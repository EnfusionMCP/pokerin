"""Admin API — withdrawal management, user management, bot tokens, rake stats."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.jwt import create_token
from ..deps import get_admin_user, get_db
from ..models.user import User
from ..models.ledger import Transaction, Withdrawal
from ..models.hand import Hand, HandAction, HandPlayer
from ..services.withdrawal_worker import complete_withdrawal, reject_withdrawal

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Withdrawals ---

@router.get("/withdrawals")
async def list_withdrawals(
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Withdrawal)
        .where(Withdrawal.status == "pending")
        .order_by(Withdrawal.created_at.asc())
    )
    rows = result.scalars().all()
    out = []
    for w in rows:
        user = await session.get(User, w.user_id)
        out.append({
            "id": w.id,
            "user_id": w.user_id,
            "character_name": user.character_name if user else "unknown",
            "amount": w.amount,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })
    return out


@router.post("/withdrawals/{withdrawal_id}/complete")
async def complete_withdrawal_route(
    withdrawal_id: int,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        await complete_withdrawal(session, withdrawal_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "completed"}


@router.post("/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal_route(
    withdrawal_id: int,
    reason: str = "",
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        await reject_withdrawal(session, withdrawal_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "rejected"}


# --- Users ---

@router.get("/users")
async def list_users(
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(User).order_by(User.id.asc()).limit(200)
    )
    return [
        {
            "id": u.id,
            "character_id": u.character_id,
            "character_name": u.character_name,
            "balance": u.balance,
            "is_banned": u.is_banned,
            "is_bot": u.is_bot,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in result.scalars().all()
    ]


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    reason: str = "",
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = True
    user.ban_reason = reason
    await session.commit()
    return {"status": "banned", "user_id": user_id}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    user.ban_reason = None
    await session.commit()
    return {"status": "unbanned", "user_id": user_id}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete as sql_delete
    from ..models.ledger import Transaction as Tx
    from ..models.user import DepositCode, DeviceFingerprint

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin user")

    # Clean up all FK references
    await session.execute(sql_delete(HandAction).where(HandAction.user_id == user_id))
    await session.execute(sql_delete(HandPlayer).where(HandPlayer.user_id == user_id))
    await session.execute(sql_delete(Tx).where(Tx.user_id == user_id))
    await session.execute(sql_delete(Withdrawal).where(Withdrawal.user_id == user_id))
    await session.execute(sql_delete(DepositCode).where(DepositCode.user_id == user_id))
    await session.execute(sql_delete(DeviceFingerprint).where(DeviceFingerprint.user_id == user_id))

    await session.delete(user)
    await session.commit()
    log.info("Admin deleted user: %s (id=%d)", user.character_name, user_id)
    return {"status": "deleted", "user_id": user_id}


@router.post("/users/{user_id}/credit")
async def credit_user(
    user_id: int,
    amount: int = 0,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    if amount == 0:
        raise HTTPException(status_code=400, detail="Amount must be nonzero")
    # Cap at 1T ISK-cents (10B ISK) in either direction
    if abs(amount) > 1_000_000_000_000:
        raise HTTPException(status_code=400, detail="Amount exceeds maximum (10B ISK)")
    result = await session.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.balance + amount < 0:
        raise HTTPException(status_code=400, detail="Would result in negative balance")
    user.balance += amount
    tx = Transaction(
        user_id=user.id,
        type="admin_credit",
        amount=amount,
        balance_after=user.balance,
        reference_id=f"admin_credit:{user_id}",
    )
    session.add(tx)
    await session.commit()
    return {"status": "credited", "new_balance": user.balance}


# --- Rake ---

@router.get("/rake")
async def rake_stats(
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.type == "rake")
    )
    total = result.scalar() or 0
    return {"total_rake": abs(total)}


# --- Bot Tokens ---

@router.post("/bot/create")
async def create_bot(
    name: str,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a bot user and return a JWT for it."""
    if not name or len(name) > 50:
        raise HTTPException(status_code=400, detail="Bot name must be 1-50 characters")
    # Only match existing BOT users — never return a real user's token
    result = await session.execute(
        select(User).where(User.character_name == name, User.is_bot == True)
    )
    user = result.scalar_one_or_none()
    if user:
        token = create_token(user.id, user.character_id, user.character_name)
        return {"user_id": user.id, "token": token, "created": False}

    # Create new bot user with character_id = negative to avoid collision with real EVE IDs
    import random
    bot_cid = -(random.randint(100000, 999999))
    user = User(
        character_id=bot_cid,
        character_name=name,
        portrait_url="",
        balance=100_000_000_000,  # 1B ISK to start
        is_bot=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_token(user.id, user.character_id, user.character_name)
    log.info("Created bot user: %s (id=%d)", name, user.id)
    return {"user_id": user.id, "token": token, "created": True}


@router.get("/bot/token")
async def get_bot_token(
    name: str,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """Get a fresh JWT for an existing bot user."""
    result = await session.execute(
        select(User).where(User.character_name == name, User.is_bot == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"Bot '{name}' not found")
    token = create_token(user.id, user.character_id, user.character_name)
    return {"user_id": user.id, "token": token}


# --- Hand History (admin view — sees all cards, no participant restriction) ---

@router.get("/hands")
async def admin_list_hands(
    limit: int = 50,
    table_id: str | None = None,
    user_id: int | None = None,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """List recent hands across all tables. Optional filters."""
    query = select(Hand).order_by(Hand.id.desc()).limit(min(limit, 200))
    if table_id:
        query = query.where(Hand.table_id == table_id)

    result = await session.execute(query)
    hands = result.scalars().all()

    # If filtering by user, narrow to hands they participated in
    if user_id is not None:
        player_result = await session.execute(
            select(HandPlayer.hand_id).where(HandPlayer.user_id == user_id)
        )
        user_hand_ids = {row[0] for row in player_result.all()}
        hands = [h for h in hands if h.id in user_hand_ids]

    out = []
    for h in hands:
        # Count players
        p_result = await session.execute(
            select(func.count()).where(HandPlayer.hand_id == h.id)
        )
        player_count = p_result.scalar() or 0
        out.append({
            "id": h.id,
            "table_id": h.table_id,
            "hand_number": h.hand_number,
            "community_cards": h.community_cards,
            "pot_total": h.pot_total,
            "rake_taken": h.rake_taken,
            "player_count": player_count,
            "started_at": h.started_at.isoformat(),
            "ended_at": h.ended_at.isoformat(),
        })
    return out


@router.get("/hands/{hand_id}")
async def admin_hand_detail(
    hand_id: int,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """Full hand detail with ALL hole cards visible (admin only)."""
    hand = await session.get(Hand, hand_id)
    if not hand:
        raise HTTPException(status_code=404, detail="Hand not found")

    result = await session.execute(
        select(HandPlayer).where(HandPlayer.hand_id == hand_id)
    )
    players = result.scalars().all()

    # Look up character names
    player_data = []
    for p in players:
        user = await session.get(User, p.user_id)
        player_data.append({
            "user_id": p.user_id,
            "character_name": user.character_name if user else "unknown",
            "seat": p.seat,
            "hole_cards": p.hole_cards,
            "starting_stack": p.starting_stack,
            "ending_stack": p.ending_stack,
            "net_won": p.net_won,
            "is_winner": p.is_winner,
        })

    result = await session.execute(
        select(HandAction)
        .where(HandAction.hand_id == hand_id)
        .order_by(HandAction.action_order)
    )
    actions = result.scalars().all()

    # Look up action user names
    action_data = []
    for a in actions:
        user = await session.get(User, a.user_id)
        action_data.append({
            "user_id": a.user_id,
            "character_name": user.character_name if user else "unknown",
            "seat": a.seat,
            "street": a.street,
            "action": a.action,
            "amount": a.amount,
            "order": a.action_order,
        })

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
        "actions": action_data,
    }


# --- Deposits ---

@router.get("/deposits")
async def admin_deposits(
    limit: int = 50,
    _admin: dict = Depends(get_admin_user),
    session: AsyncSession = Depends(get_db),
):
    """Recent deposit transactions with user info."""
    result = await session.execute(
        select(Transaction)
        .where(Transaction.type == "deposit")
        .order_by(Transaction.created_at.desc())
        .limit(min(limit, 200))
    )
    txs = result.scalars().all()
    out = []
    for tx in txs:
        user = await session.get(User, tx.user_id)
        out.append({
            "id": tx.id,
            "user_id": tx.user_id,
            "character_name": user.character_name if user else "unknown",
            "amount": tx.amount,
            "balance_after": tx.balance_after,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        })
    return out


# --- In-process Bots ---

@router.post("/bots/start")
async def start_bots(
    request: Request,
    table_id: str = "micro-1",
    count: int = 1,
    _admin: dict = Depends(get_admin_user),
):
    """Start N bot players on a table (in-process, no WebSocket)."""
    bot_service = getattr(request.app.state, "bot_service", None)
    if bot_service is None:
        raise HTTPException(status_code=500, detail="Bot service not initialized")
    try:
        results = await bot_service.start_bots(table_id, count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"started": results}


@router.post("/bots/stop")
async def stop_bots(
    request: Request,
    table_id: str = "micro-1",
    _admin: dict = Depends(get_admin_user),
):
    """Stop all bots on a table."""
    bot_service = getattr(request.app.state, "bot_service", None)
    if bot_service is None:
        raise HTTPException(status_code=500, detail="Bot service not initialized")
    count = await bot_service.stop_bots(table_id)
    return {"stopped": count}


@router.get("/bots")
async def list_bots(
    request: Request,
    _admin: dict = Depends(get_admin_user),
):
    """List running bots per table."""
    bot_service = getattr(request.app.state, "bot_service", None)
    if bot_service is None:
        return {}
    return bot_service.list_bots()
