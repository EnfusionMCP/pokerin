"""Runtime configuration security boundary tests."""

from __future__ import annotations

import pytest

from backend.config import (
    InvalidRuntimeConfiguration,
    MIN_JWT_SECRET_BYTES,
    Settings,
    validate_jwt_secret,
    validate_runtime_settings,
)


@pytest.mark.parametrize(
    "placeholder",
    [
        "CHANGE-ME-IN-PRODUCTION",
        "change-this-to-a-random-256-bit-hex-string",
        "replace-me-with-a-secure-random-secret",
        "your-secret-key-change-in-production",
        "  Change-This-To-A-Random-256-Bit-Hex-String  ",
    ],
)
def test_rejects_known_public_jwt_placeholders(placeholder: str) -> None:
    with pytest.raises(InvalidRuntimeConfiguration, match="known public placeholder"):
        validate_jwt_secret(placeholder)


def test_jwt_minimum_is_measured_in_utf8_bytes() -> None:
    with pytest.raises(InvalidRuntimeConfiguration, match="must not be blank"):
        validate_jwt_secret(" " * MIN_JWT_SECRET_BYTES)

    with pytest.raises(InvalidRuntimeConfiguration, match="at least 32 UTF-8 bytes"):
        validate_jwt_secret("x" * (MIN_JWT_SECRET_BYTES - 1))

    validate_jwt_secret("x" * MIN_JWT_SECRET_BYTES)
    validate_jwt_secret("é" * 16)  # 16 characters, exactly 32 UTF-8 bytes


def test_validation_error_never_echoes_the_candidate_secret() -> None:
    candidate = "sensitive-candidate" * 1
    with pytest.raises(InvalidRuntimeConfiguration) as exc_info:
        validate_jwt_secret(candidate)
    assert candidate not in str(exc_info.value)


def test_settings_construction_remains_available_to_import_and_migration_tools() -> None:
    runtime_settings = Settings(_env_file=None, jwt_secret="")
    assert runtime_settings.jwt_secret == ""
    with pytest.raises(InvalidRuntimeConfiguration):
        validate_runtime_settings(runtime_settings)


def test_retired_redis_dotenv_key_is_narrowly_ignored(tmp_path) -> None:
    legacy = tmp_path / ".env"
    legacy.write_text("REDIS_URL=redis://retired:6379/0\n", encoding="utf-8")
    assert Settings(_env_file=legacy).database_url

    legacy.write_text("UNEXPECTED_SETTING=must-fail\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unexpected_setting"):
        Settings(_env_file=legacy)


async def test_lifespan_rejects_secret_before_starting_services(monkeypatch) -> None:
    import backend.main as main

    service_started = False

    class UnexpectedBankService:
        def __init__(self) -> None:
            nonlocal service_started
            service_started = True

    monkeypatch.setattr(main, "BankService", UnexpectedBankService)
    monkeypatch.setattr(main.settings, "jwt_secret", "too-short")

    with pytest.raises(InvalidRuntimeConfiguration):
        async with main.lifespan(main.app):
            pytest.fail("invalid configuration must prevent lifespan startup")

    assert service_started is False
