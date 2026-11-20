-- 0008: email OTP sign-in / sign-up. Only a salted hash of each code is stored.
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  adult_attested_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created ON otp_codes(email, created_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
