"""Player seat — represents a player sitting at a poker table."""

from dataclasses import dataclass, field

from .types import Card, SeatStatus


@dataclass
class PlayerSeat:
    """A player occupying a seat at a table."""
    seat: int
    user_id: int
    character_name: str
    stack: int = 0              # current chip count (ISK-cents)
    status: SeatStatus = SeatStatus.WAITING

    # Current hand state
    hole_cards: list[Card] = field(default_factory=list)
    current_bet: int = 0        # amount bet this street
    total_bet: int = 0          # total contributed this hand
    has_acted: bool = False     # acted this betting round

    # Timeout / bank-time escalation
    bank_time_used: bool = False   # one-shot extra time, per session at the table
    sit_out_hands: int = 0         # consecutive hands sat out (kicked at 3)

    # For display
    portrait_url: str = ""

    def reset_for_hand(self) -> None:
        """Reset per-hand state before dealing."""
        self.hole_cards = []
        self.current_bet = 0
        self.total_bet = 0
        self.has_acted = False
        self.sit_out_hands = 0  # being dealt in clears any sit-out streak
        if self.status != SeatStatus.SITTING_OUT:
            self.status = SeatStatus.ACTIVE

    def reset_for_street(self) -> None:
        """Reset per-street state."""
        self.current_bet = 0
        self.has_acted = False

    @property
    def is_active(self) -> bool:
        """Still in the hand and can act."""
        return self.status == SeatStatus.ACTIVE

    @property
    def is_in_hand(self) -> bool:
        """In the hand (active or all-in)."""
        return self.status in (SeatStatus.ACTIVE, SeatStatus.ALL_IN)

    def to_public_dict(self) -> dict:
        """Public info visible to all players."""
        return {
            "seat": self.seat,
            "user_id": self.user_id,
            "name": self.character_name,
            "stack": self.stack,
            "status": self.status.value,
            "current_bet": self.current_bet,
            "portrait": self.portrait_url,
        }
