#!/usr/bin/env python3
"""Wait for strict readiness, including a completed deposit poll."""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from typing import Any


READINESS_URL = "http://127.0.0.1:8080/health"
TIMEOUT_SECONDS = 330


def is_strictly_ready(payload: Any) -> bool:
    if not isinstance(payload, dict) or payload.get("status") != "ok":
        return False
    components = payload.get("components")
    if not isinstance(components, dict):
        return False
    for name in ("database", "tables", "deposits"):
        component = components.get(name)
        if not isinstance(component, dict) or component.get("status") != "ok":
            return False
    deposits = components["deposits"]
    return bool(deposits.get("last_success"))


def main() -> int:
    deadline = time.monotonic() + TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(READINESS_URL, timeout=3) as response:  # noqa: S310
                body = response.read(1_000_001)
            if len(body) <= 1_000_000 and is_strictly_ready(json.loads(body)):
                print("deploy readiness: database, tables, and deposits are ready")
                return 0
        except Exception:
            # Readiness responses and transport exceptions can contain upstream
            # details; never render them into deployment logs.
            pass
        time.sleep(5)
    print(
        "deploy readiness: ERROR: strict readiness timed out; ingress remains stopped",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
