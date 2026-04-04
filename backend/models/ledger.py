"""Financial models — transactions, withdrawals."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class Transaction(Base):
    """Immutable ledger of all balance changes.

    Every ISK movement — deposits, withdrawals, buy-ins, cash-outs, wins,
    losses, rake — gets an entry here. The users.balance column is a cached
    sum, periodically verified against this table.
    """
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # deposit, withdrawal, buyin, cashout, rake, win, loss, refund
    type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Positive = credit, negative = debit
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    balance_after: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Context: hand_id for game transactions, deposit code for deposits, etc.
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ESI journal ref ID for deposit verification (indexed for dedup lookups)
    esi_ref_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # pending, processing, completed, rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
