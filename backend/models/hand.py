"""Hand history models — complete audit trail of every hand played."""

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class Hand(Base):
    """A single completed poker hand."""
    __tablename__ = "hands"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    table_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    hand_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Provable fairness
    server_seed: Mapped[str] = mapped_column(String(64), nullable=False)
    server_seed_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    community_cards: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pot_total: Mapped[int] = mapped_column(BigInteger, nullable=False)
    rake_taken: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class HandPlayer(Base):
    """Per-player data for a hand — hole cards, stacks, result."""
    __tablename__ = "hand_players"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hands.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    seat: Mapped[int] = mapped_column(Integer, nullable=False)

    hole_cards: Mapped[str | None] = mapped_column(String(10), nullable=True)
    starting_stack: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ending_stack: Mapped[int] = mapped_column(BigInteger, nullable=False)
    net_won: Mapped[int] = mapped_column(BigInteger, nullable=False)

    showed_cards: Mapped[bool] = mapped_column(Boolean, default=False)
    is_winner: Mapped[bool] = mapped_column(Boolean, default=False)


class HandAction(Base):
    """Individual action within a hand for full replay."""
    __tablename__ = "hand_actions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hands.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    seat: Mapped[int] = mapped_column(Integer, nullable=False)

    street: Mapped[str] = mapped_column(String(10), nullable=False)
    action_order: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
