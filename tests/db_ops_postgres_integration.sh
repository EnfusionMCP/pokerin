#!/bin/sh
# Real source -> verified dump -> disposable restore smoke test. All Docker
# resources are uniquely named and removed by the EXIT trap.

set -eu
umask 077

repo_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
postgres_image="postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685"
suffix="$(date -u '+%Y%m%d%H%M%S')-$$"
printf '%s\n' "$suffix" | grep -Eq '^[0-9]{14}-[0-9]+$' || {
    printf '%s\n' "integration: unsafe resource suffix" >&2
    exit 1
}
db_container="pokerin-dbops-it-db-$suffix"
network="pokerin-dbops-it-net-$suffix"
backup_volume="pokerin-dbops-it-backup-$suffix"
password="db-ops-integration-only-password"
destination_id="db-ops-integration"

cleanup() {
    status=$?
    trap - EXIT HUP INT TERM
    docker rm -f "$db_container" >/dev/null 2>&1 || true
    docker network rm "$network" >/dev/null 2>&1 || true
    docker volume rm "$backup_volume" >/dev/null 2>&1 || true
    exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

run_db_ops() {
    operation=$1
    docker run --rm \
        --network "$network" \
        --user 70:70 \
        --volume "$backup_volume:/backups" \
        --volume "$repo_dir/deploy/db-ops.sh:/opt/pokerin/db-ops.sh:ro" \
        --env PGHOST="$db_container" \
        --env PGPORT=5432 \
        --env PGUSER=pokerin \
        --env PGPASSWORD="$password" \
        --env PGDATABASE=pokerin \
        --env PGMAINTENANCE_DB=postgres \
        --env DB_EXPECTED_HOST="$db_container" \
        --env DB_EXPECTED_USER=pokerin \
        --env DB_EXPECTED_DATABASE=pokerin \
        --env DB_EXPECTED_SYSTEM_IDENTIFIER="$system_identifier" \
        --env BACKUP_ROOT=/backups \
        --env BACKUP_EXPECTED_ROOT=/backups \
        --env BACKUP_DESTINATION_ID="$destination_id" \
        --env BACKUP_RETENTION_COUNT=3 \
        --env BACKUP_INIT_CONFIRM="${BACKUP_INIT_CONFIRM:-}" \
        --env PRODUCTION_DATABASE_NAME=pokerin \
        --env RESTORE_EXPECTED_SOURCE_DATABASE=pokerin \
        --env RESTORE_BACKUP_ID="${RESTORE_BACKUP_ID:-}" \
        --env RESTORE_TARGET_DATABASE="${RESTORE_TARGET_DATABASE:-}" \
        --env RESTORE_MODE="${RESTORE_MODE:-disposable}" \
        --env RESTORE_CONFIRM="${RESTORE_CONFIRM:-}" \
        --env DROP_TARGET_DATABASE="${DROP_TARGET_DATABASE:-}" \
        --env DROP_CONFIRM="${DROP_CONFIRM:-}" \
        --entrypoint /bin/sh \
        "$postgres_image" /opt/pokerin/db-ops.sh "$operation"
}

docker network create "$network" >/dev/null
docker volume create "$backup_volume" >/dev/null
docker run --rm --volume "$backup_volume:/backups" --entrypoint /bin/sh \
    "$postgres_image" -c 'chown 70:70 /backups && chmod 0700 /backups'
docker run --detach \
    --name "$db_container" \
    --network "$network" \
    --env POSTGRES_USER=pokerin \
    --env POSTGRES_PASSWORD="$password" \
    --env POSTGRES_DB=pokerin \
    "$postgres_image" >/dev/null

ready=0
for _attempt in $(seq 1 60); do
    # The official entrypoint briefly runs an initialization server on its
    # Unix socket and then shuts it down. TCP becomes ready only for the final
    # server, avoiding a race where the first test query hits that shutdown.
    if docker exec "$db_container" pg_isready -h 127.0.0.1 \
        -U pokerin -d pokerin >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done
[ "$ready" -eq 1 ] || {
    printf '%s\n' "integration: PostgreSQL did not become ready" >&2
    exit 1
}

docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U pokerin -d pokerin <<'SQL'
CREATE TABLE backup_probe (
    id bigint PRIMARY KEY,
    credits bigint NOT NULL CHECK (credits >= 0),
    external_ref text NOT NULL UNIQUE
);
CREATE TABLE alembic_version (
    version_num varchar(32) NOT NULL PRIMARY KEY
);
INSERT INTO backup_probe (id, credits, external_ref)
VALUES (42, 12500, 'probe-ref');
INSERT INTO alembic_version (version_num) VALUES ('integration_probe');
SQL

system_identifier=$(docker exec "$db_container" psql -U pokerin -d pokerin -Atqc \
    'SELECT system_identifier FROM pg_control_system();')
printf '%s\n' "$system_identifier" | grep -Eq '^[0-9]{10,24}$' || {
    printf '%s\n' "integration: invalid PostgreSQL system identifier" >&2
    exit 1
}

BACKUP_INIT_CONFIRM="INITIALIZE_POKERIN_BACKUP_ROOT:${destination_id}"
export BACKUP_INIT_CONFIRM
run_db_ops init-backup-root >/dev/null
unset BACKUP_INIT_CONFIRM

backup_output=$(run_db_ops backup)
RESTORE_BACKUP_ID=$(printf '%s\n' "$backup_output" | sed -n 's/^BACKUP_ID=//p')
dump_hash=$(printf '%s\n' "$backup_output" | sed -n 's/^DUMP_SHA256=//p')
if [ -z "$RESTORE_BACKUP_ID" ] \
    || ! printf '%s\n' "$dump_hash" | grep -Eq '^[0-9a-f]{64}$'; then
    printf '%s\n' "integration: backup did not return a valid ID and hash" >&2
    exit 1
fi

RESTORE_TARGET_DATABASE=pokerin_drill_integration
RESTORE_MODE=disposable
RESTORE_CONFIRM="RESTORE_DISPOSABLE:${RESTORE_TARGET_DATABASE}:${RESTORE_BACKUP_ID}:${dump_hash}"
export RESTORE_BACKUP_ID RESTORE_TARGET_DATABASE RESTORE_MODE RESTORE_CONFIRM
run_db_ops restore >/dev/null

row=$(docker exec "$db_container" psql -U pokerin -d "$RESTORE_TARGET_DATABASE" -Atqc \
    "SELECT id || '|' || credits || '|' || external_ref FROM backup_probe;")
[ "$row" = "42|12500|probe-ref" ] || {
    printf '%s\n' "integration: representative row was not restored exactly" >&2
    exit 1
}
constraint_count=$(docker exec "$db_container" psql -U pokerin -d "$RESTORE_TARGET_DATABASE" -Atqc \
    "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid WHERE r.relname = 'backup_probe' AND c.contype IN ('p', 'u', 'c');")
[ "$constraint_count" = "3" ] || {
    printf '%s\n' "integration: expected constraints were not restored" >&2
    exit 1
}
if docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U pokerin \
    -d "$RESTORE_TARGET_DATABASE" -c \
    "INSERT INTO backup_probe VALUES (43, 1, 'probe-ref');" >/dev/null 2>&1; then
    printf '%s\n' "integration: restored unique constraint did not reject a duplicate" >&2
    exit 1
fi

DROP_TARGET_DATABASE=$RESTORE_TARGET_DATABASE
DROP_CONFIRM="DROP_DISPOSABLE_DATABASE:${DROP_TARGET_DATABASE}"
export DROP_TARGET_DATABASE DROP_CONFIRM
run_db_ops drop-disposable >/dev/null

printf '%s\n' "integration: real PostgreSQL backup/restore invariants passed"
