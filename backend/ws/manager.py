"""WebSocket connection manager — tracks connections per table and player."""

import asyncio
import json
import logging
from collections import defaultdict

from fastapi import WebSocket

log = logging.getLogger(__name__)

SEND_TIMEOUT = 5.0  # seconds before disconnecting a slow client


class ConnectionManager:
    """Manages WebSocket connections grouped by table.

    Thread-safe for single-process async usage (all access from the
    event loop). If we ever go multi-worker, replace with Redis pub/sub.
    """

    def __init__(self):
        # table_id -> {user_id -> WebSocket}
        self._tables: dict[str, dict[int, WebSocket]] = defaultdict(dict)

    async def connect(self, table_id: str, user_id: int, ws: WebSocket) -> None:
        """Register a WebSocket connection for a user at a table."""
        old = self._tables[table_id].get(user_id)
        if old is not None:
            # Player reconnected — close the stale connection
            try:
                await old.close(code=4002, reason="Replaced by new connection")
            except Exception:
                pass
            log.info("Replaced stale connection: table=%s user=%d", table_id, user_id)

        self._tables[table_id][user_id] = ws
        log.debug("Connected: table=%s user=%d (total=%d)",
                  table_id, user_id, len(self._tables[table_id]))

    async def disconnect(self, table_id: str, user_id: int, ws: WebSocket | None = None) -> None:
        """Remove a WebSocket connection.

        Bug 1 fix: if ws is provided, only remove if the stored WebSocket
        matches. Prevents a stale tab's finally block from removing a
        newer connection.
        """
        table_conns = self._tables.get(table_id)
        if table_conns is None:
            return
        stored = table_conns.get(user_id)
        if ws is not None and stored is not ws:
            # The stored connection is newer — don't remove it
            return
        table_conns.pop(user_id, None)
        if not table_conns:
            del self._tables[table_id]
        log.debug("Disconnected: table=%s user=%d", table_id, user_id)

    async def send_to_player(self, table_id: str, user_id: int, msg: dict) -> None:
        """Send a message to a specific player at a table."""
        ws = self._tables.get(table_id, {}).get(user_id)
        if ws is None:
            return
        try:
            await asyncio.wait_for(ws.send_json(msg), timeout=SEND_TIMEOUT)
        except Exception:
            log.debug("Failed to send to user=%d at table=%s", user_id, table_id)
            await self.disconnect(table_id, user_id, ws)

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

        async def _send(uid: int, ws: WebSocket) -> int | None:
            try:
                await asyncio.wait_for(ws.send_text(text), timeout=SEND_TIMEOUT)
                return None
            except Exception:
                return uid

        tasks = [
            _send(uid, ws) for uid, ws in connections.items()
            if uid != exclude
        ]
        if not tasks:
            return

        results = await asyncio.gather(*tasks)
        for uid in results:
            if uid is not None:
                await self.disconnect(table_id, uid)

    def get_connected_users(self, table_id: str) -> set[int]:
        """Return set of user IDs connected to a table."""
        return set(self._tables.get(table_id, {}).keys())

    def table_connection_count(self, table_id: str) -> int:
        """Number of WebSocket connections at a table."""
        return len(self._tables.get(table_id, {}))
