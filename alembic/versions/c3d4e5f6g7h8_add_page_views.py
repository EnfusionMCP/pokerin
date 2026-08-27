"""Move page_views schema ownership into Alembic.

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-08-18

Older deployments created this table imperatively during application startup.
The upgrade therefore adopts an existing table and creates only missing
indexes, while fresh databases receive the complete schema.
"""

from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "c3d4e5f6g7h8"
down_revision: str | None = "b2c3d4e5f6g7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _create_table() -> None:
    op.create_table(
        "page_views",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def upgrade() -> None:
    if context.is_offline_mode():
        _create_table()
        op.create_index("ix_page_views_ip_hash", "page_views", ["ip_hash"])
        op.create_index("ix_page_views_timestamp", "page_views", ["timestamp"])
        return

    inspector = sa.inspect(op.get_bind())
    if "page_views" not in inspector.get_table_names():
        _create_table()
        existing_indexes: set[str] = set()
    else:
        existing_indexes = {
            index["name"]
            for index in inspector.get_indexes("page_views")
            if index.get("name")
        }

    if "ix_page_views_ip_hash" not in existing_indexes:
        op.create_index("ix_page_views_ip_hash", "page_views", ["ip_hash"])
    if "ix_page_views_timestamp" not in existing_indexes:
        op.create_index("ix_page_views_timestamp", "page_views", ["timestamp"])


def downgrade() -> None:
    op.drop_table("page_views")
