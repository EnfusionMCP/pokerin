"""pokerin.space — FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth.router import router as auth_router
from .api.lobby import router as lobby_router
from .api.wallet import router as wallet_router
from .api.history import router as history_router
from .ws.router import router as ws_router, conn_manager
from .poker.table import TableConfig
from .services.bank import BankService
from .services.table_manager import TableManager
from .services.deposit_worker import deposit_poll_loop
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

    # Bank service + table manager
    bank = BankService()
    table_manager = TableManager(conn_manager, bank)
    app.state.table_manager = table_manager

    # Seed default tables
    default_tables = [
        TableConfig(
            id="micro-1", name="Micro Stakes", small_blind=5000, big_blind=10000,
            min_buyin=200000, max_buyin=1000000,
            rake_percent=Decimal("0.05"), rake_cap=50000,
        ),
        TableConfig(
            id="small-1", name="Small Stakes", small_blind=50000, big_blind=100000,
            min_buyin=2000000, max_buyin=10000000,
            rake_percent=Decimal("0.04"), rake_cap=500000,
        ),
        TableConfig(
            id="medium-1", name="Medium Stakes", small_blind=500000, big_blind=1000000,
            min_buyin=20000000, max_buyin=100000000,
            rake_percent=Decimal("0.03"), rake_cap=5000000,
        ),
    ]
    for tc in default_tables:
        table_manager.create_table(tc)

    # Start deposit worker
    deposit_task = asyncio.create_task(deposit_poll_loop(), name="deposit-worker")

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
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", settings.base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(lobby_router)
app.include_router(wallet_router)
app.include_router(history_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pokerin.space"}
