from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).parents[1] / "deploy" / "check-empty-tables.py"
SPEC = importlib.util.spec_from_file_location("deploy_check_empty_tables", MODULE_PATH)
assert SPEC and SPEC.loader
drain = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(drain)

READINESS_PATH = Path(__file__).parents[1] / "deploy" / "wait-readiness.py"
READINESS_SPEC = importlib.util.spec_from_file_location(
    "deploy_wait_readiness", READINESS_PATH
)
assert READINESS_SPEC and READINESS_SPEC.loader
readiness = importlib.util.module_from_spec(READINESS_SPEC)
READINESS_SPEC.loader.exec_module(readiness)


def test_empty_table_inventory_is_accepted() -> None:
    drain.validate_empty_tables(
        [
            {"table_id": "cash-1", "player_count": 0},
            {"table_id": "cash-2", "player_count": 0},
        ]
    )


def test_strict_readiness_requires_a_successful_deposit_poll() -> None:
    payload = {
        "status": "ok",
        "components": {
            "database": {"status": "ok"},
            "tables": {"status": "ok"},
            "deposits": {"status": "ok", "last_success": None},
        },
    }
    assert readiness.is_strictly_ready(payload) is False
    payload["components"]["deposits"]["last_success"] = "2026-08-27T20:00:00Z"
    assert readiness.is_strictly_ready(payload) is True


@pytest.mark.parametrize(
    "payload",
    [
        [],
        [{"table_id": "cash-1", "player_count": 1}],
        [{"table_id": "cash-1", "player_count": True}],
        [{"table_id": "", "player_count": 0}],
        [{"table_id": "cash-1", "player_count": -1}],
    ],
)
def test_unknown_or_occupied_table_inventory_fails_closed(payload: object) -> None:
    with pytest.raises(drain.TableDrainError):
        drain.validate_empty_tables(payload)


def test_production_access_logs_cannot_persist_query_credentials() -> None:
    root = MODULE_PATH.parents[1]
    caddyfile = (root / "deploy" / "Caddyfile").read_text(encoding="utf-8")
    dockerfile = (root / "Dockerfile").read_text(encoding="utf-8")

    assert caddyfile.count(r"request>uri regexp `\?.*$` ``") == 2
    assert caddyfile.count("request>headers>Referer delete") == 2
    assert '"--no-access-log"' in dockerfile
    assert '"--ws-max-size", "16384"' in dockerfile
    assert "Content-Security-Policy" in caddyfile
    assert "script-src 'self'" in caddyfile
    assert "script-src 'self' 'unsafe-inline'" not in caddyfile
    assert "object-src 'none'" in caddyfile
    assert "health_uri /health" in caddyfile


def test_dev_postgres_is_bound_to_loopback_only() -> None:
    root = MODULE_PATH.parents[1]
    compose = (root / "docker-compose.dev.yml").read_text(encoding="utf-8")

    assert '"127.0.0.1:5432:5432"' in compose
    assert '\n      - "5432:5432"' not in compose


def test_postgres_volume_is_external_and_old_env_discovery_is_compose_independent() -> None:
    root = MODULE_PATH.parents[1]
    compose = (root / "docker-compose.yml").read_text(encoding="utf-8")
    operations = (root / "deploy" / "README.md").read_text(encoding="utf-8")

    assert "external: true" in compose
    assert "${POSTGRES_VOLUME_NAME:?" in compose
    assert "label=com.docker.compose.service=postgres" in operations
    assert 'docker inspect "$(docker compose ps -q postgres)"' not in operations
