"""Lobby API — list available tables."""

import logging

from fastapi import APIRouter, HTTPException, Request

from ..schemas.lobby import TableInfo

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["lobby"])


@router.get("/tables", response_model=list[TableInfo])
async def list_tables(request: Request):
    """Return all active tables with player counts."""
    table_manager = getattr(request.app.state, "table_manager", None)
    if table_manager is None:
        return []
    return table_manager.list_tables()


@router.get("/tables/{table_id}")
async def get_table_state(table_id: str, request: Request):
    """Public table state for spectators — no hole cards."""
    table_manager = getattr(request.app.state, "table_manager", None)
    if table_manager is None:
        raise HTTPException(status_code=503, detail="Server not ready")
    table = table_manager.get_table(table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    # user_id=-1 ensures no hole cards are included
    return table.get_state_for_player(-1)
