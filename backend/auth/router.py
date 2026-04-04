"""Auth routes — EVE SSO login, callback, token refresh."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import get_current_user
from ..models.user import User
from . import jwt as app_jwt
from .sso import build_auth_url, exchange_code, parse_character_from_jwt

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
    session: AsyncSession = Depends(get_session),
):
    """Handle EVE SSO callback — exchange code, upsert user, issue app JWT."""
    try:
        token_data = await exchange_code(code, state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token", "")

    try:
        character_id, character_name = parse_character_from_jwt(access_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse EVE token: {e}")

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
            refresh_token=refresh_token,
            last_login=datetime.now(timezone.utc),
        )
        session.add(user)
        await session.flush()
        log.info("New user created: %s (char %d)", character_name, character_id)
    else:
        user.character_name = character_name
        user.portrait_url = portrait_url
        user.refresh_token = refresh_token
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
