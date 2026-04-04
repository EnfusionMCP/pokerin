"""Hand history API — view past hands."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models.hand import Hand, HandAction, HandPlayer

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/hands")
async def list_hands(
    limit: int = 50,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List recent hands the current user participated in."""
    result = await session.execute(
        select(HandPlayer.hand_id)
        .where(HandPlayer.user_id == user["user_id"])
        .order_by(HandPlayer.hand_id.desc())
        .limit(min(limit, 200))
    )
    hand_ids = [row[0] for row in result.all()]

    if not hand_ids:
        return []

    result = await session.execute(
        select(Hand).where(Hand.id.in_(hand_ids)).order_by(Hand.id.desc())
    )
    hands = result.scalars().all()

    return [
        {
            "id": h.id,
            "table_id": h.table_id,
            "hand_number": h.hand_number,
            "community_cards": h.community_cards,
            "pot_total": h.pot_total,
            "rake_taken": h.rake_taken,
            "started_at": h.started_at.isoformat(),
            "ended_at": h.ended_at.isoformat(),
            "server_seed_hash": h.server_seed_hash,
        }
        for h in hands
    ]


@router.get("/hands/{hand_id}")
async def get_hand(
    hand_id: int,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get full detail for a specific hand, including provable fairness seed."""
    hand = await session.get(Hand, hand_id)
    if not hand:
        raise HTTPException(status_code=404, detail="Hand not found")

    # Get players
    result = await session.execute(
        select(HandPlayer).where(HandPlayer.hand_id == hand_id)
    )
    players = result.scalars().all()

    # BUG 9 fix: only participants can view hand details
    participant_ids = {p.user_id for p in players}
    if user["user_id"] not in participant_ids:
        raise HTTPException(status_code=403, detail="You did not participate in this hand")

    # Only show hole cards for the requesting user or if they showed
    player_data = []
    for p in players:
        show_cards = (p.user_id == user["user_id"]) or p.showed_cards
        player_data.append({
            "user_id": p.user_id,
            "seat": p.seat,
            "hole_cards": p.hole_cards if show_cards else None,
            "starting_stack": p.starting_stack,
            "ending_stack": p.ending_stack,
            "net_won": p.net_won,
            "is_winner": p.is_winner,
        })

    # Get actions
    result = await session.execute(
        select(HandAction)
        .where(HandAction.hand_id == hand_id)
        .order_by(HandAction.action_order)
    )
    actions = result.scalars().all()

    return {
        "id": hand.id,
        "table_id": hand.table_id,
        "hand_number": hand.hand_number,
        "community_cards": hand.community_cards,
        "pot_total": hand.pot_total,
        "rake_taken": hand.rake_taken,
        "started_at": hand.started_at.isoformat(),
        "ended_at": hand.ended_at.isoformat(),
        "server_seed": hand.server_seed,
        "server_seed_hash": hand.server_seed_hash,
        "players": player_data,
        "actions": [
            {
                "user_id": a.user_id,
                "seat": a.seat,
                "street": a.street,
                "action": a.action,
                "amount": a.amount,
                "order": a.action_order,
            }
            for a in actions
        ],
    }
