"""Live QA: simulate real players over the actual WebSocket server with varied
styles (tight / loose-passive / aggressive / all-in-prone), plus players who
leave and reconnect and rebuy when short. While they play, a monitor verifies
chip conservation at every hand boundary. Afterwards every persisted hand is
audited for correct payouts.

Run against the explicitly approved SQLite test file documented in
tests/README.md (server must use that same file and be up on :8090):
    python -m tests.qa_live
"""

import asyncio, json, random, time, sqlite3, sys
from pathlib import Path

from tests.db_safety import (
    configure_disposable_sqlite_test_database,
    verify_configured_test_engine,
    verify_connected_test_database,
)

_TEST_DATABASE_URL = configure_disposable_sqlite_test_database()

import websockets
from sqlalchemy import select
from sqlalchemy.engine import make_url
from backend.db import async_session, engine
from backend.models.user import User
from backend.auth.jwt import create_token

verify_configured_test_engine(engine, _TEST_DATABASE_URL)
SQLITE_TEST_PATH = Path(make_url(_TEST_DATABASE_URL).database or "").resolve()

WS = "ws://127.0.0.1:8090/ws/table/micro-1"
MIN_BUYIN = 400_000_000
BUYIN = 800_000_000
BB = 100_000_000
DURATION = 150

STYLES = ["station", "tight", "aggro", "normal", "normal", "aggro", "station"]


async def fund_players(n):
    async with async_session() as s:
        await verify_connected_test_database(s, _TEST_DATABASE_URL)
        for i in range(n):
            uid = 20 + i
            u = (await s.execute(select(User).where(User.id == uid))).scalar_one_or_none()
            if u is None:
                s.add(User(id=uid, character_id=300000 + uid, character_name=f"P{i+1}", balance=10_000_000_000))
            else:
                u.balance = 10_000_000_000
        await s.commit()


def decide(style, valid, call_amount, min_raise, max_raise, rng):
    can_check = "check" in valid
    can_raise = "raise" in valid or "bet" in valid
    verb = "raise" if "raise" in valid else "bet"
    r = rng.random()
    if style == "station":          # calls almost everything, never raises
        if can_check: return "check", 0
        return ("call", 0) if r < 0.92 else ("fold", 0)
    if style == "tight":            # folds a lot, small calls, rare raise
        if can_check:
            return (verb, min_raise) if (can_raise and r < 0.10) else ("check", 0)
        if call_amount > max_raise * 0.25: return ("call", 0) if r < 0.25 else ("fold", 0)
        return ("call", 0) if r < 0.55 else ("fold", 0)
    if style == "aggro":            # raises often, sometimes shoves (tests side pots)
        if r < 0.10 and can_raise: return verb, max_raise          # all-in
        if can_check:
            return (verb, min(min_raise * 2, max_raise)) if (can_raise and r < 0.45) else ("check", 0)
        if r < 0.30 and can_raise: return verb, min(min_raise, max_raise)
        return ("call", 0) if r < 0.75 else ("fold", 0)
    # normal
    if can_check:
        return (verb, min_raise) if (can_raise and r < 0.18) else ("check", 0)
    big = call_amount > max_raise * 0.4
    if can_raise and r < 0.08: return verb, min_raise
    if not big and r < 0.75: return "call", 0
    if big and r < 0.35: return "call", 0
    return "fold", 0


async def player(i, stop):
    uid = 20 + i
    seat = i
    style = STYLES[i % len(STYLES)]
    token = create_token(uid, 300000 + uid, f"P{i+1}")
    rng = random.Random(uid * 131 + 5)
    transient = i >= 5  # last two players leave & rejoin to vary the player count
    while not stop.is_set():
        try:
            async with websockets.connect(WS, max_size=2**20) as ws:
                await ws.send(json.dumps({"type": "auth", "token": token}))
                await ws.recv()
                await ws.send(json.dumps({"type": "sit", "seat": seat, "buyin": BUYIN}))
                my_stack = BUYIN
                while not stop.is_set():
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=40))
                    t = msg.get("type")
                    if t == "seat_update" and msg.get("seat") == seat:
                        my_stack = msg.get("stack", my_stack)
                    elif t == "action_prompt":
                        await asyncio.sleep(rng.uniform(0.4, 1.4))
                        act, amt = decide(style, msg.get("valid", []), msg.get("call_amount", 0),
                                          msg.get("min_raise", 0), msg.get("max_raise", 0), rng)
                        await ws.send(json.dumps({"type": "action", "action": act, "amount": amt}))
                    elif t == "hand_result":
                        if my_stack < BB * 2:                       # rebuy (phase COMPLETE)
                            await ws.send(json.dumps({"type": "add_chips", "amount": BUYIN - my_stack}))
                            my_stack = BUYIN
                        if transient and rng.random() < 0.30:
                            break                                   # leave; reconnect below
        except Exception:
            pass
        if transient:
            await asyncio.sleep(rng.uniform(2, 7))                  # sit out a bit, then rejoin


async def monitor(stop, samples, leaks):
    import urllib.request
    def db():
        for _ in range(12):
            try:
                c = sqlite3.connect(
                    f"file:{SQLITE_TEST_PATH.as_posix()}?mode=ro",
                    uri=True,
                    timeout=2,
                )
                w = c.execute('select coalesce(sum(balance),0) from users').fetchone()[0]
                r = c.execute("select coalesce(sum(amount),0) from transactions where type='rake'").fetchone()[0]
                c.close(); return w, r
            except sqlite3.OperationalError:
                time.sleep(0.15)
        return None, None
    seen = set()
    while not stop.is_set():
        try:
            d = json.loads(urllib.request.urlopen('http://127.0.0.1:8090/api/tables/micro-1', timeout=4).read())
        except Exception:
            await asyncio.sleep(0.4); continue
        cb = sum((s.get('current_bet') or 0) for s in d['seats'] if s.get('status') not in (None, 'empty'))
        if d['phase'] in ('idle', 'complete') and cb == 0 and d['hand_num'] not in seen:
            seen.add(d['hand_num'])
            stacks = sum((s.get('stack') or 0) for s in d['seats'] if s.get('status') not in (None, 'empty'))
            w, r = db()
            if w is None:
                await asyncio.sleep(0.3); continue
            grand = w + r + stacks
            samples.append((d['hand_num'], grand))
            if len(samples) > 1 and grand != samples[0][1]:
                leaks.append((d['hand_num'], grand, samples[0][1]))
        await asyncio.sleep(0.25)


def audit_hands():
    c = sqlite3.connect(
        f"file:{SQLITE_TEST_PATH.as_posix()}?mode=ro",
        uri=True,
        timeout=5,
    )
    hands = c.execute('select id,hand_number,pot_total,rake_taken from hands order by id').fetchall()
    bad = []
    for hid, hn, pot, rake in hands:
        pl = c.execute('select seat,net_won,is_winner from hand_players where hand_id=?', (hid,)).fetchall()
        if not pl: continue
        net = sum(n for _, n, _ in pl)
        lost = sum(-n for _, n, _ in pl if n < 0)
        gained = sum(n for _, n, _ in pl if n > 0)
        winners = [s for s, n, w in pl if w]
        if net != -rake:                         # chips conserved within the hand
            bad.append((hn, f"sum net_won {net} != -rake {-rake}"))
        elif lost != gained + rake:              # losers fund winners + rake
            bad.append((hn, f"lost {lost} != gained {gained} + rake {rake}"))
        elif gained > 0 and not winners:         # someone gained but no winner flagged
            bad.append((hn, "gain with no winner flagged"))
    c.close()
    return len(hands), bad


async def main():
    n = len(STYLES)
    await fund_players(n)
    await engine.dispose()
    stop = asyncio.Event()
    samples, leaks = [], []
    tasks = [asyncio.create_task(player(i, stop)) for i in range(n)]
    mon = asyncio.create_task(monitor(stop, samples, leaks))
    print(f"simulating {n} players ({', '.join(set(STYLES))}) for {DURATION}s...")
    await asyncio.sleep(DURATION)
    stop.set()
    await asyncio.gather(*tasks, mon, return_exceptions=True)

    n_hands, bad = audit_hands()
    print(f"\nhand boundaries sampled: {len(samples)}")
    if samples:
        print(f"grand total: first={samples[0][1]:,} last={samples[-1][1]:,}")
    print(f"conservation leaks: {len(leaks)}")
    for l in leaks[:5]: print("   LEAK", l)
    print(f"persisted hands audited: {n_hands}, payout errors: {len(bad)}")
    for b in bad[:10]: print("   BAD", b)

    ok = (len(leaks) == 0) and (len(bad) == 0) and len(samples) >= 5 and n_hands >= 5
    print("\n==== LIVE QA " + ("PASSED" if ok else "FAILED") + " ====")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
