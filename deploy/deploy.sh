#!/bin/sh
# Canonical production deployment. This creates fresh one-shot containers so
# the backup and migration gates run on every invocation.

set -eu
umask 077

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(dirname "$script_dir")
cd "$repo_dir"

command -v docker >/dev/null 2>&1 || {
    printf '%s\n' "deploy: docker is required" >&2
    exit 1
}
command -v flock >/dev/null 2>&1 || {
    printf '%s\n' "deploy: flock is required" >&2
    exit 1
}
[ -f docker-compose.yml ] || {
    printf '%s\n' "deploy: docker-compose.yml is missing" >&2
    exit 1
}
[ -f .env ] || {
    printf '%s\n' "deploy: create and review .env before deploying" >&2
    exit 1
}
keep_ingress_stopped=${POKERIN_KEEP_INGRESS_STOPPED:-0}
case "$keep_ingress_stopped" in
    0|1) ;;
    *)
        printf '%s\n' "deploy: POKERIN_KEEP_INGRESS_STOPPED must be 0 or 1" >&2
        exit 1
        ;;
esac

# Interpolation, required backup settings, and the destination bind path are
# validated before any build or service mutation.
python3 deploy/preflight.py .env
lock_file="/home/pokerin/.pokerin-ops.lock"
exec 9>"$lock_file"
chmod 600 "$lock_file"
flock -n 9 || {
    printf '%s\n' "deploy: another database/deployment operation is running" >&2
    exit 1
}
docker compose config --quiet
postgres_volume=$(docker compose config --format json | python3 -c '
import json
import sys

config = json.load(sys.stdin)
volume = config.get("volumes", {}).get("pgdata", {})
if volume.get("external") is not True or not isinstance(volume.get("name"), str):
    raise SystemExit(1)
print(volume["name"])
')
docker volume inspect "$postgres_volume" >/dev/null 2>&1 || {
    printf '%s\n' "deploy: configured external PostgreSQL volume does not exist" >&2
    exit 1
}
docker compose run --rm --no-deps db-backup check-root
docker compose build app migrate caddy
running_caddy=$(docker compose ps --status running --services caddy)
docker compose stop --timeout 30 caddy
running_app=$(docker compose ps --status running --services app)
if [ "$running_app" = "app" ]; then
    if ! docker compose exec -T app python - < deploy/check-empty-tables.py; then
        if [ "$running_caddy" = "caddy" ] && [ "$keep_ingress_stopped" = "0" ]; then
            docker compose start caddy || true
        fi
        printf '%s\n' "deploy: table drain check failed; no backup or migration ran" >&2
        exit 1
    fi
fi
docker compose stop --timeout 60 app
docker compose up -d --wait postgres

# `compose run` always creates a fresh container. `--no-deps` prevents Compose
# from implicitly restarting a completed dependency behind this explicit order.
docker compose run --rm --no-deps -e BACKUP_REQUIRE_QUIESCED=1 db-backup backup
docker compose run --rm --no-deps migrate
docker compose up -d --wait --no-deps app
docker compose exec -T app python - < deploy/wait-readiness.py
if [ "$keep_ingress_stopped" = "0" ]; then
    docker compose up -d --no-deps caddy
else
    printf '%s\n' "deploy: ingress remains stopped for private acceptance checks"
fi
docker compose ps
