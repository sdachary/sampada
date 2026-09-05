# Configure Active Record encryption keys.
#
# Two tiers — the middle "Rails credentials" tier was dead code (see CFG-01:
# .gitignore tells you to use ENV vars, and config/credentials.yml.enc is not
# decryptable in this deploy setup), so it has been removed.
#
# 1. Explicit ACTIVE_RECORD_ENCRYPTION_* env vars (the correct path for any
#    real deployment, self-hosted or managed).
# 2. Auto-derived from SECRET_KEY_BASE — a convenience fallback for quick
#    local/self-hosted setup. Deriving the encryption keys from SECRET_KEY_BASE
#    collapses the security domains: a single leaked SECRET_KEY_BASE (used for
#    session/cookie signing) is then enough to reconstruct the keys protecting
#    ApiCredential#encrypted_value and any encrypted User columns. That risk is
#    only acceptable outside production; when it happens there a loud warning is
#    logged on every boot (see SEC-05).

primary_key = ENV['ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY']
deterministic_key = ENV['ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY']
key_derivation_salt = ENV['ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT']

if primary_key.present? && deterministic_key.present? && key_derivation_salt.present?
  Rails.application.config.active_record.encryption.primary_key = primary_key
  Rails.application.config.active_record.encryption.deterministic_key = deterministic_key
  Rails.application.config.active_record.encryption.key_derivation_salt = key_derivation_salt
else
  if Rails.env.production?
    Rails.logger.warn(
      'WARNING: ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY/_DETERMINISTIC_KEY/_KEY_DERIVATION_SALT ' \
      'are not set; deriving encryption keys from SECRET_KEY_BASE. A single leaked ' \
      'SECRET_KEY_BASE is sufficient to reconstruct these keys (protecting ' \
      "ApiCredential#encrypted_value and encrypted User columns). Set the three " \
      'ACTIVE_RECORD_ENCRYPTION_* env vars independently (ideally via sops) for any real ' \
      'deployment.',
    )
  end

  secret_base = Rails.application.secret_key_base

  primary_key = Digest::SHA256.hexdigest("#{secret_base}:primary_key")[0..63]
  deterministic_key = Digest::SHA256.hexdigest("#{secret_base}:deterministic_key")[0..63]
  key_derivation_salt = Digest::SHA256.hexdigest("#{secret_base}:key_derivation_salt")[0..63]

  Rails.application.config.active_record.encryption.primary_key = primary_key
  Rails.application.config.active_record.encryption.deterministic_key = deterministic_key
  Rails.application.config.active_record.encryption.key_derivation_salt = key_derivation_salt
end