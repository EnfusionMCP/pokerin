"""WebSocket message protocol — type definitions and serialization.

All messages are JSON dicts with a "type" field. Server-to-client messages
use snake_case types; client-to-server messages use the same convention.
"""

from enum import StrEnum


class ServerMsg(StrEnum):
    """Message types sent from server to client."""
    TABLE_STATE = "table_state"       # full snapshot (on connect/reconnect)
    HAND_START = "hand_start"         # new hand beginning
    DEAL = "deal"                     # your hole cards (private)
    COMMUNITY = "community"           # board cards revealed
    PLAYER_ACTION = "player_action"   # someone acted
    ACTION_PROMPT = "action_prompt"   # it's your turn
    HAND_RESULT = "hand_result"       # showdown result + seed reveal
    SEAT_UPDATE = "seat_update"       # player sat/stood/disconnected
    CHAT = "chat"                     # table chat message
    ERROR = "error"                   # error message


class ClientMsg(StrEnum):
    """Message types sent from client to server."""
    SIT = "sit"             # sit at a seat with buyin
    STAND = "stand"         # leave the table
    ACTION = "action"       # fold/check/call/bet/raise
    ADD_CHIPS = "add_chips" # top up between hands
    CHAT = "chat"           # send chat message
