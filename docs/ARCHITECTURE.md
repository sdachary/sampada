# Sampada Architecture

## Overview

Sampada is a Rails 7.2 application with a Tailwind CSS + Hotwire frontend. It follows a debt-first financial philosophy: **Negative → Zero → Positive**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Rails 7.2 (API + server-rendered views) |
| Database | PostgreSQL (via sqlite3 in dev) |
| Frontend | Tailwind CSS + Stimulus + Turbo |
| Background | Sidekiq (Redis) + Sidekiq-Cron |
| Auth | BCrypt/Argon2 |
| AI | OpenAI-compatible API (OpenRouter, Ollama, Claude) |
| Market Data | Yahoo Finance (free, no API key) |
| Exchange Rates | Yahoo Finance → cached in DB, refreshed every 6h |
| Format Support | CSV, JSON exports |
| Testing | RSpec + FactoryBot + SimpleCov |

## Directory Structure

```
sampada/
├── app/
│   ├── controllers/      # Rails controllers + API::V1 namespace
│   │   └── api/          # v2.0+: exports, reports, households, budgets, transactions
│   ├── javascript/       # Stimulus controllers (chat, stats, clipboard, conversations)
│   ├── jobs/             # ActiveJob base classes
│   ├── mailers/          # ActionMailer classes + notification templates
│   ├── models/           # 20+ ActiveRecord models
│   ├── services/         # Business logic services
│   │   ├── providers/    # Yahoo Finance adapter (v2.0: exchange/currency detection)
│   ├── views/            # ERB templates
│   └── workers/          # Sidekiq workers (v2.0: ImportMarketData, ExchangeRateSync)
├── config/
│   ├── initializers/     # v2.0+: sidekiq_schedule.rb (cron jobs)
│   └── sidekiq.yml       # v2.0+: market_data, maintenance queues
├── db/
│   ├── migrate/          # Squashed + 4 new migrations (v2.0-v2.3)
│   └── schema.rb         # Current database schema
├── lib/                  # Money, AiResponse, Semver, SystemDetector
├── docs/                 # Architecture + roadmap docs
└── spec/                 # RSpec tests (v2.0-v2.3: 17 new spec files)
```

## Models (21 total)

### Core Financial
- `User` — settings, preferences, currency, household memberships
- `Debt` — loans, credit cards, EMIs (v2.0: currency_code)
- `DebtPayoff` — avalanche/snowball strategies
- `InsurancePolicy` — health/term-life/vehicle policies (premium, coverage, renewal)
- `Portfolio` — investment portfolios (v2.0: currency_code)
- `Investment` — individual securities (v2.0: currency_code, exchange, yahoo_symbol)
- `DividendSip` — recurring investment plans
- `RecurringExpense` — regular bills/subscriptions (v2.0: currency_code)
- `Journey` — financial phase tracking (v2.0: currency_code)
- `NetWorthSnapshot` — point-in-time net worth (v2.0: currency_code, currency-aware aggregation)

### v2.0 — Multi-Currency
- `Currency` — 32 currencies with symbols, decimal places, active/inactive
- `ExchangeRate` — cached FX rates with 24h TTL, auto-inversion

### v2.1 — Advanced AI
- `BudgetCategory` — 16 default categories with icons, colors, sorting
- `Transaction` — expense/income/tracking with categories, merchants, recurring flags, anomaly detection
- `Budget` — monthly spending limits per category, usage/on-track tracking

### v2.3 — Collaboration
- `Household` — multi-user groups with shared currency
- `HouseholdMembership` — roles (owner/admin/member/viewer), invite status

### Supporting
- `Conversation`, `Message` — AI chat
- `Setting` — key-value user settings
- `Notification` — in-app notifications

## Key Services

### v0.x — Core Financial
- `DebtPayoffService` — Avalanche/Snowball payoff strategies
- `DividendSipService` — SIP allocation recommendations
- `DividendScreenerService` — v2.0: market-aware screening (IN/US/UK/JP/CA)
- `PortfolioService` — MPT optimization (expected return, volatility, Sharpe ratio)
- `WealthJourneyTracker` — v2.0: currency-aware debt/SIP/net-worth aggregation
- `RecurringExpenseService` — event generation for calendar

### v2.0 — Multi-Currency
- `ExchangeRateService` — fetch, cache, convert; plugs into Yahoo Finance
- `Providers::YahooFinanceAdapter` — v2.0: exchange/currency detection, `EXCHANGE_COUNTRY_MAP`, `CURRENCY_MAP`

### v2.1 — Advanced AI
- `CashFlowForecastService` — 12-month financial projection, runway calculation, health scoring
- `AnomalyDetectionService` — 3-sigma outlier detection, spending surges, budget breaches
- `AiService` — v2.1: NL transaction/budget creation, categorization, anomaly/forecast/export commands

### v2.2 — Reporting
- `ExportService` — CSV/JSON for debts, portfolios, transactions, net worth
- `AnnualReportService` — yearly report with monthly/category/net-worth analysis
- `GoalChartService` — debt-free projection, 30-year wealth growth, budget charts, income vs expenses

### v2.3 — Collaboration
- `HouseholdDashboardService` — aggregated net worth, member finances, shared asset summary

## Background Jobs (v2.0)

| Worker | Schedule | Purpose |
|--------|----------|---------|
| `ImportMarketDataWorker` | Weekdays after market close | Refresh all investment prices and dividends |
| `ExchangeRateSyncWorker` | Every 6 hours | Sync all currency exchange rates via Yahoo Finance |
| `SecurityHealthCheckJob` | Daily 2AM | Detect stale investments, queue imports |
| `SyncCleanerJob` | Every hour | Trigger rate sync if rates are stale |
| `DataCleanerJob` | Daily 3AM | Purge expired associations and exports |

## Data Flow

```
User → Rails Controller → Service Object → Model → PostgreSQL
                                ↕
                        Market Data Provider
                        (Yahoo Finance API — quotes, dividends, FX)
                                ↕
                        Sidekiq Workers
                        (ImportMarketData, ExchangeRateSync, HealthCheck)
```

## API Endpoints

### Core (v0.x)
- `GET/POST/PUT/DELETE /api/debts` — Debt CRUD
- `GET /api/debt_payoffs` — Payoff plan list
- `GET /api/portfolios` — Portfolio list with investments
- `GET/POST/PUT/DELETE /api/investments` — Investment CRUD
- `GET/POST/PUT/DELETE /api/dividend_sips` — SIP CRUD
- `GET /api/journey` — Current financial journey
- `GET /api/net_worth_snapshots` — Net worth history
- `GET/POST/PUT/DELETE /api/recurring_expenses` — Recurring expense CRUD
- `GET/PUT /api/notifications` — Notifications

### v2.0 — Multi-Currency
- Currency and exchange rate data available through all existing endpoints (currency_code, currency_symbol in JSON)

### v2.1 — Advanced AI
- `GET/POST/PUT/DELETE /api/budget_categories` — Category CRUD + seed
- `GET/POST/PUT/DELETE /api/transactions` — Transaction CRUD + monthly_totals
- `GET/POST/PUT/DELETE /api/budgets` — Budget CRUD + overview
- NL commands through AI chat (`/api/conversations/:id/messages`)

### v2.2 — Reporting
- `GET /api/exports/debts|portfolios|transactions|net_worth` — CSV/JSON downloads
- `GET /api/reports/annual|cash_flow_forecast|anomalies|goal_charts` — JSON reports

### v2.3 — Collaboration
- `GET/POST/PUT/DELETE /api/households` — Household CRUD
- `GET /api/households/:id/members` — List members
- `POST /api/households/:id/invite` — Invite user
- `DELETE /api/households/:id/leave` — Leave household
- `GET /api/households/:id/dashboard` — Family dashboard

### v2.4 — Onboarding & Insurance (all under `/api/v1/`)
- `GET/POST/PUT/DELETE /api/v1/insurance_policies` — Insurance policy CRUD
- `GET /api/v1/onboarding/snapshot` — money in/out, total owed, checklist state
- `POST /api/v1/onboarding/complete` — set `User#onboarded`
- `POST /api/v1/debts/:id/simulate` — debt payoff simulation (moved from DebtPayoffsController)
- `GET /api/v1/trips/:id` — includes `suggested_settlements` in cents

## Configuration

Key environment variables (see `.env.example`):
- `SECURITIES_PROVIDER`: Market data backend (default: `yahoo_finance`)
- `EXCHANGE_RATE_PROVIDER`: Exchange rate backend (default: `yahoo_finance`)
- `OPENAI_*`: AI assistant configuration
- `SMTP_*`: Email delivery settings

## Deployment (oradb)

- `docker-compose.yml` runs `app` + `sidekiq`, **both `network_mode: host`**. Sidekiq MUST be host-networked too — otherwise it can't reach PG/Redis at `127.0.0.1` (as `.env` sets) and crash-loops forever.
- `.env` needs `REDIS_HOST=127.0.0.1` — oradb's Redis binds localhost only.
- Dockerfile uses **jemalloc** (`LD_PRELOAD` + `MALLOC_CONF` background_thread/metadata_thp) for all Ruby processes.
- Memory baseline: app ~23 MiB, sidekiq ~78 MiB (1 GB VM, both host-networked).
- Deploy: `git push && ssh oradb "cd /opt/sampada && git pull && docker compose build app && docker compose up -d"`.
