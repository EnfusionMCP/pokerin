"""WebSocket route — /ws/table/{table_id}

Handles authentication via JWT query parameter, routes player messages
to the poker table, and relays game events back to clients.
"""

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ..auth.jwt import decode_token
from .manager import ConnectionManager
from .protocol import ClientMsg

log = logging.getLogger(__name__)

router = APIRouter()

# Singleton — initialized in main.py lifespan and shared with table manager
conn_manager = ConnectionManager()


def _authenticate_ws(token: str) -> dict | None:
    """Validate JWT from query param. Returns user dict or None."""
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
async def table_websocket(websocket: WebSocket, table_id: str, token: str = Query(...)):
    """WebSocket endpoint for a poker table.

    Authentication: pass ?token=<jwt> in the connection URL.
    The server never sends other players' hole cards — only the
    connecting player's own cards are included in state messages.
    """
    # BUG 10 fix: authenticate before accepting. If invalid, accept then
    # immediately close — can't send close frame on unaccepted WebSocket.
    user = _authenticate_ws(token)
    if user is None:
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await websocket.accept()
    user_id = user["user_id"]

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

    # BUG D fix: connect + initial send inside try/finally so cleanup always runs
    try:
        await conn_manager.connect(table_id, user_id, websocket)

        # Send current table state (filtered for this player)
        state = table.get_state_for_player(user_id)
        await websocket.send_json(state)

        # Bug 8 fix: if it's this player's turn, re-send the action prompt
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

        async for raw in websocket.iter_json():
            msg_type = raw.get("type")

            if msg_type == ClientMsg.SIT:
                await table.sit_down(
                    user_id=user_id,
                    character_id=user["character_id"],
                    character_name=user["character_name"],
                    seat=raw.get("seat", -1),
                    buyin=raw.get("buyin", 0),
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
        # Bug 1 fix: pass ws identity so stale tab doesn't remove newer connection
        await conn_manager.disconnect(table_id, user_id, websocket)
        await table.handle_disconnect(user_id)
