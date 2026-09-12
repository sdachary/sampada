# Sampada Architecture

## Overview

Sampada is a **Rails 8.1 (API-only) backend** + **React 19 SPA frontend**. Rails serves `/api/v1/*`, `/sidekiq` and `/up`; all UI is the Vite-built SPA in `frontend/` deployed to Cloudflare Pages. It follows a debt-first financial philosophy: **Negative → Zero → Positive**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Rails 8.1.3.1 — **API-only** (no server-rendered views, no Stimulus) |
| Database | PostgreSQL 16 |
| Frontend | React 19 + Vite SPA (`frontend/`), hand-rolled CSS (no Tailwind), recharts + lucide-react |
| Background | Sidekiq (Redis) + Sidekiq-Cron (host-networked on oradb) |
| Auth | Better-Auth shared identity service — JWT verified per request |
| Authorization | Pundit policies |
| Rate limiting | Rack::Attack |
| AI | OpenAI-compatible API (OpenRouter, Ollama, Claude) via `Ai::Provider` |
| Market Data | Yahoo Finance (free, no API key) |
| Exchange Rates | Yahoo Finance → cached in DB, refreshed every 6h |
| Format Support | CSV, JSON exports |
| Testing | RSpec + FactoryBot + SimpleCov |

## Directory Structure

```
sampada/
├── app/
│   ├── controllers/       # Namespaced API controllers (app/controllers/api/v1)
│   ├── jobs/              # Sidekiq jobs (import, FX sync, backups, reminders)
│   ├── mailers/           # ActionMailer classes + notification templates
│   ├── models/            # 30+ ActiveRecord models
│   ├── services/          # Business logic services
│   │   └── providers/     # Yahoo Finance adapter, market data
│   └── views/             # Mailer views only (no HTML views)
├── config/
│   ├── initializers/      # sidekiq_schedule.rb (cron), rack_attack.rb, cors.rb, auth.rb
│   └── sidekiq.yml
├── db/
│   ├── migrate/           # Fresh migrations (sequence reset after Rails 8.1 upgrade)
│   └── schema.rb          # Current database schema (generated — do not hand-edit)
├── frontend/              # React 19 SPA (Vite) — NOT under app/
│   ├── src/               # pages/ components/ lib/ i18n/
│   ├── public/            # _headers (CSP/HSTS), sw.js, manifest, legal pages
│   ├── wrangler.toml      # Cloudflare Pages config
│   └── vite.config.js     # dev proxy → http://localhost:3002
├── lib/                   # Money, AiResponse, Semver, SystemDetector
├── docs/                  # Architecture, roadmap, operations docs
└── spec/                  # RSpec test suite (mirrors app/)
```

## Models

- **Core financial**: `User`, `Debt`, `DebtPayoff` (+`DebtPayoffDebt`), `Portfolio`, `Investment`, `DividendSip`, `RecurringExpense`, `InsurancePolicy`, `Journey`, `NetWorthSnapshot`, `Transaction`, `Budget`, `BudgetCategory`
- **Multi-currency**: `Currency` (32), `ExchangeRate` (cached, 6h refresh, auto-inversion)
- **Collaboration**: `Household`, `HouseholdMembership` (owner/admin/member/viewer), `Trip` (+`TripMember`, `TripExpense`, `TripSettlement`, `TripCategory`)
- **AI chat**: `Conversation`, `Message`
- **DPDP / compliance**: `ConsentRecord`, `DeletionRequest`, `Grievance`
- **Supporting**: `Setting`, `Notification`, `PushSubscription`, `ApiCredential` (encrypted), `ActiveStorage*`

## Key Services

- `DebtPayoffService` — avalanche/snowball strategies
- `DividendSipService` + `DividendScreenerService` — dividend SIP planning / AI suggestions
- `PortfolioService` — MPT optimization (expected return, volatility, Sharpe)
- `WealthJourneyTracker` — currency-aware debt/SIP/net-worth aggregation
- `RecurringExpenseService` — EMI/subscription calendar event generation
- `ExchangeRateService` + `Providers::YahooFinanceAdapter` — FX sync/conversion
- `CashFlowForecastService` — 12-month projection, financial health scoring
- `AnomalyDetectionService` — 3-sigma outliers, spending surges, budget breaches
- `Ai::AdviceService` + `Ai::CommandParser` — NL transactions/budgets, categorisation, forecasting
- `ExportService`, `AnnualReportService`, `GoalChartService` — reporting & export
- `HouseholdDashboardService` — aggregated net worth, per-member summaries
- `Trip::Settlement` — simplified debt settlement math

## Background Jobs (app/jobs, Sidekiq)

| Job | Schedule (sidekiq_schedule.rb) | Purpose |
|-----|-------------------------------|---------|
| `ImportMarketDataJob` | Weekdays 21:30 | Refresh investment prices/dividends |
| `ExchangeRateSyncJob` | Every 6h | Sync all exchange rates |
| `SecurityHealthCheckJob` | Daily 02:00 | Detect stale investments, queue imports |
| `SyncCleanerJob` | Hourly | Trigger rate sync if rates stale |
| `ExpenseReminderCheckJob` | Daily 09:00 | Due-date checks for recurring expenses |
| `DatabaseBackupJob` | Daily 03:00 | `pg_dump` (custom, compressed), 7-day local retention |
| `NetWorthSnapshotJob` | Daily 04:00 | Periodic net-worth snapshots |
| `CheckDeletionsJob` / `ProcessDeletionJob` | — | DPDP erasure workflow (48h cancel window) |
| `AiResponseJob` | — | Async AI model responses |

## Data Flow

```
React SPA → /api/v1/* → Rails Controller → Service Object → Model → PostgreSQL
                                       ↕
                       Market Data Provider (Yahoo Finance — quotes, dividends, FX)
                                       ↕
                       Sidekiq Jobs (import, FX sync, backups, reminders)
```

## API Endpoints

Rails serves no pages — the full surface is `/api/v1/*` under `config/routes.rb`:

- **Auth**: `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile`
- **DPDP**: `POST /api/v1/dpdp/{consent,erasure,cancel-deletion,full-export,grievance}`, `GET /api/v1/dpdp/consent`
- **Financial**: `debts` (+`simulate`), `payoff_plans`, `insurance_policies`, `portfolios` (+`rebalance`, `prices`), `investments`, `goals`, `dividend_sips` (+`suggest`), `journey` (+`progress`, `net_worth`), `net_worth_snapshots`, `recurring_expenses` (+`calendar`)
- **Tracking**: `transactions` (+`monthly_totals`, `bulk_create`), `budgets` (+`overview`), `budget_categories` (+`seed`), `dashboard` (+`projection`), `reports/*`
- **Collaboration**: `households` (+`members`, `invite`, `dashboard`), `trips` + nested membership/expenses/settlements
- **AI chat**: `conversations` + nested `messages`
- **Misc**: `ai_settings`, `notifications` (+`mark_all_read`), `push_subscriptions` (+`vapid_public_key`), `api_credentials`, `onboarding/*`, `exports/*`
- **Ops**: `GET /up`, `/sidekiq`

## Auth & Security

- `Api::BaseController` includes `BetterAuthVerification` — every request resolves the session token through the shared Better-Auth service (`BETTER_AUTH_VERIFY_URL`, default `http://localhost:4000/api/auth/verify`), `BETTER_AUTH_APP_ID=sampada`, 300s cache.
- Authorization is per-resource via Pundit policies. Rate limiting via Rack::Attack. Sensitive columns encrypted with Active Record `encrypts` (keys via env — not Rails credentials).
- Frontend headers (CSP, HSTS, XFO, nosniff) served via `frontend/public/_headers` on Cloudflare Pages. Known gap: edge→origin HTTPS (see `SAMPADA_UAT_TRACKER.md` SEC-03).

## Configuration

Key environment variables (full set in `.env.example`): Auth (`BETTER_AUTH_*`), encryption (`ACTIVE_RECORD_ENCRYPTION_*`), DB/Redis (`DATABASE_URL`/`DB_HOST`/`DB_PORT`/`POSTGRES_USER`/`POSTGRES_DB`, `REDIS_HOST`), server (`PORT=3002`, `RAILS_MAX_THREADS`, `WEB_CONCURRENCY`), CORS (`CORS_ORIGINS`), backup (`DATABASE_BACKUP_ENABLED`), market data (`SECURITIES_PROVIDER`, `EXCHANGE_RATE_PROVIDER`, both `yahoo_finance`), AI + SMTP settings. Google/GitHub OAuth keys (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) exist as placeholders only — OAuth is not provisioned.

## Deployment (oradb)

- `docker-compose.yml` runs `app` + `sidekiq`, **both `network_mode: host`** — required to reach PG/Redis/Better-Auth on the shared VM (defaults `DB_HOST`/`REDIS_HOST` → `10.0.1.46`).
- Secrets via sops (`secrets.enc.env`, `.sops.yaml`), decrypted into `.env` by `deploy.sh`.
- Dockerfile uses **jemalloc** (`LD_PRELOAD` + `MALLOC_CONF`) for all Ruby processes.
- Memory baseline: app ~23 MiB, sidekiq ~78 MiB (1 GB VM).
- Frontend deploys separately to Cloudflare Pages (`sampada.pages.dev`, `wrangler.toml`), API set via `VITE_API_URL`.
- See `docs/DEPLOYMENT.md` for the full runbook.