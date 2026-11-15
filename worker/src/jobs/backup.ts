// Cron bodies that touch infrastructure: the security audit and the nightly
// D1 → R2 backup with a 30-day rolling prune.

import type { Bindings } from '../index';
import { putFile } from '../storage';
import { importMarketData } from './data';

/** SecurityHealthCheckJob: log investments not updated in 7 days, and when any
 *  symboled investment is missing a price, refresh prices inline (Rails
 *  enqueued ImportMarketDataJob; the sweep drains, so a direct call has the
 *  same effect without a queue hop). */
export async function securityHealthCheck(env: Bindings, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const stale = await env.DB.prepare('SELECT symbol, name, updated_at FROM investments WHERE updated_at < ?')
    .bind(cutoff)
    .all<{ symbol: string | null; name: string | null; updated_at: string }>();
  console.log(JSON.stringify({ job: 'security_health_check', stale_investments: stale.results.length }));
  for (const inv of stale.results) {
    console.warn(JSON.stringify({ stale: inv.symbol ?? '(no symbol)', name: inv.name, updated_at: inv.updated_at }));
  }

  const missing = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM investments WHERE current_price IS NULL AND symbol IS NOT NULL AND symbol != ''",
  ).first<{ n: number }>();
  if ((missing?.n ?? 0) > 0) {
    console.warn(JSON.stringify({ job: 'security_health_check', missing_prices: missing?.n }));
    await importMarketData(env, now);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** DatabaseBackupJob: gated by DATABASE_BACKUP_ENABLED; a table-dump JSON per
 *  night into R2 under backups/, pruned to the newest 30 days. (The D1
 *  binding's dump() only applied to deprecated alpha v1 databases.)
 *  ponytail: the whole dump is built in memory — fine at household scale;
 *  revisit if dumps grow past ~100 MB. */
export async function databaseBackup(env: Bindings, now: Date = new Date()): Promise<void> {
  if (env.DATABASE_BACKUP_ENABLED !== 'true') return;
  const nowIso = now.toISOString();
  const stamp = `${nowIso.slice(0, 10).replace(/-/g, '')}_${nowIso.slice(11, 19).replace(/:/g, '')}`;

  const tables = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  ).all<{ name: string }>();
  const selects = tables.results.map((t) => env.DB.prepare(`SELECT * FROM "${t.name.replace(/"/g, '""')}"`));
  const results = await env.DB.batch(selects);
  const dump: { generated_at: string; tables: Record<string, unknown[]> } = { generated_at: nowIso, tables: {} };
  tables.results.forEach((t, i) => {
    dump.tables[t.name] = (results[i]?.results ?? []) as unknown[];
  });
  const body = JSON.stringify(dump);
  await putFile(env, `backups/sampada_backup_${stamp}.json`, body);
  console.log(JSON.stringify({ job: 'database_backup', bytes: body.length, key: stamp }));

  const bucket = env.FILES;
  if (!bucket) return;
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);
  let cursor: string | undefined;
  for (;;) {
    const page = await bucket.list({ prefix: 'backups/', cursor, limit: 1000 });
    for (const object of page.objects) {
      if (object.uploaded < cutoff) await bucket.delete(object.key);
    }
    if (!page.truncated) break;
    cursor = (page as { cursor?: string }).cursor; // typing varies across workers-types versions
  }
}
