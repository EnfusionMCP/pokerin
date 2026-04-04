"""Deposit detection worker — polls the bank character's ESI wallet journal.

Runs as a background asyncio task. Matches incoming ISK transfers by
sender character_id to registered users. No deposit codes needed.
"""

import asyncio
import logging
import time

import httpx
from sqlalchemy import select

from ..config import settings
from ..db import async_session
from ..models.ledger import Transaction
from ..models.user import User

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
                "client_id": settings.bank_client_id or settings.eve_client_id,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Bank token refresh failed: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]


async def _fetch_wallet_journal(access_token: str, since_ref_id: int = 0) -> list[dict]:
    """Fetch wallet journal pages from ESI, stopping when we reach already-seen entries."""
    all_entries: list[dict] = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                f"{ESI_BASE}/characters/{settings.bank_character_id}/wallet/journal/",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"page": page},
            )
            if resp.status_code == 304:
                break
            if resp.status_code in (401, 403):
                raise RuntimeError(f"ESI auth failed: {resp.status_code}")
            if resp.status_code != 200:
                log.warning("ESI wallet journal page %d returned %d", page, resp.status_code)
                break
            entries = resp.json()
            if not entries:
                break
            all_entries.extend(entries)
            # If the oldest entry on this page is already processed, no need for more pages
            oldest_on_page = min(e.get("id", 0) for e in entries)
            if oldest_on_page <= since_ref_id:
                break
            total_pages = int(resp.headers.get("x-pages", "1"))
            if page >= total_pages:
                break
            page += 1
    return all_entries


async def _process_deposit(sender_char_id: int, amount: float, esi_ref_id: int) -> None:
    """Match a deposit by sender character_id and credit their balance."""
    amount_cents = int(round(amount * 100))
    if amount_cents <= 0:
        return

    async with async_session() as session:
        # Check we haven't already processed this ref
        existing = await session.execute(
            select(Transaction).where(Transaction.esi_ref_id == esi_ref_id).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            return

        # Find user by character_id
        result = await session.execute(
            select(User).where(User.character_id == sender_char_id).with_for_update()
        )
        user = result.scalar_one_or_none()

        if user is None:
            log.warning("Deposit from unregistered character %d (%.2f ISK) — ignored",
                        sender_char_id, amount)
            return

        # Credit the balance
        user.balance += amount_cents

        tx = Transaction(
            user_id=user.id,
            type="deposit",
            amount=amount_cents,
            balance_after=user.balance,
            reference_id=f"char:{sender_char_id}",
            esi_ref_id=esi_ref_id,
        )
        session.add(tx)
        await session.commit()

        log.info("Deposit credited: user=%d (%s) amount=%.2f ISK",
                 user.id, user.character_name, amount)


async def deposit_poll_loop() -> None:
    """Main loop: poll ESI wallet journal and process deposits."""
    if not settings.bank_character_id or not settings.bank_refresh_token:
        log.warning("Bank character not configured — deposit worker disabled")
        return

    log.info("Deposit worker started (polling every %ds)", POLL_INTERVAL)

    # Recover last_ref_id from DB so we don't miss deposits across restarts
    async with async_session() as session:
        from sqlalchemy import func as sqlfunc
        result = await session.execute(
            select(sqlfunc.max(Transaction.esi_ref_id))
        )
        last_ref_id = result.scalar() or 0
        log.info("Deposit worker resumed from esi_ref_id=%d", last_ref_id)
    access_token = ""
    token_obtained_at = 0.0
    TOKEN_LIFETIME = 1100

    while True:
        try:
            now = time.monotonic()
            if not access_token or (now - token_obtained_at) >= TOKEN_LIFETIME:
                access_token = await _refresh_bank_token()
                token_obtained_at = now

            journal = await _fetch_wallet_journal(access_token, since_ref_id=last_ref_id)

            for entry in sorted(journal, key=lambda e: e.get("id", 0)):
                ref_id = entry.get("id", 0)
                if ref_id <= last_ref_id:
                    continue

                # Only process player donations (ISK sent to us)
                if entry.get("ref_type") == "player_donation" and entry.get("amount", 0) > 0:
                    sender_id = entry.get("first_party_id", 0)
                    amount = entry["amount"]
                    await _process_deposit(sender_id, amount, ref_id)

                last_ref_id = max(last_ref_id, ref_id)

        except Exception as e:
            log.error("Deposit poll error: %s", e)
            access_token = ""

        await asyncio.sleep(POLL_INTERVAL)
