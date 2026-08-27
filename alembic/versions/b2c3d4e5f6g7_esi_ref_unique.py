"""Make transactions.esi_ref_id unique

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-04
"""
from typing import Sequence, Union
from alembic import op

revision: str = "b2c3d4e5f6g7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        # SQLite cannot ALTER a constraint into an existing table. Batch mode
        # recreates the table while preserving its original lookup index.
        with op.batch_alter_table("transactions") as batch_op:
            batch_op.create_unique_constraint(
                "uq_transactions_esi_ref_id",
                ["esi_ref_id"],
            )
        return

    # Preserve the exact historical PostgreSQL DDL. Existing deployments may
    # already have this named constraint and must retain a reversible path.
    op.create_unique_constraint(
        "uq_transactions_esi_ref_id",
        "transactions",
        ["esi_ref_id"],
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("transactions") as batch_op:
            batch_op.drop_constraint(
                "uq_transactions_esi_ref_id",
                type_="unique",
            )
        return

    op.drop_constraint(
        "uq_transactions_esi_ref_id",
        "transactions",
        type_="unique",
    )
