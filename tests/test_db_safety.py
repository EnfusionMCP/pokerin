"""Unit tests for destructive database safeguards."""

from types import SimpleNamespace

import pytest
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from tests.db_safety import (
    DESTRUCTIVE_CONFIRMATION,
    UnsafeTestDatabase,
    validate_disposable_test_database,
    validate_disposable_sqlite_test_database,
    validate_mutating_test_database,
    verify_configured_test_engine,
    verify_connected_sqlite_database,
)


SAFE_ENV = {
    "ENVIRONMENT": "test",
    "ALLOW_DESTRUCTIVE_TESTS": DESTRUCTIVE_CONFIRMATION,
    "TEST_DATABASE_URL": (
        "postgresql+asyncpg://pokerin_test:only-for-tests@127.0.0.1:5432/pokerin_test"
    ),
}

SAFE_SQLITE_ENV = SAFE_ENV | {
    "TEST_DATABASE_URL": "sqlite+aiosqlite:///./pokerin_test.db",
}


def test_accepts_explicit_local_disposable_database() -> None:
    assert validate_disposable_test_database(SAFE_ENV) == SAFE_ENV["TEST_DATABASE_URL"]


def test_accepts_named_disposable_sqlite_database() -> None:
    assert (
        validate_disposable_sqlite_test_database(SAFE_SQLITE_ENV)
        == SAFE_SQLITE_ENV["TEST_DATABASE_URL"]
    )
    assert validate_mutating_test_database(SAFE_ENV) == SAFE_ENV["TEST_DATABASE_URL"]
    assert (
        validate_mutating_test_database(SAFE_SQLITE_ENV)
        == SAFE_SQLITE_ENV["TEST_DATABASE_URL"]
    )


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("ENVIRONMENT", "production"),
        ("ALLOW_DESTRUCTIVE_TESTS", "yes"),
        (
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://pokerin_test:x@db.example.com/pokerin_test",
        ),
        (
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://pokerin_test:x@127.0.0.1/pokerin",
        ),
        (
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://pokerin:x@127.0.0.1/pokerin_test",
        ),
        (
            "TEST_DATABASE_URL",
            "sqlite+aiosqlite:///./pokerin_test.db",
        ),
        (
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://pokerin_test:x@127.0.0.1/pokerin_test?host=db.example.com",
        ),
    ],
)
def test_rejects_unsafe_database_configuration(key: str, value: str) -> None:
    env = SAFE_ENV | {key: value}
    with pytest.raises(UnsafeTestDatabase):
        validate_disposable_test_database(env)


def test_rejects_cached_application_engine_for_another_database() -> None:
    engine = SimpleNamespace(
        url=make_url(
            "postgresql+asyncpg://pokerin_test:x@127.0.0.1/production_test"
        )
    )
    with pytest.raises(UnsafeTestDatabase):
        verify_configured_test_engine(engine, SAFE_ENV["TEST_DATABASE_URL"])


@pytest.mark.parametrize(
    "database_url",
    [
        "sqlite+aiosqlite:///./dev.db",
        "sqlite:///./pokerin_test.db",
        "sqlite+aiosqlite:///:memory:",
        "sqlite+aiosqlite:///./pokerin_test.db?mode=ro",
        "sqlite+aiosqlite://///server/share/pokerin_test.db",
    ],
)
def test_rejects_unsafe_sqlite_database(database_url: str) -> None:
    with pytest.raises(UnsafeTestDatabase):
        validate_disposable_sqlite_test_database(
            SAFE_SQLITE_ENV | {"TEST_DATABASE_URL": database_url}
        )


async def test_verifies_actual_sqlite_file_before_mutation(tmp_path) -> None:
    database_path = tmp_path / "helper_test.db"
    database_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    engine = create_async_engine(database_url)
    try:
        async with engine.begin() as connection:
            await verify_connected_sqlite_database(connection, database_url)
            with pytest.raises(UnsafeTestDatabase):
                await verify_connected_sqlite_database(
                    connection,
                    f"sqlite+aiosqlite:///{(tmp_path / 'other_test.db').as_posix()}",
                )
    finally:
        await engine.dispose()


def test_rejects_missing_test_database_url() -> None:
    env = {key: value for key, value in SAFE_ENV.items() if key != "TEST_DATABASE_URL"}
    with pytest.raises(UnsafeTestDatabase):
        validate_disposable_test_database(env)
