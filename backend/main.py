"""pokerin.space — FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .middleware.rate_limit import RateLimitMiddleware

from .auth.router import router as auth_router
from .api.lobby import router as lobby_router
from .api.wallet import router as wallet_router
from .api.history import router as history_router
from .api.admin import router as admin_router
from .ws.router import router as ws_router, conn_manager
from .poker.table import TableConfig
from .services.bank import BankService
from .services.table_manager import TableManager
from .services.deposit_worker import DepositHealth, deposit_poll_loop
from .services.bot_service import BotService
from .config import settings, validate_runtime_settings
from .db import async_session

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("pokerin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Validate before constructing managers, starting tasks, or touching the DB.
    # Configuration imports remain usable by Alembic and offline tooling.
    validate_runtime_settings(settings)
    log.info("pokerin.space starting up")

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
    app.state.required_table_ids = frozenset(tc.id for tc in default_tables)

    # Start deposit worker with auto-restart
    deposit_health = DepositHealth(
        configured=bool(settings.bank_character_id and settings.bank_refresh_token)
    )
    app.state.deposit_health = deposit_health

    async def _deposit_supervisor():
        while True:
            try:
                await deposit_poll_loop(deposit_health)
                # A normal return means the worker disabled itself (e.g. the bank
                # character isn't configured). Do NOT hot-loop restarting it —
                # that busy-spins the event loop and floods the logs.
                log.info("Deposit worker exited cleanly; not restarting")
                return
            except asyncio.CancelledError:
                return
            except Exception:
                deposit_health.mark_failure()
                # Never interpolate arbitrary worker exceptions: HTTP/client
                # failures may carry response fragments or credential material.
                log.error("Deposit worker crashed; restarting in 30 seconds")
                await asyncio.sleep(30)

    deposit_task = asyncio.create_task(_deposit_supervisor(), name="deposit-worker")
    app.state.deposit_task = deposit_task

    # Ensure the house account (user_id=0) exists. Rake is recorded as a
    # transaction on this account, and transactions.user_id is FK-constrained to
    # users.id — without this row, Postgres rejects every rake entry and the
    # house ledger silently loses all rake.
    from .models.user import User
    async with async_session() as session:
        if await session.get(User, 0) is None:
            session.add(User(id=0, character_id=0, character_name="HOUSE"))
            await session.commit()
            log.info("Created house account (user_id=0) for rake ledger")

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
async def health(request: Request):
    """Bounded readiness check with non-sensitive component states."""
    components: dict[str, dict[str, object]] = {}
    ready = True

    async def _check_database() -> bool:
        async with async_session() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar_one() == 1

    try:
        database_ready = await asyncio.wait_for(_check_database(), timeout=2.0)
    except Exception:
        database_ready = False
    components["database"] = {
        "status": "ok" if database_ready else "unavailable"
    }
    ready = ready and database_ready

    table_manager = getattr(request.app.state, "table_manager", None)
    required_table_ids = getattr(request.app.state, "required_table_ids", ())
    tables_ready = bool(
        table_manager is not None
        and required_table_ids
        and all(
            table_manager.get_table(table_id) is not None
            for table_id in required_table_ids
        )
    )
    components["tables"] = {
        "status": "ok" if tables_ready else "unavailable"
    }
    ready = ready and tables_ready

    deposit_task = getattr(request.app.state, "deposit_task", None)
    supervisor_running = bool(
        deposit_task is not None and not deposit_task.done()
    )
    deposit_health = getattr(request.app.state, "deposit_health", None)
    if isinstance(deposit_health, DepositHealth):
        deposit_ready, deposit_component = deposit_health.snapshot(
            supervisor_running=supervisor_running
        )
    else:
        deposit_ready = False
        deposit_component = {
            "status": "unavailable",
            "configured": False,
            "supervisor": "stopped",
            "last_success": None,
        }
    components["deposits"] = deposit_component
    ready = ready and deposit_ready

    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ok" if ready else "unavailable",
            "service": "pokerin.space",
            "components": components,
        },
    )
