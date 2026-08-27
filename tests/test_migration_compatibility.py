"""Compatibility assertions for historical PostgreSQL migration DDL."""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize(
    ("arguments", "expected_sql"),
    [
        (
            ["upgrade", "a1b2c3d4e5f6:b2c3d4e5f6g7", "--sql"],
            "ALTER TABLE transactions ADD CONSTRAINT "
            "uq_transactions_esi_ref_id UNIQUE (esi_ref_id);",
        ),
        (
            ["downgrade", "b2c3d4e5f6g7:a1b2c3d4e5f6", "--sql"],
            "ALTER TABLE transactions DROP CONSTRAINT "
            "uq_transactions_esi_ref_id;",
        ),
    ],
)
def test_postgresql_esi_revision_keeps_historical_constraint_sql(
    arguments: list[str],
    expected_sql: str,
) -> None:
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": (
                "postgresql+asyncpg://pokerin_test:x@127.0.0.1/pokerin_test"
            ),
            "JWT_SECRET": "offline-migration-test-only",
        }
    )
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=Path(__file__).resolve().parents[1],
        env=environment,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert expected_sql in result.stdout


def test_page_view_migration_adopts_runtime_created_table(tmp_path) -> None:
    database_path = tmp_path / "legacy-analytics.db"
    database_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": database_url,
            "JWT_SECRET": "offline-migration-test-only",
        }
    )
    root = Path(__file__).resolve().parents[1]

    before = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "b2c3d4e5f6g7"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert before.returncode == 0, before.stderr

    with sqlite3.connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE page_views (
                id INTEGER NOT NULL PRIMARY KEY,
                ip_hash VARCHAR(64) NOT NULL,
                path VARCHAR(255) NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            CREATE INDEX ix_page_views_ip_hash ON page_views (ip_hash);
            CREATE INDEX ix_page_views_timestamp ON page_views (timestamp);
            INSERT INTO page_views (id, ip_hash, path, timestamp)
            VALUES (42, 'legacy-hash', '/legacy', '2026-08-18 00:00:00');
            """
        )

    after = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert after.returncode == 0, after.stderr

    drift_check = subprocess.run(
        [sys.executable, "-m", "alembic", "check"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert drift_check.returncode == 0, drift_check.stderr

    with sqlite3.connect(database_path) as connection:
        revision = connection.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchone()
        indexes = {
            row[1] for row in connection.execute("PRAGMA index_list('page_views')")
        }
        transaction_indexes = list(
            connection.execute("PRAGMA index_list('transactions')")
        )
        transaction_index_columns = {
            row[1]: [
                column[2]
                for column in connection.execute(
                    f"PRAGMA index_info('{row[1]}')"
                )
            ]
            for row in transaction_indexes
        }
        hand_id_type = connection.execute(
            "SELECT type FROM pragma_table_info('hands') WHERE name = 'id'"
        ).fetchone()
        legacy_row = connection.execute(
            "SELECT id, ip_hash, path, timestamp FROM page_views WHERE id = 42"
        ).fetchone()

    assert revision == ("d4e5f6g7h8i9",)
    assert indexes == {"ix_page_views_ip_hash", "ix_page_views_timestamp"}
    assert any(
        row[1] == "ix_transactions_esi_ref_id" and row[2] == 0
        for row in transaction_indexes
    )
    assert any(
        row[2] == 1
        and transaction_index_columns[row[1]] == ["esi_ref_id"]
        for row in transaction_indexes
    )
    assert hand_id_type == ("INTEGER",)
    assert legacy_row == (
        42,
        "legacy-hash",
        "/legacy",
        "2026-08-18 00:00:00",
    )


def test_refresh_token_migration_purges_column_and_preserves_user(tmp_path) -> None:
    database_path = tmp_path / "refresh_token_test.db"
    database_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": database_url,
            "JWT_SECRET": "offline-migration-test-only",
        }
    )
    root = Path(__file__).resolve().parents[1]

    before = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "c3d4e5f6g7h8"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert before.returncode == 0, before.stderr

    refresh_secret = "PLAYER_REFRESH_TOKEN_SENTINEL"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            INSERT INTO users (
                id, character_id, character_name, portrait_url,
                refresh_token, balance, created_at, last_login,
                is_banned, ban_reason, is_admin, is_bot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                1,
                90000001,
                "Migration Pilot",
                "",
                refresh_secret,
                12345,
                "2026-08-27 00:00:00",
                None,
                0,
                None,
                0,
                0,
            ),
        )

    upgraded = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert upgraded.returncode == 0, upgraded.stderr

    with sqlite3.connect(database_path) as connection:
        columns = {
            row[1] for row in connection.execute("PRAGMA table_info('users')")
        }
        user_row = connection.execute(
            "SELECT character_id, character_name, balance FROM users WHERE id = 1"
        ).fetchone()

    assert "refresh_token" not in columns
    assert user_row == (90000001, "Migration Pilot", 12345)

    downgraded = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", "c3d4e5f6g7h8"],
        cwd=root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    assert downgraded.returncode == 0, downgraded.stderr

    with sqlite3.connect(database_path) as connection:
        restored_token = connection.execute(
            "SELECT refresh_token FROM users WHERE id = 1"
        ).fetchone()

    # Downgrade restores only schema compatibility; purged credentials never
    # reappear and must be reauthorized if a future feature needs them.
    assert restored_token == (None,)
