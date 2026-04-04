"""Withdrawal worker — placeholder for manual payout processing.

For now, withdrawals are manual: admin reviews the queue and sends
ISK in-game, then marks them as completed. This module provides
the query helpers for an admin endpoint.

ESI doesn't support sending ISK programmatically, so automation
would require in-game client interaction (out of scope for v1).
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.ledger import Withdrawal

log = logging.getLogger(__name__)


async def get_pending_withdrawals(session: AsyncSession) -> list[Withdrawal]:
    """Get all pending withdrawal requests."""
    result = await session.execute(
        select(Withdrawal)
        .where(Withdrawal.status == "pending")
        .order_by(Withdrawal.created_at.asc())
    )
    return list(result.scalars().all())


async def complete_withdrawal(
    session: AsyncSession, withdrawal_id: int, admin_notes: str = ""
) -> None:
    """Mark a withdrawal as completed (admin has sent the ISK)."""
    withdrawal = await session.get(Withdrawal, withdrawal_id)
    if withdrawal is None:
        raise ValueError(f"Withdrawal {withdrawal_id} not found")
    if withdrawal.status != "pending":
        raise ValueError(f"Withdrawal {withdrawal_id} is already {withdrawal.status}")

    withdrawal.status = "completed"
    withdrawal.processed_at = datetime.now(timezone.utc)
    withdrawal.admin_notes = admin_notes
    await session.commit()

    log.info("Withdrawal %d completed (amount=%d)", withdrawal_id, withdrawal.amount)


async def reject_withdrawal(
    session: AsyncSession, withdrawal_id: int, reason: str = ""
) -> None:
    """Reject a withdrawal and refund the balance."""
    from ..models.user import User
    from ..models.ledger import Transaction

    withdrawal = await session.get(Withdrawal, withdrawal_id)
    if withdrawal is None:
        raise ValueError(f"Withdrawal {withdrawal_id} not found")
    if withdrawal.status != "pending":
        raise ValueError(f"Withdrawal {withdrawal_id} is already {withdrawal.status}")

    # Refund the user (BUG E fix: lock row to prevent balance race)
    from sqlalchemy import select
    result = await session.execute(
        select(User).where(User.id == withdrawal.user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if user:
        user.balance += withdrawal.amount
        tx = Transaction(
            user_id=user.id,
            type="refund",
            amount=withdrawal.amount,
            balance_after=user.balance,
            reference_id=f"withdrawal:{withdrawal_id}:rejected",
        )
        session.add(tx)

    withdrawal.status = "rejected"
    withdrawal.processed_at = datetime.now(timezone.utc)
    withdrawal.admin_notes = reason
    await session.commit()

    log.info("Withdrawal %d rejected (amount=%d, reason=%s)",
             withdrawal_id, withdrawal.amount, reason)
