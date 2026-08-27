"""Pytest entry point for the destructive disposable-PostgreSQL harness."""

import asyncio
import os

import pytest


@pytest.mark.integration
def test_postgres_conservation_and_persistence() -> None:
    if not os.environ.get("TEST_DATABASE_URL"):
        pytest.skip("requires an explicitly authorized disposable PostgreSQL database")

    # Import only after integration_live has installed and validated the test
    # URL as DATABASE_URL. This avoids importing application settings first.
    from tests import integration_live

    assert asyncio.run(integration_live.main()) == 0
