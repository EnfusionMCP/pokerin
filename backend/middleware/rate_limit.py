"""Simple in-memory rate limiter middleware.

Limits requests per IP on sensitive paths (auth, admin, withdraw).
Uses a sliding window counter per IP+path-prefix combo.
"""

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# (path_prefix, max_requests, window_seconds)
RATE_LIMITS = [
    ("/auth/", 20, 60),        # 20 auth requests per minute
    ("/api/admin/", 60, 60),   # 60 admin requests per minute
    ("/api/withdraw", 5, 60),  # 5 withdrawal requests per minute
    ("/api/verify", 10, 60),   # F3 fix: unauth CPU-heavy deck reproduction
]

# IP -> path_prefix -> list of timestamps
_hits: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

# Cleanup stale entries every N requests
_req_count = 0
_CLEANUP_INTERVAL = 500


def _get_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For. Use the LAST value since
    Caddy appends the real IP — earlier values are client-controlled."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _cleanup(now: float) -> None:
    """Remove entries older than 5 minutes to prevent memory growth."""
    cutoff = now - 300
    stale_ips = []
    for ip, paths in _hits.items():
        stale_paths = []
        for prefix, timestamps in paths.items():
            paths[prefix] = [t for t in timestamps if t > cutoff]
            if not paths[prefix]:
                stale_paths.append(prefix)
        for p in stale_paths:
            del paths[p]
        if not paths:
            stale_ips.append(ip)
    for ip in stale_ips:
        del _hits[ip]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        global _req_count
        path = request.url.path
        now = time.time()

        # Periodic cleanup
        _req_count += 1
        if _req_count >= _CLEANUP_INTERVAL:
            _req_count = 0
            _cleanup(now)

        for prefix, max_reqs, window in RATE_LIMITS:
            if not path.startswith(prefix):
                continue

            ip = _get_client_ip(request)
            bucket = _hits[ip][prefix]

            # Trim expired
            cutoff = now - window
            bucket[:] = [t for t in bucket if t > cutoff]

            if len(bucket) >= max_reqs:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                    headers={"Retry-After": str(window)},
                )

            bucket.append(now)
            break  # only apply first matching rule

        return await call_next(request)
