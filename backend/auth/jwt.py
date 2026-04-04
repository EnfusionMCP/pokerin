"""App-level JWT tokens for session management."""

from datetime import datetime, timedelta, timezone

import jwt

from ..config import settings


def create_token(user_id: int, character_id: int, character_name: str) -> str:
    """Issue a JWT for an authenticated user.

    Args:
        user_id: Internal database user ID.
        character_id: EVE character ID.
        character_name: EVE character name.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "cid": character_id,
        "name": character_name,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expire_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and verify an app JWT.

    Returns:
        Decoded payload dict with sub, cid, name, iat, exp.

    Raises:
        jwt.ExpiredSignatureError: Token has expired.
        jwt.InvalidTokenError: Token is malformed or signature invalid.
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
