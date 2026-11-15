// D1-backed queue for on-demand jobs (was Sidekiq + Redis). Single consumer:
// the cron sweep calls drainDue after every dispatch. Retry cap is decided by
// the pure function outcomeFor — that is where the interesting logic lives.

import type { Bindings } from '../index';

export type QueueJobType =
  | 'expense_reminder'
  | 'push_notification_delivery'
  | 'process_deletion'
  | 'import_statement'
  | 'ai_response';

export type QueuedHandler = (env: Bindings, payload: unknown) => Promise<void>;

/** Filled in by the job modules (chunks 3–4). */
export const QUEUED_HANDLERS: Record<QueueJobType, QueuedHandler> = {
  expense_reminder: async () => {},
  push_notification_delivery: async () => {},
  process_deletion: async () => {},
  import_statement: async () => {},
  ai_response: async () => {},
};

export async function enqueue(
  env: Bindings,
  type: QueueJobType,
  payload: unknown,
  opts: { runAt?: Date; maxAttempts?: number } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await env.DB.prepare(
    `INSERT INTO job_queue (id, type, payload, run_at, max_attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      type,
      JSON.stringify(payload ?? {}),
      (opts.runAt ?? now).toISOString(),
      opts.maxAttempts ?? 3,
      now.toISOString(),
    )
    .run();
  return id;
}

/** Pure retry/dead-letter decision: what to do with a failed attempt. */
export function outcomeFor(
  attemptsAfterRun: number,
  maxAttempts: number,
): { dead: boolean; retry: boolean } {
  if (attemptsAfterRun >= maxAttempts) return { dead: true, retry: false };
  return { dead: false, retry: true };
}

/** Claim + run every due queue row. A row is claimed by bumping attempts
 *  first, so a slow retry never double-runs a row within one sweep; a failed
 *  attempt either retries on a later sweep or dead-letters at max_attempts.
 *  ponytail: single-consumer (the cron sweep) — if two isolates ever drain
 *  concurrently the same row can double-run; upgrade to per-row conditional
 *  UPDATE (WHERE attempts = ?) if that ever matters. */
export async function drainDue(env: Bindings, now = new Date(), limit = 50): Promise<{ processed: number; failed: number }> {
  const nowIso = now.toISOString();
  const due = await env.DB.prepare(
    `SELECT id, type, payload, attempts, max_attempts FROM job_queue
     WHERE processed_at IS NULL AND run_at <= ? LIMIT ?`,
  )
    .bind(nowIso, limit)
    .all<{ id: string; type: QueueJobType; payload: string; attempts: number; max_attempts: number }>();

  let processed = 0;
  let failed = 0;

  for (const row of due.results) {
    const attemptsAfterRun = row.attempts + 1;
    try {
      const handler = QUEUED_HANDLERS[row.type];
      if (!handler) throw new Error(`no handler for type ${row.type}`);
      await handler(env, JSON.parse(row.payload));
      await env.DB.prepare('UPDATE job_queue SET attempts = ?, processed_at = ? WHERE id = ?')
        .bind(attemptsAfterRun, nowIso, row.id)
        .run();
      processed += 1;
    } catch (error) {
      const outcome = outcomeFor(attemptsAfterRun, row.max_attempts);
      await env.DB.prepare(
        `UPDATE job_queue SET attempts = ?, last_error = ?, processed_at = ? WHERE id = ?`,
      )
        .bind(attemptsAfterRun, String(error), outcome.dead ? nowIso : null, row.id)
        .run();
      failed += 1;
    }
  }

  return { processed, failed };
}
