#!/bin/sh
# PostgreSQL backup and restore operations for the Compose deployment.
# This script is intentionally POSIX sh so it runs in postgres:16-alpine.

set -eu
umask 077

MARKER_FILE=".pokerin-backup-root"
MARKER_FORMAT="pokerin-backup-root-v1"
VERIFY_TEMP=""

log() {
    printf '%s\n' "db-ops: $*" >&2
}

die() {
    log "ERROR: $*"
    exit 1
}

is_identifier() {
    printf '%s\n' "$1" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]{0,62}$'
}

is_backup_id() {
    printf '%s\n' "$1" \
        | grep -Eq '^backup_[0-9]{8}T[0-9]{6}Z_[0-9]{10}_[A-Za-z_][A-Za-z0-9_]{0,62}_[0-9a-f]{8}$'
}

is_disposable_database() {
    case "$1" in
        *_restore|*_restore_[A-Za-z0-9]*|*_drill|*_drill_[A-Za-z0-9]*) return 0 ;;
        *) return 1 ;;
    esac
}

require_connection_config() {
    [ -n "${PGHOST:-}" ] || die "PGHOST is required"
    [ -n "${PGPORT:-}" ] || die "PGPORT is required"
    [ -n "${PGUSER:-}" ] || die "PGUSER is required"
    [ -n "${PGPASSWORD:-}" ] || die "PGPASSWORD is required"
    [ -n "${DB_EXPECTED_HOST:-}" ] || die "DB_EXPECTED_HOST is required"
    [ -n "${DB_EXPECTED_USER:-}" ] || die "DB_EXPECTED_USER is required"
    [ -n "${DB_EXPECTED_SYSTEM_IDENTIFIER:-}" ] \
        || die "DB_EXPECTED_SYSTEM_IDENTIFIER is required"

    [ "$PGHOST" = "$DB_EXPECTED_HOST" ] \
        || die "PGHOST does not match DB_EXPECTED_HOST"
    [ "$PGUSER" = "$DB_EXPECTED_USER" ] \
        || die "PGUSER does not match DB_EXPECTED_USER"
    is_identifier "$PGUSER" || die "PGUSER must be a simple PostgreSQL identifier"
    printf '%s\n' "$PGHOST" | grep -Eq '^[A-Za-z0-9_.-]+$' \
        || die "PGHOST contains unsupported characters"
    printf '%s\n' "$PGPORT" | grep -Eq '^[0-9]{1,5}$' \
        || die "PGPORT must be numeric"
    [ "$PGPORT" -ge 1 ] && [ "$PGPORT" -le 65535 ] \
        || die "PGPORT is outside the valid range"

    # These libpq variables can redirect an otherwise explicit connection.
    [ -z "${PGHOSTADDR:-}" ] || die "PGHOSTADDR must be unset"
    [ -z "${PGSERVICE:-}" ] || die "PGSERVICE must be unset"
    [ -z "${PGSERVICEFILE:-}" ] || die "PGSERVICEFILE must be unset"
    printf '%s\n' "$DB_EXPECTED_SYSTEM_IDENTIFIER" | grep -Eq '^[0-9]{10,24}$' \
        || die "DB_EXPECTED_SYSTEM_IDENTIFIER must be numeric"
}

psql_value() {
    database=$1
    query=$2
    psql \
        --host="$PGHOST" \
        --port="$PGPORT" \
        --username="$PGUSER" \
        --dbname="$database" \
        --no-psqlrc \
        --no-align \
        --tuples-only \
        --quiet \
        --set=ON_ERROR_STOP=1 \
        --command="$query"
}

assert_database_identity() {
    database=$1
    expected="${database}|${DB_EXPECTED_USER}"
    actual=$(psql_value "$database" "SELECT current_database() || '|' || current_user;") \
        || die "could not verify PostgreSQL connection identity"
    [ "$actual" = "$expected" ] \
        || die "connected PostgreSQL identity is '$actual', expected '$expected'"
    actual_system_identifier=$(psql_value "$database" \
        "SELECT system_identifier::text FROM pg_control_system();") \
        || die "could not verify PostgreSQL system identifier"
    [ "$actual_system_identifier" = "$DB_EXPECTED_SYSTEM_IDENTIFIER" ] \
        || die "connected PostgreSQL cluster has the wrong system identifier"
}

resolve_backup_root() {
    [ -n "${BACKUP_ROOT:-}" ] || die "BACKUP_ROOT is required"
    [ -n "${BACKUP_EXPECTED_ROOT:-}" ] || die "BACKUP_EXPECTED_ROOT is required"
    [ -n "${BACKUP_DESTINATION_ID:-}" ] || die "BACKUP_DESTINATION_ID is required"
    printf '%s\n' "$BACKUP_DESTINATION_ID" \
        | grep -Eq '^[A-Za-z0-9][A-Za-z0-9_.-]{2,63}$' \
        || die "BACKUP_DESTINATION_ID must be 3-64 safe characters"

    case "$BACKUP_ROOT" in
        /*) ;;
        *) die "BACKUP_ROOT must be an absolute path" ;;
    esac
    [ -d "$BACKUP_ROOT" ] || die "BACKUP_ROOT does not exist"
    [ ! -L "$BACKUP_ROOT" ] || die "BACKUP_ROOT may not be a symlink"

    resolved=$(readlink -f "$BACKUP_ROOT") \
        || die "could not resolve BACKUP_ROOT"
    expected=$(readlink -f "$BACKUP_EXPECTED_ROOT") \
        || die "could not resolve BACKUP_EXPECTED_ROOT"
    [ "$resolved" = "$expected" ] \
        || die "BACKUP_ROOT does not resolve to BACKUP_EXPECTED_ROOT"
    case "$resolved" in
        /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/proc|/root|/run|/sbin|/sys|/tmp|/usr|/var)
            die "BACKUP_ROOT resolves to a prohibited broad path"
            ;;
    esac
    BACKUP_ROOT_RESOLVED=$resolved
}

expected_marker() {
    printf '%s:%s' "$MARKER_FORMAT" "$BACKUP_DESTINATION_ID"
}

require_backup_marker() {
    marker_path="$BACKUP_ROOT_RESOLVED/$MARKER_FILE"
    [ -f "$marker_path" ] || die "backup destination marker is missing"
    [ ! -L "$marker_path" ] || die "backup destination marker may not be a symlink"
    marker=$(cat "$marker_path") || die "could not read backup destination marker"
    [ "$marker" = "$(expected_marker)" ] \
        || die "backup destination marker does not match BACKUP_DESTINATION_ID"
}

next_backup_sequence() {
    sequence_file="$BACKUP_ROOT_RESOLVED/.backup-sequence"
    if [ -e "$sequence_file" ]; then
        [ -f "$sequence_file" ] && [ ! -L "$sequence_file" ] \
            || die "backup sequence must be a regular, non-symlink file"
        current_sequence=$(cat "$sequence_file") \
            || die "could not read backup sequence"
        printf '%s\n' "$current_sequence" | grep -Eq '^(0|[1-9][0-9]{0,9})$' \
            || die "backup sequence is invalid"
    else
        current_sequence=0
    fi
    [ "$current_sequence" -lt 9999999999 ] || die "backup sequence is exhausted"
    new_sequence=$((current_sequence + 1))
    sequence_tmp="$BACKUP_ROOT_RESOLVED/.backup-sequence.$$.partial"
    printf '%s\n' "$new_sequence" > "$sequence_tmp"
    chmod 600 "$sequence_tmp"
    sync
    mv "$sequence_tmp" "$sequence_file"
    sync
    printf '%010d\n' "$new_sequence"
}

acquire_operation_lock() {
    operation_name=$1
    LOCK_DIR="$BACKUP_ROOT_RESOLVED/.db-ops.lock"
    if ! mkdir "$LOCK_DIR" 2>/dev/null; then
        die "database operation lock exists; verify no db-ops process is running before removing it"
    fi
    {
        printf 'operation=%s\n' "$operation_name"
        printf 'pid=%s\n' "$$"
        printf 'started_at_utc=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    } > "$LOCK_DIR/owner"
}

release_operation_lock() {
    [ -n "${LOCK_DIR:-}" ] || return
    case "$LOCK_DIR" in
        "$BACKUP_ROOT_RESOLVED"/.db-ops.lock) ;;
        *) die "refusing to release an unexpected operation lock path" ;;
    esac
    rm -f "$LOCK_DIR/owner"
    rmdir "$LOCK_DIR"
    LOCK_DIR=""
}

cleanup_verify_temp() {
    [ -n "${VERIFY_TEMP:-}" ] || return 0
    case "$VERIFY_TEMP" in
        "$BACKUP_ROOT_RESOLVED"/.verify-backup_*) ;;
        *)
            log "ERROR: refusing to remove an unexpected verification temp path"
            return 1
            ;;
    esac
    if [ -L "$VERIFY_TEMP" ]; then
        log "ERROR: refusing to remove a symlinked verification temp file"
        return 1
    fi
    rm -f "$VERIFY_TEMP" || return 1
    VERIFY_TEMP=""
}

init_backup_root() {
    resolve_backup_root
    [ -w "$BACKUP_ROOT_RESOLVED" ] || die "BACKUP_ROOT is not writable"
    confirmation="INITIALIZE_POKERIN_BACKUP_ROOT:${BACKUP_DESTINATION_ID}"
    [ "${BACKUP_INIT_CONFIRM:-}" = "$confirmation" ] \
        || die "set BACKUP_INIT_CONFIRM exactly to '$confirmation'"

    marker_path="$BACKUP_ROOT_RESOLVED/$MARKER_FILE"
    if [ -e "$marker_path" ]; then
        require_backup_marker
        log "backup root is already initialized"
        return
    fi
    [ -z "$(ls -A "$BACKUP_ROOT_RESOLVED")" ] \
        || die "refusing to initialize a non-empty backup root"

    marker_tmp="$BACKUP_ROOT_RESOLVED/.marker.$$.partial"
    printf '%s\n' "$(expected_marker)" > "$marker_tmp"
    chmod 600 "$marker_tmp"
    sync
    mv "$marker_tmp" "$marker_path"
    sync
    log "initialized backup destination '$BACKUP_DESTINATION_ID'"
}

check_backup_root() {
    resolve_backup_root
    require_backup_marker
    [ -w "$BACKUP_ROOT_RESOLVED" ] || die "BACKUP_ROOT is not writable"
    acquire_operation_lock "check-root"
    release_operation_lock
    log "backup destination '$BACKUP_DESTINATION_ID' is accessible and initialized"
}

validate_manifest_shape() {
    manifest=$1
    awk '
        $1 ~ /^[0-9a-f]{64}$/ && $2 == "database.dump" { dump++ }
        $1 ~ /^[0-9a-f]{64}$/ && $2 == "metadata.txt" { metadata++ }
        $1 ~ /^[0-9a-f]{64}$/ && $2 == "toc.list" { toc++ }
        $1 ~ /^[0-9a-f]{64}$/ && $2 == "COMPLETE" { complete++ }
        END {
            if (NR != 4 || dump != 1 || metadata != 1 || toc != 1 || complete != 1) {
                exit 1
            }
        }
    ' "$manifest" || die "backup SHA256SUMS has an unexpected shape"
}

verify_backup() {
    backup_id=$1
    is_backup_id "$backup_id" || die "RESTORE_BACKUP_ID is invalid"
    backup_dir="$BACKUP_ROOT_RESOLVED/$backup_id"
    [ -d "$backup_dir" ] || die "backup '$backup_id' does not exist"
    [ ! -L "$backup_dir" ] || die "backup directory may not be a symlink"
    resolved_backup=$(readlink -f "$backup_dir") \
        || die "could not resolve backup directory"
    [ "$(dirname "$resolved_backup")" = "$BACKUP_ROOT_RESOLVED" ] \
        || die "backup directory escapes BACKUP_ROOT"

    for file in database.dump metadata.txt toc.list COMPLETE SHA256SUMS; do
        [ -f "$resolved_backup/$file" ] || die "backup is missing $file"
        [ ! -L "$resolved_backup/$file" ] || die "backup file $file may not be a symlink"
    done
    grep -Fxq "backup_id=$backup_id" "$resolved_backup/COMPLETE" \
        || die "backup completion marker does not match its directory"
    grep -Fxq "destination_id=$BACKUP_DESTINATION_ID" "$resolved_backup/COMPLETE" \
        || die "backup completion marker has the wrong destination"
    validate_manifest_shape "$resolved_backup/SHA256SUMS"
    (
        cd "$resolved_backup"
        sha256sum -c SHA256SUMS >/dev/null
    ) || die "backup SHA-256 verification failed"
    VERIFY_TEMP=$(mktemp "$BACKUP_ROOT_RESOLVED/.verify-${backup_id}.XXXXXX") \
        || die "could not create catalog verification temp file"
    if ! pg_restore --list "$resolved_backup/database.dump" > "$VERIFY_TEMP"; then
        cleanup_verify_temp || die "could not clean catalog verification temp file"
        die "pg_restore could not read the archive catalog"
    fi
    if ! cmp "$VERIFY_TEMP" "$resolved_backup/toc.list" >/dev/null 2>&1; then
        cleanup_verify_temp || die "could not clean catalog verification temp file"
        die "pg_restore catalog verification failed"
    fi
    cleanup_verify_temp || die "could not clean catalog verification temp file"

    VERIFIED_BACKUP_DIR=$resolved_backup
    VERIFIED_DUMP_HASH=$(awk '$2 == "database.dump" { print $1 }' "$resolved_backup/SHA256SUMS")
    [ -n "$VERIFIED_DUMP_HASH" ] || die "database.dump hash is missing"
}

safe_remove_partial() {
    candidate=$1
    case "$candidate" in
        "$BACKUP_ROOT_RESOLVED"/backup_*.partial) ;;
        *) die "refusing to clean an unexpected partial path" ;;
    esac
    [ ! -L "$candidate" ] || die "refusing to clean a symlinked partial backup"
    rm -rf "$candidate"
}

safe_remove_deleting() {
    candidate=$1
    case "$candidate" in
        "$BACKUP_ROOT_RESOLVED"/.deleting_backup_*) ;;
        *) die "refusing to remove an unexpected pruning path" ;;
    esac
    [ ! -L "$candidate" ] || die "refusing to remove a symlinked pruning path"
    rm -rf "$candidate"
}

apply_retention() {
    retention=${BACKUP_RETENTION_COUNT:-30}
    printf '%s\n' "$retention" | grep -Eq '^[1-9][0-9]{0,3}$' \
        || die "BACKUP_RETENTION_COUNT must be an integer from 1 to 9999"

    raw_list="$BACKUP_ROOT_RESOLVED/.retention.$$.raw"
    sorted_list="$BACKUP_ROOT_RESOLVED/.retention.$$.sorted"
    : > "$raw_list"
    for candidate in "$BACKUP_ROOT_RESOLVED"/backup_*; do
        [ -e "$candidate" ] || continue
        [ -d "$candidate" ] && [ ! -L "$candidate" ] \
            || die "backup retention found a non-directory or symlink"
        candidate_id=$(basename "$candidate")
        is_backup_id "$candidate_id" \
            || die "backup retention found an invalid backup directory name"
        candidate_sequence=$(printf '%s\n' "$candidate_id" | cut -d_ -f3)
        printf '%s %s\n' "$candidate_sequence" "$candidate_id" >> "$raw_list"
    done
    # The monotonic sequence, not wall-clock time, defines creation order. This
    # remains correct after an NTP correction or host clock rollback.
    sort -k1,1nr -k2,2r "$raw_list" > "$sorted_list"
    rm -f "$raw_list"

    index=0
    while IFS=' ' read -r candidate_sequence candidate_id; do
        [ -n "$candidate_id" ] || continue
        index=$((index + 1))
        if [ "$index" -le "$retention" ]; then
            continue
        fi
        verify_backup "$candidate_id"
        case "$VERIFIED_BACKUP_DIR" in
            "$BACKUP_ROOT_RESOLVED"/backup_*) ;;
            *) die "refusing to prune a path outside BACKUP_ROOT" ;;
        esac
        deleting="$BACKUP_ROOT_RESOLVED/.deleting_${candidate_id}"
        [ ! -e "$deleting" ] || die "backup pruning target already exists"
        mv "$VERIFIED_BACKUP_DIR" "$deleting"
        sync
        safe_remove_deleting "$deleting"
        sync
        log "pruned verified backup '$candidate_id'"
    done < "$sorted_list"
    rm -f "$sorted_list"
}

create_backup() {
    resolve_backup_root
    require_backup_marker
    [ -w "$BACKUP_ROOT_RESOLVED" ] || die "BACKUP_ROOT is not writable"
    require_connection_config
    [ -n "${PGDATABASE:-}" ] || die "PGDATABASE is required"
    [ -n "${DB_EXPECTED_DATABASE:-}" ] || die "DB_EXPECTED_DATABASE is required"
    [ "$PGDATABASE" = "$DB_EXPECTED_DATABASE" ] \
        || die "PGDATABASE does not match DB_EXPECTED_DATABASE"
    is_identifier "$PGDATABASE" || die "PGDATABASE must be a simple PostgreSQL identifier"
    assert_database_identity "$PGDATABASE"
    quiesced=${BACKUP_REQUIRE_QUIESCED:-0}
    case "$quiesced" in
        0) ;;
        1)
            active=$(psql_value "$PGDATABASE" \
                "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND backend_type = 'client backend' AND pid <> pg_backend_pid();") \
                || die "could not verify active source database connections"
            [ "$active" = "0" ] \
                || die "source database still has active connections"
            ;;
        *) die "BACKUP_REQUIRE_QUIESCED must be 0 or 1" ;;
    esac
    acquire_operation_lock "backup"
    staging=""
    cleanup_staging() {
        status=$?
        trap - EXIT HUP INT TERM
        cleanup_verify_temp || status=1
        if [ -n "${staging:-}" ] && [ -d "$staging" ]; then
            safe_remove_partial "$staging"
        fi
        release_operation_lock
        exit "$status"
    }
    trap cleanup_staging EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM

    compression=${BACKUP_COMPRESSION_LEVEL:-6}
    printf '%s\n' "$compression" | grep -Eq '^[0-9]$' \
        || die "BACKUP_COMPRESSION_LEVEL must be 0-9"
    created_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
    sequence=$(next_backup_sequence)
    random_hex=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
    printf '%s\n' "$random_hex" | grep -Eq '^[0-9a-f]{8}$' \
        || die "could not generate a backup identifier"
    backup_id="backup_${timestamp}_${sequence}_${PGDATABASE}_${random_hex}"
    staging="$BACKUP_ROOT_RESOLVED/${backup_id}.partial"
    final="$BACKUP_ROOT_RESOLVED/$backup_id"
    [ ! -e "$staging" ] && [ ! -e "$final" ] \
        || die "backup identifier collision"
    mkdir "$staging"

    pg_dump \
        --host="$PGHOST" \
        --port="$PGPORT" \
        --username="$PGUSER" \
        --dbname="$PGDATABASE" \
        --format=custom \
        --compress="$compression" \
        --no-owner \
        --no-privileges \
        --file="$staging/database.dump"
    [ -s "$staging/database.dump" ] || die "pg_dump produced an empty archive"

    pg_restore --list "$staging/database.dump" > "$staging/toc.list"
    [ -s "$staging/toc.list" ] || die "pg_restore could not read the archive catalog"
    server_version=$(psql_value "$PGDATABASE" "SHOW server_version_num;") \
        || die "could not read PostgreSQL server version"
    printf '%s\n' "$server_version" | grep -Eq '^[0-9]+$' \
        || die "PostgreSQL returned an invalid server version"
    dump_version=$(pg_dump --version | tr '\n' ' ')

    {
        printf 'format_version=1\n'
        printf 'backup_id=%s\n' "$backup_id"
        printf 'created_at_utc=%s\n' "$created_at"
        printf 'source_database=%s\n' "$PGDATABASE"
        printf 'source_user=%s\n' "$PGUSER"
        printf 'source_host=%s\n' "$PGHOST"
        printf 'server_version_num=%s\n' "$server_version"
        printf 'pg_dump_version=%s\n' "$dump_version"
        printf 'destination_id=%s\n' "$BACKUP_DESTINATION_ID"
    } > "$staging/metadata.txt"
    {
        printf 'backup_id=%s\n' "$backup_id"
        printf 'destination_id=%s\n' "$BACKUP_DESTINATION_ID"
    } > "$staging/COMPLETE"
    (
        cd "$staging"
        sha256sum database.dump metadata.txt toc.list COMPLETE > SHA256SUMS
        sha256sum -c SHA256SUMS >/dev/null
    )
    sync
    mv "$staging" "$final"
    staging=""
    sync

    verify_backup "$backup_id"
    # POSIX shell function variables are global. Retention verifies older
    # archives and therefore reuses verify_backup's backup_id variable; retain
    # the just-created identity before pruning so operator/automation output
    # can never name an archive that retention removed.
    created_backup_id=$backup_id
    created_backup_path=$final
    created_dump_hash=$VERIFIED_DUMP_HASH
    apply_retention
    release_operation_lock
    trap - EXIT HUP INT TERM
    printf 'BACKUP_ID=%s\n' "$created_backup_id"
    printf 'BACKUP_PATH=%s\n' "$created_backup_path"
    printf 'DUMP_SHA256=%s\n' "$created_dump_hash"
}

database_exists() {
    database=$1
    # Every caller validates this as a simple identifier before it reaches the
    # SQL literal, so it cannot contain a quote or escape character.
    psql_value "$PGMAINTENANCE_DB" \
        "SELECT count(*) FROM pg_database WHERE datname = '$database';"
}

verify_restored_database() {
    database=$1
    assert_database_identity "$database"
    table_count=$(psql_value "$database" "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';") \
        || die "could not verify restored tables"
    printf '%s\n' "$table_count" | grep -Eq '^[0-9]+$' \
        || die "restored table count is invalid"
    [ "$table_count" -gt 0 ] || die "restored database has no public tables"
    has_alembic=$(psql_value "$database" "SELECT CASE WHEN to_regclass('public.alembic_version') IS NULL THEN 0 ELSE 1 END;") \
        || die "could not verify restored Alembic metadata"
    [ "$has_alembic" = "1" ] || die "restored database has no Alembic version table"
}

restore_backup() {
    resolve_backup_root
    require_backup_marker
    require_connection_config
    [ -n "${RESTORE_BACKUP_ID:-}" ] || die "RESTORE_BACKUP_ID is required"
    [ -n "${RESTORE_TARGET_DATABASE:-}" ] || die "RESTORE_TARGET_DATABASE is required"
    [ -n "${PRODUCTION_DATABASE_NAME:-}" ] || die "PRODUCTION_DATABASE_NAME is required"
    [ -n "${RESTORE_EXPECTED_SOURCE_DATABASE:-}" ] \
        || die "RESTORE_EXPECTED_SOURCE_DATABASE is required"
    [ -n "${PGMAINTENANCE_DB:-}" ] || die "PGMAINTENANCE_DB is required"
    is_identifier "$RESTORE_TARGET_DATABASE" \
        || die "RESTORE_TARGET_DATABASE must be a simple PostgreSQL identifier"
    is_identifier "$PRODUCTION_DATABASE_NAME" \
        || die "PRODUCTION_DATABASE_NAME must be a simple PostgreSQL identifier"
    is_identifier "$PGMAINTENANCE_DB" \
        || die "PGMAINTENANCE_DB must be a simple PostgreSQL identifier"
    [ "$PGMAINTENANCE_DB" != "$RESTORE_TARGET_DATABASE" ] \
        || die "PGMAINTENANCE_DB may not be the restore target"

    acquire_operation_lock "restore"
    created_target=""
    cleanup_restore_lock() {
        status=$?
        trap - EXIT HUP INT TERM
        cleanup_verify_temp || status=1
        if [ "$status" -ne 0 ] && [ -n "${created_target:-}" ]; then
            log "restore failed after creating '$created_target'; it was left for inspection"
            log "remove it only with the separately confirmed drop-disposable operation"
        fi
        release_operation_lock
        exit "$status"
    }
    trap cleanup_restore_lock EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    verify_backup "$RESTORE_BACKUP_ID"
    grep -Fxq "source_database=$RESTORE_EXPECTED_SOURCE_DATABASE" \
        "$VERIFIED_BACKUP_DIR/metadata.txt" \
        || die "backup source database does not match RESTORE_EXPECTED_SOURCE_DATABASE"
    assert_database_identity "$PGMAINTENANCE_DB"

    mode=${RESTORE_MODE:-disposable}
    case "$mode" in
        disposable)
            is_disposable_database "$RESTORE_TARGET_DATABASE" \
                || die "disposable target must end in _restore, _restore_*, _drill, or _drill_*"
            [ "$RESTORE_TARGET_DATABASE" != "$PRODUCTION_DATABASE_NAME" ] \
                || die "disposable restore target may not be the production database"
            confirmation="RESTORE_DISPOSABLE:${RESTORE_TARGET_DATABASE}:${RESTORE_BACKUP_ID}:${VERIFIED_DUMP_HASH}"
            [ "${RESTORE_CONFIRM:-}" = "$confirmation" ] \
                || die "set RESTORE_CONFIRM exactly to '$confirmation'"
            exists=$(database_exists "$RESTORE_TARGET_DATABASE") \
                || die "could not check whether restore target exists"
            [ "$exists" = "0" ] \
                || die "disposable restore target already exists; refusing to overwrite it"
            createdb \
                --host="$PGHOST" \
                --port="$PGPORT" \
                --username="$PGUSER" \
                --maintenance-db="$PGMAINTENANCE_DB" \
                --template=template0 \
                "$RESTORE_TARGET_DATABASE"
            created_target=$RESTORE_TARGET_DATABASE
            pg_restore \
                --host="$PGHOST" \
                --port="$PGPORT" \
                --username="$PGUSER" \
                --dbname="$RESTORE_TARGET_DATABASE" \
                --exit-on-error \
                --single-transaction \
                --no-owner \
                --no-privileges \
                "$VERIFIED_BACKUP_DIR/database.dump"
            ;;
        approved)
            [ -n "${RESTORE_APPROVED_DATABASE:-}" ] \
                || die "RESTORE_APPROVED_DATABASE is required in approved mode"
            [ "$RESTORE_TARGET_DATABASE" = "$RESTORE_APPROVED_DATABASE" ] \
                || die "restore target does not exactly match RESTORE_APPROVED_DATABASE"
            [ "$RESTORE_TARGET_DATABASE" != "$PRODUCTION_DATABASE_NAME" ] \
                || die "approved restore must use a shadow database, not production"
            is_disposable_database "$RESTORE_TARGET_DATABASE" \
                || die "approved target must use a _restore or _drill suffix"
            confirmation="RESTORE_APPROVED:${RESTORE_TARGET_DATABASE}:${RESTORE_BACKUP_ID}:${VERIFIED_DUMP_HASH}"
            [ "${RESTORE_CONFIRM:-}" = "$confirmation" ] \
                || die "set RESTORE_CONFIRM exactly to '$confirmation'"
            exists=$(database_exists "$RESTORE_TARGET_DATABASE") \
                || die "could not check whether approved restore target exists"
            [ "$exists" = "0" ] \
                || die "approved restore target already exists; refusing to overwrite it"
            createdb \
                --host="$PGHOST" \
                --port="$PGPORT" \
                --username="$PGUSER" \
                --maintenance-db="$PGMAINTENANCE_DB" \
                --template=template0 \
                "$RESTORE_TARGET_DATABASE"
            created_target=$RESTORE_TARGET_DATABASE
            pg_restore \
                --host="$PGHOST" \
                --port="$PGPORT" \
                --username="$PGUSER" \
                --dbname="$RESTORE_TARGET_DATABASE" \
                --exit-on-error \
                --single-transaction \
                --no-owner \
                --no-privileges \
                "$VERIFIED_BACKUP_DIR/database.dump"
            ;;
        *) die "RESTORE_MODE must be 'disposable' or 'approved'" ;;
    esac

    verify_restored_database "$RESTORE_TARGET_DATABASE"
    release_operation_lock
    trap - EXIT HUP INT TERM
    printf 'RESTORED_DATABASE=%s\n' "$RESTORE_TARGET_DATABASE"
    printf 'RESTORED_FROM=%s\n' "$RESTORE_BACKUP_ID"
}

drop_disposable() {
    resolve_backup_root
    require_backup_marker
    require_connection_config
    [ -n "${DROP_TARGET_DATABASE:-}" ] || die "DROP_TARGET_DATABASE is required"
    [ -n "${PRODUCTION_DATABASE_NAME:-}" ] || die "PRODUCTION_DATABASE_NAME is required"
    [ -n "${PGMAINTENANCE_DB:-}" ] || die "PGMAINTENANCE_DB is required"
    is_identifier "$DROP_TARGET_DATABASE" \
        || die "DROP_TARGET_DATABASE must be a simple PostgreSQL identifier"
    is_disposable_database "$DROP_TARGET_DATABASE" \
        || die "drop target is not recognizably disposable"
    [ "$DROP_TARGET_DATABASE" != "$PRODUCTION_DATABASE_NAME" ] \
        || die "refusing to drop the production database"
    confirmation="DROP_DISPOSABLE_DATABASE:${DROP_TARGET_DATABASE}"
    [ "${DROP_CONFIRM:-}" = "$confirmation" ] \
        || die "set DROP_CONFIRM exactly to '$confirmation'"
    assert_database_identity "$PGMAINTENANCE_DB"
    acquire_operation_lock "drop-disposable"
    cleanup_drop_lock() {
        status=$?
        trap - EXIT HUP INT TERM
        release_operation_lock
        exit "$status"
    }
    trap cleanup_drop_lock EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    exists=$(database_exists "$DROP_TARGET_DATABASE") \
        || die "could not check whether disposable target exists"
    [ "$exists" = "1" ] || die "disposable target does not exist"
    active=$(psql_value "$DROP_TARGET_DATABASE" \
        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND backend_type = 'client backend' AND pid <> pg_backend_pid();") \
        || die "could not verify active disposable connections"
    [ "$active" = "0" ] || die "disposable database still has active connections"
    dropdb \
        --host="$PGHOST" \
        --port="$PGPORT" \
        --username="$PGUSER" \
        --maintenance-db="$PGMAINTENANCE_DB" \
        "$DROP_TARGET_DATABASE"
    release_operation_lock
    trap - EXIT HUP INT TERM
    log "dropped disposable database '$DROP_TARGET_DATABASE'"
}

verify_only() {
    resolve_backup_root
    require_backup_marker
    [ -n "${RESTORE_BACKUP_ID:-}" ] || die "RESTORE_BACKUP_ID is required"
    acquire_operation_lock "verify"
    cleanup_verify_lock() {
        status=$?
        trap - EXIT HUP INT TERM
        cleanup_verify_temp || status=1
        release_operation_lock
        exit "$status"
    }
    trap cleanup_verify_lock EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    verify_backup "$RESTORE_BACKUP_ID"
    release_operation_lock
    trap - EXIT HUP INT TERM
    printf 'VERIFIED_BACKUP=%s\n' "$RESTORE_BACKUP_ID"
    printf 'DUMP_SHA256=%s\n' "$VERIFIED_DUMP_HASH"
}

usage() {
    cat >&2 <<'EOF'
usage: db-ops.sh init-backup-root|check-root|backup|verify|restore|drop-disposable
EOF
    exit 2
}

[ "$#" -eq 1 ] || usage
case "$1" in
    init-backup-root) init_backup_root ;;
    check-root) check_backup_root ;;
    backup) create_backup ;;
    verify) verify_only ;;
    restore) restore_backup ;;
    drop-disposable) drop_disposable ;;
    *) usage ;;
esac
