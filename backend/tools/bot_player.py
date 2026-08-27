"""Bot poker player — connects via WebSocket and plays basic strategy.

Usage:
    # First, create bot users (run once, requires admin token):
    python -m backend.tools.bot_player --setup --admin-token <jwt> --url https://pokerin.space --bots 3

    # Then run the bots:
    python -m backend.tools.bot_player --table micro-1 --url https://pokerin.space --bots 3

Bots play a simple strategy:
- Preflop: fold trash, call with decent hands, raise with premium
- Postflop: check when possible, call small bets, fold to large raises with nothing
- Auto-rebuy when busted
"""

import argparse
import asyncio
import json
import logging
import random
import sys
from pathlib import Path

import aiohttp
import websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("bot")

# Hand strength tiers (preflop)
PREMIUM = {"AA", "KK", "QQ", "JJ", "AKs", "AKo"}
STRONG = {"TT", "99", "AQs", "AQo", "AJs", "KQs"}
PLAYABLE = {"88", "77", "66", "ATs", "ATo", "KJs", "KTs", "QJs", "JTs"}


def hand_key(cards: list[str]) -> str:
    """Convert two card strings like ['Ah', 'Kd'] to a hand key like 'AKo'."""
    if len(cards) < 2:
        return ""
    r1, s1 = cards[0][0], cards[0][1]
    r2, s2 = cards[1][0], cards[1][1]

    rank_order = "23456789TJQKA"
    i1 = rank_order.index(r1) if r1 in rank_order else 0
    i2 = rank_order.index(r2) if r2 in rank_order else 0

    # Sort so higher rank is first
    if i1 < i2:
        r1, r2 = r2, r1
        s1, s2 = s2, s1

    if r1 == r2:
        return f"{r1}{r2}"
    suited = "s" if s1 == s2 else "o"
    return f"{r1}{r2}{suited}"


class BotPlayer:
    def __init__(self, name: str, token: str, table_id: str, base_url: str, buyin: int):
        self.name = name
        self.token = token
        self.table_id = table_id
        self.base_url = base_url
        self.buyin = buyin
        self.ws = None
        self.my_cards: list[str] = []
        self.community: list[str] = []
        self.seated = False
        self.my_seat = -1
        self.seats: list[dict] = []

    async def run(self):
        protocol = "wss" if "https" in self.base_url else "ws"
        host = self.base_url.replace("https://", "").replace("http://", "")
        url = f"{protocol}://{host}/ws/table/{self.table_id}"

        while True:
            try:
                async with websockets.connect(url) as ws:
                    self.ws = ws
                    await ws.send(json.dumps({
                        "type": "auth",
                        "token": self.token,
                        "schema_version": 1,
                    }))
                    log.info("[%s] Connected to %s", self.name, self.table_id)
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                            await self.handle_message(msg)
                        except Exception as e:
                            log.error("[%s] Handle error: %s", self.name, e)
            except websockets.ConnectionClosed as e:
                log.info("[%s] Connection closed: %s", self.name, e)
            except Exception as e:
                log.warning("[%s] Connection error: %s", self.name, e)

            log.info("[%s] Reconnecting in 5s...", self.name)
            await asyncio.sleep(5)

    async def handle_message(self, msg: dict):
        msg_type = msg.get("type")

        if msg_type == "table_state":
            self.seats = msg.get("seats", [])
            self.community = msg.get("community", [])
            self.my_cards = msg.get("your_cards") or []
            self._find_my_seat()
            if not self.seated:
                await self._try_sit()

        elif msg_type == "hand_start":
            self.my_cards = []
            self.community = []
            log.info("[%s] Hand #%d started", self.name, msg.get("hand_num", 0))

        elif msg_type == "deal":
            self.my_cards = msg.get("cards", [])
            key = hand_key(self.my_cards)
            log.info("[%s] Dealt: %s (%s)", self.name, self.my_cards, key)

        elif msg_type == "community":
            self.community = msg.get("board", [])

        elif msg_type == "action_prompt":
            await self._decide_action(msg)

        elif msg_type == "hand_result":
            # Check if we need to rebuy
            await asyncio.sleep(1)
            self._find_my_seat()
            if self.seated and self.my_seat >= 0:
                stack = self.seats[self.my_seat].get("stack", 0) if self.my_seat < len(self.seats) else 0
                if stack <= 0:
                    log.info("[%s] Busted, rebuying", self.name)
                    await self._send({"type": "add_chips", "amount": self.buyin})

        elif msg_type == "seat_update":
            seat_idx = msg.get("seat", -1)
            if 0 <= seat_idx < len(self.seats):
                self.seats[seat_idx] = msg
            self._find_my_seat()

        elif msg_type == "error":
            err = msg.get("message", "")
            log.warning("[%s] Server error: %s", self.name, err)
            if "occupied" in err.lower() or "seat" in err.lower():
                await asyncio.sleep(random.uniform(0.5, 2.0))
                await self._try_sit()

    def _find_my_seat(self):
        for i, s in enumerate(self.seats):
            if s.get("name") == self.name and s.get("user_id") is not None:
                self.my_seat = i
                self.seated = True
                return
        self.my_seat = -1
        self.seated = False

    async def _try_sit(self):
        # Collect all empty seats and pick one randomly to avoid all bots racing for seat 0
        empty = [
            i for i, s in enumerate(self.seats)
            if s.get("status") == "empty" or s.get("user_id") is None
        ]
        if not empty:
            log.info("[%s] No empty seats", self.name)
            return
        seat = random.choice(empty)
        log.info("[%s] Sitting at seat %d with %d buyin", self.name, seat, self.buyin)
        await self._send({"type": "sit", "seat": seat, "buyin": self.buyin})

    async def _decide_action(self, prompt: dict):
        valid = prompt.get("valid", [])
        call_amount = prompt.get("call_amount", 0)
        min_raise = prompt.get("min_raise", 0)
        max_raise = prompt.get("max_raise", 0)

        key = hand_key(self.my_cards)
        street = "preflop" if len(self.community) == 0 else "postflop"

        # Add some thinking time so it looks natural
        await asyncio.sleep(random.uniform(1.0, 3.0))

        if street == "preflop":
            if key in PREMIUM:
                # Raise with premium hands
                if "raise" in valid or "bet" in valid:
                    action = "bet" if "bet" in valid else "raise"
                    amount = min(min_raise * 3, max_raise)
                    await self._send({"type": "action", "action": action, "amount": amount})
                    log.info("[%s] %s %d (premium: %s)", self.name, action, amount, key)
                    return
                if "call" in valid:
                    await self._send({"type": "action", "action": "call"})
                    return
            elif key in STRONG:
                if "call" in valid:
                    await self._send({"type": "action", "action": "call"})
                    log.info("[%s] Call (strong: %s)", self.name, key)
                    return
                if "check" in valid:
                    await self._send({"type": "action", "action": "check"})
                    return
            elif key in PLAYABLE:
                # Call small raises, fold big ones
                if "check" in valid:
                    await self._send({"type": "action", "action": "check"})
                    return
                if "call" in valid and call_amount <= min_raise * 2:
                    await self._send({"type": "action", "action": "call"})
                    return
                await self._send({"type": "action", "action": "fold"})
                return
            else:
                # Trash hand
                if "check" in valid:
                    await self._send({"type": "action", "action": "check"})
                    return
                # Occasionally bluff call
                if "call" in valid and random.random() < 0.15:
                    await self._send({"type": "action", "action": "call"})
                    return
                await self._send({"type": "action", "action": "fold"})
                return
        else:
            # Postflop: simplified — check when possible, call 40% of time, fold otherwise
            if "check" in valid:
                # Sometimes bet
                if ("bet" in valid or "raise" in valid) and random.random() < 0.2:
                    action = "bet" if "bet" in valid else "raise"
                    amount = min_raise
                    await self._send({"type": "action", "action": action, "amount": amount})
                    log.info("[%s] %s %d (postflop probe)", self.name, action, amount)
                    return
                await self._send({"type": "action", "action": "check"})
                return
            if "call" in valid and random.random() < 0.4:
                await self._send({"type": "action", "action": "call"})
                return
            await self._send({"type": "action", "action": "fold"})

    async def _send(self, msg: dict):
        if self.ws and self.ws.open:
            await self.ws.send(json.dumps(msg))


async def setup_bots(base_url: str, admin_token: str, count: int) -> list[dict]:
    """Create bot users via admin API and return their tokens."""
    bots = []
    headers = {"Authorization": f"Bearer {admin_token}"}
    async with aiohttp.ClientSession() as session:
        for i in range(1, count + 1):
            name = f"Bot-{i}"
            url = f"{base_url}/api/admin/bot/create?name={name}"
            async with session.post(url, headers=headers) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    log.error("Failed to create %s: %s", name, text)
                    continue
                data = await resp.json()
                bots.append({"name": name, "token": data["token"], "user_id": data["user_id"]})
                status = "created" if data["created"] else "exists"
                log.info("Bot %s: user_id=%d (%s)", name, data["user_id"], status)
    return bots


async def run_bots(base_url: str, table_id: str, bot_data: list[dict], buyin: int):
    """Launch all bot players with staggered connections to avoid races."""
    tasks = []
    for i, bd in enumerate(bot_data):
        bot = BotPlayer(
            name=bd["name"],
            token=bd["token"],
            table_id=table_id,
            base_url=base_url,
            buyin=buyin,
        )
        tasks.append(asyncio.create_task(bot.run()))
        # Stagger connections so bots don't all race for the same seat
        await asyncio.sleep(0.8)
    await asyncio.gather(*tasks)


async def main():
    parser = argparse.ArgumentParser(description="Poker bot players")
    parser.add_argument("--url", default="https://pokerin.space", help="Base URL")
    parser.add_argument("--table", default="micro-1", help="Table ID to join")
    parser.add_argument("--bots", type=int, default=3, help="Number of bots")
    parser.add_argument("--buyin", type=int, default=1_000_000_000, help="Buy-in amount (ISK-cents)")
    parser.add_argument("--setup", action="store_true", help="Create bot users first")
    parser.add_argument("--admin-token", help="Admin JWT for --setup")
    parser.add_argument("--tokens", nargs="+", help="Pre-generated bot tokens (skip setup)")
    args = parser.parse_args()

    if args.setup:
        if not args.admin_token:
            log.error("--admin-token required with --setup")
            sys.exit(1)
        bots = await setup_bots(args.url, args.admin_token, args.bots)
        # Save tokens to a file for reuse
        token_file = Path(__file__).parent / "bot_tokens.json"
        with open(token_file, "w") as f:
            json.dump(bots, f, indent=2)
        log.info("Saved %d bot tokens to %s", len(bots), token_file)
        log.info("Run without --setup to start playing")
        return

    # Load tokens
    if args.tokens:
        bot_data = [{"name": f"Bot-{i+1}", "token": t} for i, t in enumerate(args.tokens)]
    else:
        token_file = Path(__file__).parent / "bot_tokens.json"
        if not token_file.exists():
            log.error("No bot tokens found. Run with --setup first, or pass --tokens")
            sys.exit(1)
        with open(token_file) as f:
            bot_data = json.load(f)

    bot_data = bot_data[:args.bots]
    log.info("Starting %d bots on table %s", len(bot_data), args.table)
    await run_bots(args.url, args.table, bot_data, args.buyin)


if __name__ == "__main__":
    asyncio.run(main())
