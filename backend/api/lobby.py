"""Lobby API — list available tables."""

import logging

from fastapi import APIRouter, Request

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
