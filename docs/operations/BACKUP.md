# Backup Strategy — Sampada

## System of Record

All postgres on the India VM is covered by the shared house backup that runs on **oradb**:

- **Cron**: `/etc/cron.d/acharylab-backup` → `0 2 * * * postgres /opt/scripts/pg-backup.sh` (daily 02:00).
- **Script**: `acharylab-infrastructure/oradb/scripts/pg-backup.sh` (hosted in that repo).
- **Output**: `/backup/pg_dump/<db>-<YYYYMMDD-HHMMSS>.sql.gz.gpg` — `pg_dump | gzip`, then symmetric **AES-256** `gpg` (passphrase file `/opt/scripts/.gpg-pass`, root-only 0600; master copy held offline, never committed).
- **Coverage**: every non-template DB (excludes `kanak`, `kubera_production`, `unnati`, `sampada_test`), plus `globals-*.sql.gz.gpg` (`pg_dumpall --globals-only`).
- **Transport**: `/backup` is a git repo — each run commits and pushes (`git add -A && git commit && git push`), so the encrypted dumps are replicated off-box if the push target is a remote.
- **Retention**: 7 days (`find -mtime +7 -delete`). (Cron header comment still says "30-day retention" — the script's 7 days is authoritative.)
- **Verify** on oradb: `ls -la /backup/pg_dump/sampada_production-*.gpg | tail` — expect a fresh file every day.

## App-level backup (secondary, non-durable)

Sidekiq's `DatabaseBackupJob` (daily 03:00, `DATABASE_BACKUP_ENABLED=true`) also runs `pg_dump` in `--format=custom --compress=9` to `/tmp` and keeps the last 7. This is a local-only, unencrypted snapshot — treat it as an in-process convenience, not the durable backup.

## Restore

```bash
# Decrypt + decompress a sampada backup
gpg -d /backup/pg_dump/sampada_production-20260912-020000.sql.gz.gpg | gunzip > sampada.sql
# Load into a target DB (run against the same PG16 as postgres)
psql -d <target_db> -f sampada.sql
```

For a full-user recovery: load the newest daily dump, then `globals-*.sql.gz.gpg` to restore roles/grants.

## RTO / RPO

- **RTO**: < 1 hour (manual restore)
- **RPO**: < 24 hours (daily 02:00 dump)
- **Encryption**: AES-256 at rest; passphrase offline only