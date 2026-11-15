// Cron bodies that touch infrastructure: the security audit and the nightly
// D1 → R2 backup with free-tier budget automation.

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

// R2 free tier: 10 GB storage · 1M Class A ops (put/list/delete) · 10M Class B
// ops (get/head) per month. Backup traffic is all Class A at ~35 ops/day, and
// backups are never read in the normal path — so the binding budget is storage
// bytes. The caps below keep even a runaway DB inside the 10 GB allowance;
// nothing here can produce an overage bill.
const MAX_DUMP_BYTES = 50 * 1024 * 1024; // skip an anomalous single dump
const TOTAL_BUDGET_BYTES = 5 * 1024 * 1024 * 1024; // half the 10 GB allowance
export const RETENTION_DAYS = 30;

export type BackupObject = { key: string; uploaded: Date; size: number };

export type PruneOpts = { retentionDays: number; totalBudgetBytes: number };

/** Pure prune policy: drop anything past the retention window, then the
 *  oldest-first until the remaining backups plus the incoming dump fit the
 *  free-tier byte budget. Whether the incoming dump itself gets written is the
 *  caller's call (it must also sit under the single-dump cap). */
export function prunePlan(
  objects: BackupObject[],
  incomingSize: number,
  now: Date,
  opts: PruneOpts = { retentionDays: RETENTION_DAYS, totalBudgetBytes: TOTAL_BUDGET_BYTES },
): string[] {
  const cutoff = now.getTime() - opts.retentionDays * DAY_MS;
  const sorted = [...objects].sort((a, b) => a.uploaded.getTime() - b.uploaded.getTime());
  const expired = sorted.filter((o) => o.uploaded.getTime() < cutoff);
  const kept = sorted.filter((o) => o.uploaded.getTime() >= cutoff);
  let total = incomingSize + kept.reduce((n, o) => n + o.size, 0);
  const drop = expired.map((o) => o.key);
  for (const o of kept) {
    if (total <= opts.totalBudgetBytes) break;
    drop.push(o.key);
    total -= o.size;
  }
  return drop;
}

/** DatabaseBackupJob: gated by DATABASE_BACKUP_ENABLED; a table-dump JSON per
 *  night into R2 under backups/, pruned to the newest 30 days AND a hard
 *  free-tier byte budget (prunePlan), with an oversized dump skipped outright.
 *  (The D1 binding's dump() only applied to deprecated alpha v1 databases.)
 *  ponytail: the whole dump is built in memory — fine at household scale;
 *  revisit if dumps grow past ~100 MB. */
export async function databaseBackup(env: Bindings, now: Date = new Date()): Promise<void> {
  if (env.DATABASE_BACKUP_ENABLED !== 'true') return;
  const nowIso = now.toISOString();
  const stamp = `${nowIso.slice(0, 10).replace(/-/g, '')}_${nowIso.slice(11, 19).replace(/:/g, '')}`;
  const key = `backups/sampada_backup_${stamp}.json`;

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
  const bytes = new TextEncoder().encode(body).length; // exact UTF-8 size
  if (bytes > MAX_DUMP_BYTES) {
    console.error(JSON.stringify({ job: 'database_backup', skipped: 'dump exceeds single-dump cap', bytes }));
    return;
  }

  const bucket = env.FILES;
  if (!bucket) return;
  const existing: BackupObject[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await bucket.list({ prefix: 'backups/', cursor, limit: 1000 });
    for (const o of page.objects) existing.push({ key: o.key, uploaded: o.uploaded, size: o.size });
    if (!page.truncated) break;
    cursor = (page as { cursor?: string }).cursor; // typing varies across workers-types versions
  }

  const dropped = prunePlan(existing, bytes, now);
  for (const stale of dropped) await bucket.delete(stale);

  const droppedSet = new Set(dropped);
  const keptBytes = existing.reduce((n, o) => (droppedSet.has(o.key) ? n : n + o.size), 0);
  if (keptBytes + bytes > TOTAL_BUDGET_BYTES) {
    // unreachable while a single dump ≤ 50 MB < 5 GB budget — belt and braces
    console.error(JSON.stringify({ job: 'database_backup', skipped: 'kept backups exceed budget', bytes }));
    return;
  }
  await putFile(env, key, body);
  console.log(
    JSON.stringify({ job: 'database_backup', bytes, kept: existing.length - dropped.length, dropped: dropped.length }),
  );
}
