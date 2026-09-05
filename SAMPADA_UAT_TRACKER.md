# Sampada — UAT Report & Implementation Tracker

> **This file is a living tracker, not a one-time report.**
> Claude Code (or any implementer) should:
> 1. Pick the highest-severity `Status: Open` item.
> 2. Implement the fix.
> 3. Update that item's `Status` field (`Open` → `In Progress` → `Fixed` → `Verified`), and fill in **Implementation Notes** with what was changed, file paths touched, and any deviation from the recommendation.
> 4. If a fix is not possible as recommended, set `Status: Blocked` and explain why in **Implementation Notes** — do not delete the item.
> 5. Never delete or renumber items. If a finding turns out to be a non-issue on closer inspection, set `Status: Not an Issue` and explain why.
> 6. Re-run this same review (or targeted checks) after each fix and log the result under **Verification Log** at the bottom.

Repo tested: `https://github.com/sdachary/sampada` (Rails 7.2 API + React/Vite frontend on Cloudflare Pages, external "Better-Auth" auth service, self-hosted deploy target).

Review date: 2026-09-05
Method: Static code review of the full repository (controllers, models, auth middleware, frontend auth/API layer, Cloudflare Pages Function proxy, CI config, migrations/schema, DPDP/privacy controllers). No live/dynamic penetration testing was performed — the external Better-Auth service (`oradb`) is not in this repo and was not reachable, so its internals (password policy, session issuance, rate limiting) are **out of scope** and unverified.

---

## Status Legend
`Open` · `In Progress` · `Fixed` · `Verified` · `Blocked` · `Not an Issue`

## Summary Table

| ID | Title | Area | Severity | Status |
|----|-------|------|----------|--------|
| SEC-01 | Household read/write actions have no role check — any member can invite, promote, or delete | Auth / Authorization | **Critical** | In Progress |
| SEC-02 | Household invites grant instant access with no invitee consent step | Privacy / Authorization | High | In Progress |
| SEC-03 | Edge→origin traffic falls back to plaintext HTTP on a public IP | Security / Infra | **Critical** | In Progress |
| SEC-04 | Brakeman is installed but never run in CI; `brakeman.ignore` is stale/copy-pasted from a different app | Security / CI | Medium | In Progress |
| SEC-05 | Active Record encryption keys silently auto-derive from `SECRET_KEY_BASE` | Security / Crypto | Medium | Fixed |
| SEC-06 | Dead `GoogleAuthService` code references a token flow that no longer exists | Security debt / Cleanup | Low | Fixed |
| REL-01 | No authorization/negative-path tests exist for households (test suite only covers the "owner" happy path) | Reliability / Test coverage | Medium | In Progress |
| UX-01 | Auth forms (Login/Register) have no loading/disabled state on submit | UX | Low | In Progress |
| UX-02 | Auth inputs missing `autoComplete` attributes | UX / Accessibility | Low | In Progress |
| UX-03 | No password strength guidance shown at registration | UX | Low-Medium | In Progress |
| UX-04 | Auth pages use ad-hoc inline styles instead of the app's design system | Frontend / Maintainability | Low | In Progress |
| CFG-01 | Three-tier fallback for encryption keys, and the middle tier is dead | Config / Crypto | Medium | In Progress |
| CFG-02 | Two parallel secret-management systems (Rails credentials vs sops) | Config / Secrets | Medium | In Progress |
| CFG-03 | `docker-compose.yml` duplicates env vars across services, and silently overrides `.env` for 6 keys | Config / Deploy | Medium | In Progress |
| CFG-04 | `network_mode: host` + hardcoded IP defaults reduce portability | Config / Deploy | Low | In Progress |
| CFG-05 | `deploy.sh` hand-rolls a fragile secrets-merge instead of using Compose's built-in `--env-file` layering | Config / Deploy | Low | In Progress |
| CFG-06 | Three parallel deployment paths documented/maintained at once | Config / Docs | Low-Medium | In Progress |

---

## Detailed Findings

### SEC-01 — Household read/write actions have no role check
**Status:** In Progress
**Severity:** Critical
**Area:** Backend authorization — `app/controllers/api/households_controller.rb`

**Evidence:**
- `HouseholdMembership` has a `role` column (`owner`, `admin`, `member`, `viewer`) with validation, but it is **never read** in `HouseholdsController`.
- `find_household` is simply `current_user.households.find(params[:id])` — this returns the household for *any* member regardless of role.
- `update`, `destroy`, and `invite` all use `find_household` (or an equivalent unscoped lookup) with no additional role check.
- `invite` accepts an arbitrary `params[:role]` and passes it straight to `household.add_member(user, role: params[:role] || 'member')` — a `viewer` can invite a new member and set their role to `owner`.
- Confirmed via `spec/requests/households_api_spec.rb`: every test creates the membership as `role: 'owner'` — there is no test where a `member`/`viewer` attempts `update`, `destroy`, or `invite`, so this gap was never caught.

**Impact:** Any user added to a household (even as a read-only `viewer`) can currently: rename or delete the household (which un-links shared transactions/budgets/debts/portfolios from every member via `dependent: :nullify`), invite arbitrary existing users by email, and grant them `owner` role. This is a full privilege-escalation and data-integrity path inside a feature that explicitly exists to share sensitive financial data between people.

**Recommended fix:**
1. Add a `before_action` in `HouseholdsController` that loads the current user's membership (`current_user.household_memberships.find_by!(household_id: params[:id])`) and exposes `@membership`.
2. Define an explicit permission matrix, e.g.:
   - `index`, `show`, `members`, `dashboard`: any role.
   - `update`, `invite`: `owner` or `admin` only.
   - `destroy`: `owner` only.
3. In `invite`, restrict the assignable `role` param to `%w[admin member viewer]` (never allow inviting as `owner` — ownership should transfer explicitly, not be grantable by any inviter) and reject the request with `403` if the inviter isn't `owner`/`admin`.
4. Add request specs covering: a `viewer` attempting `update` → `403`; a `member` attempting `invite`/`destroy` → `403`; an `admin` inviting someone as `owner` → rejected or downgraded.

**Implementation Notes:**
- Added `before_action :find_household` for all actions that need household access
- Added `before_action :load_membership` for actions requiring role check (update, destroy, invite)
- Implemented `authorize_owner_or_admin!` helper for update and invite actions
- Implemented `authorize_owner!` helper for destroy action
- Restricted invite role parameter to `%w[admin member viewer]` (explicitly blocking `owner`)
- Added comprehensive test coverage in `spec/requests/households_api_spec.rb` covering all role × action combinations
- Files modified: `app/controllers/api/households_controller.rb`, `spec/requests/households_api_spec.rb`

---

### SEC-02 — Household invites grant instant access with no invitee consent
**Status:** In Progress
**Severity:** High
**Area:** Privacy / Authorization — `app/models/household.rb`, `db/schema.rb` (`household_memberships.invite_status` defaults to `"accepted"`)

**Evidence:** `Household#add_member` creates a `HouseholdMembership` with no `invite_status` argument. The schema default for that column is `"accepted"`, and the `HouseholdsController#members` action filters `.accepted` — meaning a membership created via `invite` is immediately live. The invited user is never asked to approve joining, and is not notified in-app (no `Notification` record is created in the `invite` action) before their financial data (once shared into a household) becomes visible to the inviter and any other existing members.

**Impact:** Combined with SEC-01, this means any existing member can pull an arbitrary user (by email, no password/consent needed) into a household and expose that household's shared financial data to them instantly. Even after SEC-01 is fixed (restricting *who* can invite), inviting *without the invitee's consent* is still a privacy gap under the DPDP-conscious design already present elsewhere in this codebase (see `DpdpController` — consent records, grievance flow, 48-hour deletion window all show privacy was clearly a design priority; this flow is the outlier).

**Recommended fix:**
1. Change the default flow so `add_member` for a new external invite sets `invite_status: 'pending'`.
2. Add an accept/decline endpoint (e.g. `POST /api/v1/households/:id/accept`, `/decline`) scoped to `current_user.household_memberships.pending`.
3. Update `members` (already filters `.accepted`, keep as-is) and add a `pending_invites` endpoint so the invitee can see and act on it.
4. Fire an in-app `Notification` (the `Notification` model already exists) to the invitee when a pending invite is created.

**Implementation Notes:**
- `Household#add_member` now defaults `invite_status: 'pending'` (the `create` action and owner self-membership pass `'accepted'` explicitly).
- `invite` action now creates a pending membership and fires a `household_invite` Notification to the invitee.
- Added `accept_invite` (`POST /api/v1/households/:id/accept_invite`) and `decline_invite` (`POST /api/v1/households/:id/decline_invite`) actions scoped to `current_user.household_memberships.pending`; decline removes the membership row.
- Added collection route + action `GET /api/v1/households/pending_invites` listing the caller's pending invites with household summary.
- `members` action continues to filter `.accepted` only — pending invitees are not visible until they accept.
- Files modified: `app/models/household.rb`, `app/controllers/api/households_controller.rb`, `config/routes.rb`, `spec/requests/households_api_spec.rb`

---

### SEC-03 — Edge→origin traffic falls back to plaintext HTTP on a public IP
**Status:** In Progress
**Severity:** Critical
**Area:** Infra / Transport security — `frontend/functions/[[path]].js`

**Evidence:**
```js
const ORADB_FALLBACK = 'http://acharylab.140.245.227.176.nip.io'
...
const API_ORIGIN = env.API_URL || 'http://sampada.140.245.227.176.nip.io'
```
Both the Better-Auth proxy and the Rails API proxy fall back to a **plaintext `http://`** origin addressed by public IP (via `nip.io` wildcard DNS) whenever the `ORADB_URL` / `API_URL` environment variables are not set in the Cloudflare Pages project. `.env.example` reinforces this posture (`RAILS_FORCE_SSL=false`, `RAILS_ASSUME_SSL=false` by default), and `docs/DEPLOYMENT.md` describes SSL termination as an *optional* Nginx/Certbot step rather than a requirement.

**Impact:** If the environment variable is ever unset, misspelled, or reset during a redeploy, every request from Cloudflare's edge to the origin server — including the Bearer session token forwarded on `/api/v1/*` and every financial payload — travels unencrypted over the public internet. This is a silent failure mode: nothing in the code or CI would catch it, since the fallback still "works" functionally.

**Recommended fix:**
1. Remove the plaintext fallback entirely. If `env.API_URL` / `env.ORADB_URL` is missing, return a `502` with a clear "misconfigured origin" error instead of silently degrading to HTTP.
2. If the fallback must stay for local/dev testing, gate it behind an explicit `env.ALLOW_INSECURE_ORIGIN === 'true'` flag that is never set in the production Pages project.
3. Enforce TLS on the origin itself (`RAILS_FORCE_SSL=true`, terminate via the existing Cloudflare Tunnel/Nginx setup) so a plaintext request to it fails closed rather than succeeding.
4. Add a startup/CI check that fails the build if any hardcoded `http://` origin literal remains in `frontend/functions/`.

**Implementation Notes:**
- Added `originFor(env, primaryKey, fallback)` — returns the env-configured origin when set, the (plaintext) fallback ONLY when `env.ALLOW_INSECURE_ORIGIN === 'true'`, otherwise `null`.
- Both proxy blocks (Better-Auth `/auth/v2/*` and Rails `/api/v1/*`) now fail closed with a `502 { error: "<Auth|API> origin not configured" }` when the origin resolves to `null` — no more silent plaintext degradation when `ORADB_URL` / `API_URL` are unset or misspelled.
- Moved `securityHeaders` to module scope and reused it in the new `misconfigured()` response helper.
- **Deviation on rec. 4:** the guarded plaintext fallbacks are intentionally retained (for local/dev only, behind `ALLOW_INSECURE_ORIGIN`), so a blanket grep for `http://` in `frontend/functions/` would false-positive. The fail-closed 502 is the actual guard; operators must set `API_URL` and `ORADB_URL` in the production Pages project. A future CI step could assert the two `http://` literals appear only next to `ALLOW_INSECURE_ORIGIN` references. It is an operational requirement that `ALLOW_INSECURE_ORIGIN` NOT be set in the deployed project.
- Verified: `node --check` passes on the edited function file.
- File modified: `frontend/functions/[[path]].js`

---

### SEC-04 — Brakeman not run in CI; `brakeman.ignore` is stale
**Status:** In Progress
**Severity:** Medium
**Area:** CI / Security tooling — `.github/workflows/ci.yml`, `config/brakeman.ignore`

**Evidence:** `bin/brakeman` and `config/brakeman.ignore` both exist, but `.github/workflows/ci.yml` only runs `gitleaks` and `rubocop` in the `lint` job — there is no `bundle exec brakeman` step anywhere in the pipeline. Separately, `config/brakeman.ignore` contains ignored warnings referencing `SnaptradeItemsController` and `FamilyExportsController` — classes that **do not exist anywhere in this repository** (this app has no `Family` or `Snaptrade` model). This is a leftover from the open-source template this app was likely bootstrapped from, meaning the ignore file was never adapted, and — since Brakeman doesn't even run — is currently inert either way.

**Impact:** Static security analysis (SQL injection, mass assignment, unsafe redirects, etc. — precisely the class of Rails-specific issues Brakeman is built to catch) is not actually protecting this codebase despite the tooling being present, which can create false confidence.

**Recommended fix:**
1. Add a `brakeman` step to the `lint` job in `ci.yml`: `bundle exec brakeman -A --no-pager --exit-on-warn`.
2. Regenerate `config/brakeman.ignore` from a clean scan of *this* codebase (`bin/brakeman -I`) and remove the stale `Snaptrade`/`Family` entries.
3. Re-review any warnings Brakeman surfaces once wired in; log new findings as new tracker items rather than blanket-ignoring them.

**Implementation Notes:**
- **Root cause found:** `bin/brakeman` existed but `brakeman` was **not in the Gemfile**, so the binstub would raise "brakeman is not part of the bundle" under `bundler/setup` — the tool was never actually runnable in CI's bundler context. Added `gem 'brakeman', require: false` to the `:development, :test` group in `Gemfile`. **Note:** `Gemfile.lock` needs a `bundle install` (run locally or by CI) to record the new dependency.
- Added a `Run Brakeman` step to the `lint` job in `.github/workflows/ci.yml`: `bundle exec brakeman -A --no-pager --exit-on-warn`.
- **Deviation on rec. 2:** could not regenerate the ignore file from a live scan — no Ruby toolchain is available in this working environment. Instead, replaced the stale `config/brakeman.ignore` (which referenced non-existent `Snaptrade`/`Family`/`Api::V1::*` controllers from a template app) with a minimal clean baseline (`"ignored_warnings": []`).
- **Operational flag:** with `--exit-on-warn` and an empty ignore baseline, the first CI run will **fail if the real code produces any Brakeman warnings**. That is the intended mechanism per rec. 3: triage each surfaced warning — fix it, or add it to `config/brakeman.ignore` with a justification — and log new findings as new tracker items rather than blanket-ignoring them. A `bundle exec brakeman` locally (after `bundle install`) will show the same output before pushing.
- Files modified: `Gemfile`, `.github/workflows/ci.yml`, `config/brakeman.ignore`

---

### SEC-05 — Active Record encryption keys silently auto-derive from `SECRET_KEY_BASE`
**Status:** Fixed
**Severity:** Medium
**Area:** Crypto config — `config/initializers/active_record_encryption.rb`

**Evidence:** When `ACTIVE_RECORD_ENCRYPTION_*` env vars aren't set, the initializer derives all three encryption keys (primary, deterministic, key-derivation salt) deterministically via `SHA256("#{secret_key_base}:primary_key")` etc. This is a deliberate, documented self-hosted convenience fallback, not an accident — but it means a single leaked `SECRET_KEY_BASE` (e.g. via a misconfigured log, error tracker, or `.env` committed by mistake) is sufficient to reconstruct the encryption keys protecting `ApiCredential#encrypted_value` (which stores users' AI provider API keys) and any encrypted `User` columns.

**Impact:** Reduces defense-in-depth — normally a leaked `SECRET_KEY_BASE` (used for cookie/session signing) and leaked encryption keys are independent failure domains; here they collapse into one.

**Recommended fix:**
1. Keep the auto-derivation as a *documented, opt-in* fallback for quick local/self-hosted setup, but log a `Rails.logger.warn` on boot in `production` when it's active, so operators notice.
2. Strongly recommend (README/DEPLOYMENT.md) setting the three `ACTIVE_RECORD_ENCRYPTION_*` vars independently in any real deployment, and consider refusing to boot in `production` without them unless an explicit `ALLOW_DERIVED_ENCRYPTION_KEYS=true` is set.

**Implementation Notes:**
- Rewrote `config/initializers/active_record_encryption.rb`: explicit env vars are used when all three are present; otherwise the `SECRET_KEY_BASE`-derived fallback runs and — in `production` — `Rails.logger.warn` now logs a loud boot-time warning explaining the collapsed security domains and pointing to the fix (rec. 1).
- **Deviation on rec. 2 (refuse-to-boot):** deliberately NOT made fatal by default. Verified the current production deploy (docker-compose, deploy.sh + sops) sets **no** `ACTIVE_RECORD_ENCRYPTION_*` vars (`secrets.enc.env` holds only VAPID keys; docker-compose doesn't list them) — refusing to boot would break the very next deploy. Kept derivation working in production but now loud, so the residual risk is operator-visible.
- Documented the guidance in `docs/DEPLOYMENT.md` (env-var table + a callout explaining the derivation risk and recommending sops-shipped keys); production checklist entry now requires setting the three vars independently.
- **Operator decision (2026-09-05): Rotate to new independent keys** — added first-class key-rotation support so the defense-in-depth split can actually be realized without losing data:
  - `config/initializers/active_record_encryption.rb` now honors `ACTIVE_RECORD_ENCRYPTION_PREVIOUS_PRIMARY_KEY/_PREVIOUS_DETERMINISTIC_KEY/_PREVIOUS_KEY_DERIVATION_SALT` (mapped to Rails' `previous_*` config) **only when the main trio is explicitly set** — they let the app keep reading rows encrypted under the old key set during a rotation. Logs `previous keys configured (rotation in progress)` on boot when active.
  - New `lib/tasks/encryption_rotation.rake` (`rake sampada:reencrypt`): eager-loads, discovers every model with `encrypted_attributes`, and rewrites each row so it re-encrypts under the current keys. Safe for the current single encrypted model (`ApiCredential`).
  - **Critical operator caveat (documented in the runbook):** production currently uses the **derived** keys (no explicit vars set). Rotating to independent keys therefore requires setting `PREVIOUS_*` to the derived keys (`SHA256(SECRET_KEY_BASE:…)[0..63]`, recompute snippet in the runbook) so existing `ApiCredential#encrypted_value` rows stay decryptable; otherwise the app boots but can't read existing rows.
- Added a **"Rotating the encryption keys (SEC-05)"** runbook to `docs/DEPLOYMENT.md` (generate → sops → previous keys → deploy → `sampada:reencrypt` → verify → drop previous) and `PREVIOUS_*` placeholders to `.env.example`.
- Files modified: `config/initializers/active_record_encryption.rb`, `lib/tasks/encryption_rotation.rake` (new), `docs/DEPLOYMENT.md`, `.env.example`

---

### SEC-06 — Dead `GoogleAuthService` code
**Status:** Fixed
**Severity:** Low
**Area:** Code hygiene — `app/services/google_auth_service.rb`

**Evidence:** The service's own comments admit it's dead: `# NOTE: With Better-Auth, Google tokens are stored in Better-Auth's database... This method is pre-existing dead code (Google auth is broken post Better-Auth: authorize returns nil).` `authorize` always returns `nil`; `drive_service` even references `Google::Apis::DriveV3` which the comments say isn't bundled.

**Impact:** Not directly exploitable, but a maintenance/confusion hazard — any future feature or Claude Code task touching "Google auth" is likely to be misled by this file into thinking a live OAuth flow exists here.

**Recommended fix:** Either delete the file (and its callers, if any — verify with `grep -rn GoogleAuthService app/`) or replace it with a real implementation that pulls the Google token from Better-Auth's stored account data, if that feature (Sheets sync) is still wanted. `docs/` mentions Google Sheets backup jobs (`google_sheet_backup_job.rb`, `google_sheet_sync_service.rb`) — confirm whether those depend on this dead code path before deleting.

**Implementation Notes:**
- **Confirmed the dead chain:** `WeeklyBackupJob` (scheduled from `config/sidekiq.yml`) → `GoogleSheetBackupJob` → `GoogleSheetSyncService` → `GoogleAuthService`; `ProcessDeletionJob` (DPDP deletion flow) also calls `GoogleSheetSyncService.new(user).sync!`. The whole chain was non-functional: `authorize` returned nil and `drive_service` referenced the **unbundled** `google-apis-drive_v3` gem, so `GoogleSheetSyncService.new` raised `NameError` *before its own `rescue`* — which would crash the DPDP data-export step mid-deletion.
- **Operator decision (2026-09-05): Delete the chain (Recommended)** — the Sheet backup feature exists no more.
- **Deleted:** `app/jobs/weekly_backup_job.rb`, `app/jobs/google_sheet_backup_job.rb`, `app/services/google_sheet_sync_service.rb`, `app/services/google_auth_service.rb`; removed the `weekly_backup` cron from `config/sidekiq.yml`; removed `google-apis-sheets_v4` + `googleauth` + their comment from `Gemfile`.
- **`ProcessDeletionJob` rewritten:** no longer materializes a user's export to a third party during deletion. DPDP data export is still served to the user during the 48h cancel window via `DpdpController#full_export` and `Api::ExportsController`, so nothing user-facing is lost. The `exporting`/`exported` status transitions were unreachable (nothing enqueued those states) and were dropped.
- **Drive-by fix:** the original guard `request&.pending?` was a latent `NoMethodError` — `pending?` is not defined anywhere (`status` is a plain string column; only the rake/`scope :pending` exist). Changed to `request.status == 'pending'`.
- **Docs cleaned:** `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/MAP.md` (also fixed stale `app/sidekiq/`→`app/jobs/` paths), `docs/DPDP_COMPLIANCE.md` D21, `docs/CONTEXT.md`, `docs/CONVENTIONS.md` (dropped `GOOGLE_SHEETS_CREDENTIALS`), `docs/Sampada_IMPLEMENTATION_PLAN.md`. Historical timeline mentions (CONTEXT.md:86, impl-plan §4) intentionally left as history.
- Files: 4 jobs/services deleted, `app/jobs/process_deletion_job.rb` rewritten, `Gemfile`, `config/sidekiq.yml`, 7 docs updated.

---

### REL-01 — No authorization/negative-path tests for households
**Status:** In Progress
**Severity:** Medium
**Area:** Test coverage — `spec/requests/households_api_spec.rb`

**Evidence:** Every test in this file stubs `current_user` as the household's `owner` and only exercises success paths. There is no test with `role: 'viewer'` or `role: 'member'` attempting `update`/`destroy`/`invite`, and no test asserting a non-member is denied access to a household they don't belong to (relies entirely on `current_user.households.find` raising `RecordNotFound`, which is correct for *that* case but untested).

**Recommended fix:** Once SEC-01 is fixed, add specs for each role × action combination in the new permission matrix, plus a case for a user with zero membership in the household getting a `404`.

**Implementation Notes:**
- Landed in the same PR as SEC-01 as recommended. `spec/requests/households_api_spec.rb` now covers the full permission matrix: viewer/member `update` → 403; admin/member/viewer `destroy` → 403 (owner allowed); member/viewer `invite` → 403; owner inviting as `owner` → 422; non-member `show` → 404; viewer `members`/`dashboard`/`index` allowed. Also added `accept_invite`, `decline_invite`, `pending_invites` coverage as part of SEC-02.
- **Not yet verified:** could not execute the suite here — no Ruby toolchain in this working environment. Run `bundle exec rspec spec/requests/households_api_spec.rb` to confirm green.
- File modified: `spec/requests/households_api_spec.rb`

---

### UX-01 — Auth forms have no loading/disabled state on submit
**Status:** In Progress
**Severity:** Low
**Area:** Frontend UX — `frontend/src/pages/Login.jsx`, `Register.jsx`

**Evidence:** `handleSubmit` calls `await login(...)` but the submit button has no `disabled`/loading indicator while the request is in flight, unlike e.g. the AI key form in `Register.jsx` which does use `disabled={... || aiSaving}`. A slow network or double-click can fire duplicate login/register requests.

**Recommended fix:** Add a `submitting` state, disable the button and show a spinner/label change while the auth request is pending, mirroring the pattern already used in the onboarding AI-key form.

**Implementation Notes:**
- Added a `submitting` state to `Login.jsx`, `Register.jsx`, `ResetPassword.jsx`, and `ForgotPassword.jsx`. `handleSubmit` sets it before the async call, clears it on error (success navigates away), and the submit button is `disabled={submitting}` with a label change (`Signing in…` / `Creating account…` / `Resetting…` / `Sending…`). (ForgotPassword was the last form still missing it; folded in during the UX-04 AuthLayout refactor.)
- Verified: `npm run build` passes.
- Files modified: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/ResetPassword.jsx`, `frontend/src/pages/ForgotPassword.jsx`

---

### UX-02 — Auth inputs missing `autoComplete` attributes
**Status:** In Progress
**Severity:** Low
**Area:** Frontend UX / Accessibility — `Login.jsx`, `Register.jsx`, `ResetPassword.jsx`

**Evidence:** None of the email/password `<input>` elements set `autoComplete` (`email`, `current-password`, `new-password`). Browsers and password managers rely on this to offer autofill and to distinguish "new password" from "current password" fields.

**Recommended fix:** Add `autoComplete="email"` to email inputs; `autoComplete="current-password"` on Login; `autoComplete="new-password"` on Register/ResetPassword password fields.

**Implementation Notes:**
- `Login.jsx`: `autoComplete="email"` on the email input, `autoComplete="current-password"` on the password input.
- `Register.jsx`: `autoComplete="given-name"` / `"family-name"` on the name fields, `"email"` on email, `"new-password"` on both password fields.
- `ResetPassword.jsx`: `autoComplete="new-password"` on both password fields.
- Verified: `npm run build` passes.
- Files modified: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/ResetPassword.jsx`

---

### UX-03 — No password strength guidance at registration
**Status:** In Progress
**Severity:** Low-Medium
**Area:** Frontend UX — `Register.jsx`

**Evidence:** Registration only checks client-side that `password === password_confirmation`; there's no `minLength`, strength meter, or inline requirement text. (Server-side enforcement lives in the external Better-Auth service and wasn't reviewable here — this finding is about the *UX*, not whether weak passwords are actually accepted.)

**Recommended fix:** Add a lightweight strength indicator and minimum-length hint client-side so users get feedback before submitting, regardless of what the server ultimately enforces.

**Implementation Notes:**
- Added module-level `MIN_PASSWORD_LENGTH = 8` and a `passwordStrength(pw)` scorer (0–4: length ≥ 8, mixed case, digit, symbol) with `STRENGTH_LABEL` (`Weak`/`Fair`/`Good`/`Strong`).
- When the password field is non-empty, a 4-segment strength meter renders (color-coded with the design-system vars `--coral`/`--sun`/`--emerald`) alongside the label and an inline hint: "Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols."
- Both password inputs get `minLength={MIN_PASSWORD_LENGTH}`; submit re-validates length and match client-side and shows a specific error instead of failing silently at the server.
- Also applied `minLength={8}` to both `ResetPassword.jsx` password fields for parity.
- Verified: `npm run build` passes. No browser-level verification performed in this environment.
- Files modified: `frontend/src/pages/Register.jsx`, `frontend/src/pages/ResetPassword.jsx`

---

### UX-04 — Auth pages use ad-hoc inline styles instead of the design system
**Status:** In Progress
**Severity:** Low
**Area:** Frontend maintainability — `Login.jsx`, `Register.jsx`

**Evidence:** Nearly every element in these two pages uses a `style={{ ... }}` object with hardcoded pixel values and repeated CSS variable references, while the rest of the app appears to use a `.card`/`.btn`/`.input` class-based system (those classes *are* used here too, but layered under large inline overrides). This makes future theming/dark-mode/spacing-scale changes require hunting through inline styles page by page instead of one shared stylesheet.

**Recommended fix:** Extract the repeated layout patterns (centered auth card, 360px max-width column, label/error spacing) into shared CSS classes or a small `AuthLayout` component, consistent with how other pages in `frontend/src/pages/` are structured.

**Implementation Notes:**
- Created `frontend/src/pages/AuthLayout.jsx` — a shared shell that owns the repeated layout: full-height vertically-centered flex column (`padding: 0 24px`), the `100% / max-width: 360px` column, the centered "Sampada" brand `<Link>`, the `.card` (padding 32) with `title`/`subtitle`, the coral error `<p>` (form variant), and the muted centered `foot` line. A `variant="success"` switch renders the center-aligned "✉/✓ + title + caption + CTA button" confirmation screens that Reset/Forgot previously hand-rolled. `.card`/`.btn`/`.btn-primary`/`.input` design-system classes are kept where they were already used.
- Routed **all four** auth pages through it (the finding named Login/Register, but ResetPassword and ForgotPassword carried byte-identical shell markup): `Login.jsx`, `Register.jsx`, `ResetPassword.jsx`, `ForgotPassword.jsx`. Per-page inline styles are now limited to genuinely form-specific pieces (password toggle, name grid, strength meter).
- **Consistency bonus:** `ForgotPassword.jsx` was the one auth form still missing the `submitting` disabled state from UX-01 (and its email input lacked `autoComplete` from UX-02) — both added while touching the file.
- Verified: `npm run build` passes (2407 modules). **No browser-level verification** available in this environment — the extracted component preserves the original markup/styles 1:1, but the four auth flows should be visually smoke-tested in a dev browser before release.
- Files modified: new `frontend/src/pages/AuthLayout.jsx`; modified `frontend/src/pages/Login.jsx`, `Register.jsx`, `ResetPassword.jsx`, `ForgotPassword.jsx`

---

### CFG-01 — Three-tier fallback for encryption keys, and the middle tier is dead
**Status:** In Progress
**Severity:** Medium
**Area:** Config / Crypto — `config/initializers/active_record_encryption.rb`

**Evidence:** The initializer's own comment describes three tiers: (1) explicit `ACTIVE_RECORD_ENCRYPTION_*` env vars, (2) `Rails.application.credentials.active_record_encryption`, (3) auto-derivation from `SECRET_KEY_BASE`. But tier 2 is unreachable in practice: `.gitignore` explicitly says `# Rails credentials — use ENV vars instead`, `config/credentials/production.key` is gitignored (so the encrypted `config/credentials.yml.enc` can't be decrypted in this deploy setup anyway), and nothing in `deploy.sh`, `docker-compose.yml`, or `.env.example` ever populates Rails credentials. The comment also claims tier-2 fallback is "handled in application.rb" — it isn't; `config/application.rb` has no such logic. This is dead code plus a stale/misleading comment.

**Recommended fix:** Collapse to two tiers — explicit env vars (production), auto-derived from `SECRET_KEY_BASE` (dev/test convenience only, and only when `Rails.env.production?` is false). Delete the `Rails.application.credentials.active_record_encryption` branch and its comment, and delete `config/credentials.yml.enc` if nothing else relies on Rails credentials (see CFG-02).

**Implementation Notes:**
- Rewrote `config/initializers/active_record_encryption.rb` to **two tiers**: explicit env vars, else `SECRET_KEY_BASE`-derived fallback. The dead `Rails.application.credentials.active_record_encryption` branch and its misleading "handled in application.rb" comment are gone.
- Verified no Ruby code references `Rails.application.credentials` anywhere else — the credentials file is now fully unused (grep confirmed). Deletion of `config/credentials.yml.enc` itself is deferred to CFG-02 (its own item).
- **Deviation on rec. "dev/test convenience only":** derivation remains active in production (with a loud boot warning) because the current self-hosted deploy genuinely relies on it — see SEC-05 Implementation Notes for the full rationale.
- Files modified: `config/initializers/active_record_encryption.rb`

---

### CFG-02 — Two parallel secret-management systems
**Status:** In Progress
**Severity:** Medium
**Area:** Config / Secrets — `config/credentials.yml.enc`, `.sops.yaml`, `secrets.enc.env`

**Evidence:** The repo carries both Rails' built-in encrypted credentials (`config/credentials.yml.enc`, needs `config/master.key` or `RAILS_MASTER_KEY`) *and* a completely separate `sops`-based scheme (`.sops.yaml`, `secrets.enc.env`, decrypted by `deploy.sh` at deploy time). The project has clearly standardized on the sops path — `.gitignore`, `deploy.sh`, and every deployment doc point there — but the Rails-credentials file is still committed and still has one live reference (CFG-01).

**Impact:** Anyone (including Claude Code, in a future session) adding a new secret has two plausible places to put it, one of which is a dead end. This is exactly the kind of ambiguity that causes a secret to get added to the wrong system and then "mysteriously" not show up at runtime.

**Recommended fix:** Pick sops + env vars as the one documented mechanism (matches the zero-cost self-hosted approach already in use elsewhere). Delete `config/credentials.yml.enc`, remove the credentials branch from CFG-01, and add a one-line note in `docs/DEPLOYMENT.md` / `docs/CONTRIBUTING.md`: "secrets live in `secrets.enc.env`, encrypted via sops — see `.sops.yaml`."

**Implementation Notes:**
- Deleted `config/credentials.yml.enc` (removed from the working tree via `rm`; recoverable from git history if ever needed). Its decryption keys were absent/gitignored anyway (`config/master.key`, `config/credentials/production.key`), so it was already inert.
- Confirmed before deletion that **no Ruby code references `Rails.application.credentials`** anywhere (the last live reference was the CFG-01 credentials branch, removed in the same sweep).
- Added a **Secrets** section to `docs/CONTRIBUTING.md` stating that `secrets.enc.env` (sops, see `.sops.yaml`) is the **only** secret store, and that the Rails-credentials path is removed.
- `docs/DEPLOYMENT.md` and `README.md` contained no other stale Rails-credentials references (only an unrelated "Google OAuth credentials" checklist line).
- Files modified: deleted `config/credentials.yml.enc`, `docs/CONTRIBUTING.md`

---

### CFG-03 — `docker-compose.yml` duplication and a silent `.env` override
**Status:** In Progress
**Severity:** Medium
**Area:** Config / Deploy — `docker-compose.yml`

**Evidence:** The `app` and `sidekiq` services repeat an identical 6-line `environment:` block verbatim. More importantly, both services also load `env_file: .env` — and in Docker Compose, an explicit `environment:` entry **overrides** the same key from `env_file`. So `DB_HOST`, `DB_PORT`, `REDIS_URL`, `BETTER_AUTH_VERIFY_URL`, `BETTER_AUTH_APP_ID`, and `DATABASE_BACKUP_ENABLED` are actually sourced from the **host shell's** environment (falling back to the hardcoded `:-default` if the host shell doesn't have them set) — *not* from `.env` — even though `.env` also defines them and looks like it should be authoritative. Changing one of these 6 values in `.env` silently has no effect unless the same variable happens to also be exported in the shell that runs `docker compose up`.

**Recommended fix:**
1. Use a YAML anchor to remove the app/sidekiq duplication:
   ```yaml
   x-common-env: &common-env
     RAILS_ENV: production
     DB_HOST: ${DB_HOST:-10.0.1.46}
     ...
   services:
     app:
       environment: *common-env
     sidekiq:
       environment: *common-env
   ```
2. More importantly, decide on one source of truth: either drop the `environment:` block entirely and let `.env` (via `env_file`) own these 6 values, or drop `env_file: .env` for these specific keys and document clearly that they come from the shell/compose defaults. Mixing both is the actual bug here.

**Implementation Notes:**
- Applied a `x-common-env: &common-env` YAML anchor shared by `app` and `sidekiq` (`environment: *common-env`), removing the verbatim duplication (rec. 1). Verified with a YAML parse that both services resolve to identical env sets.
- Documented the precedence explicitly in `docker-compose.yml` header comment: for the 8 shared keys, Compose interpolation resolves **shell export → project `.env` → hardcoded `:-default`**, and the interpolated `environment:` value is what the container sees (overriding `env_file`). All other vars come solely from `env_file: .env`.
- **Deviation on rec. 2 (single source of truth):** kept the `environment:` block FOR the 8 infra keys rather than removing it, because `REDIS_URL` is derived from `REDIS_HOST` at Compose interpolation time (`.env` only carries `REDIS_HOST`, per `.env.example`'s own comment), and per-key `env_file` exclusion isn't possible. Dropping `env_file: .env` entirely would also lose every other env var in `.env`. So the two-source mix is intentionally retained but now documented, and the correct precedence (`shell/.env/default` for the shared keys) is stated where the next reader bumps into it. Note: the finding's claim that `.env` has "no effect" on these keys is only true when the key is exported in the launching shell; otherwise Compose interpolation reads the project `.env` first.
- Files modified: `docker-compose.yml`

---

### CFG-04 — `network_mode: host` + hardcoded IP defaults
**Status:** In Progress
**Severity:** Low
**Area:** Config / Deploy — `docker-compose.yml`

**Evidence:** Both services run with `network_mode: host` and reach Postgres/Redis via hardcoded default IPs (`10.0.1.46`). Host networking is Linux-only, bypasses Docker's network isolation between containers, and means every dependency has to be addressed by IP/hostname instead of Compose's built-in service-name DNS.

**Recommended fix:** If Postgres/Redis genuinely live outside this Compose project (e.g. on a shared VM, which the IP suggests), host networking may be a deliberate, reasonable choice — in that case just add a one-line comment explaining why, so it doesn't look like an oversight to the next reader. If they could instead be added as services in this same `docker-compose.yml`, switch to a bridge network and reference them by service name, dropping `network_mode: host` and the hardcoded IP.

**Implementation Notes:**
- Chose the **deliberate-choice-for-a-shared-VM** branch of the recommendation: the `10.0.1.46` default plus the DPDP-driven self-hosted topology (docs/CONTEXT.md) show Postgres/Redis and the external Better-Auth service run on the same VM as the app. Re-architecting to a bridge network + in-Compose services would require knowing the operator's real intended topology and carries multi-service risk for a Low-severity maintainability item, so the correct minimal fix is documenting the intent.
- Added an explanatory comment block above `x-common-env` in `docker-compose.yml` stating that `network_mode: host` and the hardcoded defaults are deliberate, why (VM-local Postgres/Redis/oradb addressed by IP rather than in-Compose services), the accepted tradeoff (host mode is Linux-only, skips bridge isolation), and the override knobs (`DB_HOST` / `REDIS_HOST` / `BETTER_AUTH_VERIFY_URL`).
- Verified: `docker-compose.yml` still parses as valid YAML with both services intact.
- File modified: `docker-compose.yml`

---

### CFG-05 — `deploy.sh`'s hand-rolled secrets merge
**Status:** In Progress
**Severity:** Low
**Area:** Config / Deploy — `deploy.sh`

**Evidence:**
```bash
sops -d secrets.enc.env > /tmp/.env.secrets
while IFS='=' read -r key value; do
  ...
  sed -i "/^${key}=/d" .env
  echo "${key}=${value}" >> .env
done < /tmp/.env.secrets
```
This manually rewrites `.env` line-by-line with `sed`, which is fragile: it doesn't handle values containing `=` correctly beyond the first split (though `IFS='=' read -r key value` does capture the rest into `value` for simple cases, multi-`=` values from `xargs`-trimming can still misbehave), doesn't quote `${key}` against regex-special characters if a key ever contains one, and mutates a file in place as a side effect of every deploy.

**Recommended fix:** Docker Compose (v2) accepts multiple `--env-file` flags, applied in order with later files winning — no manual merge needed:
```bash
sops -d secrets.enc.env > /tmp/.env.secrets
docker compose --env-file .env --env-file /tmp/.env.secrets up -d
rm -f /tmp/.env.secrets
```
This removes the sed loop entirely and makes precedence explicit and reviewable.

**Implementation Notes:**
- **Deviated from the literal recommendation.** `docker compose --env-file` feeds the **compose-file interpolation** (`${VAR}` in the compose file) — it does **not** populate the container environment of a service that declares `env_file: .env`. This app's services load their runtime env from `env_file: .env` (see docker-compose.yml), so the `--env-file`-only fix would silently drop every sops secret from the containers. Replaced the fragile sed loop with a semantically identical but robust merge instead.
- New merge: an `awk -F=` pass over `secrets` then `.env` that drops base lines whose key appears in the secrets file, appends the secrets file verbatim, and atomically `mv`s the temp result over `.env`. Robust to `=` and `#!`/regex-special characters in values (key split happens on the first `=` only; keys are matched literally, never interpolated into a regex) and cannot leave `.env` half-written if the script is interrupted. Smoke-tested locally with fixtures containing `=` and `#!`-laden values — output matches the old loop's net result (base minus overridden keys, secrets appended).
- **Bonus correctness fix (discovered while working this item):** the old final step was `docker compose restart app sidekiq`, which restarts in place and **never re-reads env/config** — so merged .env secret changes never actually took effect on deploy, only image/app changes did. Replaced with `docker compose up -d`, which recreates containers only when their config/env changed and converges to the desired state.
- **Residual (acknowledged, not fixed):** `.env` is still mutated as a deploy side effect rather than being a pure derived artifact. Removing that requires rewiring the service `env_file:` path (e.g. a `${COMPOSE_ENV_FILE:-.env}` knob) — a larger, separately-justified refactor; the mutation is now atomic and deterministic so the practical risk is gone. `.env` is gitignored (in-place mutation is not a source-control hazard).
- **Not yet verified live:** no Docker/sops runtime in this working environment. The awk merge logic was unit-smoke-tested; `bash -n deploy.sh` passes. Operator should run one depoy cycle on the VM and confirm secrets reach the app container (`docker compose exec app env | grep VAPID`).
- File modified: `deploy.sh`

---

### CFG-06 — Three parallel deployment paths
**Status:** In Progress
**Severity:** Low-Medium
**Area:** Config / Docs — `deploy.sh` + `docker-compose.yml`, `bin/render-build.sh`, `docs/DEPLOYMENT.md` (manual Ubuntu+Nginx+Certbot)

**Evidence:** The repo simultaneously documents/supports: (1) self-hosted Docker Compose + sops (`deploy.sh`), (2) a Render.com buildpack-style deploy (`bin/render-build.sh`, precompiles assets directly rather than via Docker), and (3) a fully manual Ubuntu VM + Nginx + Certbot setup (`docs/DEPLOYMENT.md` Step 3). Each path has its own assumptions about `RAILS_FORCE_SSL`, asset compilation, and process management (Puma directly vs. behind Nginx vs. Render's router).

**Impact:** Every config knob touched by SEC-03/CFG-03 above has to be kept consistent across three different deployment stories, which is exactly how a fallback like the plaintext-HTTP one in SEC-03 goes unnoticed — it may be correct for one path and wrong for another.

**Recommended fix:** Given the stated preference for zero-cost, self-hosted infrastructure, treat Docker Compose + sops as the one primary, actively-maintained path, and either delete `bin/render-build.sh` / the manual-VM section of `docs/DEPLOYMENT.md` if unused, or clearly demote them to a "community-contributed / unsupported alternative" appendix so it's obvious which path new config changes need to be validated against.

**Implementation Notes:**
- Chose the **demote-to-unsupported** route over deletion (CFG-06 is a docs/config decision, and deleting a file is a product call better left explicit; demotion is fully reversible).
- **Verified the Render path is genuinely retired:** `docs/CONTEXT.md` (2026-06-12 entry) records "US Supabase/Render dropped for India hosting" during the DPDP compliance overhaul. There is no `render.yaml`, no other doc, script, or CI reference to Render — `bin/render-build.sh` was the only leftover, now clearly marked.
- `bin/render-build.sh`: prepended a banner header marking it **UNSUPPORTED / RETIRED** — explains the 2026-06-12 DPDP retirement, states it's not maintained/CI-exercised, and points to `deploy.sh` + `docker-compose.yml` as the one supported path.
- `docs/DEPLOYMENT.md`: rewrote the intro to (a) state **Docker Compose + sops is the one supported deployment path**, (b) demote Render (`bin/render-build.sh`) and the manual bare-metal/Nginx+Certbot steps to "reference only / not a target for new config changes", referencing `docs/CONTEXT.md`, and (c) drop the dangling third intro bullet ("Manual setup (bare metal, custom infra)") that had no corresponding section in the doc, leaving exactly the two sections that exist (Quick Start / Single VM Deploy).
- **Deviation on rec. "delete the manual-VM steps":** kept the Nginx+Certbot step (part of the Single VM guide) in place — it is the deployed production topology (`RAILS_FORCE_SSL` behind Cloudflare Tunnel/Nginx, cf. SEC-03), so deleting it would remove guidance the operator actually uses. It's now explicitly framed as reference under the single-path banner.
- Files modified: `bin/render-build.sh`, `docs/DEPLOYMENT.md`

---

## What's Already Solid (for context — don't "fix" these)

- **XSS-safe session handling:** the session token is never touched by JavaScript. It lives in an `httpOnly` cookie; the Cloudflare Pages Function extracts it server-side and forwards it as a `Bearer` header to Rails. This is a genuinely good pattern.
- **Tenant scoping:** with the sole exception of households (SEC-01), every other resource controller checked (`transactions`, `budgets`, `trips`, `dividend_sips`, `investments`, `api_credentials`, `exports`) correctly scopes queries through `current_user.<association>`, preventing IDOR.
- **Rate limiting:** `rack-attack` throttles write endpoints and fail2bans common probe paths (`/admin`, `/wp-*`, `/.env`).
- **Sidekiq::Web** is properly gated behind HTTP Basic Auth with `secure_compare` in production — not left open.
- **DPDP/privacy design:** consent records, a 48-hour-cancellable deletion request flow, a full-data-export endpoint, and a grievance-officer flow with SLA messaging are all implemented and look well thought through — the household-invite consent gap (SEC-02) is a genuine outlier against this otherwise careful privacy posture.
- **No dangerous frontend patterns:** no `dangerouslySetInnerHTML`, `eval`, or `innerHTML` usage found anywhere in `frontend/src`.
- **No exposed debug/admin routes** in `config/routes.rb` beyond the properly-guarded Sidekiq mount.

## Out of Scope / Not Verified
- The external Better-Auth service (`oradb`) — password policy, session/token issuance, its own rate limiting, email verification — is a separate service not present in this repository and was not reachable for testing.
- No live dynamic testing (no running instance was exercised); all findings are from static review. Recommend a follow-up pass with the app actually running (e.g. `bin/dev` + a REST client) to confirm the household exploit end-to-end and to check real HTTP response headers/CSP in production.
- Dependency-level vulnerability scan (`bundle audit`, `npm audit`) was not run — worth adding as a CI step alongside SEC-04.

---

## Verification Log
_(Append one entry per fix, newest at bottom.)_

| Date | Item(s) | Verified by | Result |
|------|---------|-------------|--------|
| 2026-09-05 | UX-01, UX-02, UX-03, UX-04 | Static review + `npm run build` (frontend) | Pass — build succeeds (2407 modules); inline-styles refactor and auth-form states compile. **Not browser-verified** (no browser in working env): smoke-test Login/Register/Reset/Forgot visuals before release. |
| 2026-09-05 | CFG-03, CFG-04 | `python3` YAML parse of `docker-compose.yml` | Pass — valid YAML; anchor-expanded env sets equate across `app`/`sidekiq`. |
| 2026-09-05 | CFG-05 | `bash -n deploy.sh` + local fixture smoke test of the new awk merge | Pass — merge output matches old sed loop's net result with `=`/`#!`-laden values; bash syntax OK. **Not run live** (no Docker/sops): operator should run one deploy cycle and confirm `docker compose exec app env | grep VAPID`. |
| 2026-09-05 | SEC-03 | `node --check frontend/functions/[[path]].js` | Pass — syntax-valid; fail-closed 502 path reaches both proxy blocks. |
| 2026-09-05 | SEC-01, SEC-02, REL-01 | Static review only | **Not run** — no Ruby toolchain in working env. Operator must run `bundle exec rspec spec/requests/households_api_spec.rb`; regression expectation: full role×action matrix green. |
| 2026-09-05 | SEC-04 | Static review only | **Not run** — `bundle install` unavailable here (brakeman added to Gemfile; `Gemfile.lock` pending resolution). First CI `Run Brakeman` step will surface real warnings for triage (empty ignore baseline + `--exit-on-warn`). |
| 2026-09-05 | SEC-05, SEC-06, CFG-01, CFG-02, CFG-06 | Static review only | SEC-05/CFG-01 prod boot warning should appear in app logs when derivation is active; SEC-06 → see deletion row below; CFG-02/CFG-06 are repo-state changes (verified by grep/file listing). |
| 2026-09-05 | SEC-06 (delete backup chain) | Repo-state + grep sweep | Pass — 4 job/service files deleted, `Gemfile`/`config/sidekiq.yml`/7 docs updated; grep for `google_sheet|GoogleSheetSync|GoogleAuthService|weekly_backup|sheets_v4|googleauth` in `app config spec db lib bin` returns zero hits. **Not runtime-verified** — no Ruby toolchain; operator should boot once (confirm no removed gems referenced) and run one deletion_request cycle through `ProcessDeletionJob` (expect status `deleted`, no export step). |
| 2026-09-05 | SEC-05 (key rotation) | Static review (no Ruby toolchain) | **Not run** — cannot execute. Operator must: (1) `ruby -c` both `config/initializers/active_record_encryption.rb` and `lib/tasks/encryption_rotation.rake`; (2) dry-run the rotation on a staging copy (derive current keys → set as `PREVIOUS_*` → set new independent keys → `rake sampada:reencrypt` → confirm a sample `ApiCredential#encrypted_value` row decrypts and its ciphertext changed → drop `PREVIOUS_*`). No production data was rotated in this change — the code only adds the capability. |
| 2026-09-05 | CI: add bundle + npm audit | `python3` YAML parse of `.github/workflows/ci.yml` | Pass — valid YAML. Added `bundle exec bundle-audit check --update` to the `lint` job and `npm audit --audit-level=high` to the `frontend` job. **Caveat:** `bundler-audit` is added to `Gemfile` but `Gemfile.lock` is not yet regenerated (no Ruby toolchain here) — CI's `bundler-cache` resolves it, but operator should run `bundle install` locally before pushing so the committed lock is in sync, and watch the first `Run Bundler Audit` / `Run npm audit` steps for real findings. |
