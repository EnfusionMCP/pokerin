"""Remove unused plaintext EVE refresh tokens from player accounts.

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-08-27

The application never consumes player refresh tokens after login. Dropping the
column both purges existing credentials and prevents future retention.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6g7h8i9"
down_revision: str | None = "c3d4e5f6g7h8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Explicitly clear values before removing the schema field. The drop then
    # prevents the application from retaining replacement credentials.
    op.execute(sa.text("UPDATE users SET refresh_token = NULL"))
    # Batch mode recreates the table on SQLite and emits a regular ALTER on
    # PostgreSQL. Existing token values are intentionally not copied anywhere.
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("refresh_token")


def downgrade() -> None:
    # A rollback can restore schema compatibility, but purged credentials are
    # deliberately unrecoverable and callers must reauthorize if they need one.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("refresh_token", sa.Text(), nullable=True))
