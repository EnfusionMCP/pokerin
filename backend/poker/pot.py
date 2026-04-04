"""Pot and side-pot calculation.

When multiple players go all-in for different amounts, the pot splits
into a main pot (everyone can win) and side pots (only players who
contributed enough are eligible).
"""

from dataclasses import dataclass, field


@dataclass
class Pot:
    """A single pot (main or side) with its eligible players."""
    amount: int = 0
    eligible: list[int] = field(default_factory=list)  # seat indices

    def to_dict(self) -> dict:
        return {"amount": self.amount, "eligible": list(self.eligible)}


def calculate_pots(contributions: dict[int, int]) -> list[Pot]:
    """Calculate main pot and side pots from per-seat contributions.

    Args:
        contributions: {seat_index: total_amount_contributed_this_hand}

    Returns:
        List of Pot objects, main pot first, then side pots in order.
    """
    if not contributions:
        return []

    # Sort unique contribution levels
    active = {seat: amt for seat, amt in contributions.items() if amt > 0}
    if not active:
        return []

    levels = sorted(set(active.values()))
    pots: list[Pot] = []
    prev_level = 0

    for level in levels:
        increment = level - prev_level
        eligible = [seat for seat, amt in active.items() if amt >= level]
        pot_amount = increment * len(eligible)
        if pot_amount > 0:
            pots.append(Pot(amount=pot_amount, eligible=eligible))
        prev_level = level

    return pots
