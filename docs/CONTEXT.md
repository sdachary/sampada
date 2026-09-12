# Sampada

> Auto-loaded by OpenCode at session start. Last updated: 2026-09-12
> Single source of developer context (supersedes the old docs/MAP.md + docs/CONVENTIONS.md; see git log for the merge).

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Ruby | 3.3.8 |
| Framework | Rails (API-only) | 8.1.3.1 |
| Frontend | React 19 + Vite SPA (`frontend/`) | react ^19.2, vite ^8 |
| Database | PostgreSQL | 16 |
| Background | Sidekiq + Redis | — |
| Deploy | oradb VM (140.245.227.176, `sampada.140.245.227.176.nip.io`, :3002) + Cloudflare Pages frontend (`sampada.pages.dev`) | — |
| Auth | Better-Auth (shared identity service, JWT verification) | app_id `sampada` |

---

## Architecture

Hosted, free-forever, multi-tenant personal-finance SaaS ("debt → zero → wealth"). **Rails is API-only** — it serves `/api/v1/*`, `/sidekiq` and `/up`; all UI is the React 19 SPA in `frontend/` (built by Vite, deployed to Cloudflare Pages, CSP/HSTS via `_headers`). Auth is delegated to the shared Better-Auth service: tokens verified per-request (`Api::BaseController` → `BetterAuthVerification`) against `BETTER_AUTH_VERIFY_URL` (cached 300s). Google/GitHub OAuth credentials are **not provisioned** — email/password via Better-Auth is the live path. DPDP compliance is built in (`consent_records`, erasure with 48h cancel window, `full_export`, `grievance`). Sidekiq handles async work (market data, FX sync, backups, deletion/reminder jobs). Deployed via Docker on oradb (app + sidekiq, both `network_mode: host`), secrets via sops (`secrets.enc.env`, see `.sops.yaml`); `deploy.sh` + `docker-compose.yml` is the one supported deploy path.

Decision record for the React-SPA split: `docs/frontend-decision.md`. Visual design system: `DESIGN.md` (root). Feature history: `docs/CHANGELOG.md`. Known open findings + verification state: `SAMPADA_UAT_TRACKER.md` (live). Baseline perf: `docs/PERFORMANCE.md`.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | React 19 SPA (Vite, hand-rolled CSS, no UI kit) | See `docs/frontend-decision.md` |
| Hosting | oradb shared VM (India) + CF Pages edge | DPDP data-localization intent; frontend needs no long-lived process |
| Auth | Shared Better-Auth JWT verification | One identity service for all AcharyaLab apps; OAuth creds unprovisioned |
| Pricing | Free forever | Non-profit finance tool |
| Consent | Opt-in per feature | DPDP §6 |
| DPDP | Live (consent/erasure/grievance/full-export) | Finance data = MEDIUM risk |
| Database | Self-hosted PG 16 on oradb (shared instance) | No external SaaS for user data |
| Job queue | Sidekiq + Redis | Async backups, deletion, market data |
| Web push | **Won't Do (2026-09-12)** | Email reminders already cover due dates; push_subscriptions routes/VAPID remain in code but are not planned. Do not resurrect |

---

## Routes / API surface

Rails serves no pages — everything is `/api/v1/*` (full detail in `config/routes.rb`):

- **Auth**: `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile`
- **DPDP**: `POST /api/v1/dpdp/{consent,erasure,cancel-deletion,full-export,grievance}`, `GET /api/v1/dpdp/consent`
- **Financial**: `debts` (+member `simulate`), `payoff_plans`, `insurance_policies`, `portfolios` (+`rebalance`, `prices`), `investments`, `goals`, `dividend_sips` (+`suggest`), `journey` (+`progress`, `net_worth`), `net_worth_snapshots`, `recurring_expenses` (+`calendar`)
- **Tracking**: `transactions` (+`monthly_totals`, `bulk_create`), `budgets` (+`overview`), `budget_categories` (+`seed`), `dashboard` (+`projection`), `reports` (`annual|cash_flow_forecast|anomalies|goal_charts|net_worth`), `exports` (+`csv|json`, per-module `debts|portfolios|transactions|net_worth`)
- **Collaboration**: `households` (+`members`,`invite`,`accept_invite`,`decline_invite`,`leave`,`dashboard`,`pending_invites`), `trips` with nested `trip_members`/`trip_expenses`/`trip_settlements`
- **Chat**: `conversations` + nested `messages`
- **Misc**: `ai_settings`, `notifications` (+`mark_all_read`), `push_subscriptions` (+`vapid_public_key`), `api_credentials`, `onboarding/snapshot` + `onboarding/complete`
- **Ops**: `GET /up` (health), `/sidekiq` (UI)

---

## Models / Schema

Current tables (`db/schema.rb`): `users`, `transactions`, `budgets`, `budget_categories`, `debts`, `debt_payoffs` (+`debt_payoff_debts`), `portfolios`, `investments`, `dividend_sips`, `goals`, `journeys`, `net_worth_snapshots`, `insurance_policies`, `recurring_expenses`, `currencies`, `exchange_rates`, `households`, `household_memberships`, `trips` (+`trip_members`, `trip_expenses`, `trip_settlements`, `trip_categories`), `conversations`, `messages`, `notifications`, `settings`, `consent_records`, `deletion_requests`, `grievances`, `push_subscriptions`, `api_credentials` (encrypted), `sessions`, `tenants` (+`tenant_records`), `active_storage_*`.

---

## Coding Conventions

- **Style**: 2-space indent, snake_case files/vars, PascalCase classes, 120-col max, single quotes, Ruby (no semicolons). RuboCop: `.rubocop.yml` (run `bundle exec rubocop`), Brakeman + bundler-audit in CI.
- **Autoloading**: Rails/Zeitwerk. `require` only for library code; gems grouped by environment in `Gemfile`.
- **Testing**: RSpec — `bundle exec rspec`, `*_spec.rb` in `spec/` mirroring `app/`, FactoryBot factories in `spec/factories/`, SimpleCov. (No minitest; run `bin/rails test` is wrong.)
- **Git**: commits prefixed `sampada: <summary>` (repo style), work on feature branches, PRs through GitHub.
- **Error handling**: `Api::BaseController` `rescue_from` (RecordNotFound → 404, RecordInvalid → 422) + the `render_success` / `render_error` / `render_unauthorized` helpers. JSON is `{ success, message, errors }` on failure.
- **Files to avoid editing**: `db/schema.rb` (generated by migrations), `vendor/`, `node_modules/`, `dist/`, `storage/`.

---

## Environment Variables

See `.env.example` for the full annotated set. Required: `SECRET_KEY_BASE`, `POSTGRES_PASSWORD`, `APP_DOMAIN`. Notable:

- **Auth (Better-Auth)**: `BETTER_AUTH_VERIFY_URL` (default `http://localhost:4000/api/auth/verify`), `BETTER_AUTH_APP_ID=sampada`, `BETTER_AUTH_CACHE_TTL=300`
- **Google OAuth placeholders**: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (listed, but OAuth is currently **unprovisioned**)
- **DB/Redis**: `DATABASE_URL` or `DB_HOST`/`DB_PORT`/`POSTGRES_USER`/`POSTGRES_DB`; `REDIS_HOST` (compose default `10.0.1.46`), `REDIS_URL` derived
- **Server**: `PORT=3002`, `RAILS_MAX_THREADS=3`, `WEB_CONCURRENCY=1`, `RAILS_FORCE_SSL` / `RAILS_ASSUME_SSL`
- **Encryption**: `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` / `_DETERMINISTIC_KEY` / `_KEY_DERIVATION_SALT` (set independently for prod; never rely on the `SECRET_KEY_BASE` derivation — SEC-05). Rotation runbook: `docs/DEPLOYMENT.md`
- **CORS**: `CORS_ORIGINS=http://localhost:5173,https://sampada.pages.dev`
- **Backup**: `DATABASE_BACKUP_ENABLED`, optional `DATABASE_BACKUP_S3_*`
- **Secrets**: live in `secrets.enc.env` (sops, `.sops.yaml`) — decrypted into `.env` at deploy by `deploy.sh`. Never add to Rails credentials (`config/credentials.yml.enc` is removed).

---

## Security posture

| Measure | Status |
|---------|--------|
| Auth | Better-Auth JWT verification per request; no Google/GitHub OAuth provisioned |
| Authorization | Pundit policies per resource |
| Rate limiting | Rack::Attack (`config/initializers/rack_attack.rb`) |
| Headers | CSP / HSTS / XFO / nosniff via CF Pages `_headers` |
| Encryption at rest | Active Record `encrypts` on sensitive columns; keys via env |
| TLS | HTTPS at Cloudflare edge; **edge→origin is plaintext `http://` nip.io** (known limitation, UAT SEC-03 Verified) |
| Secret scanning | gitleaks + Brakeman + bundler-audit in CI |
| DPDP | consent/erasure/grievance backend live; legal copy served from `frontend/public/privacy.html` |

---

## External Dependencies

| Service | Purpose | Data Shared | DPDP Status |
|---------|---------|-------------|-------------|
| Better-Auth (:4000, oradb) | Auth: email/password + session/short tokens | email + auth metadata | Shared first-party service |
| PostgreSQL 16 + Redis (oradb) | Primary DB + Sidekiq queue | All user data | Self-hosted India |
| Cloudflare Pages | SPA hosting/CDN/edge headers | IP, request metadata | Edge cache only |
| Market data / FX | Yahoo Finance via adapters | Symbol lookups only | No user data |
| AI providers (BYOK) | Per-user configured endpoint | Whatever the user's prompt contains | User-controlled |

---

## Deployment

- Supported path: `docker-compose.yml` + `deploy.sh` + sops. App + sidekiq both `network_mode: host` (needed to reach PG/Redis/Better-Auth on the shared VM). Build on laptop/or quiet window (1 GiB VM thrashes on build). Deploy on oradb: `git push && ssh oradb "cd /opt/sampada && sudo -u ubuntu bash deploy.sh"`. See `docs/DEPLOYMENT.md`.
- Frontend: `frontend/` build → Cloudflare Pages (`sampada.pages.dev`), API via `VITE_API_URL` (default dev proxy → `http://localhost:3002`).

---

## Session History

- **2026-09-12**: Docs sweep — merged `docs/MAP.md` + `docs/CONVENTIONS.md` into this file, dropped kubera-era / superseded docs (`frontend/DESIGN-PLAN.md`, `docs/latency-verification-2026-08-14.md`, `docs/superpowers/specs/2026-05-15-kubera-optimization-design.md`), refreshed README/ARCHITECTURE to Rails 8.1 API-only + React SPA reality.
- **2026-09-11**: SPA legal pages (DPDP privacy + ToS) + cookie banner added (`frontend/public/`); landing footer links.
- **2026-09-05 → 09-11**: UAT (SAMPADA_UAT_TRACKER.md) — SEC-01/02/03/04, REL-01 Verified; SEC-05/06 fixed; Rails 7.2 → 8.1.3.1 upgrade (CI green).
- **2026-08-11**: v2.5.0 — quick-log expense entry, offline read-only indicator.
- **2026-08-08**: v2.4.0 — insurance tracker, onboarding tour, trip settlement math, Recharts.
- **2026-06-20**: Phases 15/16 — Docker/India deployment, Trip mode. Phases 14 — auth overhaul (Google OAuth, SessionsController, DPDPController era — later replaced by Better-Auth), 4 Sidekiq jobs.
- **2026-06-12**: DPDP compliance overhaul — US Supabase/Render dropped for India hosting. Consent, erasure, DPO, sheet backup added (sheet path later dropped, SEC-06).