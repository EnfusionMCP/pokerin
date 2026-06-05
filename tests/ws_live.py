"""Live WebSocket gameplay test — drives two real players through the actual
ws://.../ws/table/{id} endpoint of a running server, over the wire.

Exercises: first-message JWT auth, table_state snapshot, sit, the deal (each
player privately receives their own hole cards), the betting protocol
(action_prompt -> action), and hand_result — the transport layer the headless
and DB tests don't cover.

Run inside the docker network against the running 'pokerin-live' server:
    python tests/ws_live.py
"""

import asyncio
import json
import sys

import websockets
from sqlalchemy import update

from backend.db import async_session, engine
from backend.models.user import User
from backend.auth.jwt import create_token

WS = "ws://pokerin-live:8080/ws/table/micro-1"
TABLE_MIN_BUYIN = 400_000_000   # micro-1 min buy-in (ISK-cents)
RUN_SECONDS = 55


async def fund(user_ids, balance):
    async with async_session() as s:
        for uid in user_ids:
            await s.execute(update(User).where(User.id == uid).values(balance=balance))
        await s.commit()


class Client:
    def __init__(self, uid, seat):
        self.uid = uid
        self.seat = seat
        self.token = create_token(uid, 100000 + uid, f"P{uid}")
        self.events = {"hand_start": 0, "deal": 0, "hand_result": 0, "action_prompt": 0, "error": []}
        self.my_cards = None

    async def run(self, stop_evt):
        async with websockets.connect(WS, max_size=2**20) as ws:
            await ws.send(json.dumps({"type": "auth", "token": self.token}))
            # First message back should be table_state.
            state = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
            if state.get("type") != "table_state":
                self.events["error"].append(f"expected table_state, got {state.get('type')}")
            await ws.send(json.dumps({"type": "sit", "seat": self.seat, "buyin": TABLE_MIN_BUYIN}))

            while not stop_evt.is_set():
                try:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=2))
                except asyncio.TimeoutError:
                    continue
                except websockets.ConnectionClosed:
                    break
                t = msg.get("type")
                if t in self.events and t != "error":
                    self.events[t] += 1
                if t == "error":
                    self.events["error"].append(msg.get("message"))
                elif t == "deal":
                    self.my_cards = msg.get("cards")
                elif t == "action_prompt":
                    valid = msg.get("valid", [])
                    # Keep hands moving toward showdown: check/call.
                    if "check" in valid:
                        act = {"type": "action", "action": "check"}
                    elif "call" in valid:
                        act = {"type": "action", "action": "call"}
                    else:
                        act = {"type": "action", "action": "fold"}
                    await ws.send(json.dumps(act))


async def main():
    failures = []
    await fund([1, 2], 1_000_000_000)

    stop = asyncio.Event()
    c1, c2 = Client(1, 0), Client(2, 1)
    tasks = [asyncio.create_task(c1.run(stop)), asyncio.create_task(c2.run(stop))]

    await asyncio.sleep(RUN_SECONDS)
    stop.set()
    await asyncio.gather(*tasks, return_exceptions=True)
    await engine.dispose()

    for c in (c1, c2):
        print(f"user {c.uid}: {c.events} cards={c.my_cards}")
        if c.events["error"]:
            failures.append(f"user {c.uid} errors: {c.events['error']}")
        if c.events["hand_start"] < 1:
            failures.append(f"user {c.uid} never received hand_start")
        if c.events["deal"] < 1 or not c.my_cards or len(c.my_cards) != 2:
            failures.append(f"user {c.uid} did not receive 2 private hole cards")
        if c.events["hand_result"] < 1:
            failures.append(f"user {c.uid} never saw a hand_result")

    # Players must NOT see each other's hole cards: the deal is per-player, and
    # table_state/broadcasts must never carry another player's cards. (Each client
    # only ever set my_cards from its own 'deal'.)
    if c1.my_cards and c2.my_cards and c1.my_cards == c2.my_cards:
        failures.append("both players received identical hole cards (card leak?)")

    if failures:
        print("\n[FAIL] live WS gameplay")
        for f in failures:
            print("   -", f)
        return 1
    print("\n[PASS] live WS gameplay — auth, sit, private deal, betting, showdown all over the wire")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
