"""Wallet-related Pydantic schemas."""

from pydantic import BaseModel


class BalanceResponse(BaseModel):
    balance: int  # ISK-cents
    deposit_code: str


class WithdrawRequest(BaseModel):
    amount: int  # ISK-cents, must be positive


class WithdrawResponse(BaseModel):
    withdrawal_id: int
    amount: int
    status: str


class TransactionItem(BaseModel):
    id: int
    type: str
    amount: int
    balance_after: int
    reference_id: str | None
    created_at: str
