"""Public requests must not create unauthenticated analytics writes."""

import httpx

from backend import main
from backend.middleware.analytics import AnalyticsMiddleware


async def test_public_routes_have_no_page_view_write_middleware() -> None:
    assert "/api/ping" not in {
        route.path for route in main.app.routes if hasattr(route, "path")
    }
    assert all(
        middleware.cls is not AnalyticsMiddleware
        for middleware in main.app.user_middleware
    )

    # Exercise an arbitrary public SPA-like path through the actual ASGI stack.
    # With analytics detached, it is a plain 404 and has no DB-write side effect.
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get("/arbitrary-public-spa-path")

    assert response.status_code == 404
