"""Hand evaluation — thin wrapper around phevaluator.

Lower rank = stronger hand. Two hands can be compared directly:
the one with the lower evaluate_hand() result wins.
"""

from phevaluator import evaluate_cards

from .types import Card


# phevaluator hand category thresholds (from their docs)
# Rank 1 = Royal Flush, Rank 7462 = worst high card
HAND_CATEGORIES = [
    (1, "Royal Flush"),
    (10, "Straight Flush"),
    (166, "Four of a Kind"),
    (322, "Full House"),
    (1599, "Flush"),
    (1609, "Straight"),
    (2467, "Three of a Kind"),
    (3325, "Two Pair"),
    (6185, "One Pair"),
    (7462, "High Card"),
]


def evaluate_hand(hole_cards: list[Card], community: list[Card]) -> int:
    """Evaluate a poker hand. Returns rank (lower = better).

    Works with 5, 6, or 7 total cards.
    """
    all_cards = [c.to_phe() for c in hole_cards + community]
    return evaluate_cards(*all_cards)


def hand_category_name(rank: int) -> str:
    """Human-readable hand category from a rank integer."""
    for threshold, name in HAND_CATEGORIES:
        if rank <= threshold:
            return name
    return "High Card"
