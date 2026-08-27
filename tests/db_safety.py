"""Hard safety gates for tests that can delete or overwrite database rows."""

from __future__ import annotations

import os
from collections.abc import Mapping
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession


DESTRUCTIVE_CONFIRMATION = "I_UNDERSTAND_THIS_WIPES_A_DISPOSABLE_TEST_DATABASE"
_LOCAL_HOSTS = {"127.0.0.1", "localhost", "postgres"}


class UnsafeTestDatabase(RuntimeError):
    """Raised before a destructive test can connect to an unsafe database."""


def _validated_test_url(
    environ: Mapping[str, str] | None = None,
) -> tuple[str, URL]:
    env = os.environ if environ is None else environ
    if env.get("ENVIRONMENT") != "test":
        raise UnsafeTestDatabase("ENVIRONMENT must be exactly 'test'")
    if env.get("ALLOW_DESTRUCTIVE_TESTS") != DESTRUCTIVE_CONFIRMATION:
        raise UnsafeTestDatabase("destructive-test confirmation is missing")

    raw_url = env.get("TEST_DATABASE_URL", "").strip()
    if not raw_url:
        raise UnsafeTestDatabase("TEST_DATABASE_URL is required")

    try:
        url = make_url(raw_url)
    except Exception as exc:
        raise UnsafeTestDatabase("TEST_DATABASE_URL is invalid") from exc

    if url.query:
        # asyncpg connection query parameters can override URL components such
        # as the host. Destructive tests do not need any query parameters, so
        # reject them rather than trying to maintain an allowlist.
        raise UnsafeTestDatabase("test database URL must not contain query parameters")

    return raw_url, url


def _validate_postgresql_url(url: URL) -> None:
    if url.drivername != "postgresql+asyncpg":
        raise UnsafeTestDatabase("test database must use postgresql+asyncpg")
    if (url.host or "").lower() not in _LOCAL_HOSTS:
        raise UnsafeTestDatabase("test database host must be local or the Docker service 'postgres'")
    if not (url.database or "").lower().endswith("_test"):
        raise UnsafeTestDatabase("test database name must end with '_test'")
    if not (url.username or "").lower().endswith("_test"):
        raise UnsafeTestDatabase("test database role must end with '_test'")


def _validate_sqlite_url(url: URL) -> Path:
    if url.drivername != "sqlite+aiosqlite":
        raise UnsafeTestDatabase("SQLite test database must use sqlite+aiosqlite")
    if any((url.host, url.username, url.password, url.port)):
        raise UnsafeTestDatabase("SQLite test database URL must be a local file")
    if not url.database or url.database == ":memory:":
        raise UnsafeTestDatabase("SQLite test database must be a named disposable file")
    if url.database.replace("\\", "/").startswith("//"):
        raise UnsafeTestDatabase("SQLite test database must not use a network path")

    database_path = Path(url.database).resolve()
    if not database_path.name.lower().endswith("_test.db"):
        raise UnsafeTestDatabase("SQLite test database filename must end with '_test.db'")
    return database_path


def validate_disposable_test_database(
    environ: Mapping[str, str] | None = None,
) -> str:
    """Validate and return a deliberately isolated PostgreSQL test URL."""

    raw_url, url = _validated_test_url(environ)
    _validate_postgresql_url(url)
    return raw_url


def validate_disposable_sqlite_test_database(
    environ: Mapping[str, str] | None = None,
) -> str:
    """Validate and return a named, local, disposable SQLite test URL."""

    raw_url, url = _validated_test_url(environ)
    _validate_sqlite_url(url)
    return raw_url


def validate_mutating_test_database(
    environ: Mapping[str, str] | None = None,
) -> str:
    """Accept either supported disposable database, never an arbitrary URL."""

    raw_url, url = _validated_test_url(environ)
    if url.drivername == "postgresql+asyncpg":
        _validate_postgresql_url(url)
    elif url.drivername == "sqlite+aiosqlite":
        _validate_sqlite_url(url)
    else:
        raise UnsafeTestDatabase(
            "test database must use postgresql+asyncpg or sqlite+aiosqlite"
        )
    return raw_url


def configure_disposable_test_database() -> str:
    """Validate the test URL and make it the application's database URL."""

    database_url = validate_disposable_test_database()
    os.environ["DATABASE_URL"] = database_url
    return database_url


def configure_disposable_sqlite_test_database() -> str:
    """Validate a disposable SQLite URL before application settings import."""

    database_url = validate_disposable_sqlite_test_database()
    os.environ["DATABASE_URL"] = database_url
    return database_url


def configure_mutating_test_database() -> str:
    """Validate either disposable DB type before application settings import."""

    database_url = validate_mutating_test_database()
    os.environ["DATABASE_URL"] = database_url
    return database_url


def verify_configured_test_engine(
    engine: AsyncEngine,
    expected_url: str,
) -> None:
    """Fail before connecting if application imports cached another DB URL."""

    if engine.url != make_url(expected_url):
        raise UnsafeTestDatabase(
            "application database engine does not target TEST_DATABASE_URL"
        )


async def verify_connected_database(
    session: AsyncSession | AsyncConnection,
    expected_url: str | None = None,
) -> None:
    """Re-check server-reported identity immediately before destructive SQL."""

    row = (
        await session.execute(text("SELECT current_database(), current_user"))
    ).one()
    database_name = str(row[0]).lower()
    role_name = str(row[1]).lower()
    if not database_name.endswith("_test") or not role_name.endswith("_test"):
        raise UnsafeTestDatabase(
            "connected PostgreSQL database or role is not test-isolated"
        )
    if expected_url is not None:
        expected = make_url(expected_url)
        if (
            database_name != str(expected.database).lower()
            or role_name != str(expected.username).lower()
        ):
            raise UnsafeTestDatabase(
                "connected PostgreSQL identity does not match TEST_DATABASE_URL"
            )


async def verify_connected_sqlite_database(
    session: AsyncSession | AsyncConnection,
    expected_url: str,
) -> None:
    """Check SQLite's actual main file immediately before a mutation."""

    expected_path = _validate_sqlite_url(make_url(expected_url))
    rows = (await session.execute(text("PRAGMA database_list"))).all()
    actual_name = next((str(row[2]) for row in rows if row[1] == "main"), "")
    if not actual_name or Path(actual_name).resolve() != expected_path:
        raise UnsafeTestDatabase(
            "connected SQLite file does not match TEST_DATABASE_URL"
        )


async def verify_connected_test_database(
    session: AsyncSession | AsyncConnection,
    expected_url: str,
) -> None:
    """Dispatch the connected-identity check for an approved test URL."""

    driver = make_url(expected_url).drivername
    if driver == "postgresql+asyncpg":
        await verify_connected_database(session, expected_url)
    elif driver == "sqlite+aiosqlite":
        await verify_connected_sqlite_database(session, expected_url)
    else:
        raise UnsafeTestDatabase("unsupported connected test database driver")
