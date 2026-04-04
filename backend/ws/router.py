"""WebSocket route — /ws/table/{table_id}

Authentication via first-message token (not query string) to avoid
tokens appearing in server/proxy access logs.
"""

import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from sqlalchemy import select

from ..auth.jwt import decode_token
from ..db import async_session
from ..models.user import User
from .manager import ConnectionManager
from .protocol import ClientMsg

log = logging.getLogger(__name__)

router = APIRouter()

# Singleton — initialized in main.py lifespan and shared with table manager
conn_manager = ConnectionManager()

# Per-user WS connection rate limit: max 5 connections per 10 seconds
_ws_connect_times: dict[int, list[float]] = {}
_WS_RATE_WINDOW = 10.0
_WS_RATE_MAX = 5


def _authenticate_ws(token: str) -> dict | None:
    """Validate JWT. Returns user dict or None."""
    try:
        payload = decode_token(token)
        return {
            "user_id": int(payload["sub"]),
            "character_id": payload["cid"],
            "character_name": payload["name"],
        }
    except Exception:
        return None


@router.websocket("/ws/table/{table_id}")
async def table_websocket(websocket: WebSocket, table_id: str):
    """WebSocket endpoint for a poker table.

    Authentication: send {"type": "auth", "token": "<jwt>"} as the first
    message after connection. The server closes if the first message isn't
    a valid auth message within 10 seconds.
    """
    # Per-user chat rate limit: 1 message per second
    _last_chat: dict[int, float] = {}

    await websocket.accept()

    # Wait for auth message (first message must be auth)
    import asyncio
    import json as _json

    try:
        raw_text = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        raw = _json.loads(raw_text)
    except (asyncio.TimeoutError, ValueError, TypeError, WebSocketDisconnect):
        await websocket.close(code=4001, reason="Auth timeout or invalid message")
        return

    if raw.get("type") != "auth" or not raw.get("token"):
        await websocket.close(code=4001, reason="First message must be auth")
        return

    user = _authenticate_ws(raw["token"])
    if user is None:
        await websocket.send_json({"type": "error", "message": "Invalid or expired token"})
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = user["user_id"]

    # WS connection rate limit
    now = time.monotonic()
    times = _ws_connect_times.get(user_id, [])
    times = [t for t in times if now - t < _WS_RATE_WINDOW]
    if len(times) >= _WS_RATE_MAX:
        await websocket.send_json({"type": "error", "message": "Too many connections, slow down"})
        await websocket.close(code=4029, reason="Rate limited")
        return
    times.append(now)
    _ws_connect_times[user_id] = times

    # Periodic cleanup — purge stale entries every 100 connections
    if len(_ws_connect_times) > 100:
        stale = [uid for uid, ts in _ws_connect_times.items()
                 if all(now - t > _WS_RATE_WINDOW for t in ts)]
        for uid in stale:
            del _ws_connect_times[uid]

    # Ban check
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if db_user and db_user.is_banned:
            await websocket.send_json({"type": "error", "message": "Account banned"})
            await websocket.close(code=4001, reason="Account banned")
            return

    # Get table from table manager
    table_manager = getattr(websocket.app.state, "table_manager", None)
    if table_manager is None:
        await websocket.send_json({"type": "error", "message": "Server not ready"})
        await websocket.close(code=4003)
        return

    table = table_manager.get_table(table_id)
    if table is None:
        await websocket.send_json({"type": "error", "message": "Table not found"})
        await websocket.close(code=4004)
        return

    try:
        await conn_manager.connect(table_id, user_id, websocket)

        # Clear disconnect flag if player is reconnecting mid-hand
        table.handle_reconnect(user_id)

        # Send current table state (filtered for this player)
        state = table.get_state_for_player(user_id)
        await websocket.send_json(state)

        # If it's this player's turn, re-send the action prompt
        if table.action_on >= 0 and table.phase.value == "betting":
            seat = table.seats[table.action_on]
            if seat and seat.user_id == user_id and seat.is_active:
                valid = table._get_valid_actions(seat)
                await websocket.send_json({
                    "type": "action_prompt",
                    "valid": [a.value for a in valid],
                    "call_amount": max(0, table.current_bet - seat.current_bet),
                    "min_raise": table.current_bet + table.min_raise,
                    "max_raise": seat.stack + seat.current_bet,
                    "timeout": 30.0,
                })

        async for text in websocket.iter_text():
            try:
                raw = _json.loads(text)
            except (ValueError, TypeError):
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue
            msg_type = raw.get("type")

            if msg_type == ClientMsg.SIT:
                try:
                    sit_seat = int(raw.get("seat", -1))
                    sit_buyin = int(raw.get("buyin", 0))
                except (TypeError, ValueError):
                    await websocket.send_json({"type": "error", "message": "Invalid seat or buyin"})
                    continue
                await table.sit_down(
                    user_id=user_id,
                    character_id=user["character_id"],
                    character_name=user["character_name"],
                    seat=sit_seat,
                    buyin=sit_buyin,
                )

            elif msg_type == ClientMsg.STAND:
                await table.stand_up(user_id)

            elif msg_type == ClientMsg.ACTION:
                await table.handle_player_action(user_id, raw)

            elif msg_type == ClientMsg.ADD_CHIPS:
                try:
                    chip_amount = int(raw.get("amount", 0))
                except (TypeError, ValueError):
                    chip_amount = 0
                await table.add_chips(user_id, chip_amount)

            elif msg_type == ClientMsg.CHAT:
                now = time.monotonic()
                if now - _last_chat.get(user_id, 0) < 1.0:
                    continue  # rate limited, silently drop
                _last_chat[user_id] = now
                text = raw.get("text", "")[:200]  # limit chat length
                await conn_manager.broadcast_table(table_id, {
                    "type": "chat",
                    "user_id": user_id,
                    "name": user["character_name"],
                    "text": text,
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        log.info("Player disconnected: user=%d table=%s", user_id, table_id)
    except Exception as e:
        log.error("WebSocket error: user=%d table=%s: %s", user_id, table_id, e)
    finally:
        # Only handle disconnect if this was the CURRENT connection (not a stale tab)
        removed = await conn_manager.disconnect(table_id, user_id, websocket)
        if removed:
            await table.handle_disconnect(user_id)
