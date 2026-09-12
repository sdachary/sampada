# Backup Strategy — Sampada

## Data Storage
PostgreSQL 16, self-hosted on the oradb VM (shared instance).

## Automated Backups
- **`DatabaseBackupJob`** (Sidekiq, daily 03:00 via `sidekiq_schedule.rb`) — `pg_dump` in compressed custom format (`--format=custom --compress=9`, no owner/privileges) to `/tmp`.
- Gated by `DATABASE_BACKUP_ENABLED` (`true` on oradb's `.env`); output path is currently local storage (`upload_to_storage` is a stub — S3/Minio upload is the extension point).
- **Retention: last 7 daily backups** (the job prunes older files).

## Manual Export
```bash
pg_dump -h <DB_HOST> -p <DB_PORT> -U <POSTGRES_USER> -d sampada_production --no-owner --no-privileges -Fc > sampada_production_$(date +%Y%m%d).dump
```

## Restore
```bash
pg_restore -h <DB_HOST> -p <DB_PORT> -U <POSTGRES_USER> -d sampada_production sampada_production_20260101.dump
```

## RTO / RPO
- **RTO**: < 2 hours
- **RPO**: < 24 hours