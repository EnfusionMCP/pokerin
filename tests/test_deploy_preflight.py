from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).parents[1] / "deploy" / "preflight.py"
SPEC = importlib.util.spec_from_file_location("deploy_preflight", MODULE_PATH)
assert SPEC and SPEC.loader
preflight = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preflight)


def _valid_values(backup_dir: Path) -> dict[str, str]:
    password = "a1" * 32
    return {
        "BANK_CHARACTER_ID": "123456789",
        "BANK_CLIENT_ID": "BANKclient_12345678901234567",
        "BANK_REFRESH_TOKEN": "refresh-token-test-only-123456789",
        "BACKUP_CONTAINER_GID": "70",
        "BACKUP_CONTAINER_UID": "70",
        "BACKUP_DESTINATION_ID": "pytest-primary",
        "BACKUP_DIR": str(backup_dir),
        "BASE_URL": "https://pokerin.space",
        "DATABASE_URL": (
            f"postgresql+asyncpg://pokerin:{password}@postgres:5432/pokerin"
        ),
        "DB_EXPECTED_SYSTEM_IDENTIFIER": "7420012345678901234",
        "DEBUG": "false",
        "EVE_CALLBACK_URL": "https://pokerin.space/auth/callback",
        "EVE_CLIENT_ID": "EVEclient_123456789",
        "JWT_SECRET": "b2" * 32,
        "POSTGRES_DB": "pokerin",
        "POSTGRES_PASSWORD": password,
        "POSTGRES_VOLUME_NAME": "pytest_pgdata",
    }


def _backup_dir(tmp_path: Path) -> Path:
    backup_dir = tmp_path / "offsite" / "pokerin"
    backup_dir.mkdir(parents=True)
    (backup_dir / ".pokerin-backup-root").write_text(
        "pokerin-backup-root-v1:pytest-primary\n", encoding="utf-8"
    )
    return backup_dir


def test_valid_production_values_are_accepted(tmp_path: Path) -> None:
    preflight.validate_values(_valid_values(_backup_dir(tmp_path)), check_backup_path=True)


@pytest.mark.parametrize(
    ("key", "value", "message"),
    [
        ("JWT_SECRET", "", "JWT_SECRET"),
        ("POSTGRES_PASSWORD", "replace-with-password", "POSTGRES_PASSWORD"),
        ("DEBUG", "true", "DEBUG"),
        (
            "DB_EXPECTED_SYSTEM_IDENTIFIER",
            "replace_me",
            "DB_EXPECTED_SYSTEM_IDENTIFIER",
        ),
    ],
)
def test_unsafe_production_values_fail_closed(
    tmp_path: Path, key: str, value: str, message: str
) -> None:
    values = _valid_values(_backup_dir(tmp_path))
    values[key] = value

    with pytest.raises(preflight.PreflightError, match=message):
        preflight.validate_values(values, check_backup_path=True)


def test_database_password_must_match_url_after_percent_decoding(tmp_path: Path) -> None:
    values = _valid_values(_backup_dir(tmp_path))
    values["POSTGRES_PASSWORD"] = "c3" * 32

    with pytest.raises(preflight.PreflightError, match="does not decode"):
        preflight.validate_values(values, check_backup_path=True)


def test_malformed_database_url_does_not_leak_credentials(tmp_path: Path) -> None:
    values = _valid_values(_backup_dir(tmp_path))
    sentinel = "DO_NOT_RENDER_THIS_SECRET"
    values["DATABASE_URL"] = (
        f"postgresql+asyncpg://pokerin:{sentinel}@postgres:not-a-port/pokerin"
    )

    with pytest.raises(preflight.PreflightError) as raised:
        preflight.validate_values(values, check_backup_path=True)

    assert str(raised.value) == "DATABASE_URL is invalid"
    assert sentinel not in str(raised.value)


def test_wrong_backup_destination_marker_fails_closed(tmp_path: Path) -> None:
    backup_dir = _backup_dir(tmp_path)
    (backup_dir / ".pokerin-backup-root").write_text(
        "pokerin-backup-root-v1:somewhere-else\n", encoding="utf-8"
    )

    with pytest.raises(preflight.PreflightError, match="marker"):
        preflight.validate_values(_valid_values(backup_dir), check_backup_path=True)


def test_published_env_example_is_not_deployable() -> None:
    example = MODULE_PATH.parents[1] / ".env.example"

    with pytest.raises(preflight.PreflightError):
        preflight.validate_values(preflight.read_dotenv(example), check_backup_path=False)


@pytest.mark.skipif(os.name != "posix", reason="POSIX file modes are required")
def test_group_readable_env_file_is_rejected(tmp_path: Path) -> None:
    backup_dir = _backup_dir(tmp_path)
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(f"{key}={value}" for key, value in _valid_values(backup_dir).items())
        + "\n",
        encoding="utf-8",
    )
    env_file.chmod(0o640)

    with pytest.raises(preflight.PreflightError, match="group/other"):
        preflight.validate_environment(env_file)
