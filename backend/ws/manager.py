"""WebSocket connection manager — tracks connections per table and player."""

import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from fastapi import WebSocket

log = logging.getLogger(__name__)

SEND_TIMEOUT = 5.0  # seconds before disconnecting a slow client


@dataclass
class _Connection:
    websocket: WebSocket
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    ready: bool = True


class ConnectionManager:
    """Manages WebSocket connections grouped by table.

    Thread-safe for single-process async usage (all access from the
    event loop). If we ever go multi-worker, replace with Redis pub/sub.
    """

    def __init__(self):
        # table_id -> {user_id -> connection state}
        self._tables: dict[str, dict[int, _Connection]] = defaultdict(dict)
        # A process-local deny set closes the gap between an admin committing a
        # ban and concurrent WebSocket work observing that database change.
        # The router still rechecks the database, so process restarts and future
        # multi-process deployments fail closed as well.
        self._blocked_users: set[int] = set()
        self._user_locks: dict[int, asyncio.Lock] = {}

    @asynccontextmanager
    async def user_guard(self, user_id: int) -> AsyncIterator[None]:
        """Serialize command admission, reconnects, bans, and token expiry."""
        lock = self._user_locks.setdefault(user_id, asyncio.Lock())
        async with lock:
            yield

    def block_user(self, user_id: int) -> None:
        """Deny new connections/commands after a committed account ban."""
        self._blocked_users.add(user_id)

    def unblock_user(self, user_id: int) -> None:
        """Remove a process-local deny after a committed account unban."""
        self._blocked_users.discard(user_id)

    def is_user_blocked(self, user_id: int) -> bool:
        return user_id in self._blocked_users

    @staticmethod
    async def _close_failed_socket(ws: WebSocket) -> None:
        """Close a failed transport without stealing router cleanup ownership."""
        try:
            await asyncio.wait_for(
                ws.close(code=1011, reason="WebSocket send failed"),
                timeout=SEND_TIMEOUT,
            )
        except Exception:
            pass

    async def connect(
        self, table_id: str, user_id: int, ws: WebSocket, *, ready: bool = True
    ) -> bool:
        """Register a WebSocket connection unless the user is blocked."""
        if self.is_user_blocked(user_id):
            return False
        old = self._tables[table_id].get(user_id)
        if old is not None:
            # Player reconnected — close the stale connection
            try:
                async with old.send_lock:
                    await asyncio.wait_for(
                        old.websocket.close(
                            code=4002, reason="Replaced by new connection"
                        ),
                        timeout=SEND_TIMEOUT,
                    )
            except Exception:
                pass
            log.info("Replaced stale connection: table=%s user=%d", table_id, user_id)

        # Closing a replaced socket yields control. A concurrent ban may have
        # landed while we were waiting, so check again before publication.
        if self.is_user_blocked(user_id):
            return False
        self._tables[table_id][user_id] = _Connection(ws, ready=ready)
        log.debug("Connected: table=%s user=%d (total=%d)",
                  table_id, user_id, len(self._tables[table_id]))
        return True

    def owns_connection(self, table_id: str, user_id: int, ws: WebSocket) -> bool:
        """Return whether ``ws`` is still the authoritative table socket."""
        stored = self._tables.get(table_id, {}).get(user_id)
        return stored is not None and stored.websocket is ws

    def deactivate_connection(self, table_id: str, user_id: int, ws: WebSocket) -> bool:
        """Hide an owned socket from broadcasts before terminal cleanup."""
        stored = self._tables.get(table_id, {}).get(user_id)
        if stored is None or stored.websocket is not ws:
            return False
        stored.ready = False
        return True

    def user_connections(self, user_id: int) -> list[tuple[str, WebSocket]]:
        """Snapshot every current socket for a user across all tables."""
        return [
            (table_id, connection.websocket)
            for table_id, connections in list(self._tables.items())
            if (connection := connections.get(user_id)) is not None
        ]

    async def terminate_connection(
        self,
        table_id: str,
        user_id: int,
        ws: WebSocket,
        *,
        code: int,
        reason: str,
        message: dict | None = None,
        on_disconnect: Callable[[], Awaitable[None]] | None = None,
    ) -> bool:
        """Identity-safely detach, deactivate table state, and close a socket.

        The mapping is removed before any await, preventing broadcasts and a
        stale router ``finally`` block from claiming a newer replacement.  The
        optional callback lets the owner update table state before the close
        wakes the router receive loop.
        """
        table_conns = self._tables.get(table_id)
        stored = table_conns.get(user_id) if table_conns is not None else None
        if stored is None or stored.websocket is not ws:
            return False

        stored.ready = False
        table_conns.pop(user_id, None)
        if not table_conns:
            del self._tables[table_id]

        callback_error: Exception | None = None
        if on_disconnect is not None:
            try:
                await on_disconnect()
            except Exception as exc:  # close must still happen
                callback_error = exc

        async with stored.send_lock:
            if message is not None:
                try:
                    await asyncio.wait_for(
                        stored.websocket.send_json(message), timeout=SEND_TIMEOUT
                    )
                except Exception:
                    pass
            try:
                await asyncio.wait_for(
                    stored.websocket.close(code=code, reason=reason),
                    timeout=SEND_TIMEOUT,
                )
            except Exception:
                pass

        if callback_error is not None:
            raise callback_error
        return True

    async def activate_connection(
        self,
        table_id: str,
        user_id: int,
        ws: WebSocket,
        bootstrap_messages: list[dict],
    ) -> bool:
        """Send bootstrap frames in order, then expose the socket to broadcasts."""
        connection = self._tables.get(table_id, {}).get(user_id)
        if connection is None or connection.websocket is not ws:
            return False
        try:
            async with connection.send_lock:
                for message in bootstrap_messages:
                    await asyncio.wait_for(ws.send_json(message), timeout=SEND_TIMEOUT)
                connection.ready = True
            return True
        except Exception:
            log.debug("Failed to bootstrap user=%d at table=%s", user_id, table_id)
            # The owning router's finally block must perform identity-aware
            # removal and table disconnect handling. Removing here would make
            # that cleanup return False and leave the player logically active.
            await self._close_failed_socket(ws)
            return False

    async def disconnect(self, table_id: str, user_id: int, ws: WebSocket | None = None) -> bool:
        """Remove a WebSocket connection. Returns True if actually removed.

        Bug 1 fix: if ws is provided, only remove if the stored WebSocket
        matches. Prevents a stale tab's finally block from removing a
        newer connection.
        """
        table_conns = self._tables.get(table_id)
        if table_conns is None:
            return False
        stored = table_conns.get(user_id)
        if ws is not None and (stored is None or stored.websocket is not ws):
            # The stored connection is newer — don't remove it
            return False
        table_conns.pop(user_id, None)
        if not table_conns:
            del self._tables[table_id]
        log.debug("Disconnected: table=%s user=%d", table_id, user_id)
        return True

    async def send_to_player(self, table_id: str, user_id: int, msg: dict) -> None:
        """Send a message to a specific player at a table."""
        ws = self._tables.get(table_id, {}).get(user_id)
        if ws is None or not ws.ready:
            return
        try:
            async with ws.send_lock:
                await asyncio.wait_for(ws.websocket.send_json(msg), timeout=SEND_TIMEOUT)
        except Exception:
            log.debug("Failed to send to user=%d at table=%s", user_id, table_id)
            await self._close_failed_socket(ws.websocket)

    async def broadcast_table(
        self, table_id: str, msg: dict, exclude: int | None = None
    ) -> None:
        """Send a message to all connected players at a table.

        Bug 4 fix: sends in parallel via asyncio.gather with per-send timeout.
        Bug 9 fix: pre-serializes JSON once instead of per-recipient.
        """
        connections = self._tables.get(table_id, {})
        if not connections:
            return

        # Pre-serialize once
        text = json.dumps(msg)

        async def _send(uid: int, connection: _Connection) -> tuple[int, WebSocket] | None:
            if not connection.ready:
                return None
            try:
                async with connection.send_lock:
                    await asyncio.wait_for(
                        connection.websocket.send_text(text), timeout=SEND_TIMEOUT
                    )
                return None
            except Exception:
                return (uid, connection.websocket)

        tasks = [
            _send(uid, connection) for uid, connection in list(connections.items())
            if uid != exclude
        ]
        if not tasks:
            return

        results = await asyncio.gather(*tasks)
        for result in results:
            if result is not None:
                uid, ws = result
                log.debug("Failed to broadcast to user=%d at table=%s", uid, table_id)
                await self._close_failed_socket(ws)

    def get_connected_users(self, table_id: str) -> set[int]:
        """Return set of user IDs connected to a table."""
        return set(self._tables.get(table_id, {}).keys())

    def table_connection_count(self, table_id: str) -> int:
        """Number of WebSocket connections at a table."""
        return len(self._tables.get(table_id, {}))
