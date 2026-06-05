"""Create all tables in the (sqlite) dev DB and seed an admin + house user.

Used for the local visual/e2e pass when a real Postgres isn't reachable.
Run with DATABASE_URL pointing at sqlite, e.g.:
    DATABASE_URL=sqlite+aiosqlite:///./dev.db python tests/dev_bootstrap.py
"""

import asyncio

from backend.db import Base, engine, async_session
# Import every model module so its tables register on Base.metadata.
from backend.models import user as _user            # noqa: F401
from backend.models import ledger as _ledger          # noqa: F401
from backend.models import hand as _hand              # noqa: F401
from backend.models import analytics as _analytics    # noqa: F401
from backend.models.user import User
from sqlalchemy import select


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as s:
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
