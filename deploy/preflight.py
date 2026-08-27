#!/usr/bin/env python3
"""Fail-closed validation for the production deployment environment."""

from __future__ import annotations

import os
import re
import shlex
import stat
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


class PreflightError(RuntimeError):
    pass


REQUIRED = {
    "BANK_CHARACTER_ID",
    "BANK_CLIENT_ID",
    "BANK_REFRESH_TOKEN",
    "BACKUP_CONTAINER_GID",
    "BACKUP_CONTAINER_UID",
    "BACKUP_DESTINATION_ID",
    "BACKUP_DIR",
    "BASE_URL",
    "DATABASE_URL",
    "DB_EXPECTED_SYSTEM_IDENTIFIER",
    "DEBUG",
    "EVE_CALLBACK_URL",
    "EVE_CLIENT_ID",
    "JWT_SECRET",
    "POSTGRES_DB",
    "POSTGRES_PASSWORD",
    "POSTGRES_VOLUME_NAME",
}
PLACEHOLDER_FRAGMENTS = ("change-me", "example", "placeholder", "replace", "your_")
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")


def read_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as exc:
        raise PreflightError("cannot read .env as UTF-8") from exc

    for lineno, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise PreflightError(f".env line {lineno} is not KEY=VALUE")
        key, raw_value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise PreflightError(f".env line {lineno} has an invalid key")
        if key in values:
            raise PreflightError(f".env contains duplicate key {key}")
        lexer = shlex.shlex(raw_value, posix=True)
        lexer.whitespace_split = True
        lexer.commenters = "#"
        try:
            parts = list(lexer)
        except ValueError as exc:
            raise PreflightError(f".env line {lineno} has invalid quoting") from exc
        if len(parts) > 1:
            raise PreflightError(
                f".env line {lineno} must quote values containing whitespace"
            )
        values[key] = parts[0] if parts else ""
    return values


def _reject_placeholder(name: str, value: str) -> None:
    normalized = value.strip().casefold()
    if not normalized or any(fragment in normalized for fragment in PLACEHOLDER_FRAGMENTS):
        raise PreflightError(f"{name} is blank or still a published placeholder")


def validate_values(values: dict[str, str], *, check_backup_path: bool) -> None:
    missing = sorted(REQUIRED - values.keys())
    if missing:
        raise PreflightError(f".env is missing required keys: {', '.join(missing)}")

    jwt_secret = values["JWT_SECRET"]
    _reject_placeholder("JWT_SECRET", jwt_secret)
    if len(jwt_secret.encode("utf-8")) < 32:
        raise PreflightError("JWT_SECRET must contain at least 32 UTF-8 bytes")

    password = values["POSTGRES_PASSWORD"]
    _reject_placeholder("POSTGRES_PASSWORD", password)
    if len(password.encode("utf-8")) < 32:
        raise PreflightError("POSTGRES_PASSWORD must contain at least 32 UTF-8 bytes")

    database = values["POSTGRES_DB"]
    if not IDENTIFIER.fullmatch(database):
        raise PreflightError("POSTGRES_DB must be a simple PostgreSQL identifier")
    try:
        url = urlsplit(values["DATABASE_URL"])
        port = url.port
    except ValueError:
        raise PreflightError("DATABASE_URL is invalid") from None
    if url.scheme != "postgresql+asyncpg":
        raise PreflightError("DATABASE_URL must use postgresql+asyncpg")
    if url.hostname != "postgres" or port != 5432:
        raise PreflightError("DATABASE_URL must target postgres:5432")
    if unquote(url.username or "") != "pokerin":
        raise PreflightError("DATABASE_URL must use the pokerin role")
    if unquote(url.password or "") != password:
        raise PreflightError(
            "DATABASE_URL password does not decode to POSTGRES_PASSWORD"
        )
    if unquote(url.path.lstrip("/")) != database:
        raise PreflightError("DATABASE_URL database does not match POSTGRES_DB")
    if url.query or url.fragment:
        raise PreflightError("DATABASE_URL query/fragment overrides are not allowed")
    volume_name = values["POSTGRES_VOLUME_NAME"]
    _reject_placeholder("POSTGRES_VOLUME_NAME", volume_name)
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{2,127}", volume_name):
        raise PreflightError("POSTGRES_VOLUME_NAME has an invalid Docker volume name")

    if values["DEBUG"].strip().casefold() not in ("false", "0"):
        raise PreflightError("DEBUG must be false in production")

    for name in ("EVE_CLIENT_ID", "BANK_CLIENT_ID"):
        _reject_placeholder(name, values[name])
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", values[name]):
            raise PreflightError(f"{name} must be an 8-128 character URL-safe opaque ID")
    _reject_placeholder("BANK_REFRESH_TOKEN", values["BANK_REFRESH_TOKEN"])
    if len(values["BANK_REFRESH_TOKEN"].encode("utf-8")) < 20:
        raise PreflightError("BANK_REFRESH_TOKEN is unexpectedly short")
    if not values["BANK_CHARACTER_ID"].isdigit() or int(values["BANK_CHARACTER_ID"]) <= 0:
        raise PreflightError("BANK_CHARACTER_ID must be a positive integer")

    try:
        base_url = urlsplit(values["BASE_URL"])
        callback_url = urlsplit(values["EVE_CALLBACK_URL"])
        base_port = base_url.port
        callback_port = callback_url.port
    except ValueError:
        raise PreflightError("BASE_URL or EVE_CALLBACK_URL is invalid") from None
    if (
        base_url.scheme != "https"
        or not base_url.hostname
        or base_url.hostname in {"localhost", "127.0.0.1", "::1"}
        or base_port not in (None, 443)
        or base_url.path not in ("", "/")
        or base_url.query
        or base_url.fragment
        or base_url.username
        or base_url.password
    ):
        raise PreflightError("BASE_URL must be a clean public HTTPS origin")
    if (
        callback_url.scheme != "https"
        or callback_url.hostname != base_url.hostname
        or callback_port != base_port
        or callback_url.path != "/auth/callback"
        or callback_url.query
        or callback_url.fragment
        or callback_url.username
        or callback_url.password
    ):
        raise PreflightError("EVE_CALLBACK_URL must be BASE_URL/auth/callback")

    system_identifier = values["DB_EXPECTED_SYSTEM_IDENTIFIER"]
    if not re.fullmatch(r"[0-9]{10,24}", system_identifier):
        raise PreflightError("DB_EXPECTED_SYSTEM_IDENTIFIER must be numeric")
    destination_id = values["BACKUP_DESTINATION_ID"]
    _reject_placeholder("BACKUP_DESTINATION_ID", destination_id)
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{2,63}", destination_id):
        raise PreflightError("BACKUP_DESTINATION_ID has an invalid format")
    for name in ("BACKUP_CONTAINER_UID", "BACKUP_CONTAINER_GID"):
        if not re.fullmatch(r"[0-9]{1,10}", values[name]):
            raise PreflightError(f"{name} must be numeric")

    backup_path = Path(values["BACKUP_DIR"])
    if not backup_path.is_absolute():
        raise PreflightError("BACKUP_DIR must be absolute")
    if str(backup_path) in {"/", "/etc", "/home", "/root", "/tmp", "/usr", "/var"}:
        raise PreflightError("BACKUP_DIR is an unsafe broad path")
    if check_backup_path:
        if not backup_path.is_dir() or backup_path.is_symlink():
            raise PreflightError("BACKUP_DIR is missing or is a symlink")
        marker = backup_path / ".pokerin-backup-root"
        expected = f"pokerin-backup-root-v1:{destination_id}"
        try:
            actual = marker.read_text(encoding="utf-8").strip()
        except (OSError, UnicodeError) as exc:
            raise PreflightError("BACKUP_DIR marker is missing or unreadable") from exc
        if marker.is_symlink() or actual != expected:
            raise PreflightError("BACKUP_DIR marker does not match its destination ID")


def validate_environment(path: Path, *, require_posix_permissions: bool = True) -> None:
    if not path.is_file() or path.is_symlink():
        raise PreflightError(".env must be a regular, non-symlink file")
    if require_posix_permissions:
        mode = stat.S_IMODE(path.stat().st_mode)
        if mode & 0o077:
            raise PreflightError(".env must not be readable or writable by group/other")
        if os.name != "posix":
            raise PreflightError("production preflight must run on a POSIX host")
        import pwd

        try:
            deploy_uid = pwd.getpwnam("pokerin").pw_uid
        except KeyError:
            raise PreflightError("required deployment user 'pokerin' does not exist") from None
        if path.stat().st_uid != deploy_uid or os.geteuid() != deploy_uid:
            raise PreflightError(".env and deploy process must be owned by user pokerin")
    validate_values(read_dotenv(path), check_backup_path=False)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: preflight.py PATH_TO_ENV", file=sys.stderr)
        return 2
    try:
        validate_environment(Path(argv[1]))
    except PreflightError as exc:
        print(f"deploy preflight: ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception:
        print("deploy preflight: ERROR: internal validation failure", file=sys.stderr)
        return 1
    print("deploy preflight: production configuration accepted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
