"""Wallet API — balance, withdrawals, transactions."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models.ledger import Transaction, Withdrawal
from ..models.user import User
from ..schemas.wallet import (
    BalanceResponse,
    TransactionItem,
    WithdrawRequest,
    WithdrawResponse,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["wallet"])


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current balance."""
    db_user = await session.get(User, user["user_id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return BalanceResponse(balance=db_user.balance)


@router.post("/withdraw", response_model=WithdrawResponse)
async def request_withdrawal(
    req: WithdrawRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Request an ISK withdrawal. Processed manually by admin."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    MIN_WITHDRAWAL = 100_000_00  # 100K ISK minimum (in ISK-cents)
    if req.amount < MIN_WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is 100K ISK")

    # Lock user row first, then check pending count — prevents TOCTOU race
    result = await session.execute(
        select(User).where(User.id == user["user_id"]).with_for_update()
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check pending withdrawal count (inside the user lock)
    pending_count = await session.execute(
        select(func.count(Withdrawal.id))
        .where(Withdrawal.user_id == user["user_id"], Withdrawal.status == "pending")
    )
    if (pending_count.scalar() or 0) >= 5:
        raise HTTPException(status_code=400, detail="Too many pending withdrawals (max 5)")

    if db_user.balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    db_user.balance -= req.amount

    tx = Transaction(
        user_id=user["user_id"],
        type="withdrawal",
        amount=-req.amount,
        balance_after=db_user.balance,
        reference_id=None,
    )
    session.add(tx)

    withdrawal = Withdrawal(
        user_id=user["user_id"],
        amount=req.amount,
        status="pending",
    )
    session.add(withdrawal)
    await session.flush()

    tx.reference_id = f"withdrawal:{withdrawal.id}"
    await session.commit()

    log.info("Withdrawal requested: user=%d amount=%d", user["user_id"], req.amount)

    return WithdrawResponse(
        withdrawal_id=withdrawal.id,
        amount=req.amount,
        status="pending",
    )


@router.get("/transactions", response_model=list[TransactionItem])
async def list_transactions(
    limit: int = 50,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List recent transactions for the current user."""
    result = await session.execute(
        select(Transaction)
        .where(Transaction.user_id == user["user_id"])
        .order_by(Transaction.created_at.desc())
        .limit(min(limit, 200))
    )
    txs = result.scalars().all()

    return [
        TransactionItem(
            id=tx.id,
            type=tx.type,
            amount=tx.amount,
            balance_after=tx.balance_after,
            reference_id=tx.reference_id,
            created_at=tx.created_at.isoformat() if tx.created_at else "",
        )
        for tx in txs
    ]
