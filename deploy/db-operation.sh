#!/bin/sh
# Canonical host wrapper for manual and scheduled database operations. The
# lock is shared with deploy.sh so no operation can start between its backup
# and migration steps.

set -eu
umask 077

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(dirname "$script_dir")
cd "$repo_dir"

[ "$#" -eq 1 ] || {
    printf '%s\n' "usage: db-operation.sh init-backup-root|check-root|backup|verify|restore|drop-disposable" >&2
    exit 2
}
operation=$1

command -v docker >/dev/null 2>&1 || {
    printf '%s\n' "db-operation: docker is required" >&2
    exit 1
}
command -v flock >/dev/null 2>&1 || {
    printf '%s\n' "db-operation: flock is required" >&2
    exit 1
}
[ -f .env ] || {
    printf '%s\n' "db-operation: .env is missing" >&2
    exit 1
}

python3 deploy/preflight.py .env
lock_file="/home/pokerin/.pokerin-ops.lock"
exec 9>"$lock_file"
chmod 600 "$lock_file"
flock -n 9 || {
    printf '%s\n' "db-operation: another database/deployment operation is running" >&2
    exit 1
}

docker compose config --quiet
case "$operation" in
    init-backup-root)
        [ -n "${BACKUP_INIT_CONFIRM:-}" ] || {
            printf '%s\n' "db-operation: BACKUP_INIT_CONFIRM is required" >&2
            exit 1
        }
        docker compose run --rm --no-deps \
            -e BACKUP_INIT_CONFIRM db-backup init-backup-root
        ;;
    check-root|backup)
        docker compose run --rm --no-deps db-backup "$operation"
        ;;
    verify|restore|drop-disposable)
        docker compose --profile ops run --rm --no-deps db-restore "$operation"
        ;;
    *)
        printf '%s\n' "db-operation: unsupported operation '$operation'" >&2
        exit 2
        ;;
esac
