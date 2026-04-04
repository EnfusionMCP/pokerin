"""Table manager — creates, tracks, and destroys poker tables."""

import asyncio
import logging
from typing import Optional

from ..poker.table import PokerTable, TableConfig
from ..ws.manager import ConnectionManager
from ..schemas.lobby import TableInfo
from .bank import BankService

log = logging.getLogger(__name__)


class TableManager:
    """Manages the lifecycle of all active poker tables."""

    def __init__(self, conn_manager: ConnectionManager, bank: BankService):
        self._tables: dict[str, PokerTable] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._conn = conn_manager
        self._bank = bank

    def create_table(self, config: TableConfig) -> PokerTable:
        """Create and start a new poker table."""
        if config.id in self._tables:
            raise ValueError(f"Table {config.id} already exists")

        table = PokerTable(config, self._conn, bank=self._bank)
        self._tables[config.id] = table

        task = asyncio.create_task(table.run(), name=f"table-{config.id}")
        task.add_done_callback(lambda t: self._on_table_done(config.id, t))
        self._tasks[config.id] = task

        log.info("Created table: %s (%s) blinds=%d/%d",
                 config.id, config.name, config.small_blind, config.big_blind)
        return table

    def _on_table_done(self, table_id: str, task: asyncio.Task) -> None:
        """Callback when a table task finishes — log crashes, clean up."""
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            log.error("Table %s crashed: %s", table_id, exc, exc_info=exc)
        self._tables.pop(table_id, None)
        self._tasks.pop(table_id, None)

    def get_table(self, table_id: str) -> Optional[PokerTable]:
        """Get a table by ID."""
        return self._tables.get(table_id)

    def list_tables(self) -> list[TableInfo]:
        """List all active tables with player counts."""
        result = []
        for tid, table in self._tables.items():
            player_count = sum(1 for s in table.seats if s is not None)
            result.append(TableInfo(
                table_id=tid,
                name=table.config.name,
                game_type=table.config.game_type,
                max_seats=table.config.max_seats,
                small_blind=table.config.small_blind,
                big_blind=table.config.big_blind,
                min_buyin=table.config.min_buyin,
                max_buyin=table.config.max_buyin,
                player_count=player_count,
            ))
        return result

    async def destroy_table(self, table_id: str) -> None:
        """Stop and remove a table."""
        table = self._tables.pop(table_id, None)
        task = self._tasks.pop(table_id, None)
        if table:
            # Credit all seated players' stacks back to their balance
            for seat in table.seats:
                if seat and seat.stack > 0:
                    try:
                        await self._bank.credit(
                            seat.user_id, seat.stack, tx_type="cashout",
                            reference_id=f"table:{table_id}:shutdown",
                        )
                    except Exception as e:
                        log.error("Failed to credit user %d on shutdown: %s", seat.user_id, e)
            await table.shutdown()
        if task:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        log.info("Destroyed table: %s", table_id)

    async def shutdown_all(self) -> None:
        """Stop all tables, crediting all seated players' stacks."""
        for tid in list(self._tables.keys()):
            await self.destroy_table(tid)
        log.info("All tables shut down")
