# Test database safety

The normal suite is non-destructive:

```bash
uv run --extra dev pytest -m "not integration"
```

Every helper that creates users, changes balances/admin state, or deletes test
fixtures refuses to import application database settings unless all common
safeguards are present:

- `ENVIRONMENT=test`
- `ALLOW_DESTRUCTIVE_TESTS=I_UNDERSTAND_THIS_WIPES_A_DISPOSABLE_TEST_DATABASE`
- `TEST_DATABASE_URL` names the disposable target (it replaces
  `DATABASE_URL` before `backend.db` is imported)

PostgreSQL helpers additionally require `postgresql+asyncpg`, a host of
`localhost`, `127.0.0.1`, or the Docker service `postgres`, and both the
database and role names ending in `_test`. The integration harness deletes its
fixtures before running.

SQLite helpers require `sqlite+aiosqlite`, no URL query parameters, and a
named local file ending in `_test.db`. They will reject `dev.db`, in-memory
databases, and SQLite files reached through URI options. For example, after
setting the three safeguards above:

```bash
export TEST_DATABASE_URL=sqlite+aiosqlite:///./pokerin_test.db
uv run python -m tests.dev_bootstrap
uv run python -m tests.qa_live
```

`tests/_dev_bots.py` accepts either guarded database type. `tests/ws_live.py`
and `tests/integration_live.py` require guarded PostgreSQL. Each helper checks
the configured engine before connecting and re-checks the server-reported
PostgreSQL identity or actual SQLite file immediately before mutation.

Use a disposable PostgreSQL container and test-only role. Never grant that role
access to another database. The CI workflow is the canonical example and
destroys the entire service container after the job.

## Protocol schema drift

WebSocket protocol changes must refresh both generated layers. From the
repository root, export the backend models first, then verify/regenerate the
frontend manifest:

```bash
uv run python -m backend.ws.schema_export backend/ws/protocol.schema.json
cd frontend
npm run protocol:generate
npm run protocol:check
```

CI independently exports the backend schema to a temporary file and compares
it byte-for-byte with the committed JSON before checking the frontend output.
