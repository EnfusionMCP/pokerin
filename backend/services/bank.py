"""BankService — centralized balance mutations for the poker tables.

Every ISK movement between a player's wallet and a table goes through
this service. Each operation opens its own short-lived DB session with
SELECT FOR UPDATE to prevent races, records a Transaction, and commits.

The table engine calls these methods from its asyncio task. Sessions are
NOT held open for the duration of a hand — only for the duration of each
individual debit/credit operation.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import async_session
from ..models.hand import Hand, HandAction, HandPlayer
from ..models.ledger import Transaction
from ..models.user import User

log = logging.getLogger(__name__)


class InsufficientBalance(Exception):
    """Raised when a player can't cover a debit."""

    def __init__(self, user_id: int, balance: int, requested: int):
        self.user_id = user_id
        self.balance = balance
        self.requested = requested
        super().__init__(
            f"User {user_id} has {balance} but needs {requested}"
        )


class BankService:
    """Atomic balance operations for poker table buy-ins and cash-outs."""

    async def adjust_balance(
        self,
        user_id: int,
        amount: int,
        tx_type: str,
        reference_id: str | None = None,
    ) -> int:
        """Atomically adjust a user's balance with row-level locking.

        Args:
            user_id: Internal DB user ID.
            amount: Positive = credit, negative = debit.
            tx_type: Transaction type (buyin, cashout, win, loss, rake).
            reference_id: Optional context (hand_id, table_id, etc.).

        Returns:
            New balance after adjustment.

        Raises:
            InsufficientBalance: If debit would make balance negative.
        """
        async with async_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id).with_for_update()
            )
            user = result.scalar_one_or_none()
            if user is None:
                raise ValueError(f"User {user_id} not found")

            new_balance = user.balance + amount
            if new_balance < 0:
                raise InsufficientBalance(user_id, user.balance, abs(amount))

            user.balance = new_balance

            tx = Transaction(
                user_id=user_id,
                type=tx_type,
                amount=amount,
                balance_after=new_balance,
                reference_id=reference_id,
            )
            session.add(tx)
            await session.commit()

            return new_balance

    async def debit(
        self, user_id: int, amount: int, tx_type: str = "buyin",
        reference_id: str | None = None,
    ) -> int:
        """Debit a player's balance (for buy-ins, add-chips).

        Returns new balance. Raises InsufficientBalance if can't cover.
        """
        if amount <= 0:
            raise ValueError("Debit amount must be positive")
        return await self.adjust_balance(user_id, -amount, tx_type, reference_id)

    async def credit(
        self, user_id: int, amount: int, tx_type: str = "cashout",
        reference_id: str | None = None,
    ) -> int:
        """Credit a player's balance (for cash-outs, winnings).

        Returns new balance.
        """
        if amount <= 0:
            return 0  # nothing to credit
        return await self.adjust_balance(user_id, amount, tx_type, reference_id)

    async def check_balance(self, user_id: int) -> int:
        """Read a player's current balance (no lock)."""
        async with async_session() as session:
            user = await session.get(User, user_id)
            if user is None:
                return 0
            return user.balance

    async def save_hand(
        self,
        table_id: str,
        hand_number: int,
        server_seed: str,
        server_seed_hash: str,
        community_cards: str,
        pot_total: int,
        rake_taken: int,
        started_at: datetime,
        ended_at: datetime,
        players: list[dict],
        actions: list[dict],
    ) -> int:
        """Persist a completed hand to the database.

        Args:
            players: List of dicts with keys: user_id, seat, hole_cards,
                     starting_stack, ending_stack, net_won, showed_cards, is_winner
            actions: List of dicts with keys: user_id, seat, street,
                     action, amount, order

        Returns:
            The hand ID.
        """
        async with async_session() as session:
            hand = Hand(
                table_id=table_id,
                hand_number=hand_number,
                server_seed=server_seed,
                server_seed_hash=server_seed_hash,
                community_cards=community_cards,
                pot_total=pot_total,
                rake_taken=rake_taken,
                started_at=started_at,
                ended_at=ended_at,
            )
            session.add(hand)
            await session.flush()  # get hand.id

            for p in players:
                hp = HandPlayer(
                    hand_id=hand.id,
                    user_id=p["user_id"],
                    seat=p["seat"],
                    hole_cards=p.get("hole_cards"),
                    starting_stack=p["starting_stack"],
                    ending_stack=p["ending_stack"],
                    net_won=p["net_won"],
                    showed_cards=p.get("showed_cards", False),
                    is_winner=p.get("is_winner", False),
                )
                session.add(hp)

            for a in actions:
                ha = HandAction(
                    hand_id=hand.id,
                    user_id=a["user_id"],
                    seat=a["seat"],
                    street=a["street"],
                    action_order=a["order"],
                    action=a["action"],
                    amount=a.get("amount", 0),
                )
                session.add(ha)

            await session.commit()
            log.info("Hand %d saved (table=%s, pot=%d, rake=%d, %d players, %d actions)",
                     hand.id, table_id, pot_total, rake_taken, len(players), len(actions))
            return hand.id

    async def record_rake(self, amount: int, hand_id: int) -> None:
        """Record rake as a transaction on the house account (user_id=0).

        For now, rake is simply tracked in the transactions table with
        a special user_id=0 (house). No actual User row needed — it's
        just an accounting entry.
        """
        if amount <= 0:
            return
        async with async_session() as session:
            tx = Transaction(
                user_id=0,  # house account
                type="rake",
                amount=amount,
                balance_after=0,  # house balance not tracked in users table
                reference_id=f"hand:{hand_id}",
            )
            session.add(tx)
            await session.commit()
