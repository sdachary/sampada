-- 0005: DPDP 18+ age-attestation timestamp, set at POST /api/v1/auth/register/begin.
ALTER TABLE users ADD COLUMN adult_attested_at TEXT;
