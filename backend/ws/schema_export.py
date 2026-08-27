"""Export the canonical WebSocket JSON Schema.

Usage::

    python -m backend.ws.schema_export
    python -m backend.ws.schema_export backend/ws/protocol.schema.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from .protocol import protocol_json_schema


def main() -> int:
    rendered = json.dumps(protocol_json_schema(), indent=2, sort_keys=True) + "\n"
    if len(sys.argv) == 1:
        sys.stdout.write(rendered)
        return 0
    if len(sys.argv) != 2:
        print("usage: python -m backend.ws.schema_export [output.json]", file=sys.stderr)
        return 2
    Path(sys.argv[1]).write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
