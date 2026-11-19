# Sampada — Backend Integration Readiness Checklist

**Prerequisite:** All UAT gates passed (see `UAT_TESTING_PLAN.md`).

**Stack:** Cloudflare Worker (`sampada-api-production`, Hono + D1 + R2) behind the
Cloudflare Pages SPA (`sampada.vayalabs.in`). Pages Functions in
`frontend/functions/[[path]].js` proxy `/api/worker/*` to the Worker via the
`WORKER_URL` binding. Auth is passkey-first with a magic-link recovery path;
sessions live in D1. There is no Rails app, Postgres database, or shared
Better-Auth service in the Sampada request path.

---

## API Contract Verification

All data routes are mounted in `worker/src/index.ts` under `/api/v1/*` and require
the `sampada_session` cookie. Unauthenticated requests return `401`.

| Area | Routes | Notes |
|------|--------|-------|
| Auth | `/api/v1/auth/me`, `/profile`, `/passkeys/*`, `/magic-link/request`, `/magic-link/verify` | Passkey primary; magic-link recovery via Resend |
| Dashboard | `/api/v1/dashboard`, `/dashboard/projection` | Net worth, debt/investment totals, projections |
| Transactions | `/api/v1/transactions*`, `/monthly_totals`, `/bulk_create` | CSV import, recurring detection |
| Debts | `/api/v1/debts*`, `/debts/:id/simulate`, `/payoff_plans` | Avalanche/snowball payoff |
| Budgets | `/api/v1/budgets*`, `/budget_categories` | Overview with spend/remaining |
| Goals | `/api/v1/goals*` | Projection + risk comparison |
| Portfolios | `/api/v1/portfolios*`, `/investments*`, `/sips`, `/dividend_sips` | Holdings, prices, rebalance |
| Reports/Exports | `/api/v1/reports*`, `/exports*`, `/dpdp/full-export` | CSV/JSON downloads via `api.raw()` |
| Households/Trips | `/api/v1/households*`, `/api/v1/trips*` | Shared budgets, trip settlements |
| Conversations | `/api/v1/conversations*` | Data CRUD; AI provider actions return 501 |
| DPDP | `/api/v1/dpdp/*` | Consent, erasure, cancel, grievance, full export |
| Settings | `/api/v1/ai_settings`, `/api/v1/api_credentials`, `/api/v1/feature_flags`, `/api/v1/onboarding/*` | Per-user settings |
| Notifications | `/api/v1/notifications*` | In-app notifications |

Full endpoint inventory: `worker/src/index.ts` + `worker/src/api/*.ts`.

---

## Data Model

D1 schema lives in `worker/migrations/0001_initial.sql` through `0007_*`.
Apply with `npm run db:migrate:remote` in `worker/`. Core user-owned tables:
`users`, `sessions`, `magic_links`, `webauthn_credentials`, `transactions`,
`debts`, `budgets`, `budget_categories`, `goals`, `portfolios`, `holdings`,
`investments`, `sips`, `consent_records`, `deletion_requests`, `grievances`,
`households`, `trips`, `conversations`, `messages`, `notifications`,
`net_worth_snapshots`.

---

## Error Response Format

`success(c, data)` → `{ success: true, ...data }`.
`error(c, message, status, details?)` → `{ error: message, status, details? }`.
Frontend reads `err.message` for toasts and `err.status` for conditional handling.
`422` for validation errors; `501` for actions with no Worker implementation.

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Worker p95 latency | ≤ 200ms |
| Dashboard aggregation | ≤ 500ms |
| CSV import (1000 rows) | ≤ 5s |
| Full DPDP export | ≤ 10s |

---

## Security Checklist

- [ ] Every `/api/v1/*` route behind `originGuard` + `requireAuth` (except magic-link request/verify)
- [ ] Turnstile verified on magic-link request; secret in Worker secrets only
- [ ] Passkey public credentials only; no private keys or password hashes stored
- [ ] Household role matrix enforced (owner/admin update+invite, owner destroy, invites pending)
- [ ] DPDP export scoped to the authenticated user
- [ ] Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `D1_PROBE_TOKEN`) in Worker secrets / SOPS, never in git

### Retention note
`processDeletion` in `worker/src/jobs/comms.ts` anonymizes user data after the
48-hour cancel window; it does not hard-delete. Hard-delete is a separate backlog item.

---

## Deployment Verification

```bash
# From repo root — Worker
cd worker && npx tsc --noEmit && npm test && npm run deploy

# Health (through the Pages proxy; the Worker custom domain is intentionally absent)
curl -sf https://sampada.vayalabs.in/api/worker/up
# => {"status":"ok","service":"sampada-api"}

# Representative authenticated route (needs a valid session cookie)
curl -sf -b cookies.txt https://sampada.vayalabs.in/api/worker/api/v1/dashboard | jq .

# Frontend + security headers
curl -sI https://sampada.vayalabs.in/ | grep -i content-security-policy
curl -sf  https://sampada.vayalabs.in/login | grep -q "Sampada"
```

Pages `WORKER_URL` binding is load-bearing: if missing, `/api/worker/*` returns
`502 Worker origin not configured`.

---

## Rollback

- **Frontend:** Cloudflare Pages rollback to a previous build.
- **Worker:** `wrangler deployments list` / `wrangler rollback` in `worker/`.
- **Database:** D1 migrations are forward-only; hotfix via a new migration.
- **R2:** `sampada-storage` backups are retained as rollback data; no objects are purged.

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Frontend Lead | | | |
| Product Owner | | | |

**Integration is complete when all UAT gates pass and every `/api/v1/*` route the SPA calls returns data with a valid session.**
