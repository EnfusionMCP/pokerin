"""Every live helper must reject ordinary invocation before app DB import."""

import os
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize(
    "module_name",
    [
        "tests.dev_bootstrap",
        "tests._dev_bots",
        "tests.ws_live",
        "tests.qa_live",
        "tests.integration_live",
    ],
)
def test_mutating_helper_requires_explicit_disposable_database(
    module_name: str,
) -> None:
    environment = os.environ.copy()
    for key in ("ENVIRONMENT", "ALLOW_DESTRUCTIVE_TESTS", "TEST_DATABASE_URL"):
        environment.pop(key, None)
    # If backend.db were imported first, this sentinel would produce a
    # SQLAlchemy URL error instead of the safety gate's deterministic failure.
    environment["DATABASE_URL"] = "definitely-not-a-database-url"

    result = subprocess.run(
        [sys.executable, "-m", module_name],
        cwd=Path(__file__).resolve().parents[1],
        env=environment,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )

    assert result.returncode != 0
    assert "ENVIRONMENT must be exactly 'test'" in result.stderr
    assert "Could not parse SQLAlchemy URL" not in result.stderr
