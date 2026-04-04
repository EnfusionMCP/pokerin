"""EVE SSO OAuth2 PKCE flow — web-based, adapted for FastAPI."""

import base64
import hashlib
import secrets
import time

import httpx

from ..config import settings

SSO_AUTH_URL = f"{settings.eve_sso_base}/v2/oauth/authorize"
SSO_TOKEN_URL = f"{settings.eve_sso_base}/v2/oauth/token"

# In-memory PKCE state store. Keyed by `state` param, value is
# (code_verifier, created_timestamp). Entries expire after 10 minutes.
# In production with multiple workers, move this to Redis.
_pending_logins: dict[str, tuple[str, float]] = {}
_LOGIN_EXPIRY = 600  # 10 minutes
_MAX_PENDING = 5000  # cap to prevent DoS (rate limiter covers /auth/ at 20/min)


def _cleanup_expired() -> None:
    """Remove expired PKCE state entries (BUG 15 fix)."""
    now = time.monotonic()
    expired = [k for k, (_, ts) in _pending_logins.items() if now - ts > _LOGIN_EXPIRY]
    for k in expired:
        del _pending_logins[k]
    # Hard cap: if still too many, drop oldest
    if len(_pending_logins) > _MAX_PENDING:
        sorted_keys = sorted(_pending_logins, key=lambda k: _pending_logins[k][1])
        for k in sorted_keys[:len(_pending_logins) - _MAX_PENDING]:
            del _pending_logins[k]


def generate_pkce() -> tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge."""
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


def build_auth_url() -> tuple[str, str]:
    """Build the EVE SSO authorization URL.

    Returns:
        (auth_url, state) — redirect the user to auth_url,
        store state to verify on callback.
    """
    verifier, challenge = generate_pkce()
    state = secrets.token_urlsafe(32)

    _cleanup_expired()
    _pending_logins[state] = (verifier, time.monotonic())

    params = {
        "response_type": "code",
        "redirect_uri": settings.eve_callback_url,
        "client_id": settings.eve_client_id,
        "scope": settings.eve_scopes,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    from urllib.parse import urlencode
    url = f"{SSO_AUTH_URL}?{urlencode(params)}"
    return url, state


async def exchange_code(code: str, state: str) -> dict:
    """Exchange authorization code for tokens.

    Args:
        code: The authorization code from the callback.
        state: The state parameter to look up the PKCE verifier.

    Returns:
        Token response dict with access_token, refresh_token, expires_in.

    Raises:
        ValueError: If state is unknown or token exchange fails.
    """
    entry = _pending_logins.pop(state, None)
    if not entry:
        raise ValueError("Unknown or expired login state")
    verifier, created_at = entry
    if time.monotonic() - created_at > _LOGIN_EXPIRY:
        raise ValueError("Login state expired")

    async with httpx.AsyncClient() as client:
        resp = await client.post(SSO_TOKEN_URL, data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.eve_client_id,
            "redirect_uri": settings.eve_callback_url,
            "code_verifier": verifier,
        }, headers={
            "Content-Type": "application/x-www-form-urlencoded",
        })

    if resp.status_code != 200:
        raise ValueError(f"Token exchange failed ({resp.status_code}): {resp.text}")

    return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Use a refresh token to get a new access token.

    Returns:
        Token response dict with new access_token, refresh_token, expires_in.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(SSO_TOKEN_URL, data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.eve_client_id,
        }, headers={
            "Content-Type": "application/x-www-form-urlencoded",
        })

    if resp.status_code != 200:
        raise ValueError(f"Token refresh failed ({resp.status_code}): {resp.text}")

    return resp.json()


def parse_character_from_jwt(access_token: str) -> tuple[int, str]:
    """Extract character_id and character_name from the EVE SSO JWT.

    The JWT payload contains:
        sub: "CHARACTER:EVE:<character_id>"
        name: "<character_name>"

    We don't verify the signature here because we just received the token
    directly from CCP's token endpoint over HTTPS — it's trustworthy.
    """
    import json

    parts = access_token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")

    payload_b64 = parts[1]
    # Add padding
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))

    sub = payload.get("sub", "")
    name = payload.get("name", "")

    # sub format: "CHARACTER:EVE:1234567890"
    if not sub.startswith("CHARACTER:EVE:"):
        raise ValueError(f"Unexpected sub format: {sub}")

    character_id = int(sub.split(":")[-1])
    return character_id, name
