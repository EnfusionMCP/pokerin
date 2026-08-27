"""WebSocket route — /ws/table/{table_id}

Authentication via first-message token (not query string) to avoid
tokens appearing in server/proxy access logs.
"""

import asyncio
import json
import logging
import math
import time
from contextlib import suppress
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from ..auth.jwt import decode_token
from ..db import async_session
from ..models.user import User
from .manager import ConnectionManager
from .protocol import (
    AckMessage,
    ActionCommand,
    AddChipsCommand,
    ChatCommand,
    ErrorMessage,
    PROCESS_STREAM_ID,
    SitCommand,
    StandCommand,
    parse_auth_message,
    parse_client_command,
)

log = logging.getLogger(__name__)

router = APIRouter()

# Singleton — initialized in main.py lifespan and shared with table manager
conn_manager = ConnectionManager()

# Per-user WS connection rate limit: max 5 connections per 10 seconds
_ws_connect_times: dict[int, list[float]] = {}
_WS_RATE_WINDOW = 10.0
_WS_RATE_MAX = 5
_WS_AUTH_TIMEOUT = 10.0
_WS_AUTH_FRAME_MAX_BYTES = 16_384
_WS_PREAUTH_MAX = 64
_pending_auth_sockets: set[int] = set()
_WS_PREAUTH_RATE_WINDOW = 60.0
_WS_PREAUTH_RATE_MAX = 20
_WS_PREAUTH_MAX_IPS = 4_096
_WS_PREAUTH_CLEANUP_INTERVAL = 256
_pre_auth_attempts: dict[str, list[float]] = {}
_pre_auth_attempt_count = 0


def _revision(table=None) -> int:
    return table.revision if table is not None else 0


def _reserve_pre_auth(websocket: WebSocket) -> bool:
    """Bound accepted sockets waiting for their first authentication frame."""
    if len(_pending_auth_sockets) >= _WS_PREAUTH_MAX:
        return False
    _pending_auth_sockets.add(id(websocket))
    return True


def _release_pre_auth(websocket: WebSocket) -> None:
    _pending_auth_sockets.discard(id(websocket))


def _websocket_client_ip(websocket: WebSocket) -> str:
    """Use the proxy-appended final XFF hop, matching the HTTP limiter."""
    forwarded = websocket.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return websocket.client.host if websocket.client else "unknown"


def _cleanup_pre_auth_attempts(now: float) -> None:
    cutoff = now - _WS_PREAUTH_RATE_WINDOW
    for client_ip, attempts in list(_pre_auth_attempts.items()):
        retained = [attempt for attempt in attempts if attempt > cutoff]
        if retained:
            _pre_auth_attempts[client_ip] = retained
        else:
            del _pre_auth_attempts[client_ip]


def _allow_pre_auth_attempt(websocket: WebSocket, *, now: float | None = None) -> bool:
    """Apply a bounded per-client sliding window before token processing."""
    global _pre_auth_attempt_count
    timestamp = time.monotonic() if now is None else now
    _pre_auth_attempt_count += 1
    if _pre_auth_attempt_count >= _WS_PREAUTH_CLEANUP_INTERVAL:
        _pre_auth_attempt_count = 0
        _cleanup_pre_auth_attempts(timestamp)

    client_ip = _websocket_client_ip(websocket)
    bucket = _pre_auth_attempts.get(client_ip)
    if bucket is None:
        if len(_pre_auth_attempts) >= _WS_PREAUTH_MAX_IPS:
            _cleanup_pre_auth_attempts(timestamp)
            if len(_pre_auth_attempts) >= _WS_PREAUTH_MAX_IPS:
                return False
        bucket = []
        _pre_auth_attempts[client_ip] = bucket

    cutoff = timestamp - _WS_PREAUTH_RATE_WINDOW
    bucket[:] = [attempt for attempt in bucket if attempt > cutoff]
    if len(bucket) >= _WS_PREAUTH_RATE_MAX:
        return False
    bucket.append(timestamp)
    return True


async def _send_error(
    websocket: WebSocket,
    code: str,
    message: str,
    *,
    table=None,
    user_id: int | None = None,
    command_id: str | None = None,
    details: dict | None = None,
) -> None:
    """Send one consistently structured protocol error."""
    payload = ErrorMessage(
        code=code,
        message=message,
        command_id=command_id,
        details=details,
        stream_id=table.stream_id if table is not None else PROCESS_STREAM_ID,
        revision=_revision(table),
    )
    rendered = payload.model_dump(mode="json", exclude_none=True)
    if table is not None and user_id is not None:
        await conn_manager.send_to_player(table.table_id, user_id, rendered)
    else:
        await websocket.send_json(rendered)


async def _send_ack(
    table,
    user_id: int,
    command_id: str,
    command_type: str,
) -> None:
    """Confirm transport receipt before dispatching the command.

    This is not a terminal success outcome. In particular, clients must not
    automatically retry financial commands if their eventual outcome is
    unknown; durable idempotency is a Phase 2 concern.
    """
    payload = AckMessage(
        command_id=command_id,
        command_type=command_type,
        status="received",
        stream_id=table.stream_id,
        revision=_revision(table),
    )
    await conn_manager.send_to_player(
        table.table_id, user_id, payload.model_dump(mode="json")
    )


def _authenticate_ws(token: str) -> dict | None:
    """Validate JWT and retain its verified absolute expiry."""
    try:
        payload = decode_token(token)
        expires_at = payload["exp"]
        if isinstance(expires_at, bool) or not isinstance(expires_at, (int, float)):
            return None
        if not math.isfinite(float(expires_at)):
            return None
        return {
            "user_id": int(payload["sub"]),
            "character_id": payload["cid"],
            "character_name": payload["name"],
            "expires_at": float(expires_at),
        }
    except Exception:
        return None


async def _user_is_banned(user_id: int) -> bool:
    """Recheck durable account state; deleted users fail closed."""
    async with async_session() as session:
        db_user = await session.get(User, user_id)
        return db_user is None or bool(db_user.is_banned)


def _error_payload(
    code: str,
    message: str,
    *,
    table=None,
    command_id: str | None = None,
) -> dict:
    return ErrorMessage(
        code=code,
        message=message,
        command_id=command_id,
        stream_id=table.stream_id if table is not None else PROCESS_STREAM_ID,
        revision=_revision(table),
    ).model_dump(mode="json", exclude_none=True)


async def _terminate_table_connection(
    websocket: WebSocket,
    table,
    user_id: int,
    *,
    error_code: str,
    message: str,
    close_code: int = 4001,
) -> bool:
    """Deactivate one owned socket and publish table disconnect state."""
    if not conn_manager.deactivate_connection(table.table_id, user_id, websocket):
        return False
    try:
        return await conn_manager.terminate_connection(
            table.table_id,
            user_id,
            websocket,
            code=close_code,
            reason=message,
            message=_error_payload(error_code, message, table=table),
            on_disconnect=lambda: table.handle_disconnect(user_id),
        )
    except Exception:
        # terminate_connection has already detached and closed the transport;
        # never expose callback/transport details to the client or logs.
        log.error(
            "Failed to publish terminal table disconnect: user=%d table=%s",
            user_id,
            table.table_id,
        )
        return True


async def _expire_table_connection(
    websocket: WebSocket,
    table,
    user_id: int,
    expires_at: float,
) -> None:
    """Close and deactivate an authenticated connection when its JWT expires."""
    while True:
        remaining = expires_at - time.time()
        if remaining <= 0:
            break
        await asyncio.sleep(remaining)
    async with conn_manager.user_guard(user_id):
        await _terminate_table_connection(
            websocket,
            table,
            user_id,
            error_code="token_expired",
            message="Authentication token expired",
        )


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

    if not _allow_pre_auth_attempt(websocket):
        try:
            await _send_error(
                websocket,
                "connection_rate_limited",
                "Too many authentication attempts",
            )
        except Exception:
            pass
        with suppress(Exception):
            await websocket.close(code=4029, reason="Authentication rate limited")
        return

    if not _reserve_pre_auth(websocket):
        try:
            await _send_error(
                websocket,
                "connection_rate_limited",
                "Too many connections awaiting authentication",
            )
        except Exception:
            pass
        with suppress(Exception):
            await websocket.close(code=4029, reason="Authentication capacity reached")
        return

    # Wait for a small first auth frame within a fixed deadline.  The global
    # pending set prevents slow unauthenticated peers from consuming unbounded
    # application tasks while that deadline runs.
    try:
        raw_text = await asyncio.wait_for(
            websocket.receive_text(), timeout=_WS_AUTH_TIMEOUT
        )
        if len(raw_text.encode("utf-8")) > _WS_AUTH_FRAME_MAX_BYTES:
            raise ValueError("authentication frame too large")
        raw = json.loads(raw_text)
    except (asyncio.TimeoutError, ValueError, TypeError, WebSocketDisconnect):
        try:
            await _send_error(websocket, "invalid_auth_message", "Auth timeout or invalid message")
        except Exception:
            pass
        with suppress(Exception):
            await websocket.close(code=4001, reason="Auth timeout or invalid message")
        return
    finally:
        _release_pre_auth(websocket)

    try:
        auth_message = parse_auth_message(raw)
    except (ValidationError, ValueError, TypeError):
        await _send_error(websocket, "invalid_auth_message", "First message must be auth")
        await websocket.close(code=4001, reason="First message must be auth")
        return

    user = _authenticate_ws(auth_message.token)
    if user is None:
        await _send_error(websocket, "invalid_token", "Invalid or expired token")
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = user["user_id"]

    # WS connection rate limit
    now = time.monotonic()
    times = _ws_connect_times.get(user_id, [])
    times = [t for t in times if now - t < _WS_RATE_WINDOW]
    if len(times) >= _WS_RATE_MAX:
        await _send_error(websocket, "connection_rate_limited", "Too many connections, slow down")
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

    # Get table from table manager
    table_manager = getattr(websocket.app.state, "table_manager", None)
    if table_manager is None:
        await _send_error(websocket, "server_not_ready", "Server not ready")
        await websocket.close(code=4003)
        return

    table = table_manager.get_table(table_id)
    if table is None:
        await _send_error(websocket, "table_not_found", "Table not found")
        await websocket.close(code=4004)
        return

    active_command_id: str | None = None
    expiry_task: asyncio.Task[None] | None = None
    try:
        # Serialize connection publication with admin bans and token expiry.
        # A second durable check after bootstrap covers bans committed by a
        # different process during the snapshot send.
        async with conn_manager.user_guard(user_id):
            if conn_manager.is_user_blocked(user_id) or await _user_is_banned(user_id):
                conn_manager.block_user(user_id)
                await _send_error(websocket, "account_banned", "Account banned")
                await websocket.close(code=4001, reason="Account banned")
                return
            if time.time() >= user["expires_at"]:
                await _send_error(websocket, "invalid_token", "Invalid or expired token")
                await websocket.close(code=4001, reason="Invalid or expired token")
                return

            # Keep the socket hidden from broadcasts until its authoritative
            # personalized snapshot has been sent as frame one.
            if not await conn_manager.connect(
                table_id, user_id, websocket, ready=False
            ):
                await _send_error(websocket, "account_banned", "Account banned")
                await websocket.close(code=4001, reason="Account banned")
                return
            if not await table.bootstrap_connection(user_id, websocket):
                return
            if conn_manager.is_user_blocked(user_id) or await _user_is_banned(user_id):
                conn_manager.block_user(user_id)
                await _terminate_table_connection(
                    websocket,
                    table,
                    user_id,
                    error_code="account_banned",
                    message="Account banned",
                )
                return

        expiry_task = asyncio.create_task(
            _expire_table_connection(
                websocket, table, user_id, user["expires_at"]
            ),
            name=f"ws-expiry-{table_id}-{user_id}",
        )

        async for text in websocket.iter_text():
            active_command_id = None
            try:
                raw = json.loads(text)
            except (ValueError, TypeError):
                await _send_error(
                    websocket, "invalid_json", "Invalid JSON", table=table, user_id=user_id
                )
                continue
            try:
                command = parse_client_command(raw)
            except ValidationError as exc:
                errors = [
                    {"path": ".".join(str(part) for part in item["loc"]),
                     "message": item["msg"], "type": item["type"]}
                    for item in exc.errors(include_url=False)
                ]
                raw_command_id = raw.get("command_id") if isinstance(raw, dict) else None
                await _send_error(
                    websocket,
                    "invalid_command",
                    "Command failed schema validation",
                    table=table,
                    user_id=user_id,
                    command_id=raw_command_id if isinstance(raw_command_id, str) else None,
                    details={"errors": errors},
                )
                continue

            command_id = command.command_id or str(uuid4())
            active_command_id = command_id
            command_payload = command.model_dump(mode="json", exclude_none=True)
            command_payload["command_id"] = command_id

            if isinstance(command, ActionCommand):
                if command.prompt_id and command.turn_token and command.prompt_id != command.turn_token:
                    await _send_error(
                        websocket,
                        "prompt_token_mismatch",
                        "prompt_id and turn_token must match",
                        table=table,
                        user_id=user_id,
                        command_id=command_id,
                    )
                    continue

            if isinstance(command, ChatCommand):
                now = time.monotonic()
                if now - _last_chat.get(user_id, 0) < 1.0:
                    await _send_error(
                        websocket,
                        "chat_rate_limited",
                        "Chat messages are limited to one per second",
                        table=table,
                        user_id=user_id,
                        command_id=command_id,
                    )
                    continue
                _last_chat[user_id] = now

            # The guard makes the durable recheck and command dispatch atomic
            # with respect to this process's admin ban endpoint. An already
            # admitted command may finish; once a ban returns, no later command
            # can be acknowledged or mutate table state.
            async with conn_manager.user_guard(user_id):
                if time.time() >= user["expires_at"]:
                    await _terminate_table_connection(
                        websocket,
                        table,
                        user_id,
                        error_code="token_expired",
                        message="Authentication token expired",
                    )
                    break
                if conn_manager.is_user_blocked(user_id) or await _user_is_banned(user_id):
                    conn_manager.block_user(user_id)
                    await _terminate_table_connection(
                        websocket,
                        table,
                        user_id,
                        error_code="account_banned",
                        message="Account banned",
                    )
                    break

                await _send_ack(table, user_id, command_id, command.type)

                if isinstance(command, SitCommand):
                    await table.sit_down(
                        user_id=user_id,
                        character_id=user["character_id"],
                        character_name=user["character_name"],
                        seat=command.seat,
                        buyin=command.buyin,
                        command_id=command_id,
                    )

                elif isinstance(command, StandCommand):
                    await table.stand_up(user_id, command_id=command_id)

                elif isinstance(command, ActionCommand):
                    await table.handle_player_action(user_id, command_payload)

                elif isinstance(command, AddChipsCommand):
                    await table.add_chips(user_id, command.amount, command_id=command_id)

                elif isinstance(command, ChatCommand):
                    await table.broadcast_chat({
                        "type": "chat",
                        "user_id": user_id,
                        "name": user["character_name"],
                        "text": command.text,
                    })

            active_command_id = None

    except WebSocketDisconnect:
        log.info("Player disconnected: user=%d table=%s", user_id, table_id)
    except Exception:
        log.error("WebSocket command processing failed: user=%d table=%s", user_id, table_id)
        try:
            await _send_error(
                websocket,
                "internal_error",
                "Command processing failed",
                table=table,
                user_id=user_id,
                command_id=active_command_id,
            )
        except Exception:
            pass
    finally:
        if expiry_task is not None and not expiry_task.done():
            expiry_task.cancel()
            with suppress(asyncio.CancelledError):
                await expiry_task
        # Only handle disconnect if this was the CURRENT connection (not a stale tab)
        removed = await conn_manager.disconnect(table_id, user_id, websocket)
        if removed:
            await table.handle_disconnect(user_id)
