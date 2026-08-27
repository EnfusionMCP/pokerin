"""Typed WebSocket protocol and JSON-Schema source of truth.

Phase 1 deliberately keeps legacy command fields valid while adding an
explicit protocol version, command correlation, ordered table revisions, and
structured acknowledgements/errors.  New clients should always send a
``command_id`` and echo the current action prompt token.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated, Any, Literal, TypeAlias
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator


SCHEMA_VERSION = 1
# Used for errors emitted before a request can be associated with a table
# instance (authentication failure, unknown table, server not ready, etc.).
# Table traffic always overrides this with PokerTable.stream_id.
PROCESS_STREAM_ID = str(uuid4())

CardString: TypeAlias = Annotated[str, Field(pattern=r"^[2-9TJQKA][cdhs]$")]
ActionName: TypeAlias = Literal["fold", "check", "call", "bet", "raise", "allin"]
CommandName: TypeAlias = Literal["sit", "stand", "action", "add_chips", "chat"]
StreetName: TypeAlias = Literal["preflop", "flop", "turn", "river", "showdown"]
PhaseName: TypeAlias = Literal["idle", "posting", "dealing", "betting", "showdown", "complete"]
SeatStatusName: TypeAlias = Literal["empty", "waiting", "active", "folded", "allin", "sitting_out"]
OccupiedSeatStatusName: TypeAlias = Literal["waiting", "active", "folded", "allin", "sitting_out"]
NonNegativeInt: TypeAlias = Annotated[int, Field(ge=0)]


def server_time() -> str:
    """Return an RFC 3339 UTC timestamp suitable for a JSON envelope."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def server_datetime() -> datetime:
    """Return a timezone-aware timestamp for typed protocol models."""
    return datetime.now(timezone.utc)


class ServerMsg(StrEnum):
    """Message types sent from server to client."""

    TABLE_STATE = "table_state"
    HAND_START = "hand_start"
    DEAL = "deal"
    COMMUNITY = "community"
    PLAYER_ACTION = "player_action"
    ACTION_ON = "action_on"
    ACTION_PROMPT = "action_prompt"
    HAND_RESULT = "hand_result"
    SEAT_UPDATE = "seat_update"
    BANK_TIME_START = "bank_time_start"
    CHAT = "chat"
    ACK = "ack"
    ERROR = "error"


class ClientMsg(StrEnum):
    """Message types sent from client to server."""

    AUTH = "auth"
    SIT = "sit"
    STAND = "stand"
    ACTION = "action"
    ADD_CHIPS = "add_chips"
    CHAT = "chat"


class ProtocolModel(BaseModel):
    """Compatibility-friendly base for all wire models."""

    model_config = ConfigDict(extra="ignore", use_enum_values=True)


class ClientEnvelope(ProtocolModel):
    # Optional during the Phase 1 compatibility window. New clients send both.
    schema_version: Literal[SCHEMA_VERSION] | None = None
    command_id: str | None = Field(default=None, min_length=1, max_length=128)


class AuthMessage(ProtocolModel):
    type: Literal["auth"] = "auth"
    schema_version: Literal[SCHEMA_VERSION] | None = None
    token: str = Field(min_length=1)


class SitCommand(ClientEnvelope):
    type: Literal["sit"] = "sit"
    seat: NonNegativeInt
    buyin: int = Field(gt=0)


class StandCommand(ClientEnvelope):
    type: Literal["stand"] = "stand"


class ActionCommand(ClientEnvelope):
    model_config = ConfigDict(
        json_schema_extra={
            "allOf": [{
                "if": {
                    "properties": {"schema_version": {"const": SCHEMA_VERSION}},
                    "required": ["schema_version"],
                },
                "then": {"required": ["prompt_id", "turn_token"]},
            }]
        }
    )

    type: Literal["action"] = "action"
    action: ActionName
    amount: int = Field(default=0, ge=0)
    # ``turn_token`` is the canonical name. ``prompt_id`` is retained as an
    # explicit alias during rollout; if both are supplied they must agree.
    prompt_id: str | None = Field(default=None, min_length=1, max_length=128)
    turn_token: str | None = Field(default=None, min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_prompt_capability(self) -> "ActionCommand":
        """Require the current turn capability on versioned commands.

        Only explicitly unversioned commands retain the Phase 1 legacy grace.
        If a legacy client supplies both aliases they must still agree.
        """
        if self.prompt_id is not None and self.turn_token is not None:
            if self.prompt_id != self.turn_token:
                raise ValueError("prompt_id and turn_token must match")
        if self.schema_version == SCHEMA_VERSION:
            if self.prompt_id is None or self.turn_token is None:
                raise ValueError("versioned action commands require prompt_id and turn_token")
        return self


class AddChipsCommand(ClientEnvelope):
    type: Literal["add_chips"] = "add_chips"
    amount: int = Field(gt=0)


class ChatCommand(ClientEnvelope):
    type: Literal["chat"] = "chat"
    text: str = Field(min_length=1, max_length=200)


ClientCommand: TypeAlias = Annotated[
    SitCommand | StandCommand | ActionCommand | AddChipsCommand | ChatCommand,
    Field(discriminator="type"),
]
ClientInboundMessage: TypeAlias = Annotated[
    AuthMessage | SitCommand | StandCommand | ActionCommand | AddChipsCommand | ChatCommand,
    Field(discriminator="type"),
]

CLIENT_COMMAND_ADAPTER = TypeAdapter(ClientCommand)
CLIENT_INBOUND_ADAPTER = TypeAdapter(ClientInboundMessage)


class ServerEnvelope(ProtocolModel):
    schema_version: Literal[SCHEMA_VERSION] = SCHEMA_VERSION
    stream_id: str = Field(min_length=1, max_length=128)
    revision: int = Field(default=0, ge=0)
    server_time: datetime = Field(default_factory=server_datetime)


class SeatData(ProtocolModel):
    seat: NonNegativeInt
    user_id: NonNegativeInt | None = None
    name: str | None = None
    stack: NonNegativeInt | None = None
    status: SeatStatusName
    current_bet: NonNegativeInt | None = None
    portrait: str | None = None


class PotData(ProtocolModel):
    amount: NonNegativeInt
    eligible: list[NonNegativeInt]


class WinnerData(ProtocolModel):
    seat: NonNegativeInt
    user_id: NonNegativeInt
    amount: NonNegativeInt
    hand: str | None = None


class BlindsData(ProtocolModel):
    model_config = ConfigDict(extra="forbid")

    small: NonNegativeInt
    big: NonNegativeInt


class TableStateMessage(ServerEnvelope):
    type: Literal["table_state"] = "table_state"
    table_id: str
    table_name: str
    seats: list[SeatData]
    community: list[CardString]
    pots: list[PotData]
    dealer: int
    action_on: int
    street: StreetName
    phase: PhaseName
    your_cards: list[CardString] | None = None
    hand_num: NonNegativeInt
    seed_hash: str | None = None
    winners: list[WinnerData] = Field(default_factory=list)
    shown_cards: dict[str, list[CardString]] = Field(default_factory=dict)
    blinds: BlindsData


class HandStartMessage(ServerEnvelope):
    type: Literal["hand_start"] = "hand_start"
    hand_num: NonNegativeInt
    seed_hash: str = Field(min_length=1)
    dealer: int
    pot: NonNegativeInt | None = None
    seats: list[SeatData] | None = None


class DealMessage(ServerEnvelope):
    type: Literal["deal"] = "deal"
    cards: list[CardString]


class CommunityMessage(ServerEnvelope):
    type: Literal["community"] = "community"
    street: StreetName
    cards: list[CardString]
    board: list[CardString]


class PlayerActionMessage(ServerEnvelope):
    type: Literal["player_action"] = "player_action"
    seat: NonNegativeInt
    user_id: NonNegativeInt
    action: ActionName
    amount: NonNegativeInt
    stack: NonNegativeInt
    current_bet: NonNegativeInt | None = None
    status: OccupiedSeatStatusName | None = None
    pot: NonNegativeInt
    action_on: int | None = None


class ActionOnMessage(ServerEnvelope):
    type: Literal["action_on"] = "action_on"
    seat: NonNegativeInt
    timeout: float = Field(ge=0)
    prompt_id: str = Field(min_length=1, max_length=128)
    turn_token: str = Field(min_length=1, max_length=128)


class ActionPromptMessage(ServerEnvelope):
    type: Literal["action_prompt"] = "action_prompt"
    valid: list[ActionName]
    call_amount: NonNegativeInt
    min_raise: NonNegativeInt
    max_raise: NonNegativeInt
    timeout: float = Field(ge=0)
    prompt_id: str = Field(min_length=1, max_length=128)
    turn_token: str = Field(min_length=1, max_length=128)


class HandResultMessage(ServerEnvelope):
    type: Literal["hand_result"] = "hand_result"
    community: list[CardString]
    winners: list[WinnerData]
    shown_cards: dict[str, list[CardString]]
    pots: list[PotData]
    server_seed: str
    rake: NonNegativeInt | None = None


class SeatUpdateMessage(ServerEnvelope, SeatData):
    type: Literal["seat_update"] = "seat_update"


class BankTimeStartMessage(ServerEnvelope):
    type: Literal["bank_time_start"] = "bank_time_start"
    seat: NonNegativeInt
    user_id: NonNegativeInt
    duration: float = Field(ge=0)


class ChatMessage(ServerEnvelope):
    type: Literal["chat"] = "chat"
    user_id: NonNegativeInt
    name: str
    text: str = Field(min_length=1, max_length=200)


class AckMessage(ServerEnvelope):
    type: Literal["ack"] = "ack"
    command_id: str = Field(min_length=1, max_length=128)
    command_type: CommandName
    # This is deliberately only a transport receipt. A later correlated error
    # remains possible until Phase 2 adds terminal command outcomes/idempotency.
    # In particular, callers must not automatically retry financial commands.
    status: Literal["received"]


class ErrorMessage(ServerEnvelope):
    type: Literal["error"] = "error"
    code: str = Field(min_length=1, max_length=128)
    message: str = Field(min_length=1)
    command_id: str | None = Field(default=None, min_length=1, max_length=128)
    details: dict[str, Any] | None = None


ServerMessage: TypeAlias = Annotated[
    TableStateMessage
    | HandStartMessage
    | DealMessage
    | CommunityMessage
    | PlayerActionMessage
    | ActionOnMessage
    | ActionPromptMessage
    | HandResultMessage
    | SeatUpdateMessage
    | BankTimeStartMessage
    | ChatMessage
    | AckMessage
    | ErrorMessage,
    Field(discriminator="type"),
]

SERVER_MESSAGE_ADAPTER = TypeAdapter(ServerMessage)


def parse_client_command(payload: object) -> ClientCommand:
    """Validate and normalize a post-auth client command."""
    return CLIENT_COMMAND_ADAPTER.validate_python(payload)


def parse_auth_message(payload: object) -> AuthMessage:
    """Validate the mandatory first-message authentication envelope."""
    message = CLIENT_INBOUND_ADAPTER.validate_python(payload)
    if not isinstance(message, AuthMessage):
        raise ValueError("First message must be auth")
    return message


def add_server_metadata(
    message: dict[str, Any],
    revision: int = 0,
    stream_id: str = PROCESS_STREAM_ID,
) -> dict[str, Any]:
    """Add protocol metadata to an existing compatibility message."""
    payload = dict(message)
    payload.setdefault("schema_version", SCHEMA_VERSION)
    payload.setdefault("stream_id", stream_id)
    payload.setdefault("revision", revision)
    payload.setdefault("server_time", server_time())
    if payload.get("type") == ServerMsg.ERROR:
        payload.setdefault("code", "table_error")
        if payload.get("command_id") is None:
            payload.pop("command_id", None)
        if payload.get("details") is None:
            payload.pop("details", None)
    return payload


def protocol_json_schema() -> dict[str, Any]:
    """Return the complete client/server protocol schema bundle."""
    client_schema = CLIENT_INBOUND_ADAPTER.json_schema()
    for definition in client_schema.get("$defs", {}).values():
        if "type" not in definition.get("properties", {}):
            continue
        required = list(definition.get("required", []))
        if "type" not in required:
            required.append("type")
        definition["required"] = required

    server_schema = SERVER_MESSAGE_ADAPTER.json_schema()
    # Pydantic validation defaults make envelope metadata convenient to
    # construct in Python, but wire messages must carry it explicitly. Encode
    # that transport requirement without incorrectly making every optional
    # subclass default (for example error.details) mandatory.
    for definition in server_schema.get("$defs", {}).values():
        properties = definition.get("properties", {})
        if "stream_id" not in properties:
            continue
        required = list(definition.get("required", []))
        for field_name in ("schema_version", "stream_id", "revision", "server_time", "type"):
            if field_name not in required:
                required.append(field_name)
        definition["required"] = required
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "schema_version": SCHEMA_VERSION,
        "generated_from": "backend.ws.protocol",
        "client_messages": client_schema,
        "server_messages": server_schema,
    }
