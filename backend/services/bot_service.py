"""In-process poker bots — asyncio tasks that play directly against the table.

No WebSocket connections needed. Bots read table state directly and submit
actions through the same queue system the WS router uses.
"""

import asyncio
import logging
import random
from collections import defaultdict

from sqlalchemy import select

from ..db import async_session
from ..models.user import User
from ..poker.table import PokerTable
from ..poker.types import ActionType, PlayerAction, HandPhase, SeatStatus

log = logging.getLogger(__name__)

# Preflop hand tiers
PREMIUM = {"AA", "KK", "QQ", "JJ", "AKs", "AKo"}
STRONG = {"TT", "99", "AQs", "AQo", "AJs", "KQs"}
PLAYABLE = {"88", "77", "66", "ATs", "ATo", "KJs", "KTs", "QJs", "JTs"}


def _hand_key(cards) -> str:
    """Convert two Card objects to a hand key like 'AKo'."""
    if len(cards) < 2:
        return ""
    from ..poker.types import RANK_CHARS, SUIT_CHARS
    r1 = RANK_CHARS[cards[0].rank.value]
    s1 = SUIT_CHARS[cards[0].suit.value]
    r2 = RANK_CHARS[cards[1].rank.value]
    s2 = SUIT_CHARS[cards[1].suit.value]

    rank_order = "23456789TJQKA"
    i1 = rank_order.index(r1)
    i2 = rank_order.index(r2)

    if i1 < i2:
        r1, r2 = r2, r1
        s1, s2 = s2, s1

    if r1 == r2:
        return f"{r1}{r2}"
    suited = "s" if s1 == s2 else "o"
    return f"{r1}{r2}{suited}"


class BotService:
    """Manages in-process bot players across tables."""

    def __init__(self, table_manager):
        self._table_manager = table_manager
        # table_id -> list of (user_id, task) pairs
        self._bots: dict[str, list[tuple[int, asyncio.Task]]] = defaultdict(list)

    async def start_bots(self, table_id: str, count: int) -> list[dict]:
        """Start `count` bot players on a table. Returns info about each bot."""
        table = self._table_manager.get_table(table_id)
        if table is None:
            raise ValueError(f"Table '{table_id}' not found")

        results = []
        for i in range(count):
            # Find the next available bot name not already on this table
            existing_names = {
                s.character_name for s in table.seats if s is not None
            }
            active_ids = {uid for uid, _ in self._bots[table_id]}

            bot_user = None
            for n in range(1, 20):
                name = f"Bot-{n}"
                if name in existing_names:
                    continue
                bot_user = await self._get_or_create_bot(name)
                if bot_user["user_id"] in active_ids:
                    continue
                break

            if bot_user is None:
                break

            uid = bot_user["user_id"]
            cid = bot_user["character_id"]
            name = bot_user["name"]

            # Find an empty seat
            empty_seats = [
                i for i, s in enumerate(table.seats) if s is None
            ]
            if not empty_seats:
                log.warning("No empty seats on %s for bot %s", table_id, name)
                break

            seat_idx = random.choice(empty_seats)

            # Sit the bot down
            await table.sit_down(
                user_id=uid,
                character_id=cid,
                character_name=name,
                seat=seat_idx,
                buyin=table.config.max_buyin,
            )

            # Verify we actually sat down before registering as bot
            if table.seats[seat_idx] is None or table.seats[seat_idx].user_id != uid:
                log.warning("Bot %s failed to sit at seat %d on %s", name, seat_idx, table_id)
                continue

            # Register as bot AFTER confirmed sit
            table._bot_users.add(uid)

            # Start the bot task with cleanup callback
            task = asyncio.create_task(
                self._bot_loop(table, uid, seat_idx, name),
                name=f"bot-{name}-{table_id}",
            )
            task.add_done_callback(lambda t, tid=table_id, u=uid: self._on_bot_done(tid, u))
            self._bots[table_id].append((uid, task))
            results.append({"name": name, "user_id": uid, "seat": seat_idx})
            log.info("Bot %s started on %s seat %d", name, table_id, seat_idx)

            # Stagger bot starts
            await asyncio.sleep(0.5)

        return results

    async def stop_bots(self, table_id: str) -> int:
        """Stop all bots on a table. Returns count stopped."""
        table = self._table_manager.get_table(table_id)
        bots = self._bots.pop(table_id, [])
        count = 0
        for uid, task in bots:
            if table:
                # Push FOLD to unblock _wait_for_action immediately
                await table.enqueue_internal_action(
                    uid, PlayerAction(action=ActionType.FOLD, user_id=uid)
                )
                table._bot_users.discard(uid)
                table._disconnected_users.add(uid)
            task.cancel()
            count += 1
        log.info("Stopped %d bots on %s", count, table_id)
        return count

    def _on_bot_done(self, table_id: str, user_id: int) -> None:
        """Cleanup when a bot task exits (crash or natural)."""
        table = self._table_manager.get_table(table_id)
        if table:
            table._bot_users.discard(user_id)
        # Remove from bot list
        if table_id in self._bots:
            self._bots[table_id] = [(u, t) for u, t in self._bots[table_id] if u != user_id]
        log.info("Bot user_id=%d cleaned up from %s", user_id, table_id)

    def list_bots(self) -> dict[str, list[dict]]:
        """List all running bots per table."""
        result = {}
        for table_id, bots in self._bots.items():
            result[table_id] = [
                {"user_id": uid, "running": not task.done()}
                for uid, task in bots
            ]
        return result

    async def _get_or_create_bot(self, name: str) -> dict:
        """Get or create a bot user in the DB."""
        async with async_session() as session:
            result = await session.execute(
                select(User).where(User.character_name == name, User.is_bot == True)
            )
            user = result.scalar_one_or_none()

            if user is None:
                cid = -(random.randint(100_000_000, 999_999_999))
                user = User(
                    character_id=cid,
                    character_name=name,
                    portrait_url="",
                    balance=1_000_000_000_000,  # 10B ISK
                    is_bot=True,
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                log.info("Created bot user: %s (id=%d)", name, user.id)

            return {
                "user_id": user.id,
                "character_id": user.character_id,
                "name": user.character_name,
            }

    async def _bot_loop(self, table: PokerTable, user_id: int, seat_idx: int, name: str):
        """Main bot loop — polls table state and submits actions."""
        log.info("[%s] Bot loop started (seat %d)", name, seat_idx)
        try:
            while True:
                # Check if we're still seated
                seat = table.seats[seat_idx] if seat_idx < len(table.seats) else None
                if seat is None or seat.user_id != user_id:
                    # We got removed — try to find ourselves elsewhere or re-sit
                    found = False
                    for i, s in enumerate(table.seats):
                        if s and s.user_id == user_id:
                            seat_idx = i
                            found = True
                            break
                    if not found:
                        log.info("[%s] No longer seated, stopping", name)
                        break

                # Check if it's our turn
                if (table.action_on == seat_idx
                        and table.phase == HandPhase.BETTING
                        and seat.is_active):

                    # Think for 3-5 seconds
                    await asyncio.sleep(random.uniform(3.0, 5.0))

                    # Double-check it's still our turn (timeout may have folded us)
                    if table.action_on != seat_idx or not seat.is_active:
                        await asyncio.sleep(0.5)
                        continue

                    action = self._decide(table, seat)
                    if await table.enqueue_internal_action(user_id, action):
                        log.info("[%s] %s %s", name, action.action.value,
                                 f"({action.amount})" if action.amount else "")

                # Between hands: check if we need a rebuy
                if seat.stack <= 0 and table.phase in (HandPhase.IDLE, HandPhase.COMPLETE):
                    try:
                        await table.add_chips(user_id, table.config.max_buyin)
                        log.info("[%s] Rebuy %d", name, table.config.max_buyin)
                    except Exception:
                        await asyncio.sleep(2)  # wait before retry

                await asyncio.sleep(0.5)

        except asyncio.CancelledError:
            log.info("[%s] Bot cancelled", name)
        except Exception as e:
            log.error("[%s] Bot error: %s", name, e, exc_info=True)

    def _decide(self, table: PokerTable, seat) -> PlayerAction:
        """Decide what action to take based on simple strategy."""
        cards = seat.hole_cards or []
        key = _hand_key(cards)
        is_preflop = table.street.value == "preflop"

        to_call = max(0, table.current_bet - seat.current_bet)
        can_check = to_call == 0
        min_raise = table.current_bet + table.min_raise
        max_raise = seat.stack + seat.current_bet

        if is_preflop:
            if key in PREMIUM:
                # Raise 3x BB
                raise_amount = min(table.config.big_blind * 3, max_raise)
                if raise_amount > table.current_bet:
                    return PlayerAction(
                        action=ActionType.RAISE if table.current_bet > 0 else ActionType.BET,
                        amount=raise_amount,
                        user_id=seat.user_id,
                    )
                return PlayerAction(action=ActionType.CALL, user_id=seat.user_id)

            if key in STRONG:
                if can_check:
                    return PlayerAction(action=ActionType.CHECK, user_id=seat.user_id)
                return PlayerAction(action=ActionType.CALL, user_id=seat.user_id)

            if key in PLAYABLE:
                if can_check:
                    return PlayerAction(action=ActionType.CHECK, user_id=seat.user_id)
                if to_call <= table.config.big_blind * 2:
                    return PlayerAction(action=ActionType.CALL, user_id=seat.user_id)
                return PlayerAction(action=ActionType.FOLD, user_id=seat.user_id)

            # Trash
            if can_check:
                return PlayerAction(action=ActionType.CHECK, user_id=seat.user_id)
            if random.random() < 0.15:
                return PlayerAction(action=ActionType.CALL, user_id=seat.user_id)
            return PlayerAction(action=ActionType.FOLD, user_id=seat.user_id)

        else:
            # Postflop
            if can_check:
                if random.random() < 0.15:
                    bet_amount = min(min_raise, max_raise)
                    return PlayerAction(
                        action=ActionType.BET,
                        amount=bet_amount,
                        user_id=seat.user_id,
                    )
                return PlayerAction(action=ActionType.CHECK, user_id=seat.user_id)

            if random.random() < 0.35:
                return PlayerAction(action=ActionType.CALL, user_id=seat.user_id)

            return PlayerAction(action=ActionType.FOLD, user_id=seat.user_id)
