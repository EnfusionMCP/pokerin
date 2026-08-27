#!/bin/sh
# Validate that Alembic targets the database protected by db-backup, then migrate.

set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${EXPECTED_DATABASE_HOST:?EXPECTED_DATABASE_HOST is required}"
: "${EXPECTED_DATABASE_PORT:?EXPECTED_DATABASE_PORT is required}"
: "${EXPECTED_DATABASE_USER:?EXPECTED_DATABASE_USER is required}"
: "${EXPECTED_DATABASE_NAME:?EXPECTED_DATABASE_NAME is required}"

python - <<'PY'
import os
from sqlalchemy.engine import make_url

try:
    url = make_url(os.environ["DATABASE_URL"])
except Exception as exc:
    raise SystemExit("migrate: DATABASE_URL is invalid") from None

expected = {
    "drivername": "postgresql+asyncpg",
    "host": os.environ["EXPECTED_DATABASE_HOST"],
    "port": int(os.environ["EXPECTED_DATABASE_PORT"]),
    "username": os.environ["EXPECTED_DATABASE_USER"],
    "database": os.environ["EXPECTED_DATABASE_NAME"],
}
actual = {
    "drivername": url.drivername,
    "host": url.host,
    "port": url.port,
    "username": url.username,
    "database": url.database,
}
wrong = [name for name, value in expected.items() if actual[name] != value]
if wrong:
    raise SystemExit(
        "migrate: DATABASE_URL does not match the database protected by the "
        f"backup gate ({', '.join(wrong)})"
    )
if url.query:
    raise SystemExit("migrate: DATABASE_URL query overrides are not allowed")
PY

exec alembic upgrade head
