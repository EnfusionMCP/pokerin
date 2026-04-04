"""Wallet API — balance, deposits, withdrawals."""

import logging
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models.ledger import Transaction, Withdrawal
from ..models.user import DepositCode, User
from ..schemas.wallet import (
    BalanceResponse,
    TransactionItem,
    WithdrawRequest,
    WithdrawResponse,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["wallet"])


def _generate_deposit_code() -> str:
    """Generate a unique deposit code like PKR-A7X9F2."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(6))
    return f"PKR-{suffix}"


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current balance and active deposit code."""
    db_user = await session.get(User, user["user_id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find or create a deposit code
    result = await session.execute(
        select(DepositCode)
        .where(DepositCode.user_id == user["user_id"], DepositCode.used_at.is_(None))
        .order_by(DepositCode.created_at.desc())
        .limit(1)
    )
    deposit_code = result.scalar_one_or_none()

    if deposit_code is None:
        code_str = _generate_deposit_code()
        deposit_code = DepositCode(user_id=user["user_id"], code=code_str)
        session.add(deposit_code)
        await session.commit()
    else:
        code_str = deposit_code.code

    return BalanceResponse(balance=db_user.balance, deposit_code=code_str)


@router.post("/withdraw", response_model=WithdrawResponse)
async def request_withdrawal(
    req: WithdrawRequest,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Request an ISK withdrawal. Processed manually by admin."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # BUG 5 fix: SELECT FOR UPDATE to prevent concurrent overdraw
    result = await session.execute(
        select(User).where(User.id == user["user_id"]).with_for_update()
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Debit balance immediately (row is locked)
    db_user.balance -= req.amount

    # Record transaction
    tx = Transaction(
        user_id=user["user_id"],
        type="withdrawal",
        amount=-req.amount,
        balance_after=db_user.balance,
        reference_id=None,
    )
    session.add(tx)

    # Create withdrawal request
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
