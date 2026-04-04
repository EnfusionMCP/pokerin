"""Add UNIQUE constraint on transactions.esi_ref_id

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
    op.create_unique_constraint("uq_transactions_esi_ref_id", "transactions", ["esi_ref_id"])


def downgrade() -> None:
    op.drop_constraint("uq_transactions_esi_ref_id", "transactions")
