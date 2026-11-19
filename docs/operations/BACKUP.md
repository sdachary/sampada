# Backup Strategy — Sampada

Sampada's data lives in Cloudflare D1 (`sampada-db`) and R2 (`sampada-storage`).
There is no Postgres VM, `pg_dump`, or on-host cron backup.

## System of record

- **D1 (`sampada-db`)** — all user data, sessions, magic links, and relational state.
- **R2 (`sampada-storage`)** — uploaded documents and rollback objects. Retained
  intentionally; no objects are purged.

## Export a D1 snapshot

From `worker/` with Wrangler authenticated (use the OAuth profile — the SOPS
Cloudflare token is not authorized for D1):

```bash
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID \
  npx wrangler d1 export sampada-db --remote --output /path/to/sampada-$(date +%F).sql
```

Keep exports outside the repo (e.g. `.secrets/backups/`, gitignored, mode 600).
Never commit database dumps or secrets.

## Point-in-time recovery

Cloudflare D1 may offer point-in-time recovery in the dashboard depending on the
database plan. Verify the current setting there before relying on it; do not
assume it is enabled.

## Restore

D1 migrations are forward-only. To restore, import a snapshot into a target
database and redeploy the Worker against it:

```bash
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID \
  npx wrangler d1 execute <target-db> --remote --file=/path/to/sampada-YYYY-MM-DD.sql
```

Test restores against a non-production database first. R2 objects restore via
the R2 dashboard / `wrangler r2 object put`.

## Pre-wipe snapshots

Before the 2026-11-19 test-data wipe, snapshots were taken and retained outside
git in `.secrets/backups/` (`sampada-db-prewipe-20261119.sql` and
`better_auth-sampada-prewipe-20261119.sql`). Checksums are recorded in the
cleanup Notion card and wiki session log.

## RTO / RPO

- **RTO**: depends on the restore target; D1 import of a modest dataset is minutes.
- **RPO**: bounded by the most recent manual export / PITR window (verify in dashboard).
- **Encryption**: TLS in transit; Cloudflare manages at-rest encryption.
