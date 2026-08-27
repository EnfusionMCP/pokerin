"""Watchable demo bots that play like real players: hand-strength-based decisions
(Chen preflop, phevaluator postflop), position/pot-odds aware, realistic bet
sizing, with a 2-5s think delay. Seats 5 bots; leaves seat 0 for the human.
Throwaway dev helper — not committed."""

import asyncio, json, math, os, random

from tests.db_safety import (
    configure_mutating_test_database,
    verify_configured_test_engine,
    verify_connected_test_database,
)

_TEST_DATABASE_URL = configure_mutating_test_database()

import websockets
from phevaluator import evaluate_cards
from sqlalchemy import select
from backend.db import async_session, engine
from backend.models.user import User
from backend.auth.jwt import create_token

verify_configured_test_engine(engine, _TEST_DATABASE_URL)

WS = os.environ.get("WS_URL", "ws://127.0.0.1:8090/ws/table/micro-1")
N = int(os.environ.get("N", "5"))
SEATS = [1, 2, 3, 4, 5, 6, 7, 8]
BUYIN = 800_000_000
RANKVAL = {r: i for i, r in enumerate("23456789TJQKA", start=2)}
HIGH = {"A": 10, "K": 8, "Q": 7, "J": 6}


async def ensure_users():
    async with async_session() as s:
        await verify_connected_test_database(s, _TEST_DATABASE_URL)
        for i in range(N):
            uid = 10 + i
            u = (await s.execute(select(User).where(User.id == uid))).scalar_one_or_none()
            if u is None:
                s.add(User(id=uid, character_id=200000 + uid, character_name=f"Villain{i+1}", balance=10_000_000_000))
            else:
                u.balance = 10_000_000_000
        await s.commit()


def chen(c1, c2):
    """Chen formula preflop hand strength (~ -1 .. 20)."""
    v1, v2 = RANKVAL[c1[0]], RANKVAL[c2[0]]
    hi_char = c1[0] if v1 >= v2 else c2[0]
    hi, lo = max(v1, v2), min(v1, v2)
    if v1 == v2:  # pair
        return max(HIGH.get(hi_char, hi / 2) * 2, 5)
    score = HIGH.get(hi_char, hi / 2)
    if c1[1] == c2[1]:
        score += 2  # suited
    gap = hi - lo - 1
    score -= {0: 0, 1: 1, 2: 2, 3: 4}.get(gap, 5)
    if gap <= 1 and hi < 12:
        score += 1  # straight-y, both below Q
    return math.ceil(score)


def made_rank(cards):
    """phevaluator rank (1 best .. 7462 worst) for 5-7 cards."""
    return evaluate_cards(*cards)


def clamp(x, lo, hi):
    return max(lo, min(hi, int(x)))


def decide(my_cards, board, valid, call_amount, min_raise, max_raise, pot, bb, rng):
    can_check = "check" in valid
    can_raise = "raise" in valid or "bet" in valid
    verb = "raise" if "raise" in valid else "bet"

    if len(board) < 3:
        # ---- preflop: Chen score ----
        score = chen(my_cards[0], my_cards[1])
        facing_raise = call_amount > bb  # someone raised beyond the big blind
        if not facing_raise:
            if score >= 11:
                return verb, clamp(3 * bb, min_raise, max_raise)        # premium: open ~3x
            if score >= 8:
                return (verb, clamp(3 * bb, min_raise, max_raise)) if rng.random() < 0.6 else ("call", 0)
            if score >= 6:
                return ("call", 0)                                       # playable: limp/call
            if can_check:
                return "check", 0                                        # free look in the BB
            return ("call", 0) if (score >= 4 and call_amount <= bb and rng.random() < 0.5) else ("fold", 0)
        else:
            # facing a raise — tighten
            if score >= 13 and can_raise:
                return verb, clamp(call_amount * 3, min_raise, max_raise)  # 3-bet the best hands
            if score >= 9:
                return ("call", 0)
            if score >= 7 and call_amount <= 3 * bb:
                return ("call", 0) if rng.random() < 0.5 else ("fold", 0)
            return "fold", 0

    # ---- postflop: real made-hand strength ----
    rank = made_rank([*my_cards, *board])
    pot = max(pot, bb)
    if rank <= 3325:        # two pair or better — value
        size = clamp(pot * (0.6 + rng.random() * 0.25), min_raise, max_raise)
        if can_check:
            return verb, size
        return verb, size if (can_raise and rng.random() < 0.6) else ("call", 0)
    if rank <= 6185:        # one pair — pot-control
        if can_check:
            return (verb, clamp(pot * 0.5, min_raise, max_raise)) if rng.random() < 0.35 else ("check", 0)
        # facing a bet: call if price is reasonable relative to pot
        if call_amount <= pot * 0.6:
            return "call", 0
        return ("call", 0) if rng.random() < 0.3 else ("fold", 0)
    # high card / nothing — check-fold, occasional bluff
    if can_check:
        return (verb, clamp(pot * 0.5, min_raise, max_raise)) if rng.random() < 0.12 else ("check", 0)
    return ("call", 0) if (call_amount <= bb and rng.random() < 0.2) else ("fold", 0)


async def bot(i):
    uid = 10 + i
    seat = SEATS[i]
    token = create_token(uid, 200000 + uid, f"Villain{i+1}")
    rng = random.Random(uid * 977 + 11)
    while True:
        try:
            async with websockets.connect(WS, max_size=2**20) as ws:
                await ws.send(json.dumps({"type": "auth", "token": token}))
                state = json.loads(await ws.recv())
                bb = (state.get("blinds") or {}).get("big", 100_000_000)
                await ws.send(json.dumps({"type": "sit", "seat": seat, "buyin": BUYIN}))
                my_cards, board, pot, my_stack = [], [], bb, BUYIN
                async for text in ws:
                    m = json.loads(text)
                    t = m.get("type")
                    if t == "deal":
                        my_cards = m.get("cards", [])
                    elif t in ("hand_start",):
                        board, pot = [], 0
                        seats = m.get("seats") or []
                        me = next((s for s in seats if s.get("seat") == seat), None)
                        if me and (me.get("stack") or 0) < bb * 2:
                            await ws.send(json.dumps({"type": "add_chips", "amount": BUYIN - (me.get("stack") or 0)}))
                    elif t == "community":
                        board = m.get("board", board)
                    elif t == "player_action":
                        if m.get("pot") is not None:
                            pot = m["pot"]
                    elif t == "seat_update" and m.get("seat") == seat:
                        my_stack = m.get("stack", my_stack)
                    elif t == "action_prompt":
                        await asyncio.sleep(rng.uniform(2.0, 5.0))   # human think time
                        act, amt = decide(my_cards, board, m.get("valid", []),
                                          m.get("call_amount", 0), m.get("min_raise", 0),
                                          m.get("max_raise", 0), pot, bb, rng)
                        await ws.send(json.dumps({"type": "action", "action": act, "amount": amt}))
        except Exception:
            await asyncio.sleep(1.5)


async def main():
    await ensure_users()
    await engine.dispose()
    await asyncio.gather(*[bot(i) for i in range(N)])


if __name__ == "__main__":
    asyncio.run(main())
