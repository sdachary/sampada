-- 0010: lightweight client-side error telemetry for debugging real sessions.
CREATE TABLE IF NOT EXISTS client_errors (
  id TEXT PRIMARY KEY,
  path TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors(created_at);
