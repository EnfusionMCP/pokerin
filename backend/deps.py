"""FastAPI dependency injection — current user, DB session."""

from fastapi import Depends, HTTPException, Query, WebSocket, WebSocketException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .auth.jwt import decode_token
from .db import get_session

security = HTTPBearer()


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    """Dependency: async database session."""
    return session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Dependency: decode JWT from Authorization header.

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
    return {
        "user_id": int(payload["sub"]),
        "character_id": payload["cid"],
        "character_name": payload["name"],
    }


async def get_ws_user(websocket: WebSocket, token: str = Query(...)) -> dict:
    """Dependency: decode JWT from WebSocket query parameter.

    WebSocket connections can't use Authorization headers in browser JS,
    so the token is passed as ?token=<jwt> in the connection URL.

    Returns:
        Dict with user_id, character_id, character_name.

    Raises:
        WebSocketException if token is invalid.
    """
    try:
        payload = decode_token(token)
    except Exception:
        # BUG 17 fix: raise WebSocketException, not HTTPException
        raise WebSocketException(code=4001, reason="Invalid or expired token")
    return {
        "user_id": int(payload["sub"]),
        "character_id": payload["cid"],
        "character_name": payload["name"],
    }
