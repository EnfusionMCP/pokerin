"""Pytest adapter for the deterministic engine simulation harness."""

import pytest

from tests import engine_sim


CASES = [
    ("fuzz-all-player-counts", engine_sim.test_fuzz_all_player_counts),
    ("short-all-in-big-blind", engine_sim.test_c3_short_bb),
    ("short-undersize-raise", engine_sim.test_s4_short_raise),
    ("side-pot-layering", engine_sim.test_side_pots),
    ("bank-time-sit-out-kick", engine_sim.test_bank_time_escalation),
    ("folded-player-stand-up", engine_sim.test_s3_folded_standup),
    ("rake-does-not-overflow", engine_sim.test_rake_tiny_pot),
    ("under-raise-gate", engine_sim.test_underraise_gate),
    ("reconnect-restores-player", engine_sim.test_reconnect_restores),
    ("rebuy-reactivates-player", engine_sim.test_rebuy_reactivates),
    ("cleanup-is-idempotent", engine_sim.test_cleanup_no_double_credit),
]


@pytest.mark.parametrize(("_case_name", "case"), CASES, ids=[case[0] for case in CASES])
async def test_engine_regression(
    _case_name: str,
    case,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Remove deliberate gameplay pauses while retaining the production engine.
    monkeypatch.setattr(engine_sim.table_mod.asyncio, "sleep", engine_sim._noop_sleep)
    failures = await case()
    assert failures == []
