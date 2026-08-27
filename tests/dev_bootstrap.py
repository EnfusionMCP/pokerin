"""Create all tables in the (sqlite) dev DB and seed an admin + house user.

Used for the local visual/e2e pass when a real Postgres isn't reachable.
It requires the disposable-database environment documented in tests/README.md.
"""

import asyncio

from tests.db_safety import (
    configure_disposable_sqlite_test_database,
    verify_configured_test_engine,
    verify_connected_test_database,
)

_TEST_DATABASE_URL = configure_disposable_sqlite_test_database()

from backend.db import Base, engine, async_session
# Import every model module so its tables register on Base.metadata.
from backend.models import user as _user            # noqa: F401
from backend.models import ledger as _ledger          # noqa: F401
from backend.models import hand as _hand              # noqa: F401
from backend.models import analytics as _analytics    # noqa: F401
from backend.models.user import User
from sqlalchemy import select

verify_configured_test_engine(engine, _TEST_DATABASE_URL)


async def main():
    async with engine.begin() as conn:
        await verify_connected_test_database(conn, _TEST_DATABASE_URL)
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as s:
        await verify_connected_test_database(s, _TEST_DATABASE_URL)
        if await s.get(User, 0) is None:
            s.add(User(id=0, character_id=0, character_name="HOUSE", balance=0))
        existing = (await s.execute(select(User).where(User.id == 1))).scalar_one_or_none()
        if existing is None:
            s.add(User(id=1, character_id=2116875456, character_name="Darothius Inkunen",
                       balance=5_000_000_000_000, is_admin=True))
        await s.commit()
    print("dev DB bootstrapped: all tables created, house(0) + admin(1) seeded")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
