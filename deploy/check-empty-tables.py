#!/usr/bin/env python3
"""Refuse deployment while any in-memory poker table still has a player."""

from __future__ import annotations

import json
import sys
import urllib.request
from typing import Any


class TableDrainError(RuntimeError):
    pass


def validate_empty_tables(payload: Any) -> None:
    if not isinstance(payload, list) or not payload:
        raise TableDrainError("table inventory is missing or not ready")
    occupied: list[str] = []
    for index, table in enumerate(payload):
        if not isinstance(table, dict):
            raise TableDrainError(f"table entry {index} is invalid")
        table_id = table.get("table_id")
        player_count = table.get("player_count")
        if not isinstance(table_id, str) or not table_id:
            raise TableDrainError(f"table entry {index} has no table_id")
        if isinstance(player_count, bool) or not isinstance(player_count, int):
            raise TableDrainError(f"table {table_id} has an invalid player_count")
        if player_count < 0:
            raise TableDrainError(f"table {table_id} has a negative player_count")
        if player_count:
            occupied.append(f"{table_id}={player_count}")
    if occupied:
        raise TableDrainError("occupied tables: " + ", ".join(occupied))


def main() -> int:
    try:
        with urllib.request.urlopen(  # noqa: S310 - fixed loopback URL
            "http://127.0.0.1:8080/api/tables", timeout=5
        ) as response:
            if response.status != 200:
                raise TableDrainError("table inventory endpoint is not healthy")
            body = response.read(1_000_001)
        if len(body) > 1_000_000:
            raise TableDrainError("table inventory response is unexpectedly large")
        validate_empty_tables(json.loads(body))
    except TableDrainError as exc:
        print(f"deploy drain check: ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception:
        print("deploy drain check: ERROR: could not verify empty tables", file=sys.stderr)
        return 1
    print("deploy drain check: all tables are empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
