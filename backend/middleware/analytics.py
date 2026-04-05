"""Lightweight page view tracker — logs unique visitors by hashed IP."""

import hashlib
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from ..db import async_session
from ..models.analytics import PageView

log = logging.getLogger(__name__)

# Only track these paths (don't log every API call)
_TRACK_PREFIXES = ("/auth/callback",)
# Track the initial page load — the SPA entry point comes through as any non-API path
_SKIP_PREFIXES = ("/api/", "/ws/", "/health", "/auth/login")


class AnalyticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        path = request.url.path

        # Track auth callbacks (someone completing login) and page loads
        is_callback = path.startswith("/auth/callback")
        is_page = not any(path.startswith(p) for p in _SKIP_PREFIXES)

        if is_callback or is_page:
            try:
                ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
                ip = ip.split(",")[0].strip()
                ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]

                async with async_session() as session:
                    session.add(PageView(ip_hash=ip_hash, path=path))
                    await session.commit()
            except Exception as e:
                log.debug("Analytics write failed: %s", e)

        return response
