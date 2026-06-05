"""Async SQLAlchemy engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

# SQLite (used for local dev / tests) uses a pool that doesn't accept the
# size/overflow knobs Postgres does, so configure the engine accordingly.
if settings.database_url.startswith("sqlite"):
    engine = create_async_engine(settings.database_url, echo=settings.debug)
else:
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,  # recycle connections every 30 min to avoid stale connections
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    """Dependency: yields an async DB session, auto-closes on exit."""
    async with async_session() as session:
        yield session
