"""Auth routes — EVE SSO login, callback, token refresh."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import get_current_user
from ..models.ledger import Transaction
from ..models.user import User
from . import jwt as app_jwt
from .sso import SSOFlowError, build_auth_url, exchange_code, parse_character_from_jwt

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login():
    """Redirect user to EVE SSO login page."""
    auth_url, state = build_auth_url()
    return RedirectResponse(auth_url)


@router.get("/callback")
async def callback(
    code: str,
    state: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Handle EVE SSO callback — exchange code, upsert user, issue app JWT."""
    try:
        token_data = await exchange_code(code, state)
    except SSOFlowError:
        raise HTTPException(
            status_code=400,
            detail="EVE SSO login could not be completed",
        ) from None

    access_token = token_data["access_token"]
    try:
        character_id, character_name = parse_character_from_jwt(access_token)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="EVE SSO returned an invalid identity token",
        ) from None

    portrait_url = f"https://images.evetech.net/characters/{character_id}/portrait?size=128"

    # Upsert user
    result = await session.execute(
        select(User).where(User.character_id == character_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            character_id=character_id,
            character_name=character_name,
            portrait_url=portrait_url,
            last_login=datetime.now(timezone.utc),
        )
        session.add(user)
        await session.flush()
        log.info("New user created: %s (char %d)", character_name, character_id)

        # Signup bonus — first 50 real players get 50M ISK (one per IP)
        BONUS_LIMIT = 50
        BONUS_ISK_CENTS = 5_000_000_000  # 50M ISK × 100

        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
        )

        # How many bonuses have been given out?
        bonus_count_result = await session.execute(
            select(func.count()).select_from(Transaction).where(
                Transaction.type == "admin_credit",
                Transaction.reference_id.like("signup_bonus_%"),
            )
        )
        bonuses_given = bonus_count_result.scalar()

        # Has this IP already claimed one?
        ip_dupe_result = await session.execute(
            select(Transaction.id).where(
                Transaction.type == "admin_credit",
                Transaction.reference_id == f"signup_bonus::{client_ip}",
            ).limit(1)
        )
        ip_already_claimed = ip_dupe_result.scalar_one_or_none() is not None

        if bonuses_given < BONUS_LIMIT and not ip_already_claimed:
            user.balance = BONUS_ISK_CENTS
            session.add(Transaction(
                user_id=user.id,
                type="admin_credit",
                amount=BONUS_ISK_CENTS,
                balance_after=BONUS_ISK_CENTS,
                reference_id=f"signup_bonus::{client_ip}",
            ))
            log.info(
                "Signup bonus: 50M ISK credited to %s (bonus #%d of %d, ip=%s)",
                character_name, bonuses_given + 1, BONUS_LIMIT, client_ip,
            )
        elif ip_already_claimed:
            log.info(
                "Signup bonus skipped for %s — IP %s already claimed",
                character_name, client_ip,
            )
    else:
        user.character_name = character_name
        user.portrait_url = portrait_url
        user.last_login = datetime.now(timezone.utc)
        log.info("User logged in: %s (char %d)", character_name, character_id)

    await session.commit()

    # Ban check
    if user.is_banned:
        raise HTTPException(status_code=403, detail=f"Account banned: {user.ban_reason or 'Contact admin'}")

    # Issue app JWT
    token = app_jwt.create_token(user.id, character_id, character_name, is_admin=user.is_admin)

    # Redirect to frontend with token
    frontend_url = f"{settings.base_url}/#/lobby?token={token}"
    return RedirectResponse(frontend_url)


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return current user info from JWT. Mainly for debugging."""
    return user
