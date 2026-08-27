"""Focused Phase 1 WebSocket protocol and ordering regressions."""

from __future__ import annotations

import asyncio
import json

import pytest
from pydantic import ValidationError

from backend.poker.player import PlayerSeat
from backend.poker.table import PokerTable, TableConfig
from backend.poker.types import ActionType, HandPhase, PlayerAction, SeatStatus
from backend.services.bank import InsufficientBalance
from backend.ws.manager import ConnectionManager
from backend.ws.protocol import (
    AckMessage,
    ErrorMessage,
    SERVER_MESSAGE_ADAPTER,
    parse_client_command,
    protocol_json_schema,
)


class RecordingConnection:
    def __init__(self) -> None:
        self.private: list[tuple[int, dict]] = []
        self.public: list[dict] = []

    async def send_to_player(self, _table_id: str, user_id: int, message: dict) -> None:
        self.private.append((user_id, message))

    async def broadcast_table(self, _table_id: str, message: dict) -> None:
        self.public.append(message)


class FakeWebSocket:
    def __init__(self, *, delay_snapshot: bool = False, delay_revision: int | None = None) -> None:
        self.frames: list[dict] = []
        self.closed: list[tuple[int, str]] = []
        self.snapshot_started = asyncio.Event()
        self.delay_snapshot = delay_snapshot
        self.delay_revision = delay_revision

    async def send_json(self, message: dict) -> None:
        if message.get("type") == "table_state":
            self.snapshot_started.set()
            if self.delay_snapshot:
                await asyncio.sleep(0.02)
        self.frames.append(message)

    async def send_text(self, text: str) -> None:
        message = json.loads(text)
        if message.get("revision") == self.delay_revision:
            await asyncio.sleep(0.02)
        self.frames.append(message)

    async def close(self, code: int, reason: str) -> None:
        self.closed.append((code, reason))


def make_table(connection=None, bank=None) -> PokerTable:
    return PokerTable(
        TableConfig(
            id="phase-1",
            name="Phase 1",
            max_seats=2,
            small_blind=50,
            big_blind=100,
            min_buyin=1_000,
            max_buyin=10_000,
        ),
        connection or RecordingConnection(),
        bank,
    )


def test_versioned_actions_require_matching_prompt_capability() -> None:
    with pytest.raises(ValidationError):
        parse_client_command({
            "type": "action",
            "schema_version": 1,
            "command_id": "missing-token",
            "action": "call",
        })

    with pytest.raises(ValidationError):
        parse_client_command({
            "type": "action",
            "schema_version": 1,
            "command_id": "mismatch",
            "action": "call",
            "prompt_id": "one",
            "turn_token": "two",
        })

    parsed = parse_client_command({
        "type": "action",
        "schema_version": 1,
        "command_id": "matched",
        "action": "call",
        "prompt_id": "turn-1",
        "turn_token": "turn-1",
    })
    assert parsed.turn_token == "turn-1"

    # Explicitly unversioned legacy traffic retains the rollout grace.
    legacy = parse_client_command({"type": "action", "action": "check"})
    assert legacy.schema_version is None
    assert legacy.prompt_id is None


def test_exported_schema_requires_wire_envelope_and_visible_action_tokens() -> None:
    bundle = protocol_json_schema()
    server = bundle["server_messages"]
    for definition in server["$defs"].values():
        if "stream_id" not in definition.get("properties", {}):
            continue
        required = set(definition["required"])
        assert {"type", "schema_version", "stream_id", "revision", "server_time"} <= required

    action = bundle["client_messages"]["$defs"]["ActionCommand"]
    conditional = action["allOf"][0]
    assert conditional["if"]["properties"]["schema_version"]["const"] == 1
    assert set(conditional["then"]["required"]) == {"prompt_id", "turn_token"}

    blinds = server["$defs"]["BlindsData"]
    assert set(blinds["required"]) == {"small", "big"}
    assert blinds["additionalProperties"] is False


def test_generated_schema_marks_metadata_required_and_accepts_envelopes() -> None:
    schema = protocol_json_schema()["server_messages"]
    ack_schema = schema["$defs"]["AckMessage"]
    required = set(ack_schema["required"])
    ack = AckMessage(
        stream_id="table-stream",
        revision=4,
        command_id="cmd-1",
        command_type="action",
        status="received",
    ).model_dump(mode="json")
    assert ack["status"] == "received"
    assert "status" in required
    assert required <= set(ack)
    SERVER_MESSAGE_ADAPTER.validate_python(ack)

    for field in ("schema_version", "stream_id", "revision", "server_time"):
        incomplete = dict(ack)
        incomplete.pop(field)
        assert field in required and field not in incomplete

    error = ErrorMessage(
        stream_id="table-stream",
        revision=4,
        code="invalid_command",
        message="Invalid command",
    ).model_dump(mode="json", exclude_none=True)
    assert "command_id" not in error and "details" not in error
    assert "command_id" not in schema["$defs"]["ErrorMessage"]["required"]
    assert "details" not in schema["$defs"]["ErrorMessage"]["required"]
    SERVER_MESSAGE_ADAPTER.validate_python(error)


def test_snapshot_and_prompt_share_required_table_stream() -> None:
    table = make_table()
    table.seats[0] = PlayerSeat(
        seat=0,
        user_id=7,
        character_name="Pilot",
        stack=5_000,
        status=SeatStatus.ACTIVE,
    )
    table.phase = HandPhase.BETTING
    table.action_on = 0
    table.current_bet = 100
    table.min_raise = 100

    prompt = table.get_action_prompt_for(table.seats[0])
    snapshot = table.get_state_for_player(7)
    assert prompt["stream_id"] == snapshot["stream_id"] == table.stream_id
    assert prompt["revision"] == snapshot["revision"] == table.revision
    assert prompt["prompt_id"] == prompt["turn_token"]
    SERVER_MESSAGE_ADAPTER.validate_python(prompt)
    SERVER_MESSAGE_ADAPTER.validate_python(snapshot)

    invalid = dict(snapshot)
    invalid["phase"] = "not-a-phase"
    with pytest.raises(ValidationError):
        SERVER_MESSAGE_ADAPTER.validate_python(invalid)


async def test_fast_tokened_action_queued_before_waiter_is_not_drained() -> None:
    table = make_table()
    table.seats[0] = PlayerSeat(
        seat=0,
        user_id=7,
        character_name="Pilot",
        stack=5_000,
        status=SeatStatus.ACTIVE,
    )
    table.phase = HandPhase.BETTING
    table.action_on = 0
    table.current_bet = 100
    table._current_prompt_id = "turn-fast"

    await table.handle_player_action(7, {
        "type": "action",
        "schema_version": 1,
        "command_id": "fast-command",
        "action": "call",
        "prompt_id": "turn-fast",
        "turn_token": "turn-fast",
    })
    assert table._action_queues[7].qsize() == 1
    action = await asyncio.wait_for(
        table._wait_for_action(7, "turn-fast"), timeout=0.2
    )
    assert action.action == ActionType.CALL


async def test_stale_action_is_skipped_without_losing_current_action() -> None:
    table = make_table()
    stale = PlayerAction(action=ActionType.FOLD, user_id=7)
    current = PlayerAction(action=ActionType.CHECK, user_id=7)
    await table._enqueue_action(7, stale, "old-turn", "old-command")
    await table._enqueue_action(7, current, "new-turn", "new-command")
    action = await asyncio.wait_for(
        table._wait_for_action(7, "new-turn"), timeout=0.2
    )
    assert action.action == ActionType.CHECK


async def test_invalid_raw_event_fails_before_revision_or_delivery() -> None:
    connection = RecordingConnection()
    table = make_table(connection)
    with pytest.raises(ValidationError):
        await table.broadcast_chat({
            "type": "chat",
            "user_id": 7,
            "name": "Pilot",
            # required text deliberately absent
        })
    assert table.revision == 0
    assert connection.public == []


async def test_financial_errors_are_stable_and_never_expose_service_details() -> None:
    class FailingBank:
        async def debit(self, *_args, **_kwargs) -> None:
            raise RuntimeError("postgresql://admin:secret@internal/ledger")

    connection = RecordingConnection()
    table = make_table(connection, FailingBank())
    await table.sit_down(7, 77, "Pilot", 0, 1_000, command_id="buyin-command")
    buyin_error = connection.private[-1][1]
    assert buyin_error["code"] == "buyin_failed"
    assert buyin_error["message"] == "Unable to complete buy-in"
    assert "secret" not in buyin_error["message"]

    class InsufficientBank:
        async def debit(self, *_args, **_kwargs) -> None:
            raise InsufficientBalance(7, 100, 1_000)

    connection = RecordingConnection()
    table = make_table(connection, InsufficientBank())
    table.seats[0] = PlayerSeat(0, 7, "Pilot", stack=1_000)
    await table.add_chips(7, 1_000, command_id="topup-command")
    topup_error = connection.private[-1][1]
    assert topup_error["code"] == "insufficient_balance"
    assert topup_error["message"] == "Insufficient wallet balance for this top-up"
    assert "has 100" not in topup_error["message"]


async def test_forced_stand_and_internal_bot_actions_use_prompt_bound_queue() -> None:
    table = make_table()
    seat = PlayerSeat(
        seat=0,
        user_id=7,
        character_name="Pilot",
        stack=5_000,
        status=SeatStatus.ACTIVE,
    )
    table.seats[0] = seat
    table.phase = HandPhase.BETTING
    table.action_on = 0
    table._current_prompt_id = "stand-turn"
    await table.stand_up(7, command_id="stand-command")
    forced = await asyncio.wait_for(
        table._wait_for_action(7, "stand-turn"), timeout=0.2
    )
    assert forced.action == ActionType.FOLD

    seat.status = SeatStatus.ACTIVE
    table._current_prompt_id = "bot-turn"
    queued = await table.enqueue_internal_action(
        7, PlayerAction(action=ActionType.CHECK, user_id=7)
    )
    assert queued is True
    bot_action = await asyncio.wait_for(
        table._wait_for_action(7, "bot-turn"), timeout=0.2
    )
    assert bot_action.action == ActionType.CHECK


async def test_bootstrap_snapshot_is_first_and_public_revisions_are_serialized() -> None:
    manager = ConnectionManager()
    table = make_table(manager)
    socket = FakeWebSocket(delay_snapshot=True, delay_revision=1)
    await manager.connect(table.table_id, 7, socket, ready=False)

    bootstrap = asyncio.create_task(table.bootstrap_connection(7, socket))
    await socket.snapshot_started.wait()
    first = asyncio.create_task(table.broadcast_chat({
        "type": "chat", "user_id": 8, "name": "A", "text": "one",
    }))
    second = asyncio.create_task(table.broadcast_chat({
        "type": "chat", "user_id": 9, "name": "B", "text": "two",
    }))
    assert await bootstrap is True
    await asyncio.gather(first, second)

    assert [frame["type"] for frame in socket.frames] == ["table_state", "chat", "chat"]
    assert [frame["revision"] for frame in socket.frames] == [0, 1, 2]
    assert {frame["stream_id"] for frame in socket.frames} == {table.stream_id}


async def test_failed_bootstrap_remains_registered_for_router_disconnect_cleanup() -> None:
    class FailingWebSocket(FakeWebSocket):
        async def send_json(self, _message: dict) -> None:
            raise ConnectionError("bootstrap transport failed")

    manager = ConnectionManager()
    table = make_table(manager)
    table.seats[0] = PlayerSeat(
        seat=0,
        user_id=7,
        character_name="Pilot",
        stack=5_000,
        status=SeatStatus.WAITING,
    )
    socket = FailingWebSocket()
    await manager.connect(table.table_id, 7, socket, ready=False)

    assert await table.bootstrap_connection(7, socket) is False
    # activate_connection must not preempt the router's identity-aware finally.
    assert manager.table_connection_count(table.table_id) == 1
    assert socket.closed[-1][0] == 1011
    removed = await manager.disconnect(table.table_id, 7, socket)
    assert removed is True
    await table.handle_disconnect(7)
    assert table.seats[0].status == SeatStatus.SITTING_OUT


async def test_failed_private_send_preserves_owner_cleanup_and_replacement_identity() -> None:
    class FailingPrivateWebSocket(FakeWebSocket):
        async def send_json(self, _message: dict) -> None:
            raise ConnectionError("private send failed")

    manager = ConnectionManager()
    old_socket = FailingPrivateWebSocket()
    await manager.connect("phase-1", 7, old_socket)
    await manager.send_to_player("phase-1", 7, {
        "type": "ack",
        "status": "received",
        "command_id": "cmd-1",
    })
    assert old_socket.closed[-1][0] == 1011
    assert manager.table_connection_count("phase-1") == 1

    # A replacement remains authoritative; the old router's finally must not
    # remove the newer socket.
    new_socket = FakeWebSocket()
    await manager.connect("phase-1", 7, new_socket)
    assert await manager.disconnect("phase-1", 7, old_socket) is False
    assert manager.get_connected_users("phase-1") == {7}
    assert await manager.disconnect("phase-1", 7, new_socket) is True


async def test_failed_broadcast_preserves_connection_for_router_cleanup() -> None:
    class FailingBroadcastWebSocket(FakeWebSocket):
        async def send_text(self, _text: str) -> None:
            raise ConnectionError("broadcast send failed")

    manager = ConnectionManager()
    socket = FailingBroadcastWebSocket()
    await manager.connect("phase-1", 7, socket)
    await manager.broadcast_table("phase-1", {"type": "chat", "revision": 1})
    assert socket.closed[-1][0] == 1011
    assert manager.table_connection_count("phase-1") == 1
    assert await manager.disconnect("phase-1", 7, socket) is True


async def test_disconnect_and_bootstrap_reconnect_publish_revisioned_seat_updates() -> None:
    manager = ConnectionManager()
    table = make_table(manager)
    table.seats[0] = PlayerSeat(
        seat=0,
        user_id=7,
        character_name="Pilot",
        stack=5_000,
        status=SeatStatus.WAITING,
    )
    observer = FakeWebSocket()
    await manager.connect(table.table_id, 8, observer)

    await table.handle_disconnect(7)
    assert observer.frames[-1]["type"] == "seat_update"
    assert observer.frames[-1]["status"] == "sitting_out"
    disconnected_revision = observer.frames[-1]["revision"]

    player = FakeWebSocket()
    await manager.connect(table.table_id, 7, player, ready=False)
    assert await table.bootstrap_connection(7, player) is True
    assert observer.frames[-1]["type"] == "seat_update"
    assert observer.frames[-1]["status"] == "waiting"
    assert observer.frames[-1]["revision"] == disconnected_revision + 1
    assert player.frames[0]["type"] == "table_state"
    assert player.frames[0]["revision"] == observer.frames[-1]["revision"]
    assert player.frames[0]["seats"][0]["status"] == "waiting"
