"""Deposit detection worker — polls the bank character's ESI wallet journal.

Runs as a background asyncio task. Matches incoming ISK transfers to
deposit codes, credits player balances.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import async_session
from ..models.ledger import Transaction
from ..models.user import DepositCode, User

log = logging.getLogger(__name__)

ESI_BASE = "https://esi.evetech.net/latest"
POLL_INTERVAL = 60  # seconds


async def _refresh_bank_token() -> str:
    """Refresh the bank character's ESI access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.eve_sso_base}/v2/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": settings.bank_refresh_token,
                "client_id": settings.eve_client_id,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Bank token refresh failed: {resp.status_code} {resp.text}")
    data = resp.json()
    return data["access_token"]


async def _fetch_wallet_journal(access_token: str) -> list[dict]:
    """Fetch the bank character's wallet journal from ESI."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ESI_BASE}/characters/{settings.bank_character_id}/wallet/journal/",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"page": 1},
        )
    if resp.status_code == 304:
        return []  # no changes since last poll
    if resp.status_code in (401, 403):
        # Token expired or revoked — raise so outer loop clears it
        raise RuntimeError(f"ESI auth failed: {resp.status_code}")
    if resp.status_code != 200:
        log.warning("ESI wallet journal returned %d: %s", resp.status_code, resp.text[:200])
        return []
    return resp.json()


async def _process_deposit(
    session: AsyncSession,
    sender_id: int,
    deposit_code: str,
    amount: float,
    esi_ref_id: int,
) -> None:
    """Match a deposit to a user and credit their balance."""
    # ISK amount from ESI is a float — convert to our integer format (ISK x 100)
    # BUG 13 fix: round before truncating to avoid IEEE 754 precision loss
    amount_cents = int(round(amount * 100))

    if amount_cents <= 0:
        return

    # Look up the deposit code
    result = await session.execute(
        select(DepositCode)
        .where(DepositCode.code == deposit_code, DepositCode.used_at.is_(None))
    )
    code_record = result.scalar_one_or_none()

    if code_record is None:
        log.warning("Unknown deposit code '%s' from sender %d (%.2f ISK)",
                    deposit_code, sender_id, amount)
        return

    # BUG 5 fix: lock the user row to prevent concurrent balance race
    result2 = await session.execute(
        select(User).where(User.id == code_record.user_id).with_for_update()
    )
    user = result2.scalar_one_or_none()
    if user is None:
        log.error("Deposit code %s belongs to missing user %d", deposit_code, code_record.user_id)
        return

    # Credit the balance (row is locked)
    user.balance += amount_cents

    # Record the transaction
    tx = Transaction(
        user_id=user.id,
        type="deposit",
        amount=amount_cents,
        balance_after=user.balance,
        reference_id=deposit_code,
        esi_ref_id=esi_ref_id,
    )
    session.add(tx)

    # Mark the code as used
    code_record.used_at = datetime.now(timezone.utc)

    await session.commit()
    log.info("Deposit credited: user=%d (%s) amount=%.2f ISK code=%s",
             user.id, user.character_name, amount, deposit_code)


async def deposit_poll_loop() -> None:
    """Main loop: poll ESI wallet journal and process deposits."""
    if not settings.bank_character_id or not settings.bank_refresh_token:
        log.warning("Bank character not configured — deposit worker disabled")
        return

    log.info("Deposit worker started (polling every %ds)", POLL_INTERVAL)
    last_ref_id = 0
    access_token = ""
    token_obtained_at = 0.0
    TOKEN_LIFETIME = 1100  # refresh before 1199s expiry

    while True:
        try:
            # BUG 12 fix: proactively refresh token before expiry
            now = time.monotonic()
            if not access_token or (now - token_obtained_at) >= TOKEN_LIFETIME:
                access_token = await _refresh_bank_token()
                token_obtained_at = now

            journal = await _fetch_wallet_journal(access_token)

            for entry in sorted(journal, key=lambda e: e.get("id", 0)):
                ref_id = entry.get("id", 0)
                if ref_id <= last_ref_id:
                    continue

                # Only process player donations
                if entry.get("ref_type") != "player_donation":
                    last_ref_id = max(last_ref_id, ref_id)
                    continue

                reason = (entry.get("reason") or "").strip().upper()
                amount = entry.get("amount", 0)
                sender_id = entry.get("first_party_id", 0)

                if amount > 0 and reason.startswith("PKR-"):
                    async with async_session() as session:
                        # Check we haven't already processed this ref
                        existing = await session.execute(
                            select(Transaction)
                            .where(Transaction.esi_ref_id == ref_id)
                            .limit(1)
                        )
                        if existing.scalar_one_or_none() is None:
                            await _process_deposit(session, sender_id, reason, amount, ref_id)

                last_ref_id = max(last_ref_id, ref_id)

        except Exception as e:
            log.error("Deposit poll error: %s", e)
            access_token = ""  # force token refresh on next iteration

        await asyncio.sleep(POLL_INTERVAL)
