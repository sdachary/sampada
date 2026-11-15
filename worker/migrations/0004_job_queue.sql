-- 0004_job_queue.sql — D1-backed queue for on-demand jobs (was Sidekiq/Redis).
-- Cloudflare Queues was skipped: plan eligibility on the free tier is unconfirmed
-- and the $0 constraint can't depend on it. Single consumer = the cron sweep
-- (drainDue runs after every cron dispatch), which is enough at household scale.

CREATE TABLE IF NOT EXISTS job_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,               -- 'expense_reminder' | 'push_notification_delivery' | 'process_deletion' | 'import_statement' | 'ai_response'
  payload TEXT NOT NULL,            -- JSON
  run_at TEXT NOT NULL,             -- ISO; not before this
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  processed_at TEXT,                -- NULL = pending
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS index_job_queue_on_due ON job_queue(processed_at, run_at);
