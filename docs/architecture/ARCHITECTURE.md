# Sampada Architecture

## Overview

Sampada is a **Cloudflare Worker API** (Hono + D1 + R2) behind a **React 19 SPA**
built with Vite and deployed to Cloudflare Pages. There is no Rails app, Postgres
database, Redis/Sidekiq, or shared Better-Auth service in the Sampada request path.
The retired Rails source was removed from the repo after the cutover; git history
retains it for rollback. Sampada follows a debt-first financial philosophy:
**Negative → Zero → Positive**.

```
Browser → https://sampada.vayalabs.in (Cloudflare Pages SPA)
              │  same-origin /api/worker/*
              ▼
        Pages Function [[path]].js  (proxy via WORKER_URL; /api/auth/* hard-404)
              │
              ▼
        Worker sampada-api-production  (Hono)
              ├── D1  sampada-db      (SQLite: data + sessions + magic links)
              ├── R2  sampada-storage (backups / uploaded documents)
              └── Resend REST         (magic-link + notification email)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Cloudflare Worker, Hono 4, TypeScript (`worker/`) |
| Database | Cloudflare D1 (SQLite), migrations `0001`–`0007` |
| File storage | Cloudflare R2 (`sampada-storage`) |
| Auth | Passkeys (`@simplewebauthn/server`) primary + magic-link recovery (Resend); D1 sessions |
| Edge abuse control | Pages Function honeypot + Turnstile on magic-link request |
| Background | Worker Cron Triggers (`worker/wrangler.toml`): FX sync, snapshots, deletion checks |
| Frontend | React 19 + Vite SPA (`frontend/`), hand-rolled CSS (no Tailwind), recharts + lucide-react |
| Rate limiting | D1-backed + origin guard in `worker/src/auth.ts` |
| Format Support | CSV, JSON exports |
| Testing | Vitest (Worker), node:test + Playwright + Lighthouse CI (frontend) |

## Directory Structure

```
sampada/
├── worker/                   # Hono Worker — the only API
│   ├── src/
│   │   ├── index.ts          # route registry (mounts every /api/v1/* router)
│   │   ├── auth.ts           # originGuard, requireAuth, session cookie, passkeys
│   │   ├── api/              # one router per resource (debts, goals, dpdp, ...)
│   │   ├── jobs/             # cron jobs (comms/deletions, FX, snapshots)
│   │   └── email.ts          # Resend REST wrapper
│   ├── migrations/           # D1 SQL migrations
│   ├── wrangler.toml         # sampada-api-production, D1/R2 bindings, vars, crons
│   └── vitest tests
├── frontend/                 # React 19 SPA (Vite)
│   ├── src/                  # pages/ components/ lib/ styles/
│   ├── public/               # _headers (CSP/HSTS), sw.js, manifest, legal pages
│   ├── functions/[[path]].js # /api/worker/* proxy; /api/auth/* hard-404
│   ├── wrangler.toml         # Cloudflare Pages config
│   └── vite.config.js        # dev proxy → local Worker on :8787
└── docs/                     # architecture, roadmap, operations docs
```

## Data Model

D1 schema is defined in `worker/migrations/0001_initial.sql` (`0002`–`0007` add
indexes and later features).

- **Core financial**: users, debts, payoff plans, portfolios, holdings, investments,
  dividend SIPs, recurring expenses, insurance policies, journeys, net-worth snapshots,
  transactions, budgets, budget categories
- **Multi-currency**: currencies, exchange rates (cached, 6h refresh)
- **Collaboration**: households, household memberships (owner/admin/member/viewer),
  trips + trip members/expenses/settlements/categories
- **AI chat**: conversations, messages
- **DPDP / compliance**: consent records, deletion requests, grievances
- **Supporting**: notifications, API credentials, webauthn credentials, magic links,
  active_storage blobs/attachments, statement imports, recurring detections

## Key Modules

- `debt` routers — avalanche/snowball payoff and simulation
- `portfolio` routers — holdings, prices, rebalance
- `reports` + `exports` — CSV/JSON downloads and full DPDP export
- `goals` — projection + risk comparison
- `households` — aggregated dashboard; role-scoped invites (pending accept/decline)
- `trips` — simplified settlement math
- `dpdp` — consent, erasure (48h cancel window; anonymizes, does not hard-delete),
  grievances
- `jobs/comms` — cron-driven deletion processing and notifications

## Auth & Security

- Sessions live in D1 (`sessions` table) via the `sampada_session` cookie; passkeys
  are the primary sign-in. Magic-link recovery verifies Turnstile, stores a hashed
  single-use token with ~10 min TTL, and sends via Resend.
- Every `/api/v1/*` router runs `originGuard` + `requireAuth` from `worker/src/auth.ts`.
- Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `D1_PROBE_TOKEN`) are Worker
  secrets / SOPS only — never in git, wikis, or Notion.
- Frontend security headers (CSP, HSTS, XFO, nosniff) are in `frontend/public/_headers`.
  CSP `connect-src` is same-origin (`'self'`) plus Sentry; no external API host.

## Configuration

Worker bindings and vars are in `worker/wrangler.toml` (D1 `sampada-db`, R2
`sampada-storage`, cron triggers). Frontend uses the same-origin default
`VITE_API_URL=/api/worker`; Pages binding `WORKER_URL` points at the Worker and is
load-bearing (missing → `502 Worker origin not configured`). See `.env.example`.

## Deployment

- Worker: `cd worker && npm run deploy` (`sampada-api-production`).
- Frontend: `npm run build` in `frontend/`, deploy the directory to Cloudflare Pages
  (`sampada.vayalabs.in`).
- Health: `GET /api/worker/up` through the Pages proxy →
  `{"status":"ok","service":"sampada-api"}`.
- Backups: R2 `sampada-storage` objects and D1 exports are retained for rollback.
- See `docs/DEPLOYMENT.md` for the runbook.
