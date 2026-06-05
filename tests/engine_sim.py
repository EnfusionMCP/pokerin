"""Engine simulation harness — drives the real PokerTable through many hands
at every player count, fuzzing every legal action, asserting hard invariants:

  * chip conservation: wallets + table stacks + rake == constant (between hands)
  * no negative stacks, ever
  * no unhandled exceptions
  * pot accounting matches contributions at showdown

Plus targeted regression tests for the fixes in this session:
  C3 (short all-in BB), S4 (undersize-raise short stack), S3 (folded stand-up),
  side-pot layering, and the bank-time / sit-out / kick escalation.

Run:  source venv/Scripts/activate && python tests/engine_sim.py
"""

import asyncio
import random
import sys
import traceback

import backend.poker.table as table_mod
from backend.poker.table import PokerTable, TableConfig, SeatStatus
from decimal import Decimal


# ----------------------------------------------------------------------------
# Fakes
# ----------------------------------------------------------------------------

class FakeBank:
    """In-memory wallet ledger. Mirrors the BankService surface the table uses."""

    def __init__(self):
        self.wallets: dict[int, int] = {}
        self.rake_collected: int = 0
        self._hand_seq = 0

    async def debit(self, user_id, amount, tx_type="buyin", reference_id=None):
        if amount <= 0:
            raise ValueError("debit must be positive")
        bal = self.wallets.get(user_id, 0)
        if bal - amount < 0:
            raise ValueError(f"insufficient: user {user_id} has {bal}, needs {amount}")
        self.wallets[user_id] = bal - amount
        return self.wallets[user_id]

    async def credit(self, user_id, amount, tx_type="cashout", reference_id=None):
        if amount < 0:
            raise ValueError("cannot credit negative")
        if amount == 0:
            return self.wallets.get(user_id, 0)
        self.wallets[user_id] = self.wallets.get(user_id, 0) + amount
        return self.wallets[user_id]

    async def save_hand(self, **kwargs):
        self._hand_seq += 1
        return self._hand_seq

    async def record_rake(self, amount, hand_id):
        if amount > 0:
            self.rake_collected += amount


class FakeConn:
    """Connection manager that auto-responds to ACTION_PROMPT with a (legal,
    randomized) action — the coverage fuzzer. Records broadcasts for assertions."""

    def __init__(self, rng: random.Random):
        self.rng = rng
        self.table: PokerTable | None = None
        self.skip_users: set[int] = set()    # users who never respond (timeout test)
        self.bank_time_starts: list[dict] = []
        self.errors_to: list[tuple[int, str]] = []
        self._pending: list[asyncio.Task] = []
        self.seated: set[int] = set()
        # optional hook: called after each ACTION_PROMPT scheduling, with (user_id, msg)
        self.on_prompt = None

    def get_connected_users(self, table_id):
        return set(self.seated)

    async def broadcast_table(self, table_id, msg):
        if msg.get("type") == "bank_time_start":
            self.bank_time_starts.append(msg)

    async def send_to_player(self, table_id, user_id, msg):
        mtype = msg.get("type")
        if mtype == "bank_time_start":
            self.bank_time_starts.append(msg)
        elif mtype == "error":
            self.errors_to.append((user_id, msg.get("message", "")))
        elif mtype == "action_prompt":
            if user_id in self.skip_users:
                return  # never respond → exercises timeout/bank-time path
            # Schedule the response AFTER _wait_for_action starts awaiting,
            # so its stale-drain doesn't eat our action.
            t = asyncio.create_task(self._respond(user_id, dict(msg)))
            self._pending.append(t)
            if self.on_prompt:
                self.on_prompt(user_id, msg)

    async def _respond(self, user_id, msg):
        assert self.table is not None
        valid = set(msg.get("valid", []))
        min_raise = msg.get("min_raise", 0)
        max_raise = msg.get("max_raise", 0)
        r = self.rng.random()

        # Coverage-weighted: bias toward staying in the hand (reach showdowns,
        # build side pots) but regularly raise/all-in and occasionally fold.
        if "check" in valid and r < 0.55:
            action, amount = "check", 0
        elif "call" in valid and r < 0.55:
            action, amount = "call", 0
        elif ("raise" in valid or "bet" in valid) and r < 0.85:
            verb = "raise" if "raise" in valid else "bet"
            if self.rng.random() < 0.30 and max_raise > 0:
                amount = max_raise  # all-in
            else:
                lo, hi = min_raise, max(min_raise, max_raise)
                amount = self.rng.randint(lo, hi) if hi > lo else lo
            action = verb
        elif "call" in valid:
            action, amount = "call", 0
        elif "check" in valid:
            action, amount = "check", 0
        else:
            action, amount = "fold", 0

        await self.table.handle_player_action(user_id, {"action": action, "amount": amount})

    async def drain(self):
        """Let any scheduled responder tasks finish."""
        while self._pending:
            batch = self._pending
            self._pending = []
            await asyncio.gather(*batch, return_exceptions=True)


# ----------------------------------------------------------------------------
# Harness helpers
# ----------------------------------------------------------------------------

async def _noop_sleep(*_a, **_k):
    return None


def make_table(rng, sb=50, bb=100, min_buyin=2000, max_buyin=20000, rake=Decimal("0.05")):
    conn = FakeConn(rng)
    bank = FakeBank()
    cfg = TableConfig(
        id="sim-1", name="Sim", small_blind=sb, big_blind=bb,
        min_buyin=min_buyin, max_buyin=max_buyin, rake_percent=rake, rake_cap=0,
    )
    table = PokerTable(cfg, conn, bank)
    conn.table = table
    return table, conn, bank


def total_chips(table, bank):
    on_table = sum(s.stack for s in table.seats if s)
    in_wallets = sum(bank.wallets.values())
    return on_table + in_wallets + bank.rake_collected


def assert_invariants(table, bank, expected_total, ctx):
    # No negative or absurd stacks
    for s in table.seats:
        if s is not None:
            assert s.stack >= 0, f"{ctx}: seat {s.seat} negative stack {s.stack}"
            assert s.current_bet == 0, f"{ctx}: seat {s.seat} leftover current_bet {s.current_bet} between hands"
    got = total_chips(table, bank)
    assert got == expected_total, f"{ctx}: chip leak — expected {expected_total}, got {got} (Δ={got-expected_total})"


async def seat_players(table, bank, n, buyin, wallet):
    for uid in range(1, n + 1):
        bank.wallets[uid] = wallet
        table.conn.seated.add(uid)
        await table.sit_down(uid, 1000 + uid, f"P{uid}", seat=uid - 1, buyin=buyin)


# ----------------------------------------------------------------------------
# Test 1: full fuzz across every player count
# ----------------------------------------------------------------------------

async def test_fuzz_all_player_counts():
    failures = []
    for n in range(2, 10):
        for trial in range(12):
            rng = random.Random(1000 * n + trial)
            table, conn, bank = make_table(rng)
            buyin = 20000
            wallet = 400000  # fund rebuys so the table stays full across hands
            await seat_players(table, bank, n, buyin=buyin, wallet=wallet)
            expected_total = total_chips(table, bank)  # wallets(0 left) + stacks

            try:
                hands_played = 0
                for h in range(60):
                    # Re-activate / rebuy anyone who busted so we keep ~n players.
                    for s in table.seats:
                        if s is None:
                            continue
                        if s.stack < table.config.big_blind:
                            need = buyin - s.stack
                            avail = bank.wallets.get(s.user_id, 0)
                            topup = min(need, avail)
                            if topup > 0:
                                bank.wallets[s.user_id] -= topup
                                s.stack += topup
                            if s.stack >= table.config.big_blind:
                                s.status = SeatStatus.WAITING
                                s.sit_out_hands = 0
                    if table._active_player_count() < 2:
                        break
                    await table._play_hand()
                    await conn.drain()
                    hands_played += 1
                    assert_invariants(table, bank, expected_total, f"n={n} trial={trial} hand={h}")
                if hands_played < 5:
                    failures.append(f"n={n} trial={trial}: only {hands_played} hands played")
            except Exception:
                failures.append(f"n={n} trial={trial}: EXCEPTION\n{traceback.format_exc()}")
    return failures


# ----------------------------------------------------------------------------
# Test 2: C3 — short all-in BB keeps the betting line at a full big blind
# ----------------------------------------------------------------------------

async def test_c3_short_bb():
    failures = []
    rng = random.Random(7)
    table, conn, bank = make_table(rng, sb=50, bb=100, min_buyin=60, max_buyin=20000)
    # Three players; make the BB short so it posts all-in for < a full BB.
    for uid in range(1, 4):
        bank.wallets[uid] = 100000
        conn.seated.add(uid)
    await table.sit_down(1, 1001, "Dealer", seat=0, buyin=20000)
    await table.sit_down(2, 1002, "SB", seat=1, buyin=20000)
    await table.sit_down(3, 1003, "ShortBB", seat=2, buyin=20000)

    table._reset_hand()
    table.dealer_seat = -1
    table._advance_dealer()  # dealer = seat 0
    # Force the BB (3 players: BB is dealer+2 = seat 2) short.
    table.seats[2].stack = 60
    table._post_blinds()

    if table.current_bet != 100:
        failures.append(f"C3: current_bet should be full BB 100, got {table.current_bet}")
    if table.seats[2].status != SeatStatus.ALL_IN:
        failures.append(f"C3: short BB should be ALL_IN, got {table.seats[2].status}")
    # UTG to-call must be the full big blind, not the short post.
    utg = table.seats[0]
    to_call = table.current_bet - utg.current_bet
    if to_call != 100:
        failures.append(f"C3: UTG to-call should be 100, got {to_call}")
    return failures


# ----------------------------------------------------------------------------
# Test 3: S4 — undersize raise from a short stack becomes a clean all-in
# ----------------------------------------------------------------------------

async def test_s4_short_raise():
    from backend.poker.types import ActionType, PlayerAction
    failures = []
    rng = random.Random(11)
    table, conn, bank = make_table(rng, sb=50, bb=100)
    for uid in range(1, 3):
        bank.wallets[uid] = 100000
        conn.seated.add(uid)
    await table.sit_down(1, 1001, "A", seat=0, buyin=20000)
    await table.sit_down(2, 1002, "B", seat=1, buyin=20000)
    table._reset_hand()
    table.dealer_seat = 0
    table._post_blinds()  # current_bet=100, min_raise=100

    # Seat 0 has only 150 chips; tries to "raise" to 120 (undersize).
    actor = table.seats[0]
    actor.stack = 150 - actor.current_bet  # ensure total commit cap is 150
    start_total = actor.stack + actor.current_bet
    table._apply_action(actor, PlayerAction(action=ActionType.RAISE, amount=120, user_id=1))

    if actor.stack != 0:
        failures.append(f"S4: short raiser should be all-in (stack 0), got {actor.stack}")
    if actor.status != SeatStatus.ALL_IN:
        failures.append(f"S4: short raiser status should be ALL_IN, got {actor.status}")
    if actor.current_bet != start_total:
        failures.append(f"S4: committed {actor.current_bet}, expected all {start_total}")
    if table.current_bet < start_total and table.current_bet != 100:
        failures.append(f"S4: table.current_bet inconsistent: {table.current_bet}")
    return failures


# ----------------------------------------------------------------------------
# Test 4: side-pot layering conserves chips and assigns eligibility correctly
# ----------------------------------------------------------------------------

async def test_side_pots():
    from backend.poker.pot import calculate_pots
    failures = []

    # Layered all-in: 100 / 300 / 300
    pots = calculate_pots({0: 100, 1: 300, 2: 300})
    total = sum(p.amount for p in pots)
    if total != 700:
        failures.append(f"sidepot A: total {total} != 700")
    main = pots[0]
    if not (main.amount == 300 and set(main.eligible) == {0, 1, 2}):
        failures.append(f"sidepot A: main pot wrong: {main.amount} {main.eligible}")
    side = pots[1]
    if not (side.amount == 400 and set(side.eligible) == {1, 2}):
        failures.append(f"sidepot A: side pot wrong: {side.amount} {side.eligible}")

    # Three distinct all-in levels: 50 / 120 / 300 / 300
    pots2 = calculate_pots({0: 50, 1: 120, 2: 300, 3: 300})
    t2 = sum(p.amount for p in pots2)
    if t2 != 770:
        failures.append(f"sidepot B: total {t2} != 770")
    # levels 50,120,300 → 3 pots
    if len(pots2) != 3:
        failures.append(f"sidepot B: expected 3 pots, got {len(pots2)}")
    return failures


# ----------------------------------------------------------------------------
# Test 5: bank-time → sit-out → kick escalation
# ----------------------------------------------------------------------------

async def test_bank_time_escalation():
    failures = []
    # Tiny timers so the test runs instantly.
    orig_to, orig_bt = table_mod.ACTION_TIMEOUT, table_mod.BANK_TIME
    table_mod.ACTION_TIMEOUT = 0.05
    table_mod.BANK_TIME = 0.05
    try:
        rng = random.Random(3)
        table, conn, bank = make_table(rng)
        for uid in range(1, 4):
            bank.wallets[uid] = 100000
            conn.seated.add(uid)
        await table.sit_down(1, 1001, "Responder1", seat=0, buyin=20000)
        await table.sit_down(2, 1002, "Responder2", seat=1, buyin=20000)
        await table.sit_down(3, 1003, "AFK", seat=2, buyin=20000)
        # Seat 3 never responds.
        conn.skip_users.add(3)
        expected_total = total_chips(table, bank)

        afk = next(s for s in table.seats if s and s.user_id == 3)

        # Hand 1: AFK should consume bank time (broadcast), then fold; bank_time_used set.
        await table._play_hand()
        await conn.drain()
        assert_invariants(table, bank, expected_total, "banktime h1")
        if not any(m.get("user_id") == 3 for m in conn.bank_time_starts):
            failures.append("bank-time: no BANK_TIME_START broadcast for AFK on first timeout")
        if not afk.bank_time_used:
            failures.append("bank-time: AFK bank_time_used not set after first timeout")

        # Subsequent hands: AFK times out with no bank time → auto sit-out, then kicked.
        kicked = False
        for h in range(2, 7):
            await table._play_hand()
            await conn.drain()
            assert_invariants(table, bank, expected_total, f"banktime h{h}")
            await table._cleanup_disconnected()  # kick check runs here (phase COMPLETE)
            assert_invariants(table, bank, expected_total, f"banktime h{h} post-cleanup")
            if all((s is None or s.user_id != 3) for s in table.seats):
                kicked = True
                break
        if not kicked:
            failures.append("bank-time: AFK player was never kicked after sitting out 3+ hands")
        # After kick, the AFK player's chips must be back in their wallet (conserved).
        assert_invariants(table, bank, expected_total, "banktime final")
    finally:
        table_mod.ACTION_TIMEOUT, table_mod.BANK_TIME = orig_to, orig_bt
    return failures


# ----------------------------------------------------------------------------
# Test 6: S3 — a folded player standing up mid-hand keeps their pot chips
# ----------------------------------------------------------------------------

async def test_s3_folded_standup():
    from backend.poker.types import ActionType, PlayerAction
    failures = []
    rng = random.Random(5)
    table, conn, bank = make_table(rng, sb=50, bb=100)
    for uid in range(1, 4):
        bank.wallets[uid] = 100000
        conn.seated.add(uid)
    await table.sit_down(1, 1001, "A", seat=0, buyin=20000)
    await table.sit_down(2, 1002, "B", seat=1, buyin=20000)
    await table.sit_down(3, 1003, "Folder", seat=2, buyin=20000)
    expected_total = total_chips(table, bank)

    table._reset_hand()
    table.dealer_seat = 0
    table.phase = table_mod.HandPhase.BETTING
    table._post_blinds()
    # Folder (seat 2) puts some chips in then folds.
    folder = table.seats[2]
    table._force_bet(folder, 500)
    folder.status = SeatStatus.FOLDED
    chips_in_pot_before = sum(s.total_bet for s in table.seats if s)

    # Folder stands up mid-hand — must NOT null the seat or destroy pot chips.
    await table.stand_up(3)

    if table.seats[2] is None:
        failures.append("S3: folded player's seat was nulled mid-hand (pot chips destroyed)")
    chips_in_pot_after = sum(s.total_bet for s in table.seats if s)
    if chips_in_pot_after != chips_in_pot_before:
        failures.append(f"S3: pot chips changed on stand_up: {chips_in_pot_before} -> {chips_in_pot_after}")
    return failures


# ----------------------------------------------------------------------------
# Test 7: rake never exceeds a pot (tiny 1-chip side pot must not go negative)
# ----------------------------------------------------------------------------

async def test_rake_tiny_pot():
    from backend.poker.player import PlayerSeat
    from backend.poker.deck import Deck
    failures = []
    rng = random.Random(99)
    table, conn, bank = make_table(rng, sb=50, bb=100, rake=Decimal("0.05"))

    # The exact contributions that produced a -1 stack: seat 2 puts in ONE chip
    # more than seats 0 and 5, creating a 1-chip side pot that proportional rake
    # rounding tried to over-charge.
    contribs = {0: 57000, 1: 20000, 2: 57001, 3: 20000, 4: 20000, 5: 57000}
    d = Deck()
    d.shuffle("t", 1)
    table.community = d.deal(5)
    for idx, tb in contribs.items():
        s = PlayerSeat(seat=idx, user_id=idx + 1, character_name=f"P{idx}",
                       stack=0, status=SeatStatus.ALL_IN)
        s.total_bet = tb
        s.hole_cards = d.deal(2)
        table.seats[idx] = s
    table.saw_flop = True
    pot_total = sum(contribs.values())

    result = table._resolve_showdown()

    for s in table.seats:
        if s and s.stack < 0:
            failures.append(f"rake-tiny: seat {s.seat} negative stack {s.stack}")
    distributed = sum(s.stack for s in table.seats if s)
    rake = result["rake"]
    if distributed + rake != pot_total:
        failures.append(f"rake-tiny: conservation off — distributed {distributed} + rake {rake} != {pot_total}")
    # Rake should be close to 5% but never more than the pot can give.
    if rake < 0 or rake > pot_total:
        failures.append(f"rake-tiny: implausible rake {rake}")
    return failures


# ----------------------------------------------------------------------------
# Runner
# ----------------------------------------------------------------------------

async def main():
    # Skip the dramatic pauses in _play_hand.
    table_mod.asyncio.sleep = _noop_sleep

    tests = [
        ("fuzz all player counts (2-9)", test_fuzz_all_player_counts),
        ("C3 short all-in BB", test_c3_short_bb),
        ("S4 short undersize raise", test_s4_short_raise),
        ("side-pot layering", test_side_pots),
        ("bank-time / sit-out / kick", test_bank_time_escalation),
        ("S3 folded stand-up", test_s3_folded_standup),
        ("rake never exceeds a pot", test_rake_tiny_pot),
    ]
    all_ok = True
    for name, fn in tests:
        try:
            failures = await fn()
        except Exception:
            print(f"[ERROR] {name}\n{traceback.format_exc()}")
            all_ok = False
            continue
        if failures:
            all_ok = False
            print(f"[FAIL] {name}")
            for f in failures[:20]:
                print(f"        - {f}")
        else:
            print(f"[PASS] {name}")
    print("\n==== " + ("ALL TESTS PASSED" if all_ok else "FAILURES PRESENT") + " ====")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
