"""Reproduce the negative-stack bug deterministically and dump the offending hand."""

import asyncio
import random

import backend.poker.table as table_mod
import backend.poker.deck as deck_mod
from backend.poker.table import PokerTable, TableConfig, SeatStatus
from decimal import Decimal

from engine_sim import FakeBank, FakeConn, make_table, total_chips, seat_players  # noqa: F401


async def _noop_sleep(*_a, **_k):
    return None


def patch_deterministic_deck(rng):
    # Replace the CSPRNG seed with a PRNG-derived one so hands reproduce.
    def fake_token_hex(n):
        return ''.join(rng.choice('0123456789abcdef') for _ in range(n * 2))
    deck_mod.secrets.token_hex = fake_token_hex


async def main():
    table_mod.asyncio.sleep = _noop_sleep

    for n in range(2, 10):
        for trial in range(60):
            rng = random.Random(50000 + 1000 * n + trial)
            # Non-deterministic deck (real secrets) — matches the conditions that
            # triggered the bug; we just need to catch one and dump it.
            table, conn, bank = make_table(rng)
            buyin, wallet = 20000, 400000
            await seat_players(table, bank, n, buyin=buyin, wallet=wallet)
            expected = total_chips(table, bank)

            # Capture each showdown result.
            orig = table._resolve_showdown
            def wrap(_orig=orig, _t=table):
                r = _orig()
                _t._last_result = r
                return r
            table._resolve_showdown = wrap

            for h in range(60):
                for s in table.seats:
                    if s and s.stack < table.config.big_blind:
                        need = buyin - s.stack
                        avail = bank.wallets.get(s.user_id, 0)
                        topup = min(need, max(0, avail))
                        if topup > 0:
                            bank.wallets[s.user_id] -= topup
                            s.stack += topup
                        if s.stack >= table.config.big_blind:
                            s.status = SeatStatus.WAITING
                            s.sit_out_hands = 0
                if table._active_player_count() < 2:
                    break

                pre = {i: (s.stack if s else None) for i, s in enumerate(table.seats)}
                await table._play_hand()
                await conn.drain()

                neg = [s for s in table.seats if s and s.stack < 0]
                tot = total_chips(table, bank)
                if neg or tot != expected:
                    print(f"=== BUG n={n} trial={trial} hand={h} ===")
                    print(f"chip total expected={expected} got={tot} (delta={tot-expected})")
                    print("pre-hand stacks:", pre)
                    print("result:", table._last_result)
                    print("post seats:")
                    for s in table.seats:
                        if s:
                            print(f"  seat{s.seat} u{s.user_id} stack={s.stack} total_bet={s.total_bet} status={s.status.value}")
                    print("actions:")
                    for a in table._hand_actions:
                        print("  ", a)
                    print("community:", [str(c) for c in table.community])
                    return

    print("no negative-stack bug reproduced in this sweep")


if __name__ == "__main__":
    asyncio.run(main())
