"""Readiness checks for database, table, and deposit components."""

from __future__ import annotations

import asyncio
import json
import time
from types import SimpleNamespace
from typing import Any

import pytest

from backend import main
from backend.services.deposit_worker import (
    DEPOSIT_INITIAL_GRACE_SECONDS,
    DEPOSIT_STALE_AFTER_SECONDS,
    DepositHealth,
)


class DatabaseResult:
    def scalar_one(self) -> int:
        return 1


class DatabaseSession:
    async def execute(self, statement: object) -> DatabaseResult:
        return DatabaseResult()


class SessionContext:
    async def __aenter__(self) -> DatabaseSession:
        return DatabaseSession()

    async def __aexit__(self, *args: object) -> None:
        return None


class RunningTask:
    def __init__(self, done: bool = False) -> None:
        self._done = done

    def done(self) -> bool:
        return self._done


class TableManager:
    def __init__(self, available: set[str] | None = None) -> None:
        self.available = {"micro-1"} if available is None else available

    def get_table(self, table_id: str) -> object | None:
        return object() if table_id in self.available else None


def request_for(
    deposit_health: DepositHealth,
    *,
    task_done: bool = False,
    tables: set[str] | None = None,
) -> Any:
    state = SimpleNamespace(
        table_manager=TableManager(tables),
        required_table_ids=frozenset({"micro-1"}),
        deposit_task=RunningTask(task_done),
        deposit_health=deposit_health,
    )
    return SimpleNamespace(app=SimpleNamespace(state=state))


def payload(response: Any) -> dict[str, Any]:
    return json.loads(response.body)


async def test_health_is_ready_after_successful_deposit_poll(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "async_session", SessionContext)
    deposit_health = DepositHealth(configured=True)
    deposit_health.mark_success()

    response = await main.health(request_for(deposit_health))
    body = payload(response)

    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["components"] == {
        "database": {"status": "ok"},
        "tables": {"status": "ok"},
        "deposits": {
            "configured": True,
            "supervisor": "running",
            "last_success": deposit_health.last_success_at.isoformat(),
            "status": "ok",
        },
    }


async def test_health_database_check_is_bounded_and_sanitized(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    observed_timeout: list[float] = []

    async def force_timeout(coro: Any, timeout: float) -> None:
        observed_timeout.append(timeout)
        coro.close()
        raise asyncio.TimeoutError("DATABASE_DSN_SENTINEL")

    monkeypatch.setattr(main.asyncio, "wait_for", force_timeout)
    deposit_health = DepositHealth(configured=True)
    deposit_health.mark_success()

    response = await main.health(request_for(deposit_health))
    body_text = response.body.decode()

    assert observed_timeout == [2.0]
    assert response.status_code == 503
    assert payload(response)["components"]["database"] == {
        "status": "unavailable"
    }
    assert "DATABASE_DSN_SENTINEL" not in body_text


async def test_transient_deposit_failure_stays_ready_within_grace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "async_session", SessionContext)
    deposit_health = DepositHealth(configured=True)
    deposit_health.mark_failure()

    response = await main.health(request_for(deposit_health))

    assert response.status_code == 200
    assert payload(response)["components"]["deposits"]["status"] == "degraded"


async def test_permanently_failing_deposit_worker_eventually_fails_readiness(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "async_session", SessionContext)
    deposit_health = DepositHealth(configured=True)
    deposit_health.started_monotonic = (
        time.monotonic() - DEPOSIT_INITIAL_GRACE_SECONDS - 1
    )
    deposit_health.mark_failure()

    response = await main.health(request_for(deposit_health))

    assert response.status_code == 503
    assert payload(response)["components"]["deposits"]["status"] == "failing"


async def test_stale_deposit_success_or_stopped_supervisor_fails_readiness(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "async_session", SessionContext)
    deposit_health = DepositHealth(configured=True)
    deposit_health.mark_success()
    deposit_health.last_success_monotonic = (
        time.monotonic() - DEPOSIT_STALE_AFTER_SECONDS - 1
    )

    stale = await main.health(request_for(deposit_health))
    stopped = await main.health(request_for(deposit_health, task_done=True))

    assert stale.status_code == 503
    assert payload(stale)["components"]["deposits"]["status"] == "stale"
    assert stopped.status_code == 503
    assert payload(stopped)["components"]["deposits"]["status"] == "stopped"


async def test_missing_required_table_or_deposit_configuration_fails_readiness(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "async_session", SessionContext)
    disabled = DepositHealth(configured=False)

    response = await main.health(request_for(disabled, tables=set()))
    body = payload(response)

    assert response.status_code == 503
    assert body["components"]["tables"]["status"] == "unavailable"
    assert body["components"]["deposits"]["status"] == "disabled"
