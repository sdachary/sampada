# Sampada

> Auto-loaded by OpenCode at session start. Last updated: 2026-11-19.
> Single source of developer context. The retired Rails app, Postgres, Redis/Sidekiq,
> and the shared Better-Auth service are no longer part of Sampada. See git history
> for the pre-cutover Rails source and `docs/architecture/ARCHITECTURE.md` for the
> current architecture.

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | Cloudflare Worker `sampada-api-production` — Hono 4 + TypeScript (`worker/`) |
| Database | Cloudflare D1 `sampada-db` (SQLite), migrations `0001`–`0007` |
| File storage | Cloudflare R2 `sampada-storage` (backups / documents) |
| Auth | Passkeys primary + magic-link recovery (Resend); sessions in D1 |
| Frontend | React 19 + Vite SPA (`frontend/`), hand-rolled CSS, recharts + lucide-react |
| Hosting | Cloudflare Pages `sampada.vayalabs.in`; same-origin `/api/worker/*` proxy via Pages Function |
| Background | Worker Cron Triggers (`worker/wrangler.toml`): FX sync, snapshots, deletion checks |

---

## Architecture

Hosted, free-forever, multi-tenant personal-finance SaaS ("debt → zero → wealth").
The SPA calls the Worker through a same-origin Pages Function proxy
(`frontend/functions/[[path]].js`), which forwards `/api/worker/*` to the Worker
via the load-bearing `WORKER_URL` binding and hard-404s the retired `/api/auth/*`.
There is no long-lived origin server, VM, or shared auth service in the request path.

```
Browser → Cloudflare Pages SPA → /api/worker/* → Pages Function → Worker → D1 / R2 / Resend
```

DPDP compliance is built in (consent records, erasure with 48h cancel window —
the Worker cron anonymizes data after the window; hard-delete is a backlog item —
grievance, full export). Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`,
`D1_PROBE_TOKEN`) live in Worker secrets / SOPS only — never in git, wikis, or Notion.

Architecture: `docs/architecture/ARCHITECTURE.md`. Design system: `DESIGN.md` (root).
Feature history: `docs/CHANGELOG.md`. Open findings: `SAMPADA_UAT_TRACKER.md`.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | Cloudflare Worker (Hono + D1 + R2) | Serverless cutover complete; oradb dependencies removed |
| Auth | Passkeys + magic-link recovery, D1 sessions | One session store, no homelab VM in the auth path |
| Frontend | React 19 SPA (Vite, hand-rolled CSS, no UI kit) | See `docs/frontend-decision.md` (historical: written pre-cutover) |
| Hosting | Cloudflare edge (Pages + Workers) | No long-lived process to operate |
| Pricing | Free forever | Non-profit finance tool |
| Consent | Opt-in per feature | DPDP §6 |
| DPDP | Live (consent/erasure/grievance/full-export) | Finance data = MEDIUM risk |
| Web push | **Won't Do (2026-09-12)** | Email reminders cover due dates; do not resurrect |

---

## Routes / API surface

Worker serves `/api/v1/*` under `worker/src/index.ts`; every router uses
`originGuard` + `requireAuth`. Unauthenticated requests return `401`.

- **Auth**: `/auth/me`, `/auth/profile`, `/auth/passkeys/*`, `/auth/magic-link/{request,verify}`
- **DPDP**: `/dpdp/{consent,erasure,cancel-deletion,full-export,grievance,deletion-requests}`
- **Financial**: `debts` (+`simulate`), `payoff_plans`, `insurance_policies`, `portfolios` (+`rebalance`,`prices`), `investments`, `goals`, `dividend_sips`, `journey`, `net_worth_snapshots`, `recurring_expenses`
- **Tracking**: `transactions` (+`monthly_totals`,`bulk_create`), `budgets` (+`overview`), `budget_categories`, `dashboard` (+`projection`), `reports/*`, `exports/*`
- **Collaboration**: `households` (+members/invite/accept/decline/dashboard), `trips` + nested members/expenses/settlements
- **Chat**: `conversations` + nested `messages`
- **Misc**: `ai_settings`, `notifications` (+`mark_all_read`), `api_credentials`, `feature_flags`, `onboarding/{snapshot,complete}`
- **Ops**: `GET /up` (health, via `/api/worker/up` on Pages)

---

## Schema

D1 tables are defined in `worker/migrations/0001_initial.sql` (`0002`–`0007` add
later features): `users`, `sessions`, `magic_links`, `webauthn_credentials`,
`transactions`, `budgets`, `budget_categories`, `debts`, `goals`, `portfolios`,
`holdings`, `investments`, `dividend_sips`, `journeys`, `net_worth_snapshots`,
`insurance_policies`, `recurring_expenses`, `currencies`, `exchange_rates`,
`households`, `household_memberships`, `trips` (+ nested tables), `conversations`,
`messages`, `notifications`, `consent_records`, `deletion_requests`, `grievances`,
`api_credentials`, `tenants`, `active_storage_*`.

---

## Coding Conventions

- **Style**: TypeScript in `worker/src/api/*.ts`, 2-space indent, single quotes.
- **Routers**: `new Hono<AppEnv>()`, `router.use('*', originGuard, requireAuth)`,
  `success(c, ...)` / `error(c, msg, status, details?)`, SQLite via `c.env.DB.prepare(...)`.
- **Testing**: Vitest in `worker/` (`npm test`); node:test + Playwright + Lighthouse CI in `frontend/`.
- **Git**: commits prefixed `sampada: <summary>`, feature branches, PRs to `main` (protected).
- **Files to avoid editing**: `node_modules/`, `dist/`, generated migrations already applied.

---

## Environment Variables / Secrets

See `.env.example`. Production secrets are Worker secrets / SOPS, never committed:

- `TURNSTILE_SECRET_KEY` — Turnstile verification for magic-link requests
- `RESEND_API_KEY` — transactional email
- `D1_PROBE_TOKEN` — shared secret for the read-only `/up` probe

Frontend uses `VITE_API_URL=/api/worker` (same-origin). Pages binding `WORKER_URL`
points at the Worker; if missing, `/api/worker/*` returns `502`.

---

## Security posture

| Measure | Status |
|---------|--------|
| Auth | Passkeys + magic-link (Turnstile), D1 sessions in `sampada_session` cookie |
| Authorization | Per-user ownership scoping + household role checks in Worker |
| Rate limiting | Edge honeypot in Pages proxy + origin guard on every router |
| Headers | CSP / HSTS / XFO / nosniff via CF Pages `_headers` (connect-src `'self'`) |
| TLS | HTTPS at Cloudflare edge; no plaintext origin hop |
| Secret scanning | gitleaks in CI; secrets in Worker secrets / SOPS |
| DPDP | consent/erasure/grievance/full-export live; legal copy in `frontend/public/privacy.html` |

---

## External Dependencies

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Cloudflare Workers / D1 / R2 | API, database, file storage | All user data |
| Resend | Transactional email (magic links / notifications) | Email address |
| Cloudflare Turnstile | Abuse protection on magic-link request | IP, request metadata |
| Market data / FX | Yahoo Finance (via cron/router) | Symbol lookups only |
| AI providers (BYOK) | Per-user configured endpoint | Whatever the user's prompt contains |

No Sampada data or routes remain on oradb (verified: no Sampada DB/schema, no Caddy routes, 0 Sampada shared-auth rows).

---

## Deployment

- Worker: `cd worker && npx tsc --noEmit && npm test && npm run deploy`.
- Frontend: `npm run build` in `frontend/`, deploy directory to Cloudflare Pages.
- Health: `curl https://sampada.vayalabs.in/api/worker/up` → `{"status":"ok","service":"sampada-api"}`.
- Runbook: `docs/deployment/DEPLOYMENT.md`.

---

## Session History

- **2026-11-19**: Serverless cutover complete — ported all remaining `/api/v1/*` routers to Worker/D1 (goals, households, trips, conversations, dpdp, exports, notifications); removed oradb/Better-Auth/Rails references from frontend, config and docs; deleted the decommissioned Rails tree. Test data wiped for fresh signups. oradb verified clean.
- **2026-09-25**: v2.6.0 cleanup — recurring expense auto-log, net-worth overview, budget-health strip, auth form dedupe, inline-style sweep; full Rails backend suite green (413 examples). Docs MASTER_SPEC + IMPLEMENTATION_PLAN archived.
- **2026-09-12**: Docs sweep — merged MAP + CONVENTIONS into this file, dropped superseded docs, refreshed README/ARCHITECTURE to Rails 8.1 API-only + React SPA reality.
- **2026-09-11**: SPA legal pages (DPDP privacy + ToS) + cookie banner added.
- **2026-09-05 → 09-11**: UAT (SAMPADA_UAT_TRACKER.md) — SEC/REL findings verified and fixed; Rails 7.2 → 8.1.3.1 upgrade.
- **2026-08-11**: v2.5.0 — quick-log expense entry, offline read-only indicator.
- **2026-08-08**: v2.4.0 — insurance tracker, onboarding tour, trip settlement math, Recharts.
- **2026-06-20**: Phases 15/16 — Docker/India deployment, Trip mode (pre-cutover).
- **2026-06-12**: DPDP compliance overhaul (pre-cutover).
