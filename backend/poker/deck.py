"""Provably fair deck — HMAC-SHA256 deterministic Fisher-Yates shuffle."""

import hashlib
import hmac
import secrets

from .types import Card, ALL_CARDS


def _hmac_shuffle(cards: list[Card], seed_hex: str, table_id: str, hand_number: int) -> None:
    """Fisher-Yates shuffle driven by HMAC-SHA256 in counter mode.

    For each swap step i (51 down to 1):
      Rejection sampling to ensure unbiased distribution:
      Compute until h[:4] < floor(2^32 / (i+1)) * (i+1), then j = h[:4] % (i+1)
    """
    key = bytes.fromhex(seed_hex)
    counter = 0
    for i in range(len(cards) - 1, 0, -1):
        limit = (0x100000000 // (i + 1)) * (i + 1)
        while True:
            h = hmac.new(key, f"{table_id}:{hand_number}:{counter}".encode(), hashlib.sha256).digest()
            counter += 1
            v = int.from_bytes(h[:4], "big")
            if v < limit:
                j = v % (i + 1)
                break
        cards[i], cards[j] = cards[j], cards[i]


class Deck:
    """A 52-card deck with provably fair deterministic shuffling."""

    __slots__ = ("_cards", "_pos", "_seed", "_seed_hash")

    def __init__(self):
        self._cards: list[Card] = []
        self._pos: int = 0
        self._seed: str = ""
        self._seed_hash: str = ""

    def shuffle(self, table_id: str, hand_number: int) -> None:
        """Generate a random seed and deterministically shuffle the deck.

        The seed is committed via SHA-256 hash before the deal and revealed
        after the hand. Anyone with the seed, table_id, and hand_number can
        reproduce the exact deck order using Deck.reproduce().
        """
        self._seed = secrets.token_hex(32)
        self._seed_hash = hashlib.sha256(self._seed.encode()).hexdigest()

        self._cards = list(ALL_CARDS)
        _hmac_shuffle(self._cards, self._seed, table_id, hand_number)
        self._pos = 0

    @staticmethod
    def reproduce(server_seed: str, table_id: str, hand_number: int) -> list[str]:
        """Reproduce the exact deck order from a revealed seed.

        Returns the full 52-card deck as a list of card strings (e.g. ["Ah", "2c", ...]).
        This is the verification primitive — compare against dealt cards to confirm fairness.
        """
        cards = list(ALL_CARDS)
        _hmac_shuffle(cards, server_seed, table_id, hand_number)
        return [str(c) for c in cards]

    def deal(self, n: int = 1) -> list[Card]:
        """Deal n cards from the top of the deck."""
        if self._pos + n > len(self._cards):
            raise RuntimeError(f"Deck exhausted: {self._pos}/{len(self._cards)}, requested {n}")
        cards = self._cards[self._pos:self._pos + n]
        self._pos += n
        return cards

    def burn(self) -> None:
        """Burn one card (standard poker procedure before community deals)."""
        if self._pos >= len(self._cards):
            raise RuntimeError("Deck exhausted — cannot burn")
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
