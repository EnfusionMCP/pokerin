"""WebSocket authentication, expiry, and account-ban lifecycle regressions."""

from __future__ import annotations

import asyncio
import time
from types import SimpleNamespace

from backend.api import admin
from backend.ws import router as ws_router
from backend.ws import manager as manager_module
from backend.ws.manager import ConnectionManager


class FakeWebSocket:
    def __init__(self, forwarded_for: str | None = None) -> None:
        self.frames: list[dict] = []
        self.closes: list[tuple[int, str]] = []
        self.accepted = False
        self.headers = (
            {"x-forwarded-for": forwarded_for} if forwarded_for is not None else {}
        )
        self.client = SimpleNamespace(host="127.0.0.1")

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, message: dict) -> None:
        self.frames.append(message)

    async def close(self, code: int, reason: str = "") -> None:
        self.closes.append((code, reason))


class NeverAuthenticatesSocket(FakeWebSocket):
    async def receive_text(self) -> str:
        await asyncio.Event().wait()
        raise AssertionError("unreachable")


class NeverClosesSocket(FakeWebSocket):
    async def close(self, code: int, reason: str = "") -> None:
        await asyncio.Event().wait()


class FakeTable:
    def __init__(self, table_id: str) -> None:
        self.table_id = table_id
        self.stream_id = f"stream-{table_id}"
        self.revision = 3
        self.disconnected: list[int] = []

    async def handle_disconnect(self, user_id: int) -> None:
        self.disconnected.append(user_id)


class FakeTableManager:
    def __init__(self, *tables: FakeTable) -> None:
        self.tables = {table.table_id: table for table in tables}

    def get_table(self, table_id: str) -> FakeTable | None:
        return self.tables.get(table_id)


class FakeSession:
    def __init__(self, user: SimpleNamespace, *, commit_gate: asyncio.Event | None = None) -> None:
        self.user = user
        self.commits = 0
        self.commit_started = asyncio.Event()
        self.commit_gate = commit_gate

    async def get(self, _model, user_id: int):
        return self.user if self.user.id == user_id else None

    async def commit(self) -> None:
        self.commits += 1
        self.commit_started.set()
        if self.commit_gate is not None:
            await self.commit_gate.wait()


def request_with_tables(*tables: FakeTable) -> SimpleNamespace:
    return SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(table_manager=FakeTableManager(*tables)))
    )


def test_authentication_requires_and_carries_verified_expiry(monkeypatch) -> None:
    monkeypatch.setattr(
        ws_router,
        "decode_token",
        lambda _token: {"sub": "7", "cid": 77, "name": "Pilot", "exp": 12345},
    )
    authenticated = ws_router._authenticate_ws("signed-token")
    assert authenticated == {
        "user_id": 7,
        "character_id": 77,
        "character_name": "Pilot",
        "expires_at": 12345.0,
    }

    monkeypatch.setattr(
        ws_router,
        "decode_token",
        lambda _token: {"sub": "7", "cid": 77, "name": "Pilot"},
    )
    assert ws_router._authenticate_ws("missing-expiry") is None

    monkeypatch.setattr(
        ws_router,
        "decode_token",
        lambda _token: {
            "sub": "7",
            "cid": 77,
            "name": "Pilot",
            "exp": float("nan"),
        },
    )
    assert ws_router._authenticate_ws("invalid-expiry") is None


async def test_first_authentication_frame_has_deadline_and_releases_capacity(
    monkeypatch,
) -> None:
    socket = NeverAuthenticatesSocket()
    ws_router._pending_auth_sockets.clear()
    ws_router._pre_auth_attempts.clear()
    monkeypatch.setattr(ws_router, "_WS_AUTH_TIMEOUT", 0.01)

    await ws_router.table_websocket(socket, "irrelevant")

    assert socket.accepted is True
    assert socket.frames[-1]["code"] == "invalid_auth_message"
    assert socket.closes[-1][0] == 4001
    assert ws_router._pending_auth_sockets == set()


def test_pre_authentication_capacity_is_bounded_and_reusable(monkeypatch) -> None:
    sockets = [FakeWebSocket() for _ in range(3)]
    ws_router._pending_auth_sockets.clear()
    monkeypatch.setattr(ws_router, "_WS_PREAUTH_MAX", 2)
    try:
        assert ws_router._reserve_pre_auth(sockets[0]) is True
        assert ws_router._reserve_pre_auth(sockets[1]) is True
        assert ws_router._reserve_pre_auth(sockets[2]) is False
        ws_router._release_pre_auth(sockets[0])
        assert ws_router._reserve_pre_auth(sockets[2]) is True
    finally:
        ws_router._pending_auth_sockets.clear()


def test_pre_authentication_burst_uses_proxy_appended_ip_and_bounds_cardinality(
    monkeypatch,
) -> None:
    ws_router._pre_auth_attempts.clear()
    monkeypatch.setattr(ws_router, "_WS_PREAUTH_RATE_MAX", 2)
    monkeypatch.setattr(ws_router, "_WS_PREAUTH_MAX_IPS", 2)
    try:
        # The first XFF value is attacker-controlled; Caddy appends the real
        # peer as the last value, which must select the shared rate bucket.
        first = FakeWebSocket("spoof-a, 203.0.113.7")
        second = FakeWebSocket("spoof-b, 203.0.113.7")
        assert ws_router._allow_pre_auth_attempt(first, now=10.0) is True
        assert ws_router._allow_pre_auth_attempt(second, now=10.1) is True
        assert ws_router._allow_pre_auth_attempt(first, now=10.2) is False

        assert ws_router._allow_pre_auth_attempt(
            FakeWebSocket("198.51.100.8"), now=10.3
        ) is True
        assert ws_router._allow_pre_auth_attempt(
            FakeWebSocket("192.0.2.9"), now=10.4
        ) is False
        assert len(ws_router._pre_auth_attempts) == 2
    finally:
        ws_router._pre_auth_attempts.clear()


async def test_expiry_closes_and_deactivates_only_the_owned_socket(monkeypatch) -> None:
    manager = ConnectionManager()
    monkeypatch.setattr(ws_router, "conn_manager", manager)
    table = FakeTable("alpha")
    expired = FakeWebSocket()
    assert await manager.connect(table.table_id, 7, expired) is True

    await ws_router._expire_table_connection(
        expired, table, 7, expires_at=time.time() - 1
    )

    assert table.disconnected == [7]
    assert manager.get_connected_users(table.table_id) == set()
    assert expired.frames[-1]["code"] == "token_expired"
    assert expired.closes[-1] == (4001, "Authentication token expired")

    # A stale expiry task must never remove a replacement connection.
    replacement = FakeWebSocket()
    assert await manager.connect(table.table_id, 7, replacement) is True
    await ws_router._expire_table_connection(
        expired, table, 7, expires_at=time.time() - 1
    )
    assert manager.owns_connection(table.table_id, 7, replacement) is True
    assert table.disconnected == [7]


async def test_replacement_close_timeout_cannot_hold_user_lifecycle_lock(
    monkeypatch,
) -> None:
    manager = ConnectionManager()
    stale = NeverClosesSocket()
    replacement = FakeWebSocket()
    monkeypatch.setattr(manager_module, "SEND_TIMEOUT", 0.01)
    assert await manager.connect("alpha", 7, stale) is True

    async with manager.user_guard(7):
        connected = await asyncio.wait_for(
            manager.connect("alpha", 7, replacement), timeout=0.1
        )

    assert connected is True
    assert manager.owns_connection("alpha", 7, replacement) is True


async def test_admin_ban_closes_all_sockets_and_updates_each_table(monkeypatch) -> None:
    manager = ConnectionManager()
    monkeypatch.setattr(ws_router, "conn_manager", manager)
    first = FakeWebSocket()
    second = FakeWebSocket()
    assert await manager.connect("alpha", 7, first) is True
    assert await manager.connect("beta", 7, second) is True
    alpha = FakeTable("alpha")
    beta = FakeTable("beta")
    user = SimpleNamespace(id=7, is_banned=False, ban_reason=None)
    session = FakeSession(user)

    result = await admin.ban_user(
        7,
        request_with_tables(alpha, beta),
        reason="policy",
        _admin={"user_id": 1},
        session=session,
    )

    assert result == {"status": "banned", "user_id": 7, "connections_closed": 2}
    assert user.is_banned is True and user.ban_reason == "policy"
    assert session.commits == 1
    assert manager.is_user_blocked(7) is True
    assert manager.user_connections(7) == []
    assert alpha.disconnected == [7] and beta.disconnected == [7]
    assert first.frames[-1]["code"] == second.frames[-1]["code"] == "account_banned"
    assert first.closes[-1][0] == second.closes[-1][0] == 4001


async def test_ban_commit_serializes_against_reconnect(monkeypatch) -> None:
    manager = ConnectionManager()
    monkeypatch.setattr(ws_router, "conn_manager", manager)
    commit_gate = asyncio.Event()
    user = SimpleNamespace(id=7, is_banned=False, ban_reason=None)
    session = FakeSession(user, commit_gate=commit_gate)

    ban_task = asyncio.create_task(
        admin.ban_user(
            7,
            request_with_tables(),
            _admin={"user_id": 1},
            session=session,
        )
    )
    await session.commit_started.wait()

    socket = FakeWebSocket()

    async def reconnect() -> bool:
        async with manager.user_guard(7):
            return await manager.connect("alpha", 7, socket)

    reconnect_task = asyncio.create_task(reconnect())
    await asyncio.sleep(0)
    assert reconnect_task.done() is False
    commit_gate.set()

    await ban_task
    assert await reconnect_task is False
    assert manager.user_connections(7) == []


async def test_committed_unban_clears_process_local_deny(monkeypatch) -> None:
    manager = ConnectionManager()
    manager.block_user(7)
    monkeypatch.setattr(ws_router, "conn_manager", manager)
    user = SimpleNamespace(id=7, is_banned=True, ban_reason="policy")
    session = FakeSession(user)

    result = await admin.unban_user(
        7, _admin={"user_id": 1}, session=session
    )

    assert result == {"status": "unbanned", "user_id": 7}
    assert user.is_banned is False and user.ban_reason is None
    assert session.commits == 1
    assert manager.is_user_blocked(7) is False


async def test_user_guard_allows_admitted_command_then_blocks_later_work() -> None:
    manager = ConnectionManager()
    command_started = asyncio.Event()
    release_command = asyncio.Event()
    dispatched: list[str] = []

    async def admitted_command() -> None:
        async with manager.user_guard(7):
            assert manager.is_user_blocked(7) is False
            command_started.set()
            await release_command.wait()
            dispatched.append("first")

    async def commit_ban() -> None:
        async with manager.user_guard(7):
            manager.block_user(7)

    command_task = asyncio.create_task(admitted_command())
    await command_started.wait()
    ban_task = asyncio.create_task(commit_ban())
    await asyncio.sleep(0)
    assert ban_task.done() is False

    release_command.set()
    await asyncio.gather(command_task, ban_task)
    assert dispatched == ["first"]
    async with manager.user_guard(7):
        assert manager.is_user_blocked(7) is True
