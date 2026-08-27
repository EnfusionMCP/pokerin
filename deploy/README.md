# Production database operations

The production deployment treats a verified PostgreSQL backup as a hard
precondition for every Alembic migration. The startup chain is:

```text
postgres healthy -> db-backup exits 0 -> migrate exits 0 -> app starts
```

Use `sh deploy/deploy.sh` for deployments. It creates fresh one-shot backup and
migration containers on every invocation; this avoids relying on whether
Compose chooses to restart an already-completed dependency. The Compose
dependency conditions still protect initial/manual startup, but `compose
restart app` intentionally only restarts the app and is not a deployment.

Run every command in this guide as the dedicated `pokerin` user unless a line
explicitly starts with `sudo`. The setup script creates `.env` as that user with
mode `0600`. Running a wrapper as root is rejected before it can create a
root-owned lock or read application secrets into the wrong account.
Remove any legacy `REDIS_URL` entry when refreshing an older `.env`; Redis is
not used by the single-worker application and is no longer deployed.

`db-backup` creates a PostgreSQL custom-format archive in a staging directory,
checks it with `pg_restore --list`, writes and verifies `SHA256SUMS`, then
atomically renames the completed directory. If the destination, database
identity, dump, manifest, or retention pass is wrong, the migration and new app
container do not start. The application image itself no longer runs Alembic.

## Configure the backup destination

Use a durable, encrypted off-host filesystem mounted on the Docker host (for
example, an encrypted NFS or replicated block-storage mount). A plain local
directory protects migrations but does not protect against loss of the host.
Monitoring the mount and copying snapshots to another failure domain remain
operator responsibilities; SHA-256 detects corruption but is not encryption or
authentication.

Current role boundary: the historical Compose cluster initializes `pokerin` as
the PostgreSQL bootstrap superuser, and the application, migration, and backup
paths still share that role. This Phase 0 work does not safely rewrite roles on
an existing cluster. Treat separation into bootstrap/admin, migration owner,
backup, and least-privilege runtime roles (with independent secrets) as a
must-complete hardening item before public real-money service; an application
database compromise currently has cluster-level privileges.

Set these values in the deployment `.env`:

```dotenv
BACKUP_DIR=/mnt/offsite/pokerin
BACKUP_DESTINATION_ID=pokerin-primary-01
BACKUP_RETENTION_COUNT=30
BACKUP_COMPRESSION_LEVEL=6
BACKUP_CONTAINER_UID=70
BACKUP_CONTAINER_GID=70
```

The PostgreSQL data volume is external so `docker compose down --volumes`
cannot delete it. For a fresh installation, set
`POSTGRES_VOLUME_NAME=pokerin_pgdata` and create it once before starting
PostgreSQL:

```bash
docker volume create pokerin_pgdata
```

For an existing installation, do not guess the name. Before switching to this
Compose file, inspect the running PostgreSQL mount and set
`POSTGRES_VOLUME_NAME` to the exact existing volume name:

```bash
docker ps --filter 'label=com.docker.compose.service=postgres' \
  --format '{{.ID}}\t{{.Names}}\t{{.Label "com.docker.compose.project"}}'
docker inspect '<the exact container ID selected above>' \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{println .Name}}{{end}}{{end}}'
docker volume inspect '<the exact name printed above>'
```

The deploy wrapper validates that configured external volume before it starts
any service. Externalizing PostgreSQL does not make it a backup; retain the
verified off-host archive workflow below. `down --volumes` can still remove
Caddy state, so it is not a routine deployment command.

Also generate unique JWT and PostgreSQL secrets as directed by `.env.example`,
set `DEBUG=false`, and keep the file private:

```bash
chmod 600 .env
```

The host and container preflight gates reject published placeholders,
mismatched `POSTGRES_PASSWORD`/`DATABASE_URL` credentials, a non-Compose
database host, a weak JWT, a wrong backup marker, and any group/world access to
`.env` before it builds or changes a service.

The Compose project and PostgreSQL volume have stable explicit names, and the
backup gate also verifies the cluster's immutable PostgreSQL system identifier.
On the first installation, start only PostgreSQL using the placeholder identifier,
read the actual value, then replace `DB_EXPECTED_SYSTEM_IDENTIFIER` in `.env`:

```bash
docker compose up -d postgres
docker compose exec -T postgres sh -c \
  'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT system_identifier FROM pg_control_system();"'
```

If a checkout is renamed or Compose otherwise points at a fresh volume, its
system identifier will differ and migration backup fails. During intentional
cluster replacement, update the expected identifier only after independently
verifying the new cluster and restore.

`BACKUP_DIR` must be absolute. The default uid/gid is the `postgres` user in
`postgres:16-alpine`; use the uid/gid required by the mounted store if it
differs. Prepare the path without making it world-readable:

```bash
sudo install -d -o 70 -g 70 -m 0700 /mnt/offsite/pokerin
```

Initialize an empty destination once. The destination ID is deliberately part
of the confirmation and marker. If an off-host mount later disappears and an
empty local mountpoint is exposed, the missing marker makes backup fail closed.

```bash
export BACKUP_INIT_CONFIRM='INITIALIZE_POKERIN_BACKUP_ROOT:pokerin-primary-01'
sh deploy/db-operation.sh init-backup-root
unset BACKUP_INIT_CONFIRM
```

Use the destination ID actually stored in `.env` in that literal confirmation.
Do not source `.env` into a shell: dotenv quoting is not a safe shell interface,
and doing so unnecessarily exports every application credential.

Do not copy the marker to a different destination. If `.db-ops.lock` remains
after a host or container crash, first prove no `db-ops` container/process is
running and inspect the lock's `owner` file; only then remove that exact lock
directory.

## Backups and retention

Every canonical deployment runs the pre-migration backup gate. The deployment
also builds the frontend from `package-lock.json` into a custom Caddy image, so
the static site and Caddy configuration are replaced together without a
mutable `frontend_dist` host directory:

```bash
sh deploy/deploy.sh
```

The wrapper holds the same host advisory lock used by scheduled and documented
manual database operations, verifies the backup mount from its uid-70
container, builds images, and stops Caddy to close/block external ingress.
It refuses to continue unless the running app reports every table empty. This
temporary Phase 0 guard prevents shutdown from owning in-memory player funds;
players and bots must stand before a deploy. It then gracefully stops the app,
checks that no other client sessions remain on the source database, takes the
final backup, migrates, and keeps writes stopped until the new app is healthy.
Caddy is reopened only after a stricter in-container check observes a successful
deposit poll in addition to database and table readiness; the initial five-minute
health grace cannot by itself pass this deployment gate. Caddy also actively
checks `/health` and stops proxying to an unhealthy backend. Docker does not
restart a merely unhealthy container, so alert on app health and investigate
supervisor/ESI failures rather than depending on the restart policy.
Caddy is restarted if the empty-table guard fails. After the app has stopped,
any failure deliberately leaves both app and Caddy stopped. If the backup
failed, no migration ran; after correcting the cause, restart app and then
Caddy, or rerun the canonical deployment. If migration started and failed,
leave both stopped; inspect Alembic state and either fix forward or perform the
approved shadow restore below. Do not blindly restart older code against a
partly changed schema.

Migration `d4e5f6g7h8i9` intentionally clears and drops the obsolete plaintext
`users.refresh_token` column. Its downgrade recreates only an empty nullable
column; prior player grants cannot be recovered, and any needed EVE grant must
be authorized again. Rolling application code back before that revision would
resume plaintext token retention and is a security regression. The separate
bank refresh token configured in `.env` is not changed by this migration.
The mandatory backup immediately before this migration still contains the old
player refresh-token values. Keep that archive encrypted and access-restricted,
track it as sensitive credential material, and retire it under an explicit
retention decision after the recovery window. Rotating the application JWT
does not invalidate an EVE SSO grant stored in an older backup.

The empty-table probe is only a best-effort, maintenance-only Phase 0 control.
It has a time-of-check/time-of-use window for requests that passed Caddy
immediately before ingress stopped, and shutdown credit errors are not yet a
durable reconciliation barrier. **Do not use this deploy path with seated funds.**
Before public real-money operation, replace it with an authenticated
application drain transition that rejects new seat/balance mutations, waits
for in-flight mutations, and durably confirms ledger reconciliation before
shutdown.

Run a backup on demand with:

```bash
sh deploy/db-operation.sh backup
```

Do not bypass `db-operation.sh` for manual work. Its host lock prevents a timer
or operator command from starting between a deployment's final backup and
Alembic migration; the backup-directory lock independently serializes
container-side dump, verification, retention, restore, and cleanup operations.

Install the included systemd units for a daily backup independent of deploys:

```bash
sudo install -m 0644 deploy/systemd/pokerin-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/pokerin-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pokerin-backup.timer
systemctl list-timers pokerin-backup.timer
```

The timer assumes `/home/pokerin/app`, matching `setup-vps.sh`. Adjust
`WorkingDirectory` if the deployment lives elsewhere. The newest
`BACKUP_RETENTION_COUNT` complete, verified backup directories are retained.
Incomplete `.partial` directories never count as backups and are removed by
their creating process; a crash may leave one for manual inspection.

Each completed directory contains:

```text
database.dump  metadata.txt  toc.list  COMPLETE  SHA256SUMS
```

Watch timer failures and backup age in host monitoring. A reasonable alert is
no successful backup in 26 hours. Test the full restore path at least quarterly.

## Verify a backup without restoring

Choose the exact directory basename printed as `BACKUP_ID` by a backup:

```bash
export RESTORE_BACKUP_ID=backup_YYYYMMDDTHHMMSSZ_0000000042_pokerin_0123abcd
sh deploy/db-operation.sh verify
```

Verification checks the destination marker, controlled filenames, every
SHA-256 entry, and the live `pg_restore --list` catalog against the saved
catalog.

## Disposable restore drill

The safe default only creates a new database whose name clearly contains a
restore/drill suffix. It refuses to overwrite an existing database.

```bash
export RESTORE_BACKUP_ID=backup_YYYYMMDDTHHMMSSZ_0000000042_pokerin_0123abcd
export RESTORE_TARGET_DATABASE=pokerin_drill_20260827
export RESTORE_MODE=disposable

# Obtain the verified dump hash without trusting a guessed value.
sh deploy/db-operation.sh verify
export DUMP_SHA256='<DUMP_SHA256 printed by verify>'
export RESTORE_CONFIRM="RESTORE_DISPOSABLE:${RESTORE_TARGET_DATABASE}:${RESTORE_BACKUP_ID}:${DUMP_SHA256}"

sh deploy/db-operation.sh restore
```

The restore command creates the target from `template0`, restores in one
transaction with `--exit-on-error`, confirms the connected database/user, and
requires public tables plus `alembic_version`. Perform application-level checks
before calling the drill successful, for example:

```bash
docker compose exec postgres psql -U pokerin -d "$RESTORE_TARGET_DATABASE" \
  -c 'TABLE alembic_version;'
docker compose exec postgres psql -U pokerin -d "$RESTORE_TARGET_DATABASE" \
  -c 'SELECT count(*) AS users FROM users;'
```

Clean up only with a second exact confirmation:

```bash
export DROP_TARGET_DATABASE="$RESTORE_TARGET_DATABASE"
export DROP_CONFIRM="DROP_DISPOSABLE_DATABASE:${DROP_TARGET_DATABASE}"
sh deploy/db-operation.sh drop-disposable
unset RESTORE_CONFIRM DROP_CONFIRM DUMP_SHA256
```

Record the backup ID, hash, duration, row-count checks, operator, and drill date.
The acceptance target is a successful quarterly restore within the service's
documented recovery-time objective, with the newest backup age inside its
recovery-point objective.

If `pg_restore` or post-restore verification fails, the new suffixed database is
left in place for diagnosis and a retry refuses to overwrite it. Use the same
separately confirmed `drop-disposable` command above after inspection, then
retry the restore. Approved shadow targets must also use a `_restore` or
`_drill` suffix so this cleanup path is always available.

## Approved shadow restore and production cutover

The tooling deliberately does not drop or overwrite the live production
database. For disaster recovery, restore to one explicitly approved, new shadow
database, validate it, then cut over by changing configuration. The original
database remains the rollback target if image startup or post-restore checks
fail.

```bash
export RESTORE_BACKUP_ID=backup_YYYYMMDDTHHMMSSZ_0000000042_pokerin_0123abcd
export RESTORE_TARGET_DATABASE=pokerin_restore_20260827
export RESTORE_APPROVED_DATABASE="$RESTORE_TARGET_DATABASE"
export RESTORE_MODE=approved
sh deploy/db-operation.sh verify
export DUMP_SHA256='<DUMP_SHA256 printed by verify>'
export RESTORE_CONFIRM="RESTORE_APPROVED:${RESTORE_TARGET_DATABASE}:${RESTORE_BACKUP_ID}:${DUMP_SHA256}"

sh deploy/db-operation.sh restore
```

Run the same row-count and application-level validation as the disposable
drill. A cutover must keep ingress closed until all private acceptance checks
pass; otherwise writes made on the shadow could be lost if you roll back.
First drain the old database through the canonical wrapper while explicitly
keeping ingress stopped:

```bash
POKERIN_KEEP_INGRESS_STOPPED=1 sh deploy/deploy.sh
```

Now update both `POSTGRES_DB` and the database name in `DATABASE_URL` in `.env`
to the approved shadow name. Do not change the host, user, or password. Rerun
the deployment in maintenance mode; it backs up and migrates the shadow, then
starts the app only on the private Compose network:

```bash
POKERIN_KEEP_INGRESS_STOPPED=1 sh deploy/deploy.sh
docker compose ps
docker compose logs --no-log-prefix db-backup migrate app
```

Perform health, ledger, row-count, and application smoke checks without
starting Caddy. If acceptance fails, keep ingress stopped, restore the previous
`POSTGRES_DB` and `DATABASE_URL`, and rerun the same maintenance-mode command;
the old database was never deleted. Only after a final decision to accept the
shadow should you reopen ingress:

```bash
docker compose up -d --no-deps caddy
```

This creates a verified backup of the shadow before applying newer migrations,
and no public writes occur before the keep-or-rollback decision. Unset restore
confirmations when finished, and never leave them in `.env`.
