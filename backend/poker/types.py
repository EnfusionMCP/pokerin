"""Core poker types — cards, streets, actions."""

from enum import IntEnum, StrEnum
from dataclasses import dataclass


class Suit(IntEnum):
    CLUBS = 0
    DIAMONDS = 1
    HEARTS = 2
    SPADES = 3


class Rank(IntEnum):
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14


RANK_CHARS = {
    Rank.TWO: "2", Rank.THREE: "3", Rank.FOUR: "4", Rank.FIVE: "5",
    Rank.SIX: "6", Rank.SEVEN: "7", Rank.EIGHT: "8", Rank.NINE: "9",
    Rank.TEN: "T", Rank.JACK: "J", Rank.QUEEN: "Q", Rank.KING: "K",
    Rank.ACE: "A",
}

SUIT_CHARS = {
    Suit.CLUBS: "c", Suit.DIAMONDS: "d",
    Suit.HEARTS: "h", Suit.SPADES: "s",
}

RANK_NAMES = {
    Rank.TWO: "Two", Rank.THREE: "Three", Rank.FOUR: "Four", Rank.FIVE: "Five",
    Rank.SIX: "Six", Rank.SEVEN: "Seven", Rank.EIGHT: "Eight", Rank.NINE: "Nine",
    Rank.TEN: "Ten", Rank.JACK: "Jack", Rank.QUEEN: "Queen", Rank.KING: "King",
    Rank.ACE: "Ace",
}

SUIT_NAMES = {
    Suit.CLUBS: "Clubs", Suit.DIAMONDS: "Diamonds",
    Suit.HEARTS: "Hearts", Suit.SPADES: "Spades",
}


@dataclass(frozen=True, slots=True)
class Card:
    rank: Rank
    suit: Suit

    def __str__(self) -> str:
        return f"{RANK_CHARS[self.rank]}{SUIT_CHARS[self.suit]}"

    def __repr__(self) -> str:
        return str(self)

    def to_phe(self) -> str:
        """Format for phevaluator: rank char + suit char (e.g. 'Ah', 'Td')."""
        return str(self)

    @classmethod
    def from_str(cls, s: str) -> "Card":
        """Parse 'Ah', '2c', 'Td' etc."""
        rank_map = {v: k for k, v in RANK_CHARS.items()}
        suit_map = {v: k for k, v in SUIT_CHARS.items()}
        return cls(rank=rank_map[s[0]], suit=suit_map[s[1]])


# All 52 cards, ordered by suit then rank
ALL_CARDS = tuple(Card(rank, suit) for suit in Suit for rank in Rank)


class Street(StrEnum):
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


class ActionType(StrEnum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"
    ALL_IN = "allin"


class SeatStatus(StrEnum):
    EMPTY = "empty"
    WAITING = "waiting"      # seated but not in current hand
    ACTIVE = "active"        # playing current hand
    FOLDED = "folded"
    ALL_IN = "allin"
    SITTING_OUT = "sitting_out"


class HandPhase(StrEnum):
    IDLE = "idle"            # waiting for players
    POSTING = "posting"      # posting blinds
    DEALING = "dealing"      # dealing hole cards
    BETTING = "betting"      # active betting round
    SHOWDOWN = "showdown"    # evaluating hands
    COMPLETE = "complete"    # distributing pot


@dataclass
class PlayerAction:
    """An action submitted by a player."""
    action: ActionType
    amount: int = 0
    user_id: int = 0
