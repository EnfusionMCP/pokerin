"""FastAPI dependency injection — current user, DB session."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .auth.jwt import decode_token
from .db import get_session
from .models.user import User

security = HTTPBearer()


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    """Dependency: async database session."""
    return session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Dependency: decode JWT from Authorization header + ban check.

    Returns:
        Dict with user_id (int), character_id (int), character_name (str).
    """
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = int(payload["sub"])

    # Ban check
    from sqlalchemy import select
    result = await session.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    if db_user and db_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account banned: {db_user.ban_reason or 'Contact admin'}",
        )

    return {
        "user_id": user_id,
        "character_id": payload["cid"],
        "character_name": payload["name"],
    }


async def get_admin_user(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Dependency: require admin privileges."""
    from sqlalchemy import select
    result = await session.execute(
        select(User).where(User.id == user["user_id"])
    )
    db_user = result.scalar_one_or_none()
    if not db_user or not db_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )
    return user
