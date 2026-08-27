"""Deposit detection worker — polls the bank character's ESI wallet journal.

Runs as a background asyncio task. Matches incoming ISK transfers by
sender character_id to registered users. No deposit codes needed.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from ..config import settings
from ..db import async_session
from ..models.ledger import Transaction
from ..models.user import User

log = logging.getLogger(__name__)

ESI_BASE = "https://esi.evetech.net/latest"
POLL_INTERVAL = 60  # seconds
DEPOSIT_INITIAL_GRACE_SECONDS = POLL_INTERVAL * 5
DEPOSIT_STALE_AFTER_SECONDS = POLL_INTERVAL * 5


class DepositUpstreamError(RuntimeError):
    """A stable error that never carries an upstream body or credential."""


@dataclass
class DepositHealth:
    """In-process readiness state for the deposit poller.

    A short grace/staleness window keeps a transient ESI outage from blocking
    the application immediately, while a poller that never succeeds (or stops
    succeeding) eventually makes readiness fail closed.
    """

    configured: bool
    started_monotonic: float = field(default_factory=time.monotonic)
    last_success_monotonic: float | None = None
    last_success_at: datetime | None = None
    consecutive_failures: int = 0

    def mark_success(self) -> None:
        self.last_success_monotonic = time.monotonic()
        self.last_success_at = datetime.now(timezone.utc)
        self.consecutive_failures = 0

    def mark_failure(self) -> None:
        self.consecutive_failures += 1

    def snapshot(
        self,
        *,
        supervisor_running: bool,
        now_monotonic: float | None = None,
    ) -> tuple[bool, dict[str, object]]:
        now = time.monotonic() if now_monotonic is None else now_monotonic
        component: dict[str, object] = {
            "configured": self.configured,
            "supervisor": "running" if supervisor_running else "stopped",
            "last_success": (
                self.last_success_at.isoformat()
                if self.last_success_at is not None
                else None
            ),
        }
        if not self.configured:
            component["status"] = "disabled"
            return False, component
        if not supervisor_running:
            component["status"] = "stopped"
            return False, component

        if self.last_success_monotonic is None:
            within_grace = (
                now - self.started_monotonic <= DEPOSIT_INITIAL_GRACE_SECONDS
            )
            if within_grace:
                component["status"] = (
                    "starting" if self.consecutive_failures == 0 else "degraded"
                )
            else:
                component["status"] = "failing"
            return within_grace, component

        last_success_age = now - self.last_success_monotonic
        if last_success_age > DEPOSIT_STALE_AFTER_SECONDS:
            component["status"] = "stale"
            return False, component
        component["status"] = (
            "ok" if self.consecutive_failures == 0 else "degraded"
        )
        return True, component


async def _refresh_bank_token() -> str:
    """Refresh the bank character's ESI access token."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.eve_sso_base}/v2/oauth/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": settings.bank_refresh_token,
                    "client_id": settings.bank_client_id or settings.eve_client_id,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except Exception:
        log.warning("Bank token refresh request failed")
        raise DepositUpstreamError("Bank token refresh failed") from None

    if response.status_code != 200:
        log.warning("Bank token refresh returned HTTP %d", response.status_code)
        raise DepositUpstreamError("Bank token refresh failed")
    try:
        payload = response.json()
    except Exception:
        log.warning("Bank token refresh returned an invalid response")
        raise DepositUpstreamError("Bank token refresh failed") from None
    if not isinstance(payload, dict):
        log.warning("Bank token refresh returned a non-object response")
        raise DepositUpstreamError("Bank token refresh failed")
    access_token = payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        log.warning("Bank token refresh response omitted its access token")
        raise DepositUpstreamError("Bank token refresh failed")
    return access_token


async def _fetch_wallet_journal(access_token: str, since_ref_id: int = 0) -> list[dict]:
    """Fetch wallet journal pages from ESI, stopping when we reach already-seen entries."""
    all_entries: list[dict] = []
    page = 1
    try:
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{ESI_BASE}/characters/{settings.bank_character_id}/wallet/journal/",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"page": page},
                )
                if response.status_code in (401, 403):
                    raise DepositUpstreamError("ESI wallet authorization failed")
                if response.status_code != 200:
                    log.warning(
                        "ESI wallet journal page %d returned HTTP %d",
                        page,
                        response.status_code,
                    )
                    # Never return entries from earlier pages after a later
                    # page fails. Advancing the cursor from a partial result
                    # would permanently skip deposits on the failed page.
                    raise DepositUpstreamError("ESI wallet journal request failed")
                entries = response.json()
                if not isinstance(entries, list):
                    raise DepositUpstreamError("ESI wallet journal response was invalid")
                raw_total_pages = response.headers.get("x-pages")
                if raw_total_pages is None:
                    raise DepositUpstreamError(
                        "ESI wallet journal pagination was missing"
                    )
                total_pages = int(raw_total_pages)
                if total_pages < page:
                    raise DepositUpstreamError(
                        "ESI wallet journal pagination was invalid"
                    )
                if not entries:
                    if page == 1 and total_pages == 1:
                        break
                    raise DepositUpstreamError(
                        "ESI wallet journal returned an incomplete page"
                    )
                entry_ids: list[int] = []
                for entry in entries:
                    if not isinstance(entry, dict):
                        raise DepositUpstreamError(
                            "ESI wallet journal entry was invalid"
                        )
                    entry_id = entry.get("id")
                    if type(entry_id) is not int or entry_id <= 0:
                        raise DepositUpstreamError(
                            "ESI wallet journal entry identifier was invalid"
                        )
                    entry_ids.append(entry_id)
                all_entries.extend(entries)
                # If the oldest entry on this page is already processed, no need for more pages
                oldest_on_page = min(entry_ids)
                if oldest_on_page <= since_ref_id:
                    break
                if page >= total_pages:
                    break
                page += 1
    except DepositUpstreamError:
        raise
    except Exception:
        log.warning("ESI wallet journal request or response failed")
        raise DepositUpstreamError("ESI wallet journal request failed") from None
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


async def deposit_poll_loop(health: DepositHealth | None = None) -> None:
    """Main loop: poll ESI wallet journal and process deposits."""
    configured = bool(settings.bank_character_id and settings.bank_refresh_token)
    if health is None:
        health = DepositHealth(configured=configured)
    if not configured:
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

            health.mark_success()

        except DepositUpstreamError:
            health.mark_failure()
            log.error("Deposit poll upstream operation failed; retrying")
            access_token = ""
        except Exception:
            health.mark_failure()
            # SQL/client exceptions can include parameters, response fragments,
            # or authorization data. Never interpolate arbitrary exception text.
            log.error("Deposit poll failed with an internal error; retrying")
            access_token = ""

        await asyncio.sleep(POLL_INTERVAL)
