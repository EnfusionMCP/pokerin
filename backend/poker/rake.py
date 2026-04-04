"""Rake calculation — no flop, no drop."""

from decimal import Decimal


class RakeCalculator:
    """Calculates rake for a single hand."""

    __slots__ = ("percent", "cap")

    def __init__(self, percent: Decimal, cap: int):
        """
        Args:
            percent: Rake percentage as decimal (e.g. Decimal("0.03") for 3%).
            cap: Maximum rake in ISK-cents (balance units, ISK x 100).
        """
        self.percent = percent
        self.cap = cap

    def calculate(self, pot_total: int, saw_flop: bool) -> int:
        """Calculate rake for a hand.

        No flop, no drop: if the hand ended before the flop was dealt,
        no rake is taken regardless of pot size.

        Args:
            pot_total: Total pot in ISK-cents.
            saw_flop: Whether community cards were dealt.

        Returns:
            Rake amount in ISK-cents.
        """
        if not saw_flop:
            return 0
        rake = int(pot_total * self.percent)
        return min(rake, self.cap)
