from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import time
from pathlib import Path

import pytest


SCRIPT = Path(__file__).parents[1] / "deploy" / "db-ops.sh"
SH = shutil.which("sh") if os.name != "nt" else None
FLOCK = shutil.which("flock") if os.name != "nt" else None

pytestmark = pytest.mark.skipif(SH is None, reason="POSIX sh is required")


def _executable(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(0o755)


def _copy_with_test_lock(source: Path, destination: Path, lock_file: Path) -> None:
    body = source.read_text(encoding="utf-8")
    production = 'lock_file="/home/pokerin/.pokerin-ops.lock"'
    assert production in body
    _executable(
        destination,
        body.replace(production, f'lock_file="{lock_file.as_posix()}"'),
    )


@pytest.fixture
def db_ops_env(tmp_path: Path) -> tuple[dict[str, str], Path, Path]:
    backup_root = tmp_path / "backups"
    backup_root.mkdir()
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_log = tmp_path / "commands.log"

    _executable(
        fake_bin / "psql",
        """#!/bin/sh
printf 'psql %s\\n' "$*" >> "$FAKE_LOG"
database=""
query=""
for argument in "$@"; do
    case "$argument" in
        --dbname=*) database=${argument#--dbname=} ;;
        --command=*) query=${argument#--command=} ;;
    esac
done
case "$query" in
    *pg_stat_activity*) printf '%s\\n' "${FAKE_ACTIVE_CONNECTIONS:-0}" ;;
    *pg_control_system*) printf '%s\\n' "${FAKE_SYSTEM_IDENTIFIER:-7420012345678901234}" ;;
    *pg_database*) printf '%s\\n' "${FAKE_TARGET_EXISTS:-0}" ;;
    *information_schema.tables*) printf '%s\\n' "${FAKE_TABLE_COUNT:-12}" ;;
    *to_regclass*) printf '%s\\n' "${FAKE_HAS_ALEMBIC:-1}" ;;
    *server_version_num*) printf '160010\\n' ;;
    *current_database*) printf '%s|%s\\n' "${FAKE_IDENTITY_DB:-$database}" "${FAKE_IDENTITY_USER:-$PGUSER}" ;;
    *) printf '0\\n' ;;
esac
""",
    )
    _executable(
        fake_bin / "pg_dump",
        """#!/bin/sh
printf 'pg_dump %s\\n' "$*" >> "$FAKE_LOG"
if [ "${1:-}" = "--version" ]; then
    printf 'pg_dump (PostgreSQL) 16.10\\n'
    exit 0
fi
output=""
for argument in "$@"; do
    case "$argument" in --file=*) output=${argument#--file=} ;; esac
done
[ -n "$output" ] || exit 2
printf 'deterministic fake custom archive\\n' > "$output"
""",
    )
    _executable(
        fake_bin / "pg_restore",
        """#!/bin/sh
printf 'pg_restore %s\\n' "$*" >> "$FAKE_LOG"
if [ "${1:-}" = "--list" ]; then
    printf 'FAKE POSTGRESQL ARCHIVE CATALOG\\n'
    [ "${FAKE_LIST_FAIL_AFTER_OUTPUT:-0}" = "0" ] || exit 7
elif [ "${FAKE_RESTORE_FAIL:-0}" != "0" ]; then
    exit 8
fi
""",
    )
    for command in ("createdb", "dropdb"):
        _executable(
            fake_bin / command,
            f"#!/bin/sh\nprintf '{command} %s\\n' \"$*\" >> \"$FAKE_LOG\"\n",
        )
    _executable(fake_bin / "sync", "#!/bin/sh\nexit 0\n")
    _executable(
        fake_bin / "alembic",
        "#!/bin/sh\nprintf 'alembic %s\\n' \"$*\" >> \"$FAKE_LOG\"\n",
    )

    environment = os.environ.copy()
    for variable in ("PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE"):
        environment.pop(variable, None)
    environment.update(
        {
            "PATH": f"{fake_bin}{os.pathsep}{environment['PATH']}",
            "FAKE_LOG": str(fake_log),
            "PGHOST": "postgres",
            "PGPORT": "5432",
            "PGUSER": "pokerin",
            "PGPASSWORD": "test-only-password",
            "PGDATABASE": "pokerin",
            "PGMAINTENANCE_DB": "postgres",
            "DB_EXPECTED_HOST": "postgres",
            "DB_EXPECTED_USER": "pokerin",
            "DB_EXPECTED_DATABASE": "pokerin",
            "DB_EXPECTED_SYSTEM_IDENTIFIER": "7420012345678901234",
            "BACKUP_ROOT": str(backup_root),
            "BACKUP_EXPECTED_ROOT": str(backup_root),
            "BACKUP_DESTINATION_ID": "pytest-destination",
            "BACKUP_RETENTION_COUNT": "2",
            "PRODUCTION_DATABASE_NAME": "pokerin",
            "RESTORE_EXPECTED_SOURCE_DATABASE": "pokerin",
        }
    )
    return environment, backup_root, fake_log


def _run(environment: dict[str, str], operation: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(SH), str(SCRIPT), operation],
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )


def _initialize_marker(backup_root: Path) -> None:
    (backup_root / ".pokerin-backup-root").write_text(
        "pokerin-backup-root-v1:pytest-destination\n", encoding="utf-8"
    )


def _create_backup(
    environment: dict[str, str], backup_root: Path
) -> tuple[str, str]:
    _initialize_marker(backup_root)
    result = _run(environment, "backup")
    assert result.returncode == 0, result.stderr
    values = dict(line.split("=", 1) for line in result.stdout.splitlines())
    return values["BACKUP_ID"], values["DUMP_SHA256"]


def test_backup_fails_before_database_access_without_destination_marker(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, _, fake_log = db_ops_env

    result = _run(environment, "backup")

    assert result.returncode != 0
    assert "destination marker is missing" in result.stderr
    assert not fake_log.exists()


def test_backup_rejects_connected_identity_before_dump(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    _initialize_marker(backup_root)
    environment["FAKE_IDENTITY_USER"] = "unexpected_user"

    result = _run(environment, "backup")

    assert result.returncode != 0
    assert "connected PostgreSQL identity" in result.stderr
    assert "pg_dump" not in fake_log.read_text(encoding="utf-8")
    assert not list(backup_root.glob("backup_*"))


def test_quiesced_backup_rejects_other_client_sessions(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    _initialize_marker(backup_root)
    environment.update(
        {"BACKUP_REQUIRE_QUIESCED": "1", "FAKE_ACTIVE_CONNECTIONS": "1"}
    )

    result = _run(environment, "backup")

    assert result.returncode != 0
    assert "still has active connections" in result.stderr
    assert "pg_dump" not in fake_log.read_text(encoding="utf-8")


def test_backup_is_complete_verified_atomic_and_retained(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, _ = db_ops_env
    _initialize_marker(backup_root)

    newest_id = ""
    for _ in range(3):
        result = _run(environment, "backup")
        assert result.returncode == 0, result.stderr
        newest_id = dict(line.split("=", 1) for line in result.stdout.splitlines())[
            "BACKUP_ID"
        ]

    backups = sorted(backup_root.glob("backup_*"))
    assert len(backups) == 2
    assert (backup_root / newest_id).is_dir()
    assert not list(backup_root.glob("*.partial"))
    assert not list(backup_root.glob(".deleting_*"))
    assert not (backup_root / ".db-ops.lock").exists()
    for backup in backups:
        assert backup.is_dir()
        expected_files = {
            "database.dump",
            "metadata.txt",
            "toc.list",
            "COMPLETE",
            "SHA256SUMS",
        }
        assert {path.name for path in backup.iterdir()} == expected_files
        for line in (backup / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
            expected_hash, filename = line.split()
            actual_hash = hashlib.sha256((backup / filename).read_bytes()).hexdigest()
            assert actual_hash == expected_hash


def test_disposable_restore_requires_hash_bound_confirmation_before_create(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    backup_id, _ = _create_backup(environment, backup_root)
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": "pokerin_drill_pytest",
            "RESTORE_MODE": "disposable",
        }
    )
    fake_log.write_text("", encoding="utf-8")

    result = _run(environment, "restore")

    assert result.returncode != 0
    assert "RESTORE_CONFIRM exactly" in result.stderr
    assert "createdb" not in fake_log.read_text(encoding="utf-8")


def test_disposable_restore_creates_new_target_and_runs_verification(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    backup_id, dump_hash = _create_backup(environment, backup_root)
    target = "pokerin_drill_pytest"
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": target,
            "RESTORE_MODE": "disposable",
            "RESTORE_CONFIRM": (
                f"RESTORE_DISPOSABLE:{target}:{backup_id}:{dump_hash}"
            ),
        }
    )
    fake_log.write_text("", encoding="utf-8")

    result = _run(environment, "restore")

    assert result.returncode == 0, result.stderr
    assert f"RESTORED_DATABASE={target}" in result.stdout
    command_log = fake_log.read_text(encoding="utf-8")
    assert f"createdb --host=postgres" in command_log
    assert f"--dbname={target}" in command_log
    assert "pg_restore --host=postgres" in command_log
    assert not (backup_root / ".db-ops.lock").exists()


def test_catalog_output_with_nonzero_pg_restore_status_is_rejected(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, _ = db_ops_env
    backup_id, _ = _create_backup(environment, backup_root)
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "FAKE_LIST_FAIL_AFTER_OUTPUT": "1",
        }
    )

    result = _run(environment, "verify")

    assert result.returncode != 0
    assert "pg_restore could not read" in result.stderr
    assert not (backup_root / ".db-ops.lock").exists()
    assert not list(backup_root.glob(".verify-*"))


def test_stale_catalog_temp_does_not_block_verification(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, _ = db_ops_env
    backup_id, _ = _create_backup(environment, backup_root)
    stale = backup_root / f".verify-{backup_id}-1.toc.partial"
    stale.write_text("interrupted old container\n", encoding="utf-8")
    environment["RESTORE_BACKUP_ID"] = backup_id

    result = _run(environment, "verify")

    assert result.returncode == 0, result.stderr
    assert stale.read_text(encoding="utf-8") == "interrupted old container\n"
    assert list(backup_root.glob(".verify-*")) == [stale]


def test_retention_uses_monotonic_sequence_after_clock_rollback(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, _ = db_ops_env
    _initialize_marker(backup_root)
    fake_bin = Path(environment["PATH"].split(os.pathsep, 1)[0])
    _executable(
        fake_bin / "date",
        """#!/bin/sh
case "$*" in
    *%Y%m%dT%H%M%SZ*) printf '%s\n' "$FAKE_BACKUP_TIMESTAMP" ;;
    *) exec /bin/date "$@" ;;
esac
""",
    )

    newest_id = ""
    for timestamp in ("20260827T030000Z", "20260827T020000Z", "20260827T010000Z"):
        environment["FAKE_BACKUP_TIMESTAMP"] = timestamp
        result = _run(environment, "backup")
        assert result.returncode == 0, result.stderr
        newest_id = dict(line.split("=", 1) for line in result.stdout.splitlines())[
            "BACKUP_ID"
        ]

    assert (backup_root / newest_id).is_dir()
    assert len(list(backup_root.glob("backup_*"))) == 2


@pytest.mark.parametrize(
    ("failure_environment", "message"),
    [
        ({"FAKE_RESTORE_FAIL": "1"}, "left for inspection"),
        ({"FAKE_TABLE_COUNT": "0"}, "restored database has no public tables"),
    ],
)
def test_failed_restore_leaves_only_confirmed_cleanup_path(
    db_ops_env: tuple[dict[str, str], Path, Path],
    failure_environment: dict[str, str],
    message: str,
) -> None:
    environment, backup_root, fake_log = db_ops_env
    backup_id, dump_hash = _create_backup(environment, backup_root)
    target = "pokerin_restore_failed"
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": target,
            "RESTORE_MODE": "disposable",
            "RESTORE_CONFIRM": (
                f"RESTORE_DISPOSABLE:{target}:{backup_id}:{dump_hash}"
            ),
        }
        | failure_environment
    )
    fake_log.write_text("", encoding="utf-8")

    result = _run(environment, "restore")

    assert result.returncode != 0
    assert message in result.stderr
    commands = fake_log.read_text(encoding="utf-8")
    assert "createdb" in commands
    assert "dropdb" not in commands
    assert not (backup_root / ".db-ops.lock").exists()

    environment.pop("FAKE_RESTORE_FAIL", None)
    environment.pop("FAKE_TABLE_COUNT", None)
    environment.update(
        {
            "FAKE_TARGET_EXISTS": "1",
            "DROP_TARGET_DATABASE": target,
            "DROP_CONFIRM": f"DROP_DISPOSABLE_DATABASE:{target}",
        }
    )
    cleanup = _run(environment, "drop-disposable")
    assert cleanup.returncode == 0, cleanup.stderr
    assert "dropdb" in fake_log.read_text(encoding="utf-8")


def test_restore_lock_prevents_backup_pruning_during_archive_verification(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, _ = db_ops_env
    backup_id, dump_hash = _create_backup(environment, backup_root)
    target = "pokerin_restore_race"
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": target,
            "RESTORE_MODE": "disposable",
            "RESTORE_CONFIRM": (
                f"RESTORE_DISPOSABLE:{target}:{backup_id}:{dump_hash}"
            ),
        }
    )
    fake_bin = Path(environment["PATH"].split(os.pathsep, 1)[0])
    verify_started = backup_root.parent / "verify-started"
    verify_continue = backup_root.parent / "verify-continue"
    environment.update(
        {
            "FAKE_VERIFY_STARTED": str(verify_started),
            "FAKE_VERIFY_CONTINUE": str(verify_continue),
        }
    )
    _executable(
        fake_bin / "pg_restore",
        """#!/bin/sh
printf 'pg_restore %s\\n' "$*" >> "$FAKE_LOG"
if [ "${1:-}" = "--list" ]; then
    : > "$FAKE_VERIFY_STARTED"
    while [ ! -e "$FAKE_VERIFY_CONTINUE" ]; do sleep 0.05; done
    printf 'FAKE POSTGRESQL ARCHIVE CATALOG\\n'
fi
""",
    )

    restore = subprocess.Popen(
        [str(SH), str(SCRIPT), "restore"],
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 5
        while not verify_started.exists() and time.monotonic() < deadline:
            time.sleep(0.05)
        assert verify_started.exists(), "restore did not enter archive verification"

        contender = _run(environment, "backup")
        assert contender.returncode != 0
        assert "operation lock exists" in contender.stderr
    finally:
        verify_continue.touch()
    stdout, stderr = restore.communicate(timeout=5)
    assert restore.returncode == 0, stderr
    assert f"RESTORED_DATABASE={target}" in stdout


def test_in_place_production_restore_is_not_supported(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    backup_id, dump_hash = _create_backup(environment, backup_root)
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": "pokerin",
            "RESTORE_MODE": "production",
            "RESTORE_CONFIRM": f"unused:{dump_hash}",
            "FAKE_TARGET_EXISTS": "1",
        }
    )
    fake_log.write_text("", encoding="utf-8")

    result = _run(environment, "restore")

    assert result.returncode != 0
    assert "disposable' or 'approved" in result.stderr
    command_log = fake_log.read_text(encoding="utf-8")
    assert "dropdb" not in command_log
    assert "createdb" not in command_log


def test_approved_restore_uses_an_empty_exact_shadow_target(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, backup_root, fake_log = db_ops_env
    backup_id, dump_hash = _create_backup(environment, backup_root)
    target = "pokerin_restore_candidate"
    environment.update(
        {
            "RESTORE_BACKUP_ID": backup_id,
            "RESTORE_TARGET_DATABASE": target,
            "RESTORE_APPROVED_DATABASE": target,
            "RESTORE_MODE": "approved",
            "RESTORE_CONFIRM": f"RESTORE_APPROVED:{target}:{backup_id}:{dump_hash}",
        }
    )
    fake_log.write_text("", encoding="utf-8")

    result = _run(environment, "restore")

    assert result.returncode == 0, result.stderr
    command_log = fake_log.read_text(encoding="utf-8")
    assert "dropdb" not in command_log
    assert "createdb --host=postgres" in command_log
    assert not (backup_root / ".db-ops.lock").exists()


def test_compose_startup_chain_keeps_migration_out_of_app_command() -> None:
    compose = (SCRIPT.parents[1] / "docker-compose.yml").read_text(encoding="utf-8")
    dockerfile = (SCRIPT.parents[1] / "Dockerfile").read_text(encoding="utf-8")

    assert "condition: service_completed_successfully" in compose
    assert "command: [\"/bin/sh\", \"deploy/migrate.sh\"]" in compose
    assert "alembic upgrade head &&" not in dockerfile
    assert 'CMD ["uvicorn", "backend.main:app"' in dockerfile


def test_shell_entrypoints_parse() -> None:
    for script in ("db-ops.sh", "db-operation.sh", "deploy.sh", "migrate.sh"):
        result = subprocess.run(
            [str(SH), "-n", str(SCRIPT.parent / script)],
            check=False,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, result.stderr


def test_migrate_rejects_database_not_protected_by_backup_gate(
    db_ops_env: tuple[dict[str, str], Path, Path],
) -> None:
    environment, _, fake_log = db_ops_env
    environment.update(
        {
            "DATABASE_URL": (
                "postgresql+asyncpg://pokerin:test-only-password@wrong-host:5432/pokerin"
            ),
            "EXPECTED_DATABASE_HOST": "postgres",
            "EXPECTED_DATABASE_PORT": "5432",
            "EXPECTED_DATABASE_USER": "pokerin",
            "EXPECTED_DATABASE_NAME": "pokerin",
        }
    )

    result = subprocess.run(
        [str(SH), str(SCRIPT.parent / "migrate.sh")],
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "does not match the database protected by the backup gate" in result.stderr
    assert not fake_log.exists() or "alembic" not in fake_log.read_text(encoding="utf-8")


def test_deploy_wrapper_forces_fresh_backup_before_migration(tmp_path: Path) -> None:
    fake_repo = tmp_path / "repo"
    fake_deploy = fake_repo / "deploy"
    fake_bin = fake_repo / "bin"
    fake_deploy.mkdir(parents=True)
    fake_bin.mkdir()
    _copy_with_test_lock(
        SCRIPT.parent / "deploy.sh",
        fake_deploy / "deploy.sh",
        fake_repo / ".global-ops.lock",
    )
    shutil.copy2(SCRIPT.parent / "check-empty-tables.py", fake_deploy)
    shutil.copy2(SCRIPT.parent / "wait-readiness.py", fake_deploy)
    (fake_repo / ".env").write_text("SAFE_TEST_ONLY=1\n", encoding="utf-8")
    (fake_repo / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")
    docker_log = fake_repo / "docker.log"
    _executable(
        fake_bin / "docker",
        """#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
case "$*" in
    "compose ps --status running --services caddy") printf 'caddy\\n' ;;
    "compose ps --status running --services app") printf 'app\\n' ;;
esac
""",
    )
    _executable(
        fake_bin / "python3",
        """#!/bin/sh
if [ "${1:-}" = "-c" ]; then
    printf '%s\n' 'pytest_pgdata'
else
    printf 'python3 %s\n' "$*" >> "$FAKE_DOCKER_LOG"
fi
""",
    )
    _executable(fake_bin / "flock", "#!/bin/sh\nexit 0\n")
    environment = os.environ.copy()
    environment.update(
        {
            "PATH": f"{fake_bin}{os.pathsep}{environment['PATH']}",
            "FAKE_DOCKER_LOG": str(docker_log),
        }
    )

    result = subprocess.run(
        [str(SH), str(fake_deploy / "deploy.sh")],
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    commands = docker_log.read_text(encoding="utf-8").splitlines()
    assert commands[0] == "python3 deploy/preflight.py .env"
    assert "volume inspect pytest_pgdata" in commands
    root_check = commands.index(
        "compose run --rm --no-deps db-backup check-root"
    )
    assert "compose build app migrate caddy" in commands
    build = commands.index("compose build app migrate caddy")
    stop_ingress = commands.index("compose stop --timeout 30 caddy")
    drain = commands.index("compose exec -T app python -")
    stop = commands.index("compose stop --timeout 60 app")
    backup = commands.index(
        "compose run --rm --no-deps -e BACKUP_REQUIRE_QUIESCED=1 db-backup backup"
    )
    migrate = commands.index("compose run --rm --no-deps migrate")
    app = commands.index("compose up -d --wait --no-deps app")
    assert root_check < build < stop_ingress < drain < stop < backup < migrate < app


@pytest.mark.skipif(FLOCK is None, reason="util-linux flock is required")
def test_deploy_lock_blocks_scheduled_or_manual_database_operation(
    tmp_path: Path,
) -> None:
    fake_repo = tmp_path / "repo"
    other_repo = tmp_path / "other-release"
    fake_deploy = fake_repo / "deploy"
    other_deploy = other_repo / "deploy"
    fake_bin = fake_repo / "bin"
    fake_deploy.mkdir(parents=True)
    other_deploy.mkdir(parents=True)
    fake_bin.mkdir()
    shared_lock = tmp_path / ".global-ops.lock"
    _copy_with_test_lock(
        SCRIPT.parent / "deploy.sh", fake_deploy / "deploy.sh", shared_lock
    )
    shutil.copy2(SCRIPT.parent / "check-empty-tables.py", fake_deploy)
    shutil.copy2(SCRIPT.parent / "wait-readiness.py", fake_deploy)
    _copy_with_test_lock(
        SCRIPT.parent / "db-operation.sh",
        other_deploy / "db-operation.sh",
        shared_lock,
    )
    (fake_repo / ".env").write_text("SAFE_TEST_ONLY=1\n", encoding="utf-8")
    (fake_repo / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")
    (other_repo / ".env").write_text("SAFE_TEST_ONLY=1\n", encoding="utf-8")
    (other_repo / "docker-compose.yml").write_text(
        "services: {}\n", encoding="utf-8"
    )
    started = fake_repo / "deploy-started"
    proceed = fake_repo / "deploy-proceed"
    docker_log = fake_repo / "docker.log"
    _executable(
        fake_bin / "docker",
        """#!/bin/sh
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"
if [ "${FAKE_BLOCK_DEPLOY:-0}" = "1" ] && [ "$*" = "compose config --quiet" ]; then
    : > "$FAKE_DEPLOY_STARTED"
    while [ ! -e "$FAKE_DEPLOY_PROCEED" ]; do sleep 0.05; done
fi
""",
    )
    _executable(
        fake_bin / "python3",
        "#!/bin/sh\n[ \"${1:-}\" != \"-c\" ] || printf '%s\\n' pytest_pgdata\n",
    )
    environment = os.environ.copy()
    environment.update(
        {
            "PATH": f"{fake_bin}{os.pathsep}{environment['PATH']}",
            "FAKE_DOCKER_LOG": str(docker_log),
            "FAKE_DEPLOY_STARTED": str(started),
            "FAKE_DEPLOY_PROCEED": str(proceed),
            "FAKE_BLOCK_DEPLOY": "1",
        }
    )

    deploy = subprocess.Popen(
        [str(SH), str(fake_deploy / "deploy.sh")],
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 5
        while not started.exists() and time.monotonic() < deadline:
            time.sleep(0.05)
        assert started.exists(), "deploy did not acquire the orchestration lock"

        contender_environment = environment | {"FAKE_BLOCK_DEPLOY": "0"}
        contender = subprocess.run(
            [str(SH), str(other_deploy / "db-operation.sh"), "backup"],
            env=contender_environment,
            check=False,
            capture_output=True,
            text=True,
        )
        assert contender.returncode != 0
        assert "another database/deployment operation" in contender.stderr
    finally:
        proceed.touch()
    _, deploy_stderr = deploy.communicate(timeout=10)
    assert deploy.returncode == 0, deploy_stderr

    service = (
        SCRIPT.parent / "systemd" / "pokerin-backup.service"
    ).read_text(encoding="utf-8")
    assert "/deploy/db-operation.sh backup" in service
