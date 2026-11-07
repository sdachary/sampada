# 1.3 Frontend — Passkeys UI

Status: ready · FREE · Est: 8 pts
No new npm deps: `navigator.credentials` is native (WebAuthn Level 3, all evergreen browsers +
iOS Safari 16+ / Android Chrome 9+). Feature-detect, hide otherwise.

## Where
Settings page → new "Security" section (Card):
- Passkey list: label (editable inline), platform badge ("Built into this device" /
  "Security key"), last used, delete Button (muted danger, ConfirmDialog).
- `Add passkey` Button (only if `navigator.credentials` + `PublicKeyCredential
  isUserVerifyingPlatformAuthenticatorAvailable()` return true; else section hidden entirely —
  no dead UI).

## Flows
**Add:** click Add → GET options → `navigator.credentials.create()` → POST /register →
toast "Passkey added" → list refresh. Label prompt: inline input in the success toast area or a
small ResponsiveModal with one field + save. On `NotAllowedError` (user dismissed) → silent
empty state restore.

**Sign in (Login page):** under the password form — divider "or" — `Use passkey` Button:
- GET auth options with the email field value if present (helps `allowCredentials`),
  else discoverable credentials (`mediation: 'conditional'` autofill on focus of the email input —
  passive, zero-click: attach the conditional UI to the email field so saved passkeys appear in
  autofill).
- On success → same post-login redirect logic as password login (reuse auth-context).

## Edge cases
- No passkeys + deleted last one client-side race → server 422 shows toast with server reason.
- Browser unsupported → section hidden (don't render "not supported" noise).
- Cross-device (phone QR): handled natively by browser create/get dialog; nothing for us to draw.

## Files
```
frontend/src/pages/Login.jsx            (passkey sign-in button + conditional UI)
frontend/src/pages/Settings.jsx         (Security card — follow existing Settings sections pattern)
frontend/src/lib/passkeys.js            (options↔browser encoding, ~80 lines: base64url↔ArrayBuffer)
```
