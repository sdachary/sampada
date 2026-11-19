-- Add idempotency key storage for replay middleware
-- Key is SHA256 hex of "path:key" where key is Idempotency-Key header value
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key_hash TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'done')),
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);