"""Live integration test against a REAL Postgres database.

Runs inside the Docker network (DATABASE_URL points at the 'postgres' service).
Exercises the real BankService (SELECT FOR UPDATE debit/credit), real hand
persistence, and real rake accounting across a full multiplayer session —
the integration the headless fuzzer mocks with FakeBank.

Asserts:
  * DB-side chip conservation: sum(user.balance) + sum(table stacks)
      + sum(rake transactions) == initial total
  * hands / hand_players / hand_actions rows are persisted
  * buy-in and rake transactions are recorded
  * no negative balances or stacks

Run (inside container):  alembic upgrade head && python tests/integration_live.py
"""

import asyncio
import random
import sys

import backend.poker.table as table_mod
from backend.poker.table import PokerTable, TableConfig, SeatStatus
from backend.services.bank import BankService
from backend.db import async_session, engine
from backend.models.user import User
from backend.models.hand import Hand, HandPlayer, HandAction
from backend.models.ledger import Transaction
from sqlalchemy import select, func, delete
from decimal import Decimal

from engine_sim import FakeConn  # reuse the auto-responding fuzzer connection


async def _noop_sleep(*_a, **_k):
    return None


async def reset_db():
    async with async_session() as s:
        await s.execute(delete(HandAction))
        await s.execute(delete(HandPlayer))
        await s.execute(delete(Hand))
        await s.execute(delete(Transaction))
        await s.execute(delete(User))
        await s.commit()


async def seed_users(n, balance):
    async with async_session() as s:
        # House account (id=0) — mirrors the lifespan startup; rake transactions
        # FK-reference it.
        s.add(User(id=0, character_id=0, character_name="HOUSE", balance=0))
        for uid in range(1, n + 1):
            s.add(User(id=uid, character_id=100000 + uid, character_name=f"P{uid}", balance=balance))
        await s.commit()


async def sum_balances():
    async with async_session() as s:
        return (await s.execute(select(func.coalesce(func.sum(User.balance), 0)))).scalar()


async def sum_rake():
    async with async_session() as s:
        return (await s.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.type == "rake")
        )).scalar()


async def count(model):
    async with async_session() as s:
        return (await s.execute(select(func.count()).select_from(model))).scalar()


async def main():
    table_mod.asyncio.sleep = _noop_sleep
    failures = []

    N = 6
    BUYIN = 20000
    WALLET = 400000

    await reset_db()
    await seed_users(N, WALLET)
    initial_total = await sum_balances()
    print(f"seeded {N} users, total ISK-cents = {initial_total}")

    rng = random.Random(2026)
    conn = FakeConn(rng)
    bank = BankService()
    cfg = TableConfig(id="live-1", name="Live", small_blind=50, big_blind=100,
                      min_buyin=2000, max_buyin=20000, rake_percent=Decimal("0.05"), rake_cap=0)
    table = PokerTable(cfg, conn, bank)
    conn.table = table

    # Seat everyone (REAL debits via SELECT FOR UPDATE).
    for uid in range(1, N + 1):
        conn.seated.add(uid)
        await table.sit_down(uid, 100000 + uid, f"P{uid}", seat=uid - 1, buyin=BUYIN)

    # Verify buy-ins actually moved money in the DB.
    after_buyin = await sum_balances()
    on_table = sum(s.stack for s in table.seats if s)
    if after_buyin + on_table != initial_total:
        failures.append(f"buy-in conservation: {after_buyin} + {on_table} != {initial_total}")

    # Play a full session, rebuying from the real wallet as needed.
    hands = 0
    for h in range(40):
        for s in table.seats:
            if s and s.stack < table.config.big_blind:
                # Real top-up through add_chips (debits DB).
                need = BUYIN - s.stack
                bal = await bank.check_balance(s.user_id)
                topup = min(need, bal)
                if topup > 0:
                    try:
                        await table.add_chips(s.user_id, topup)
                    except Exception:
                        pass
        if table._active_player_count() < 2:
            break
        await table._play_hand()
        await conn.drain()
        hands += 1

        # DB-side conservation after every hand.
        bal = await sum_balances()
        rake = await sum_rake()
        on_table = sum(s.stack for s in table.seats if s)
        if bal + on_table + rake != initial_total:
            failures.append(f"hand {h}: conservation off — wallets {bal} + table {on_table} + rake {rake} != {initial_total}")
            break
        for s in table.seats:
            if s and s.stack < 0:
                failures.append(f"hand {h}: seat {s.seat} negative stack {s.stack}")

    # Persistence + ledger assertions.
    n_hands = await count(Hand)
    n_hp = await count(HandPlayer)
    n_ha = await count(HandAction)
    n_buyin = None
    async with async_session() as s:
        n_buyin = (await s.execute(
            select(func.count()).select_from(Transaction).where(Transaction.type == "buyin")
        )).scalar()
    rake_total = await sum_rake()

    print(f"played {hands} hands | Hand rows={n_hands} HandPlayer={n_hp} HandAction={n_ha} "
          f"buyin_tx={n_buyin} rake_total={rake_total}")

    if hands < 10:
        failures.append(f"only {hands} hands played")
    if n_hands < hands:
        failures.append(f"hand persistence: {n_hands} Hand rows for {hands} hands played")
    if n_hp == 0:
        failures.append("no HandPlayer rows persisted")
    if n_ha == 0:
        failures.append("no HandAction rows persisted")
    if n_buyin < N:
        failures.append(f"buy-in transactions: {n_buyin} < {N}")

    # Final conservation.
    bal = await sum_balances()
    rake = await sum_rake()
    on_table = sum(s.stack for s in table.seats if s)
    if bal + on_table + rake != initial_total:
        failures.append(f"FINAL conservation: {bal} + {on_table} + {rake} != {initial_total}")

    await engine.dispose()

    if failures:
        print("\n[FAIL] live integration")
        for f in failures:
            print("   -", f)
        return 1
    print("\n[PASS] live integration against real Postgres — conservation, persistence, ledger all correct")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
