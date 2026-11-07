# 1.3 Backend — Passkeys (WebAuthn)

Status: ready · FREE · Est: 15 pts · Flag: `passkeys`
Infra cost: $0 (WebAuthn is browser-native; no attestation service needed for discoverable
credentials).

## What
Passwordless sign-in for existing users: register a passkey on the current device, then
authenticate via `navigator.credentials.get()` — no password exposure, phishing-resistant.

## Dependencies
- **New gem:** `webauthn-ruby` (maintained by cedarcode, pure Ruby, no native deps).
- Existing `users`, `sessions` (bearer token issuance stays identical — passkey auth just
  replaces the password step before session creation).

## New table
```ruby
create_table :webauthn_credentials, id: :uuid do |t|
  t.references :user, type: :uuid, null: false
  t.string  :webauthn_id, null: false        # base64url, unique
  t.string  :public_key, null: false         # serialized COSE key
  t.string  :label, null: false, default: "This device"
  t.bigint  :sign_count, null: false, default: 0
  t.enum    :transport, null: false, default: "platform"  # platform | cross-platform
  t.datetime :last_used_at
  t.timestamps
end
add_index :webauthn_credentials, :webauthn_id, unique: true
```
No `webauthn_challenge` table: store challenge in Redis with `ex=requestTTL 120s`
(key: `wa:reg:<session>` / `wa:auth:<email-hmac>`), consumed on verify (one-time).

## API (all under `/api/v1/auth/passkeys`)
| Endpoint | Body | Returns |
|---|---|---|
| `GET /register/options` (auth) | — | PK credential creation options (RP id = `window.location.hostname`, user.id = `user.uuid` base64url) |
| `POST /register` (auth) | `attestationResponse`, `label` | creates credential; revokes nothing |
| `GET /auth/options` (no auth) | `?email=` | assertion options (`allowCredentials` of that user; empty ⇒ discoverable) |
| `POST /auth/verify` (no auth) | `assertionResponse` | same payload as login: `{token, user}` — then normal session flow |
| `DELETE /:id` (auth) | — | removes credential; block deleting the **last** remaining credential (user must already have a working password) |
| `GET /` (auth) | — | list own credentials (id, label, transport, last_used_at) |

## Flow
- Registration requires a fresh signed-in session (bearer token) — no unauthenticated register.
- Browser: Frontend calls options → `navigator.credentials.create(...)` with `residentKey:
  "required"` (discoverable, works across synced devices) → POST returns back.
- Cross-device: WebAuthn handled natively by the browser/platform (QR handoff to phone).
  No QR code we generate.
- Recovery: first passkey registration also generates a one-time recovery code (shown once,
  hashed like a password). Used in the "lost device" path — same endpoint as password reset.

## Verify rules (security)
- Reject on `sign_count` ≤ stored unless origin/platform reports sign_count always 0
  (WebAuthn Level 3 synchronous clones) — enforce per-transport.
- Origin check: exactly equals `Rails.env.production? ? "https://sampada.app"` (env var
  `WEBAUTHN_ORIGIN`) and `rp_id` from `WEBAUTHN_RP_ID`.
- Timeout: options expire in 120s via Redis TTL; verification must present challenge match.

## Tests (RSpec)
- Stub WebAuthn::FakeClient-like fixture (hand-rolled generate COSE keys with OpenSSL in spec
  helper): happy register→login, replayed assertion rejected (`StaleObject`),
  wrong-origin assertion rejected, duplicate credential id rejected, delete-last-credential
  blocked, session still issued identical payload as password login.

## Rollback
Endpoints behind flag. Table additive. `webauthn-ruby` removal harmless once endpoints removed.
