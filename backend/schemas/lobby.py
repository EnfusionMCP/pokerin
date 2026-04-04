"""Lobby-related Pydantic schemas."""

from pydantic import BaseModel


class TableInfo(BaseModel):
    """Public info about a table shown in the lobby."""
    table_id: str
    name: str
    game_type: str
    max_seats: int
    small_blind: int  # ISK-cents
    big_blind: int    # ISK-cents
    min_buyin: int
    max_buyin: int
    player_count: int
    avg_pot: int = 0
