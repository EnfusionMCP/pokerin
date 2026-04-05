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
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from .deck import Deck
from .evaluator import evaluate_hand, hand_category_name
from .player import PlayerSeat
from .pot import Pot, calculate_pots
from .rake import RakeCalculator
from .types import (
    ActionType, Card, HandPhase, PlayerAction, SeatStatus, Street,
    RANK_CHARS, SUIT_CHARS,
)
from ..ws.protocol import ServerMsg

log = logging.getLogger(__name__)

ACTION_TIMEOUT = 30.0  # seconds per action
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


class PokerTable:
    """A single poker table running as an asyncio task."""

    def __init__(self, config: TableConfig, conn_manager, bank=None):
        self.config = config
        self.table_id = config.id
        self.conn = conn_manager
        self._bank = bank  # BankService for DB balance operations

        # Lock for seat mutations (sit_down, stand_up, add_chips)
        self._seat_lock = asyncio.Lock()

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
        self._action_queues: dict[int, asyncio.Queue] = {}
        self._shutdown = asyncio.Event()
        # Track disconnected user IDs for cleanup between hands (BUG B fix)
        self._disconnected_users: set[int] = set()
        # Bot user IDs — these are never cleaned up by _cleanup_disconnected
        self._bot_users: set[int] = set()

        # Rake
        self._rake = RakeCalculator(config.rake_percent, config.rake_cap)

        # Hand history for DB persistence
        self._hand_actions: list[dict] = []
        self._action_order: int = 0

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

        self.deck.shuffle()
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
        await self._broadcast_result(result)

        # Persist hand history and rake to DB
        await self._persist_hand(result, starting_stacks, hand_started)

        self.phase = HandPhase.COMPLETE

        # Clear all current bets so stale data doesn't show between hands
        for seat in self.seats:
            if seat:
                seat.current_bet = 0
        self.pots = []

        await asyncio.sleep(3.0)  # pause for players to see the result

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
            # BUG B fix: disconnected players don't get dealt into next hand
            if seat.user_id in self._disconnected_users:
                seat.status = SeatStatus.SITTING_OUT
                continue
            if seat.status != SeatStatus.SITTING_OUT:
                if seat.stack > 0:
                    seat.reset_for_hand()
                else:
                    seat.status = SeatStatus.SITTING_OUT

    async def _cleanup_disconnected(self) -> None:
        """Remove disconnected players who aren't in a hand. Credits stack to bank."""
        if self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE):
            return
        connected = self.conn.get_connected_users(self.table_id)
        for i, seat in enumerate(self.seats):
            if seat and seat.status == SeatStatus.SITTING_OUT:
                if seat.user_id in self._bot_users:
                    continue  # bots don't need WS connections
                if seat.user_id not in connected:
                    uid = seat.user_id
                    # Credit remaining stack back to bank before removing
                    if seat.stack > 0 and self._bank:
                        try:
                            await self._bank.credit(uid, seat.stack, tx_type="cashout",
                                                     reference_id=f"table:{self.table_id}:disconnect")
                            log.info("Credited %d to user %d on disconnect cleanup", seat.stack, uid)
                        except Exception as e:
                            log.error("Failed to credit disconnect stack: user=%d amount=%d: %s", uid, seat.stack, e)
                    self.seats[i] = None
                    self._action_queues.pop(uid, None)
                    self._disconnected_users.discard(uid)

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

        # Find SB and BB positions
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), 0
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

        # Bug 5 fix: use actual BB bet (may be less if short-stacked)
        self.current_bet = bb_player.current_bet
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
                await self.conn.send_to_player(self.table_id, seat.user_id, {
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

            # Broadcast who's acting so all clients can show the timer
            await self._broadcast({
                "type": "action_on",
                "seat": self.action_on,
                "timeout": ACTION_TIMEOUT,
            })

            await self.conn.send_to_player(self.table_id, seat.user_id, {
                "type": ServerMsg.ACTION_PROMPT,
                "valid": [a.value for a in valid],
                "call_amount": max(0, self.current_bet - seat.current_bet),
                "min_raise": self.current_bet + self.min_raise,
                "max_raise": seat.stack + seat.current_bet,
                "timeout": ACTION_TIMEOUT,
            })

            # Wait for action (or timeout → auto-fold)
            log.info("[%s] %s: waiting for seat%d (%s) | cur_bet=%d seat_bet=%d stack=%d",
                     self.table_id, self.street.value, seat.seat, seat.character_name,
                     self.current_bet, seat.current_bet, seat.stack)
            action = await self._wait_for_action(seat.user_id)

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

            # Record for hand history
            self._hand_actions.append({
                "user_id": seat.user_id,
                "seat": seat.seat,
                "street": self.street.value,
                "action": action.action.value,
                "amount": action.amount,
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
                "amount": action.amount,
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
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), 0
        )
        if len(active) == 2:
            return active[dealer_idx].seat  # heads-up: dealer acts first preflop
        return active[(dealer_idx + 3) % len(active)].seat

    def _postflop_first_actor(self) -> int:
        """First to act postflop = first active left of dealer."""
        active = [s for s in self.seats if s and s.is_active]
        dealer_idx = next(
            (i for i, s in enumerate(active) if s.seat == self.dealer_seat), 0
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

        # Can raise if not already all-in and have chips beyond calling
        if seat.stack > to_call:
            if self.current_bet == 0:
                actions.append(ActionType.BET)
            else:
                actions.append(ActionType.RAISE)

        return actions

    async def _wait_for_action(self, user_id: int) -> PlayerAction:
        """Wait for a player action from their per-player queue, with timeout."""
        queue = self._action_queues.get(user_id)
        if queue is None:
            queue = asyncio.Queue()
            self._action_queues[user_id] = queue

        # Drain any stale actions left in the queue from previous turns
        while not queue.empty():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                break

        try:
            action = await asyncio.wait_for(queue.get(), timeout=ACTION_TIMEOUT)
            return action
        except asyncio.TimeoutError:
            # Auto-check if free, otherwise fold
            seat = next((s for s in self.seats if s and s.user_id == user_id), None)
            if seat and self.current_bet <= seat.current_bet:
                log.info("Player %d timed out — auto-check", user_id)
                return PlayerAction(action=ActionType.CHECK, user_id=user_id)
            log.info("Player %d timed out — auto-fold", user_id)
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
                        # Full raise — reopens action
                        self.min_raise = raise_inc
                        self.last_raiser = seat.seat
                    self.current_bet = new_bet
                seat.status = SeatStatus.ALL_IN
            else:
                # Normal raise
                if amount < self.current_bet + self.min_raise:
                    amount = self.current_bet + self.min_raise
                bet_needed = amount - seat.current_bet
                self._force_bet(seat, bet_needed)
                self.min_raise = amount - self.current_bet
                self.current_bet = amount
                self.last_raiser = seat.seat

            seat.has_acted = True

        elif action.action == ActionType.ALL_IN:
            actual = seat.stack
            self._force_bet(seat, actual)
            if seat.current_bet > self.current_bet:
                raise_inc = seat.current_bet - self.current_bet
                if raise_inc >= self.min_raise:
                    # Full raise — reopens action
                    self.min_raise = raise_inc
                    self.last_raiser = seat.seat
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
        uncapped_rake = self._rake.calculate(total_pot, self.saw_flop)
        # Distribute rake proportionally across pots
        total_rake = uncapped_rake
        winners_list = []
        shown = {}

        # Pre-compute per-pot rake with remainder assigned to last pot (BUG G fix)
        pot_rakes: list[int] = []
        rake_assigned = 0
        for i, pot in enumerate(pots):
            if total_pot > 0 and i < len(pots) - 1:
                pr = (pot.amount * total_rake) // total_pot
            elif total_pot > 0:
                pr = total_rake - rake_assigned  # last pot gets remainder
            else:
                pr = 0
            pot_rakes.append(pr)
            rake_assigned += pr

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
        seat: int, buyin: int,
    ) -> None:
        """Seat a player at the table."""
        async with self._seat_lock:
            await self._sit_down_inner(user_id, character_id, character_name, seat, buyin)

    async def _sit_down_inner(
        self, user_id: int, character_id: int, character_name: str,
        seat: int, buyin: int,
    ) -> None:
        if seat < 0 or seat >= self.config.max_seats:
            await self.conn.send_to_player(self.table_id, user_id, {
                "type": ServerMsg.ERROR, "message": "Invalid seat number",
            })
            return

        if self.seats[seat] is not None:
            await self.conn.send_to_player(self.table_id, user_id, {
                "type": ServerMsg.ERROR, "message": "Seat is occupied",
            })
            return

        # Check player isn't already seated elsewhere at this table
        for s in self.seats:
            if s and s.user_id == user_id:
                await self.conn.send_to_player(self.table_id, user_id, {
                    "type": ServerMsg.ERROR, "message": "Already seated at this table",
                })
                return

        if buyin < self.config.min_buyin or buyin > self.config.max_buyin:
            await self.conn.send_to_player(self.table_id, user_id, {
                "type": ServerMsg.ERROR,
                "message": f"Buy-in must be between {self.config.min_buyin} and {self.config.max_buyin}",
            })
            return

        # Debit balance from DB
        if self._bank:
            try:
                await self._bank.debit(
                    user_id, buyin, tx_type="buyin",
                    reference_id=f"table:{self.table_id}",
                )
            except Exception as e:
                await self.conn.send_to_player(self.table_id, user_id, {
                    "type": ServerMsg.ERROR, "message": str(e),
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

    async def stand_up(self, user_id: int) -> None:
        """Remove a player from the table."""
        async with self._seat_lock:
            await self._stand_up_inner(user_id)

    async def _stand_up_inner(self, user_id: int) -> None:
        for i, seat in enumerate(self.seats):
            if seat and seat.user_id == user_id:
                # Mid-hand: fold and queue for removal after hand ends
                if seat.is_in_hand and self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE):
                    self._disconnected_users.add(user_id)
                    # Inject fold so _wait_for_action unblocks immediately
                    if seat.is_active:
                        seat.status = SeatStatus.FOLDED
                        queue = self._action_queues.get(user_id)
                        if queue is None:
                            queue = asyncio.Queue()
                            self._action_queues[user_id] = queue
                        await queue.put(PlayerAction(action=ActionType.FOLD, user_id=user_id))
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
        action_str = raw.get("action", "fold")
        # BUG 18 fix: coerce amount to int, default 0
        try:
            amount = max(0, int(raw.get("amount", 0)))
        except (TypeError, ValueError):
            amount = 0

        try:
            action_type = ActionType(action_str)
        except ValueError:
            action_type = ActionType.FOLD

        action = PlayerAction(action=action_type, amount=amount, user_id=user_id)
        # Route to per-player queue (BUG A fix)
        queue = self._action_queues.get(user_id)
        if queue is None:
            queue = asyncio.Queue()
            self._action_queues[user_id] = queue
        await queue.put(action)

    async def handle_disconnect(self, user_id: int) -> None:
        """Handle a player disconnecting.

        Tracks user as disconnected so _reset_hand won't deal them in.
        Does NOT immediately fold mid-hand — the 30s action timeout handles
        that. This gives players a chance to reconnect after brief network
        hiccups without losing their hand.
        """
        self._disconnected_users.add(user_id)
        for seat in self.seats:
            if seat and seat.user_id == user_id:
                if not seat.is_in_hand:
                    seat.status = SeatStatus.SITTING_OUT
                log.info("Player %d disconnected from table %s", user_id, self.table_id)
                return

    def handle_reconnect(self, user_id: int) -> None:
        """Clear disconnect flag when a player reconnects mid-hand."""
        self._disconnected_users.discard(user_id)

    async def add_chips(self, user_id: int, amount: int) -> None:
        """Top up a player's stack between hands."""
        async with self._seat_lock:
            await self._add_chips_inner(user_id, amount)

    async def _add_chips_inner(self, user_id: int, amount: int) -> None:
        if amount <= 0:
            return
        for seat in self.seats:
            if seat and seat.user_id == user_id:
                if self.phase not in (HandPhase.IDLE, HandPhase.COMPLETE):
                    await self.conn.send_to_player(self.table_id, user_id, {
                        "type": ServerMsg.ERROR,
                        "message": "Can only add chips between hands",
                    })
                    return
                new_stack = seat.stack + amount
                if new_stack > self.config.max_buyin:
                    await self.conn.send_to_player(self.table_id, user_id, {
                        "type": ServerMsg.ERROR,
                        "message": f"Stack would exceed max buy-in ({self.config.max_buyin})",
                    })
                    return
                # Debit balance from DB
                if self._bank:
                    try:
                        await self._bank.debit(
                            user_id, amount, tx_type="buyin",
                            reference_id=f"table:{self.table_id}:topup",
                        )
                    except Exception as e:
                        await self.conn.send_to_player(self.table_id, user_id, {
                            "type": ServerMsg.ERROR, "message": str(e),
                        })
                        return
                seat.stack = new_stack
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

        return {
            "type": ServerMsg.TABLE_STATE,
            "table_id": self.table_id,
            "table_name": self.config.name,
            "seats": seats_data,
            "community": [str(c) for c in self.community],
            "pots": [p.to_dict() for p in self._calculate_current_pots()],
            "dealer": self.dealer_seat,
            "action_on": self.action_on,
            "street": self.street.value,
            "phase": self.phase.value,
            "your_cards": your_cards,
            "hand_num": self.hand_number,
            "seed_hash": self.deck.seed_hash if self.hand_number > 0 else None,
            "blinds": {
                "small": self.config.small_blind,
                "big": self.config.big_blind,
            },
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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
        """Send a message to all connected players at this table."""
        await self.conn.broadcast_table(self.table_id, msg)
