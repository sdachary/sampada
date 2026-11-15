-- 0003_webauthn_challenges.sql — WebAuthn challenges moved from Redis (Rails) to D1.
-- Challenges are looked up by uuid id and deleted on single use. No FK on
-- user_id: registration rows may predate the user.

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,                -- uuid, app-generated
  challenge TEXT NOT NULL UNIQUE,
  user_id TEXT,                       -- NULL during registration (user not created yet)
  purpose TEXT NOT NULL,              -- 'register' | 'login'
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_webauthn_challenges_on_expires_at ON webauthn_challenges(expires_at);
