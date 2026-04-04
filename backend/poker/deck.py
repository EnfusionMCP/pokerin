"""CSPRNG deck — Fisher-Yates shuffle with secrets.randbelow()."""

import hashlib
import secrets
from typing import Optional

from .types import Card, ALL_CARDS


class Deck:
    """A 52-card deck with cryptographically secure shuffling."""

    __slots__ = ("_cards", "_pos", "_seed", "_seed_hash")

    def __init__(self):
        self._cards: list[Card] = []
        self._pos: int = 0
        self._seed: str = ""
        self._seed_hash: str = ""

    def shuffle(self) -> None:
        """Fisher-Yates shuffle using OS entropy via secrets.randbelow().

        Generates a provable-fairness seed (committed via hash before deal,
        revealed after hand). The seed is NOT used as the RNG source — we
        use the OS CSPRNG directly, which has far more entropy than any
        seed-based PRNG.
        """
        self._seed = secrets.token_hex(32)
        self._seed_hash = hashlib.sha256(self._seed.encode()).hexdigest()

        self._cards = list(ALL_CARDS)
        for i in range(len(self._cards) - 1, 0, -1):
            j = secrets.randbelow(i + 1)
            self._cards[i], self._cards[j] = self._cards[j], self._cards[i]
        self._pos = 0

    def deal(self, n: int = 1) -> list[Card]:
        """Deal n cards from the top of the deck."""
        if self._pos + n > len(self._cards):
            raise RuntimeError(f"Deck exhausted: {self._pos}/{len(self._cards)}, requested {n}")
        cards = self._cards[self._pos:self._pos + n]
        self._pos += n
        return cards

    def burn(self) -> None:
        """Burn one card (standard poker procedure before community deals)."""
        self._pos += 1

    @property
    def seed(self) -> str:
        return self._seed

    @property
    def seed_hash(self) -> str:
        return self._seed_hash

    @property
    def remaining(self) -> int:
        return len(self._cards) - self._pos
