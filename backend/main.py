"""pokerin.space — FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .middleware.rate_limit import RateLimitMiddleware
from .middleware.analytics import AnalyticsMiddleware

from .auth.router import router as auth_router
from .api.lobby import router as lobby_router
from .api.wallet import router as wallet_router
from .api.history import router as history_router
from .api.admin import router as admin_router
from .ws.router import router as ws_router, conn_manager
from .poker.table import TableConfig
from .services.bank import BankService
from .services.table_manager import TableManager
from .services.deposit_worker import deposit_poll_loop
from .services.bot_service import BotService
from .config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("pokerin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    log.info("pokerin.space starting up")

    # Security check: refuse to start with default JWT secret
    if settings.jwt_secret == "CHANGE-ME-IN-PRODUCTION":
        raise RuntimeError("JWT_SECRET must be set in .env — refusing to start with default")

    # Bank service + table manager
    bank = BankService()
    table_manager = TableManager(conn_manager, bank)
    app.state.table_manager = table_manager
    app.state.bot_service = BotService(table_manager)

    # Seed default tables
    # All values in ISK-cents (ISK × 100)
    # Micro:  50K/100K blinds,   4M–10M buyin
    # Small:  250K/500K blinds,  20M–50M buyin
    # Medium: 1M/2M blinds,     80M–200M buyin
    # High:   5M/10M blinds,    400M–1B buyin
    # Whale:  25M/50M blinds,   2B–5B buyin
    default_tables = [
        TableConfig(
            id="micro-1", name="Micro Stakes",
            small_blind=5_000_000, big_blind=10_000_000,
            min_buyin=400_000_000, max_buyin=1_000_000_000,
            rake_percent=Decimal("0.05"), rake_cap=0,
        ),
        TableConfig(
            id="small-1", name="Small Stakes",
            small_blind=25_000_000, big_blind=50_000_000,
            min_buyin=2_000_000_000, max_buyin=5_000_000_000,
            rake_percent=Decimal("0.04"), rake_cap=0,
        ),
        TableConfig(
            id="medium-1", name="Medium Stakes",
            small_blind=100_000_000, big_blind=200_000_000,
            min_buyin=8_000_000_000, max_buyin=20_000_000_000,
            rake_percent=Decimal("0.035"), rake_cap=0,
        ),
        TableConfig(
            id="high-1", name="High Stakes",
            small_blind=500_000_000, big_blind=1_000_000_000,
            min_buyin=40_000_000_000, max_buyin=100_000_000_000,
            rake_percent=Decimal("0.03"), rake_cap=0,
        ),
        TableConfig(
            id="whale-1", name="Whale Stakes",
            small_blind=2_500_000_000, big_blind=5_000_000_000,
            min_buyin=200_000_000_000, max_buyin=500_000_000_000,
            rake_percent=Decimal("0.025"), rake_cap=0,
        ),
    ]
    for tc in default_tables:
        table_manager.create_table(tc)

    # Start deposit worker with auto-restart
    async def _deposit_supervisor():
        while True:
            try:
                await deposit_poll_loop()
            except asyncio.CancelledError:
                return
            except Exception as e:
                log.error("Deposit worker crashed, restarting in 30s: %s", e)
                await asyncio.sleep(30)

    deposit_task = asyncio.create_task(_deposit_supervisor(), name="deposit-worker")

    # Create analytics table if it doesn't exist
    from .db import engine
    from .models.analytics import PageView
    async with engine.begin() as conn:
        await conn.run_sync(PageView.__table__.create, checkfirst=True)

    log.info("pokerin.space ready — %d tables active", len(default_tables))

    yield

    # Shutdown
    deposit_task.cancel()
    await table_manager.shutdown_all()
    log.info("pokerin.space shut down")


app = FastAPI(
    title="pokerin.space",
    description="EVE Online ISK Poker",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# CORS — only allow frontend origins
_cors_origins = [settings.base_url]
if settings.debug:
    _cors_origins += ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Analytics — track page views
app.add_middleware(AnalyticsMiddleware)

# Rate limiting on sensitive endpoints
app.add_middleware(RateLimitMiddleware)

# Routes
app.include_router(auth_router)
app.include_router(lobby_router)
app.include_router(wallet_router)
app.include_router(history_router)
app.include_router(ws_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pokerin.space"}


@app.post("/api/ping")
async def ping(request: Request):
    """Tracking pixel — frontend calls this on page load."""
    import hashlib
    from .db import async_session as _async_session
    from .models.analytics import PageView
    try:
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        ip = ip.split(",")[0].strip()
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
        body = await request.json()
        path = str(body.get("path", "/"))[:255]
        async with _async_session() as session:
            session.add(PageView(ip_hash=ip_hash, path=path))
            await session.commit()
    except Exception:
        pass
    return {"ok": True}
