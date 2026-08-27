"""Poker table state machine — the core game engine.

Each table runs as an asyncio task. The game loop waits for enough players,
deals hands, collects actions via an asyncio Queue (fed by the WebSocket
router), and broadcasts results via the ConnectionManager.

Card security: hole cards are NEVER sent to other players. The
get_state_for_player() method filters the state for each recipient.
"""

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from .deck import Deck
from .evaluator import evaluate_hand, hand_category_name
from .player import PlayerSeat
from .pot import Pot, calculate_pots
from .rake import RakeCalculator
from .types import (
    ActionType, Card, HandPhase, PlayerAction, SeatStatus, Street,
    RANK_CHARS, SUIT_CHARS,
)
from ..services.bank import InsufficientBalance
from ..ws.protocol import (
    ActionPromptMessage,
    SERVER_MESSAGE_ADAPTER,
    ServerMsg,
    TableStateMessage,
    add_server_metadata,
)

log = logging.getLogger(__name__)

ACTION_TIMEOUT = 30.0  # seconds per action
BANK_TIME = 15.0       # one-shot extra time when the base timer expires
SIT_OUT_KICK_HANDS = 3  # consecutive sat-out hands before a player is removed
MIN_PLAYERS = 2


@dataclass
class TableConfig:
    """Persistent table configuration."""
    id: str
    name: str
    game_type: str = "nlhe"
    max_seats: int = 9
    small_blind: int = 0
    big_blind: int = 0
    min_buyin: int = 0
    max_buyin: int = 0
    rake_percent: Decimal = Decimal("0.03")
    rake_cap: int = 0


@dataclass(frozen=True)
class QueuedPlayerAction:
    """An action bound to the exact turn prompt that accepted it."""

    action: PlayerAction
    prompt_id: str
    command_id: str | None = None


class PokerTable:
    """A single poker table running as an asyncio task."""

    def __init__(self, config: TableConfig, conn_manager, bank=None):
        self.config = config
        self.table_id = config.id
        # Revisions are monotonic only within this opaque table-process epoch.
        # Clients must reset their revision cursor when this value changes.
        self.stream_id = str(uuid4())
        self.conn = conn_manager
        self._bank = bank  # BankService for DB balance operations

        # Lock for seat mutations (sit_down, stand_up, add_chips)
        self._seat_lock = asyncio.Lock()
        # Serialize revision allocation and public delivery. Connection
        # bootstrap also takes this lock so a snapshot is always the first frame
        # in a newly activated subscription.
        self._event_lock = asyncio.Lock()

        # Seats
        self.seats: list[Optional[PlayerSeat]] = [None] * config.max_seats

        # Game state
        self.deck = Deck()
        self.community: list[Card] = []
        self.pots: list[Pot] = []
        self.hand_number: int = 0
        self.dealer_seat: int = -1
        self.street: Street = Street.PREFLOP
        self.phase: HandPhase = HandPhase.IDLE
        self.action_on: int = -1
        self.last_raiser: int = -1
        self.current_bet: int = 0  # highest bet this street
        self.min_raise: int = 0    # minimum raise increment
        self.saw_flop: bool = False

        # Per-player action queues — keyed by user_id (BUG A fix)
        self._action_queues: dict[int, asyncio.Queue[QueuedPlayerAction]] = {}
        self._shutdown = asyncio.Event()
        # Phase 1 protocol ordering/correlation. Phase 2 persists these values.
        self._revision: int = 0
        self._current_prompt_id: str | None = None
        self._recent_command_ids: set[str] = set()
        self._recent_command_order: deque[str] = deque(maxlen=1024)
        # Track disconnected user IDs for cleanup between hands (BUG B fix)
        self._disconnected_users: set[int] = set()
        # Players who timed out with no bank time left — moved to SITTING_OUT
        # at the start of the next hand.
        self._auto_sitout: set[int] = set()
        # Bot user IDs — these are never cleaned up by _cleanup_disconnected
        self._bot_users: set[int] = set()

        # Rake
        self._rake = RakeCalculator(config.rake_percent, config.rake_cap)

        # Hand history for DB persistence
        self._hand_actions: list[dict] = []
        self._action_order: int = 0
        # Last showdown result — shown to clients that connect during the
        # post-hand pause so a refresh doesn't hide who won.
        self._last_result: dict | None = None

    # ------------------------------------------------------------------
    # Main game loop
    # ------------------------------------------------------------------

    async def run(self) -> None:
        """Main loop: wait for players, deal hands."""
        log.info("Table %s (%s) started", self.table_id, self.config.name)
        while not self._shutdown.is_set():
            await self._cleanup_disconnected()
            active = self._active_player_count()
            if active < MIN_PLAYERS:
                self.phase = HandPhase.IDLE
                await asyncio.sleep(1.0)
                continue
            await self._play_hand()

    async def shutdown(self) -> None:
        """Signal the table to stop."""
        self._shutdown.set()

    # ------------------------------------------------------------------
    # Hand flow
    # ------------------------------------------------------------------

    async def _play_hand(self) -> None:
        """Play a single hand from deal to showdown."""
        self.hand_number += 1
        log.info("=== HAND #%d START on %s ===", self.hand_number, self.table_id)
        self.phase = HandPhase.POSTING
        self._hand_actions = []
        self._action_order = 0
        hand_started = time.time()

        # Prepare
        self._reset_hand()

        # Re-check after reset — a player may have stood up between the
        # count check in run() and now (TOCTOU race)
        if self._active_player_count() < MIN_PLAYERS:
            self.phase = HandPhase.IDLE
            return

        self.deck.shuffle(self.table_id, self.hand_number)
        self._advance_dealer()
        self._post_blinds()

        # Snapshot starting stacks for hand history
        starting_stacks: dict[int, int] = {}
        for seat in self.seats:
            if seat and seat.is_in_hand:
                starting_stacks[seat.seat] = seat.stack + seat.total_bet
        log.info("Hand #%d: dealer=seat%d, players=%s",
                 self.hand_number, self.dealer_seat,
                 [(s.seat, s.character_name, s.status.value, s.stack, s.current_bet)
                  for s in self.seats if s and s.is_in_hand])

        # Notify all players (include blind pot + seat data so UI updates immediately)
        blind_pot = sum(p.amount for p in self._calculate_current_pots())
        seats_data = []
        for i, seat in enumerate(self.seats):
            if seat is None:
                seats_data.append({"seat": i, "status": "empty"})
            else:
                seats_data.append(seat.to_public_dict())

        await self._broadcast({
            "type": ServerMsg.HAND_START,
            "hand_num": self.hand_number,
            "seed_hash": self.deck.seed_hash,
            "dealer": self.dealer_seat,
            "pot": blind_pot,
            "seats": seats_data,
        })

        # Deal hole cards
        self.phase = HandPhase.DEALING
        self._deal_hole_cards()
        await self._send_hole_cards()
        await asyncio.sleep(1.5)  # pause after dealing so players can see their cards

        # Betting rounds
        for street in (Street.PREFLOP, Street.FLOP, Street.TURN, Street.RIVER):
            self.street = street

            if street != Street.PREFLOP:
                self._deal_community(street)
                await self._broadcast_community(street)
                await asyncio.sleep(1.0)  # pause after community cards appear
                if street == Street.FLOP:
                    self.saw_flop = True

            # Skip betting if only one player or all-in showdown
            active_count = sum(1 for s in self.seats if s and s.is_active)
            if active_count <= 1:
                continue

            self.phase = HandPhase.BETTING
            await self._run_betting_round()

            # Check if hand is over (everyone folded)
            in_hand = [s for s in self.seats if s and s.is_in_hand]
            if len(in_hand) <= 1:
                break

        # Showdown and distribute
        self.phase = HandPhase.SHOWDOWN
        in_hand_final = [(s.seat, s.character_name, s.status.value) for s in self.seats if s and s.is_in_hand]
        log.info("[%s] Hand #%d SHOWDOWN: remaining=%s community=%s",
                 self.table_id, self.hand_number, in_hand_final,
                 [str(c) for c in self.community])
        result = self._resolve_showdown()
        # Remember the result so a player who connects/refreshes during the
        # showdown still sees who won and how much (get_state_for_player).
        self._last_result = result
        await self._broadcast_result(result)

        # Persist hand history and rake to DB
        await self._persist_hand(result, starting_stacks, hand_started)

        self.phase = HandPhase.COMPLETE

        # Clear all current bets so stale data doesn't show between hands
        for seat in self.seats:
            if seat:
                seat.current_bet = 0
        self.pots = []

        await asyncio.sleep(5.0)  # pause for players to read the result (who won, how much)

    # ------------------------------------------------------------------
    # Dealing
    # ------------------------------------------------------------------

    def _reset_hand(self) -> None:
        """Reset all seats for a new hand."""
        self.community = []
        self.pots = []
        self.saw_flop = False
        for seat in self.seats:
            if seat is None:
                continue
            # Always clear stale bet data regardless of status
            seat.current_bet = 0
            seat.total_bet = 0
            # Item 7: players who exhausted their bank time and timed out are
            # moved to sitting-out for this and subsequent hands.
            if seat.user_id in self._auto_sitout:
                seat.status = SeatStatus.SITTING_OUT
                self._auto_sitout.discard(seat.user_id)
            # BUG B fix: disconnected players don't get dealt into next hand
            if seat.user_id in self._disconnected_users:
                seat.status = SeatStatus.SITTING_OUT
            if seat.status == SeatStatus.SITTING_OUT:
                # Count the sit-out streak — _cleanup_disconnected kicks at the cap.
                seat.sit_out_hands += 1
                continue
            if seat.stack > 0:
                seat.reset_for_hand()  # resets sit_out_hands to 0
            else:
                seat.status = SeatStatus.SITTING_OUT
                seat.sit_out_hands += 1

    async def _cleanup_disconnected(self) -> None:
        """Remove players who aren't in a hand. Credits stack to bank.

        Two removal triggers: a disconnected player (no WS connection), or a
        player who has sat out too many consecutive hands (item 7 kick).
        """
        if self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE):
            return
        # Hold the seat lock so a concurrent stand_up can't credit the same stack
        # we're about to credit (double-credit race). We also null the seat and
        # capture the amount BEFORE awaiting the credit, so any re-entrant path
        # sees an empty seat.
        async with self._seat_lock:
            connected = self.conn.get_connected_users(self.table_id)
            for i, seat in enumerate(self.seats):
                if seat and seat.status == SeatStatus.SITTING_OUT:
                    if seat.user_id in self._bot_users:
                        continue  # bots don't need WS connections
                    disconnected = seat.user_id not in connected
                    kicked = seat.sit_out_hands >= SIT_OUT_KICK_HANDS
                    if disconnected or kicked:
                        uid = seat.user_id
                        amount = seat.stack
                        reason = "disconnect" if disconnected else "sitout-kick"
                        # Remove the seat first so no other path can re-credit it.
                        self.seats[i] = None
                        self._action_queues.pop(uid, None)
                        self._disconnected_users.discard(uid)
                        self._auto_sitout.discard(uid)
                        if amount > 0 and self._bank:
                            try:
                                await self._bank.credit(uid, amount, tx_type="cashout",
                                                         reference_id=f"table:{self.table_id}:{reason}")
                                log.info("Credited %d to user %d on %s cleanup", amount, uid, reason)
                            except Exception as e:
                                log.error("Failed to credit cleanup stack: user=%d amount=%d: %s", uid, amount, e)
                        if kicked and not disconnected:
                            await self._send_to_player(uid, {
                                "type": ServerMsg.ERROR,
                                "message": "Removed from table after sitting out 3 hands",
                            })
                        await self._broadcast({
                            "type": ServerMsg.SEAT_UPDATE,
                            "seat": i, "user_id": None, "status": "empty",
                        })

    def _advance_dealer(self) -> None:
        """Move dealer button to next occupied seat."""
        seats = self._occupied_seats()
        if not seats:
            return
        if self.dealer_seat < 0:
            self.dealer_seat = seats[0].seat
            return
        # Find next seat after current dealer
        for s in seats:
            if s.seat > self.dealer_seat:
                self.dealer_seat = s.seat
                return
        self.dealer_seat = seats[0].seat  # wrap around

    def _post_blinds(self) -> None:
        """Post small and big blinds."""
        active = [s for s in self.seats if s and s.is_active]
        if len(active) < 2:
            return

        # Find SB and BB positions (C5 fix: don't default to 0 if dealer not active)
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), None
        )
        if dealer_idx is None:
            # Dealer not active — find first active seat after dealer position
            dealer_idx = next(
                (i for i, s in enumerate(active) if s.seat > self.dealer_seat), 0
            )

        if len(active) == 2:
            # Heads-up: dealer posts SB, other posts BB
            sb_player = active[dealer_idx]
            bb_player = active[(dealer_idx + 1) % 2]
        else:
            sb_player = active[(dealer_idx + 1) % len(active)]
            bb_player = active[(dealer_idx + 2) % len(active)]

        self._force_bet(sb_player, min(self.config.small_blind, sb_player.stack))
        self._force_bet(bb_player, min(self.config.big_blind, bb_player.stack))

        # BUG 7 fix: mark players ALL_IN if blind consumed entire stack
        if sb_player.stack == 0:
            sb_player.status = SeatStatus.ALL_IN
        if bb_player.stack == 0:
            bb_player.status = SeatStatus.ALL_IN

        # C3 fix: a short all-in BB does NOT lower the street betting line.
        # The full big blind remains the amount to match; the BB's partial
        # contribution is already recorded and reconciled by side-pot logic.
        self.current_bet = self.config.big_blind
        self.min_raise = self.config.big_blind

    def _deal_hole_cards(self) -> None:
        """Deal 2 cards to each active player (includes ALL_IN from blinds)."""
        for seat in self.seats:
            if seat and seat.is_in_hand:
                seat.hole_cards = self.deck.deal(2)

    async def _send_hole_cards(self) -> None:
        """Send each player their own hole cards (PRIVATE — never broadcast)."""
        for seat in self.seats:
            if seat and seat.hole_cards:
                await self._send_to_player(seat.user_id, {
                    "type": ServerMsg.DEAL,
                    "cards": [str(c) for c in seat.hole_cards],
                })

    def _deal_community(self, street: Street) -> None:
        """Deal community cards for the given street."""
        self.deck.burn()
        if street == Street.FLOP:
            self.community.extend(self.deck.deal(3))
        elif street in (Street.TURN, Street.RIVER):
            self.community.extend(self.deck.deal(1))

    async def _broadcast_community(self, street: Street) -> None:
        """Broadcast community cards to all players."""
        if street == Street.FLOP:
            cards = [str(c) for c in self.community[:3]]
        elif street == Street.TURN:
            cards = [str(self.community[3])]
        else:
            cards = [str(self.community[4])]

        await self._broadcast({
            "type": ServerMsg.COMMUNITY,
            "street": street.value,
            "cards": cards,
            "board": [str(c) for c in self.community],
        })

    # ------------------------------------------------------------------
    # Betting
    # ------------------------------------------------------------------

    async def _run_betting_round(self) -> None:
        """Run a single betting round, collecting actions from players."""
        active = [s for s in self.seats if s and s.is_active]
        if len(active) <= 1:
            log.info("[%s] %s: skipping betting, only %d active",
                     self.table_id, self.street.value, len(active))
            return
        log.info("[%s] === %s BETTING === active=%s, current_bet=%d",
                 self.table_id, self.street.value.upper(),
                 [(s.seat, s.character_name) for s in active], self.current_bet)

        # BUG 1 fix: only reset per-street state on postflop streets.
        # Preflop, blinds are already posted — preserve current_bet on players.
        if self.street != Street.PREFLOP:
            for s in active:
                s.reset_for_street()
            self.current_bet = 0
            self.min_raise = self.config.big_blind
            self.last_raiser = -1
        else:
            # Preflop: just reset has_acted so everyone gets to act,
            # but preserve current_bet (blind amounts already posted).
            for s in active:
                s.has_acted = False
            self.last_raiser = -1

        # Determine first to act
        if self.street == Street.PREFLOP:
            self.action_on = self._preflop_first_actor()
        else:
            self.action_on = self._postflop_first_actor()

        # Collect actions until round is complete
        while True:
            seat = self.seats[self.action_on]
            if seat is None or not seat.is_active:
                if not self._advance_action():
                    break
                continue

            valid = self._get_valid_actions(seat)
            prompt_id = str(uuid4())
            self._current_prompt_id = prompt_id

            # Broadcast who's acting so all clients can show the timer
            await self._broadcast({
                "type": ServerMsg.ACTION_ON,
                "seat": self.action_on,
                "timeout": ACTION_TIMEOUT,
                "prompt_id": prompt_id,
                "turn_token": prompt_id,
            })

            await self._send_to_player(seat.user_id, self.get_action_prompt_for(seat, valid))

            # Wait for action (or timeout → auto-fold)
            log.info("[%s] %s: waiting for seat%d (%s) | cur_bet=%d seat_bet=%d stack=%d",
                     self.table_id, self.street.value, seat.seat, seat.character_name,
                     self.current_bet, seat.current_bet, seat.stack)
            action = await self._wait_for_action(seat.user_id, prompt_id)
            if self._current_prompt_id == prompt_id:
                self._current_prompt_id = None

            # Validate action against legal moves — coerce invalid actions
            valid_set = {a.value for a in valid}
            if action.action.value not in valid_set and action.action != ActionType.ALL_IN:
                to_call = self.current_bet - seat.current_bet
                if to_call > 0 and action.action == ActionType.CHECK:
                    # Can't check when facing a bet — fold instead
                    log.warning("[%s] seat%d sent CHECK facing bet=%d, forcing FOLD",
                                self.table_id, seat.seat, to_call)
                    action = PlayerAction(action=ActionType.FOLD, user_id=seat.user_id)
                elif action.action in (ActionType.BET, ActionType.RAISE) and ActionType.RAISE not in valid and ActionType.BET not in valid:
                    log.warning("[%s] seat%d sent invalid %s, forcing FOLD",
                                self.table_id, seat.seat, action.action.value)
                    action = PlayerAction(action=ActionType.FOLD, user_id=seat.user_id)

            log.info("[%s] %s: seat%d (%s) -> %s amount=%d",
                     self.table_id, self.street.value, seat.seat, seat.character_name,
                     action.action.value, action.amount)
            self._apply_action(seat, action)

            # S4 fix: report the amount actually committed, not what was requested
            # (raises get bumped/clamped). For fold/check there is no amount.
            if action.action in (ActionType.FOLD, ActionType.CHECK):
                committed_amount = 0
            else:
                committed_amount = seat.current_bet

            # Record for hand history
            self._hand_actions.append({
                "user_id": seat.user_id,
                "seat": seat.seat,
                "street": self.street.value,
                "action": action.action.value,
                "amount": committed_amount,
                "order": self._action_order,
            })
            self._action_order += 1

            # Advance to next player first so we can broadcast who's next
            more_action = self._advance_action()
            log.info("[%s] %s: advance -> more_action=%s, action_on=seat%d",
                     self.table_id, self.street.value, more_action, self.action_on)

            # Broadcast the action + who's next
            await self._broadcast({
                "type": ServerMsg.PLAYER_ACTION,
                "seat": seat.seat,
                "user_id": seat.user_id,
                "action": action.action.value,
                "amount": committed_amount,
                "stack": seat.stack,
                "current_bet": seat.current_bet,
                "status": seat.status.value,
                "pot": sum(p.amount for p in self._calculate_current_pots()),
                "action_on": self.action_on if more_action else -1,
            })

            if not more_action:
                break

    def _preflop_first_actor(self) -> int:
        """First to act preflop = UTG (left of BB)."""
        active = [s for s in self.seats if s and s.is_active]
        # C5 fix: don't default to 0 if dealer not active
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), None
        )
        if dealer_idx is None:
            dealer_idx = next(
                (i for i, s in enumerate(active) if s.seat > self.dealer_seat), 0
            )
        if len(active) == 2:
            return active[dealer_idx].seat  # heads-up: dealer acts first preflop
        return active[(dealer_idx + 3) % len(active)].seat

    def _postflop_first_actor(self) -> int:
        """First to act postflop = first active left of dealer."""
        active = [s for s in self.seats if s and s.is_active]
        # C5 fix: don't default to 0 if dealer not active
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), None
        )
        if dealer_idx is None:
            dealer_idx = next(
                (i for i, s in enumerate(active) if s.seat > self.dealer_seat), 0
            )
        return active[(dealer_idx + 1) % len(active)].seat

    def _get_valid_actions(self, seat: PlayerSeat) -> list[ActionType]:
        """Determine legal actions for a player."""
        actions = [ActionType.FOLD]
        to_call = self.current_bet - seat.current_bet

        if to_call <= 0:
            actions.append(ActionType.CHECK)
        else:
            actions.append(ActionType.CALL)

        # Can raise only if the player has chips beyond the call AND the betting
        # is actually open to them. A sub-minimum all-in (an "incomplete raise")
        # does NOT reopen the action — a player facing 0 < to_call < min_raise may
        # only call or fold, never re-raise.
        if seat.stack > to_call:
            if self.current_bet == 0:
                actions.append(ActionType.BET)          # opening bet
            elif to_call == 0 or to_call >= self.min_raise:
                actions.append(ActionType.RAISE)        # facing a full (reopening) bet/raise

        return actions

    async def _next_action_for_prompt(
        self,
        queue: asyncio.Queue[QueuedPlayerAction],
        prompt_id: str,
        timeout: float,
    ) -> PlayerAction:
        """Return the next action for ``prompt_id`` without extending its timer."""
        deadline = asyncio.get_running_loop().time() + timeout
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                raise asyncio.TimeoutError
            queued = await asyncio.wait_for(queue.get(), timeout=remaining)
            if queued.prompt_id == prompt_id:
                return queued.action
            log.debug(
                "Ignoring stale queued action: user=%d expected_prompt=%s got_prompt=%s command=%s",
                queued.action.user_id,
                prompt_id,
                queued.prompt_id,
                queued.command_id,
            )

    async def _wait_for_action(self, user_id: int, prompt_id: str) -> PlayerAction:
        """Wait for an action bound to this exact prompt, with timeout."""
        queue = self._action_queues.get(user_id)
        if queue is None:
            queue = asyncio.Queue()
            self._action_queues[user_id] = queue

        seat = next((s for s in self.seats if s and s.user_id == user_id), None)

        # Base timer.
        try:
            return await self._next_action_for_prompt(queue, prompt_id, ACTION_TIMEOUT)
        except asyncio.TimeoutError:
            pass

        # Base timer expired. Item 7 escalation:
        # 1) If the player still has their one-shot bank time, grant the
        #    extension and wait again. Bank time expiring just folds this turn.
        # 2) Otherwise fold AND mark the player to sit out from the next hand.
        is_bot = seat is not None and seat.user_id in self._bot_users
        if seat is not None and not seat.bank_time_used and not is_bot:
            seat.bank_time_used = True
            await self._broadcast({
                "type": ServerMsg.BANK_TIME_START,
                "seat": seat.seat,
                "user_id": user_id,
                "duration": BANK_TIME,
            })
            log.info("Player %d using bank time (%.0fs)", user_id, BANK_TIME)
            try:
                return await self._next_action_for_prompt(queue, prompt_id, BANK_TIME)
            except asyncio.TimeoutError:
                # Bank time gone — auto-check if free, else fold. Keep the seat.
                if self.current_bet <= seat.current_bet:
                    log.info("Player %d bank time expired — auto-check", user_id)
                    return PlayerAction(action=ActionType.CHECK, user_id=user_id)
                log.info("Player %d bank time expired — auto-fold", user_id)
                return PlayerAction(action=ActionType.FOLD, user_id=user_id)

        # No bank time left — fold and sit the player out from the next hand.
        if seat is not None and not is_bot:
            self._auto_sitout.add(user_id)
            log.info("Player %d timed out, no bank time — auto-fold + sit out", user_id)
        if seat is not None and self.current_bet <= seat.current_bet and is_bot:
            # Bots never accrue sit-out; keep the old auto-check-if-free behavior.
            return PlayerAction(action=ActionType.CHECK, user_id=user_id)
        return PlayerAction(action=ActionType.FOLD, user_id=user_id)

    def _apply_action(self, seat: PlayerSeat, action: PlayerAction) -> None:
        """Apply a player's action to the table state."""
        if action.action == ActionType.FOLD:
            seat.status = SeatStatus.FOLDED

        elif action.action == ActionType.CHECK:
            seat.has_acted = True

        elif action.action == ActionType.CALL:
            to_call = self.current_bet - seat.current_bet
            actual = min(to_call, seat.stack)
            self._force_bet(seat, actual)
            seat.has_acted = True
            if seat.stack == 0:
                seat.status = SeatStatus.ALL_IN

        elif action.action in (ActionType.BET, ActionType.RAISE):
            # BUG 18 fix: coerce amount to int
            amount = int(action.amount)
            to_call = self.current_bet - seat.current_bet

            # Validate: must be at least min_raise (or all-in)
            if amount >= seat.stack + seat.current_bet:
                # All-in
                actual = seat.stack
                self._force_bet(seat, actual)
                new_bet = seat.current_bet
                if new_bet > self.current_bet:
                    raise_inc = new_bet - self.current_bet
                    if raise_inc >= self.min_raise:
                        # Full raise — reopens action (C1 fix: reset has_acted for all other active)
                        self.min_raise = raise_inc
                        self.last_raiser = seat.seat
                        for s in self.seats:
                            if s and s.is_active and s.seat != seat.seat:
                                s.has_acted = False
                    self.current_bet = new_bet
                seat.status = SeatStatus.ALL_IN
            else:
                # Normal raise — bump undersize raises up to the legal minimum
                if amount < self.current_bet + self.min_raise:
                    amount = self.current_bet + self.min_raise
                # S4 fix: a short stack may not cover the bumped target. Clamp to
                # the stack and treat it as an all-in instead of silently setting
                # current_bet to an amount the player never reached.
                max_total = seat.stack + seat.current_bet
                if amount >= max_total:
                    self._force_bet(seat, seat.stack)
                    new_bet = seat.current_bet
                    if new_bet > self.current_bet:
                        raise_inc = new_bet - self.current_bet
                        if raise_inc >= self.min_raise:
                            # Full raise — reopens action
                            self.min_raise = raise_inc
                            self.last_raiser = seat.seat
                            for s in self.seats:
                                if s and s.is_active and s.seat != seat.seat:
                                    s.has_acted = False
                        self.current_bet = new_bet
                    seat.status = SeatStatus.ALL_IN
                else:
                    bet_needed = amount - seat.current_bet
                    self._force_bet(seat, bet_needed)
                    self.min_raise = amount - self.current_bet
                    self.current_bet = amount
                    self.last_raiser = seat.seat
                    # C1 fix: reset has_acted for all other active so action reopens
                    for s in self.seats:
                        if s and s.is_active and s.seat != seat.seat:
                            s.has_acted = False

            seat.has_acted = True

        elif action.action == ActionType.ALL_IN:
            actual = seat.stack
            self._force_bet(seat, actual)
            if seat.current_bet > self.current_bet:
                raise_inc = seat.current_bet - self.current_bet
                if raise_inc >= self.min_raise:
                    # Full raise — reopens action (C1 fix: reset has_acted for all other active)
                    self.min_raise = raise_inc
                    self.last_raiser = seat.seat
                    for s in self.seats:
                        if s and s.is_active and s.seat != seat.seat:
                            s.has_acted = False
                self.current_bet = seat.current_bet
            seat.status = SeatStatus.ALL_IN
            seat.has_acted = True

    def _force_bet(self, seat: PlayerSeat, amount: int) -> None:
        """Deduct chips from a player's stack into their bet."""
        actual = min(amount, seat.stack)
        seat.stack -= actual
        seat.current_bet += actual
        seat.total_bet += actual

    def _advance_action(self) -> bool:
        """Move to the next player to act. Returns False if round is over."""
        active = [s for s in self.seats if s and s.is_active]
        if len(active) <= 1:
            return False

        seat_indices = [s.seat for s in active]

        # Find current position — if the actor just folded/went all-in,
        # they won't be in the active list. Find the next active seat
        # after self.action_on by seat number.
        if self.action_on in seat_indices:
            cur_idx = seat_indices.index(self.action_on)
            next_idx = (cur_idx + 1) % len(seat_indices)
        else:
            # Actor left the active list (fold/all-in). Find the first
            # active seat whose seat number comes after action_on.
            next_idx = 0
            for i, sn in enumerate(seat_indices):
                if sn > self.action_on:
                    next_idx = i
                    break

        next_seat_num = seat_indices[next_idx]
        next_seat = self.seats[next_seat_num]

        # Round is complete when all active players have acted and matched
        all_matched = all(
            s.current_bet == self.current_bet and s.has_acted
            for s in active
        )
        if all_matched:
            return False

        self.action_on = next_seat_num
        return True

    # ------------------------------------------------------------------
    # Showdown and pot distribution
    # ------------------------------------------------------------------

    def _calculate_current_pots(self) -> list[Pot]:
        """Calculate pots from all contributions including folded players (BUG 2 fix)."""
        contributions = {}
        for seat in self.seats:
            if seat and seat.total_bet > 0:
                contributions[seat.seat] = seat.total_bet
        return calculate_pots(contributions)

    def _resolve_showdown(self) -> dict:
        """Evaluate hands, distribute pots, calculate rake."""
        in_hand = [s for s in self.seats if s and s.is_in_hand]

        if len(in_hand) == 1:
            # Everyone else folded — no showdown needed
            winner = in_hand[0]
            total = sum(s.total_bet for s in self.seats if s and s.total_bet > 0)
            rake = self._rake.calculate(total, self.saw_flop)
            winnings = total - rake
            winner.stack += winnings
            return {
                "winners": [{
                    "seat": winner.seat,
                    "user_id": winner.user_id,
                    "amount": winnings,
                    "hand": None,
                }],
                "shown_cards": {},
                "rake": rake,
                "pots": [{"amount": total, "eligible": [winner.seat]}],
                "server_seed": self.deck.seed,
            }

        # Multiple players — evaluate hands and distribute pots
        pots = self._calculate_current_pots()

        # BUG 11 fix: calculate total pot first, apply rake cap once on total
        total_pot = sum(p.amount for p in pots)
        target_rake = self._rake.calculate(total_pot, self.saw_flop)
        winners_list = []
        shown = {}

        # Distribute the rake across pots proportionally. Critical: a pot's rake
        # can NEVER exceed the pot's own amount, or the winner of a tiny pot would
        # be charged more than the pot holds and go negative. Floor each pot's
        # share, cap it at the pot amount, then spill the leftover (from flooring
        # and capping) one chip at a time into the pots with remaining room,
        # largest-first. The actual total rake is the sum of what was taken.
        pot_rakes: list[int] = [0] * len(pots)
        if total_pot > 0 and target_rake > 0:
            assigned = 0
            for i, pot in enumerate(pots):
                pr = min((pot.amount * target_rake) // total_pot, pot.amount)
                pot_rakes[i] = pr
                assigned += pr
            leftover = target_rake - assigned
            order = sorted(range(len(pots)), key=lambda i: pots[i].amount, reverse=True)
            while leftover > 0:
                progressed = False
                for i in order:
                    if leftover <= 0:
                        break
                    if pot_rakes[i] < pots[i].amount:
                        pot_rakes[i] += 1
                        leftover -= 1
                        progressed = True
                if not progressed:
                    break  # no pot can absorb more rake than it holds
        total_rake = sum(pot_rakes)

        # Bug 2 fix: if a side pot has no eligible players (all folded),
        # carry its chips forward to the next pot that does have eligible players.
        orphan_carry = 0

        for pot_idx, pot in enumerate(pots):
            eligible = [
                self.seats[s] for s in pot.eligible
                if self.seats[s] and self.seats[s].is_in_hand
            ]

            pot_rake = pot_rakes[pot_idx]
            distributable = pot.amount - pot_rake + orphan_carry

            if not eligible:
                # No one can win this pot — carry chips forward
                orphan_carry = distributable
                continue

            orphan_carry = 0

            # Evaluate each eligible player's hand
            hand_ranks = []
            for player in eligible:
                rank = evaluate_hand(player.hole_cards, self.community)
                hand_ranks.append((player, rank))

            hand_ranks.sort(key=lambda x: x[1])
            best_rank = hand_ranks[0][1]

            # Find all players tied for best
            pot_winners = [p for p, r in hand_ranks if r == best_rank]

            # Split among winners
            share = distributable // len(pot_winners)
            remainder = distributable % len(pot_winners)

            for i, winner in enumerate(pot_winners):
                won = share + (1 if i < remainder else 0)
                winner.stack += won
                winners_list.append({
                    "seat": winner.seat,
                    "user_id": winner.user_id,
                    "amount": won,
                    "hand": hand_category_name(best_rank),
                })
                shown[str(winner.seat)] = [str(c) for c in winner.hole_cards]

        # If any orphan chips remain (shouldn't happen with 2+ in_hand), give to first winner
        if orphan_carry > 0 and winners_list:
            first_winner_seat = winners_list[0]["seat"]
            self.seats[first_winner_seat].stack += orphan_carry
            winners_list[0]["amount"] += orphan_carry

        # Show all in-hand players' cards at showdown (not just winners)
        for s in self.seats:
            if s and s.is_in_hand and str(s.seat) not in shown:
                shown[str(s.seat)] = [str(c) for c in s.hole_cards]

        return {
            "winners": winners_list,
            "shown_cards": shown,
            "rake": total_rake,
            "pots": [p.to_dict() for p in pots],
            "server_seed": self.deck.seed,
        }

    async def _broadcast_result(self, result: dict) -> None:
        """Broadcast hand result to all players (rake excluded — house info)."""
        broadcast = {
            "type": ServerMsg.HAND_RESULT,
            "community": [str(c) for c in self.community],
            "winners": result["winners"],
            "shown_cards": result["shown_cards"],
            "pots": result["pots"],
            "server_seed": result["server_seed"],
        }
        await self._broadcast(broadcast)

        # H10 fix: broadcast seat updates so stacks reflect immediately
        for seat in self.seats:
            if seat and seat.is_in_hand:
                await self._broadcast({
                    "type": ServerMsg.SEAT_UPDATE,
                    **seat.to_public_dict(),
                })

    async def _persist_hand(
        self, result: dict, starting_stacks: dict[int, int], hand_started: float
    ) -> None:
        """Save hand history and rake to DB via BankService."""
        if not self._bank:
            return

        try:
            # Build player records
            winner_seats = {w["seat"] for w in result.get("winners", [])}
            shown_cards = result.get("shown_cards", {})
            players = []
            for seat in self.seats:
                if seat is None:
                    continue
                if seat.seat not in starting_stacks:
                    continue
                start = starting_stacks[seat.seat]
                end = seat.stack
                net = end - start
                cards_str = " ".join(str(c) for c in seat.hole_cards) if seat.hole_cards else None
                players.append({
                    "user_id": seat.user_id,
                    "seat": seat.seat,
                    "hole_cards": cards_str,
                    "starting_stack": start,
                    "ending_stack": end,
                    "net_won": net,
                    "showed_cards": str(seat.seat) in shown_cards,
                    "is_winner": seat.seat in winner_seats,
                })

            community_str = " ".join(str(c) for c in self.community) if self.community else None
            pot_total = sum(p.get("amount", 0) for p in result.get("pots", []))
            rake = result.get("rake", 0)

            from datetime import datetime, timezone
            started = datetime.fromtimestamp(hand_started, tz=timezone.utc)
            ended = datetime.now(timezone.utc)

            hand_id = await self._bank.save_hand(
                table_id=self.table_id,
                hand_number=self.hand_number,
                server_seed=self.deck.seed,
                server_seed_hash=self.deck.seed_hash,
                community_cards=community_str,
                pot_total=pot_total,
                rake_taken=rake,
                started_at=started,
                ended_at=ended,
                players=players,
                actions=self._hand_actions,
            )

            # Record rake as house revenue
            if rake > 0:
                await self._bank.record_rake(rake, hand_id)

        except Exception as e:
            log.error("Failed to persist hand %d on table %s: %s",
                      self.hand_number, self.table_id, e)

    # ------------------------------------------------------------------
    # Player management (called from WebSocket router)
    # ------------------------------------------------------------------

    async def sit_down(
        self, user_id: int, character_id: int, character_name: str,
        seat: int, buyin: int, command_id: str | None = None,
    ) -> None:
        """Seat a player at the table."""
        async with self._seat_lock:
            await self._sit_down_inner(
                user_id, character_id, character_name, seat, buyin, command_id
            )

    async def _sit_down_inner(
        self, user_id: int, character_id: int, character_name: str,
        seat: int, buyin: int, command_id: str | None = None,
    ) -> None:
        if seat < 0 or seat >= self.config.max_seats:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR, "code": "invalid_seat",
                "message": "Invalid seat number", "command_id": command_id,
            })
            return

        if self.seats[seat] is not None:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR, "code": "seat_occupied",
                "message": "Seat is occupied", "command_id": command_id,
            })
            return

        # Check player isn't already seated elsewhere at this table
        for s in self.seats:
            if s and s.user_id == user_id:
                await self._send_to_player(user_id, {
                    "type": ServerMsg.ERROR, "code": "already_seated",
                    "message": "Already seated at this table", "command_id": command_id,
                })
                return

        if buyin < self.config.min_buyin or buyin > self.config.max_buyin:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "message": f"Buy-in must be between {self.config.min_buyin} and {self.config.max_buyin}",
                "code": "invalid_buyin", "command_id": command_id,
            })
            return

        # Debit balance from DB
        if self._bank:
            try:
                await self._bank.debit(
                    user_id, buyin, tx_type="buyin",
                    reference_id=f"table:{self.table_id}",
                )
            except InsufficientBalance:
                await self._send_to_player(user_id, {
                    "type": ServerMsg.ERROR,
                    "code": "insufficient_balance",
                    "message": "Insufficient wallet balance for this buy-in",
                    "command_id": command_id,
                })
                return
            except Exception:
                log.exception("Buy-in debit failed: table=%s user=%d", self.table_id, user_id)
                await self._send_to_player(user_id, {
                    "type": ServerMsg.ERROR,
                    "code": "buyin_failed",
                    "message": "Unable to complete buy-in",
                    "command_id": command_id,
                })
                return

        self._disconnected_users.discard(user_id)  # clear disconnect flag on reconnect
        player = PlayerSeat(
            seat=seat,
            user_id=user_id,
            character_name=character_name,
            stack=buyin,
            status=SeatStatus.WAITING,
            # BUG 6 fix: use character_id for portrait, not user_id
            portrait_url=f"https://images.evetech.net/characters/{character_id}/portrait?size=128",
        )
        self.seats[seat] = player

        await self._broadcast({
            "type": ServerMsg.SEAT_UPDATE,
            **player.to_public_dict(),
        })
        log.info("Player %s sat at table %s seat %d (buyin=%d)",
                 character_name, self.table_id, seat, buyin)

    async def stand_up(self, user_id: int, command_id: str | None = None) -> None:
        """Remove a player from the table."""
        async with self._seat_lock:
            await self._stand_up_inner(user_id, command_id)

    async def _stand_up_inner(self, user_id: int, command_id: str | None = None) -> None:
        for i, seat in enumerate(self.seats):
            if seat and seat.user_id == user_id:
                # Mid-hand: defer removal until the hand ends. S3 fix — this must
                # also cover a player who has already FOLDED but still has chips in
                # the live pot (total_bet > 0). Nulling that seat now would erase
                # those chips from _calculate_current_pots and shrink the pot.
                mid_hand = self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE)
                if mid_hand and (seat.is_in_hand or seat.total_bet > 0):
                    self._disconnected_users.add(user_id)
                    # Inject fold so _wait_for_action unblocks immediately
                    if seat.is_active:
                        seat.status = SeatStatus.FOLDED
                        if self.action_on == i and self._current_prompt_id is not None:
                            await self._enqueue_action(
                                user_id,
                                PlayerAction(action=ActionType.FOLD, user_id=user_id),
                                self._current_prompt_id,
                                command_id,
                            )
                    self._bump_revision()
                    return

                # Credit remaining stack back to DB balance
                if self._bank and seat.stack > 0:
                    try:
                        await self._bank.credit(
                            user_id, seat.stack, tx_type="cashout",
                            reference_id=f"table:{self.table_id}",
                        )
                    except Exception as e:
                        log.error("Failed to credit stack on stand_up: user=%d err=%s", user_id, e)
                self.seats[i] = None
                self._action_queues.pop(user_id, None)
                self._disconnected_users.discard(user_id)
                await self._broadcast({
                    "type": ServerMsg.SEAT_UPDATE,
                    "seat": i,
                    "user_id": None,
                    "status": "empty",
                })
                log.info("Player %d stood up from table %s seat %d",
                         user_id, self.table_id, i)
                return

    async def handle_player_action(self, user_id: int, raw: dict) -> None:
        """Handle an action message from a player."""
        command_id = raw.get("command_id")
        if isinstance(command_id, str) and command_id in self._recent_command_ids:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "duplicate_command",
                "message": "This command_id was already accepted",
                "command_id": command_id,
            })
            return

        prompt_alias = raw.get("prompt_id")
        turn_token = raw.get("turn_token")
        if prompt_alias is not None and turn_token is not None and prompt_alias != turn_token:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "prompt_token_mismatch",
                "message": "prompt_id and turn_token must match",
                "command_id": command_id,
            })
            return
        if raw.get("schema_version") == 1 and (prompt_alias is None or turn_token is None):
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "missing_prompt_token",
                "message": "Versioned action commands require the current prompt token",
                "command_id": command_id,
            })
            return

        prompt_id = turn_token or prompt_alias
        if prompt_id is not None and prompt_id != self._current_prompt_id:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "stale_prompt",
                "message": "Action does not match the current prompt",
                "command_id": command_id,
                "details": {"expected_prompt_id": self._current_prompt_id},
            })
            return

        acting = self.seats[self.action_on] if 0 <= self.action_on < len(self.seats) else None
        if self.phase != HandPhase.BETTING or acting is None or acting.user_id != user_id:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "not_your_turn",
                "message": "It is not your turn",
                "command_id": command_id,
            })
            return

        # Explicitly unversioned legacy actions may omit the capability, but are
        # still bound to the current prompt at ingress so they cannot leak into
        # a later turn.
        accepted_prompt_id = self._current_prompt_id
        if accepted_prompt_id is None:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "no_active_prompt",
                "message": "There is no active action prompt",
                "command_id": command_id,
            })
            return

        # BUG 18 fix: coerce amount to int, default 0
        try:
            amount = max(0, int(raw.get("amount", 0)))
        except (TypeError, ValueError):
            amount = 0

        # M3 fix: a garbled/missing action must NOT silently fold an attentive
        # player. Reject it and let the action timeout be the only auto-fold path.
        action_str = raw.get("action")
        try:
            action_type = ActionType(action_str)
        except ValueError:
            await self._send_to_player(user_id, {
                "type": ServerMsg.ERROR,
                "code": "invalid_action",
                "message": "Invalid action",
                "command_id": command_id,
            })
            return

        action = PlayerAction(action=action_type, amount=amount, user_id=user_id)
        if isinstance(command_id, str):
            if len(self._recent_command_order) == self._recent_command_order.maxlen:
                expired = self._recent_command_order.popleft()
                self._recent_command_ids.discard(expired)
            self._recent_command_order.append(command_id)
            self._recent_command_ids.add(command_id)
        # Route to the per-player queue, bound to the exact prompt. The waiter
        # may not have started yet; it must not drain this valid fast response.
        await self._enqueue_action(user_id, action, accepted_prompt_id, command_id)

    async def _enqueue_action(
        self,
        user_id: int,
        action: PlayerAction,
        prompt_id: str,
        command_id: str | None = None,
    ) -> None:
        queue = self._action_queues.get(user_id)
        if queue is None:
            queue = asyncio.Queue()
            self._action_queues[user_id] = queue
        await queue.put(QueuedPlayerAction(action, prompt_id, command_id))

    async def enqueue_internal_action(self, user_id: int, action: PlayerAction) -> bool:
        """Queue a trusted bot/system action for the current prompt only."""
        if self._current_prompt_id is None or not (0 <= self.action_on < len(self.seats)):
            return False
        acting = self.seats[self.action_on]
        if acting is None or acting.user_id != user_id:
            return False
        await self._enqueue_action(user_id, action, self._current_prompt_id)
        return True

    async def handle_disconnect(self, user_id: int) -> None:
        """Handle a player disconnecting.

        Tracks user as disconnected so _reset_hand won't deal them in.
        Does NOT immediately fold mid-hand — the 30s action timeout handles
        that. This gives players a chance to reconnect after brief network
        hiccups without losing their hand.
        """
        async with self._event_lock:
            self._disconnected_users.add(user_id)
            for seat in self.seats:
                if seat and seat.user_id == user_id:
                    public_status_changed = False
                    if not seat.is_in_hand and seat.status != SeatStatus.SITTING_OUT:
                        seat.status = SeatStatus.SITTING_OUT
                        public_status_changed = True
                    if public_status_changed:
                        await self._broadcast_locked({
                            "type": ServerMsg.SEAT_UPDATE,
                            **seat.to_public_dict(),
                        })
                    log.info("Player %d disconnected from table %s", user_id, self.table_id)
                    return

    def _restore_reconnected_seat(self, user_id: int) -> PlayerSeat | None:
        """Mutate reconnect state and return a seat whose public status changed."""
        was_disconnected = user_id in self._disconnected_users
        self._disconnected_users.discard(user_id)
        for seat in self.seats:
            if seat and seat.user_id == user_id:
                if (was_disconnected
                        and seat.status == SeatStatus.SITTING_OUT
                        and seat.stack > 0
                        and user_id not in self._auto_sitout):
                    seat.status = SeatStatus.WAITING
                    seat.sit_out_hands = 0
                    return seat
                return None
        return None

    async def handle_reconnect(self, user_id: int) -> None:
        """Clear disconnect flag when a player reconnects.

        If the player was sat out purely because they disconnected (not because
        they exhausted their bank time / went AFK), bring them back to WAITING so
        the next hand deals them in. Without this, a brief network blip would trap
        them in SITTING_OUT and get them kicked after 3 hands.
        """
        async with self._event_lock:
            seat = self._restore_reconnected_seat(user_id)
            if seat is not None:
                await self._broadcast_locked({
                    "type": ServerMsg.SEAT_UPDATE,
                    **seat.to_public_dict(),
                })

    async def add_chips(
        self, user_id: int, amount: int, command_id: str | None = None
    ) -> None:
        """Top up a player's stack between hands."""
        async with self._seat_lock:
            await self._add_chips_inner(user_id, amount, command_id)

    async def _add_chips_inner(
        self, user_id: int, amount: int, command_id: str | None = None
    ) -> None:
        if amount <= 0:
            return
        for seat in self.seats:
            if seat and seat.user_id == user_id:
                if self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE):
                    await self._send_to_player(user_id, {
                        "type": ServerMsg.ERROR,
                        "message": "Can only add chips between hands",
                        "code": "hand_in_progress", "command_id": command_id,
                    })
                    return
                new_stack = seat.stack + amount
                if new_stack > self.config.max_buyin:
                    await self._send_to_player(user_id, {
                        "type": ServerMsg.ERROR,
                        "message": f"Stack would exceed max buy-in ({self.config.max_buyin})",
                        "code": "max_buyin_exceeded", "command_id": command_id,
                    })
                    return
                # Debit balance from DB
                if self._bank:
                    try:
                        await self._bank.debit(
                            user_id, amount, tx_type="buyin",
                            reference_id=f"table:{self.table_id}:topup",
                        )
                    except InsufficientBalance:
                        await self._send_to_player(user_id, {
                            "type": ServerMsg.ERROR,
                            "code": "insufficient_balance",
                            "message": "Insufficient wallet balance for this top-up",
                            "command_id": command_id,
                        })
                        return
                    except Exception:
                        log.exception("Top-up debit failed: table=%s user=%d", self.table_id, user_id)
                        await self._send_to_player(user_id, {
                            "type": ServerMsg.ERROR,
                            "code": "topup_failed",
                            "message": "Unable to complete top-up",
                            "command_id": command_id,
                        })
                        return
                seat.stack = new_stack
                # A rebuy is an explicit "I'm back" — clear any sit-out so the
                # player is dealt in next hand and not kicked for the streak.
                if seat.status == SeatStatus.SITTING_OUT and seat.stack > 0:
                    seat.status = SeatStatus.WAITING
                    seat.sit_out_hands = 0
                    self._auto_sitout.discard(user_id)
                    self._disconnected_users.discard(user_id)
                await self._broadcast({
                    "type": ServerMsg.SEAT_UPDATE,
                    **seat.to_public_dict(),
                })
                return

    # ------------------------------------------------------------------
    # State views
    # ------------------------------------------------------------------

    def get_state_for_player(self, user_id: int) -> dict:
        """Build a full table state snapshot filtered for one player.

        The requesting player sees their own hole cards. Everyone else's
        cards show as null.
        """
        seats_data = []
        your_cards = None

        for i, seat in enumerate(self.seats):
            if seat is None:
                seats_data.append({"seat": i, "status": "empty"})
                continue
            d = seat.to_public_dict()
            if seat.user_id == user_id and seat.hole_cards:
                your_cards = [str(c) for c in seat.hole_cards]
            seats_data.append(d)

        # During the post-hand pause, surface the showdown result so a client
        # that just connected/refreshed still sees who won and how much, and the
        # revealed cards.
        showing = self.phase == HandPhase.COMPLETE and self._last_result is not None
        winners = self._last_result["winners"] if showing else []
        shown_cards = self._last_result["shown_cards"] if showing else {}

        snapshot = TableStateMessage(
            stream_id=self.stream_id,
            revision=self._revision,
            table_id=self.table_id,
            table_name=self.config.name,
            seats=seats_data,
            community=[str(c) for c in self.community],
            pots=[p.to_dict() for p in self._calculate_current_pots()],
            dealer=self.dealer_seat,
            action_on=self.action_on,
            street=self.street.value,
            phase=self.phase.value,
            your_cards=your_cards,
            hand_num=self.hand_number,
            seed_hash=self.deck.seed_hash if self.hand_number > 0 else None,
            winners=winners,
            shown_cards=shown_cards,
            blinds={
                "small": self.config.small_blind,
                "big": self.config.big_blind,
            },
        )
        return snapshot.model_dump(mode="json", exclude_none=False)

    async def bootstrap_connection(self, user_id: int, websocket) -> bool:
        """Activate a connection with an authoritative snapshot as frame one.

        The table event lock prevents a newer public revision from being
        delivered while the personalized snapshot/prompt pair is assembled and
        queued. The connection manager keeps the socket invisible to broadcasts
        until all bootstrap frames have been sent.
        """
        async with self._event_lock:
            reconnected_seat = self._restore_reconnected_seat(user_id)
            if reconnected_seat is not None:
                # Existing ready subscribers see the status transition. The new
                # socket is still not-ready and receives it through its snapshot.
                await self._broadcast_locked({
                    "type": ServerMsg.SEAT_UPDATE,
                    **reconnected_seat.to_public_dict(),
                })

            prompt = None
            if self.action_on >= 0 and self.phase == HandPhase.BETTING:
                seat = self.seats[self.action_on]
                if seat and seat.user_id == user_id and seat.is_active:
                    # Build this first because it may create/bump a missing turn
                    # token. The snapshot must carry the resulting revision.
                    prompt = self.get_action_prompt_for(seat)

            messages = [self.get_state_for_player(user_id)]
            if prompt is not None:
                messages.append(prompt)
            return await self.conn.activate_connection(
                self.table_id, user_id, websocket, messages
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def revision(self) -> int:
        """Current monotonic protocol revision for this table instance."""
        return self._revision

    def _bump_revision(self) -> int:
        self._revision += 1
        return self._revision

    def get_action_prompt_for(
        self, seat: PlayerSeat, valid: list[ActionType] | None = None
    ) -> dict:
        """Build the personalized authoritative prompt for the current turn."""
        if self._current_prompt_id is None:
            self._current_prompt_id = str(uuid4())
            self._bump_revision()
        if valid is None:
            valid = self._get_valid_actions(seat)
        prompt = ActionPromptMessage(
            stream_id=self.stream_id,
            revision=self._revision,
            valid=[action.value for action in valid],
            call_amount=max(0, self.current_bet - seat.current_bet),
            min_raise=self.current_bet + self.min_raise,
            max_raise=seat.stack + seat.current_bet,
            timeout=ACTION_TIMEOUT,
            prompt_id=self._current_prompt_id,
            turn_token=self._current_prompt_id,
        )
        return prompt.model_dump(mode="json")

    async def _send_to_player(self, user_id: int, msg: dict) -> None:
        """Send a private event stamped with this table's current revision."""
        payload = add_server_metadata(msg, self._revision, self.stream_id)
        SERVER_MESSAGE_ADAPTER.validate_python(payload)
        await self.conn.send_to_player(
            self.table_id,
            user_id,
            payload,
        )

    async def broadcast_chat(self, msg: dict) -> None:
        """Publish chat through the same ordered event stream as table events."""
        await self._broadcast(msg)

    def _active_player_count(self) -> int:
        """Count players who can participate in a hand."""
        return sum(
            1 for s in self.seats
            if s and s.status != SeatStatus.SITTING_OUT and s.stack > 0
        )

    def _occupied_seats(self) -> list[PlayerSeat]:
        """All non-empty seats with chips, ordered by seat number."""
        return [
            s for s in self.seats
            if s and s.status != SeatStatus.SITTING_OUT and s.stack > 0
        ]

    async def _broadcast(self, msg: dict) -> None:
        """Send an ordered, versioned event to all table connections."""
        async with self._event_lock:
            await self._broadcast_locked(msg)

    async def _broadcast_locked(self, msg: dict) -> None:
        """Broadcast while the caller owns ``_event_lock``."""
        revision = self._revision + 1
        payload = add_server_metadata(msg, revision, self.stream_id)
        # The same canonical models that generate the frontend schema guard the
        # real outbound boundary. Invalid events fail before revision commit or
        # delivery instead of poisoning client connections.
        SERVER_MESSAGE_ADAPTER.validate_python(payload)
        self._revision = revision
        await self.conn.broadcast_table(
            self.table_id,
            payload,
        )
