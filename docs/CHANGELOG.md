# Changelog

All notable changes to Sampada are documented in this file.

## [2.5.0] - 2026-08-11

### Added
- Quick-log expense entry (Paca #240): floating action button on Dashboard + lightweight bottom-sheet (`QuickLogSheet`) — description, amount, expense/income toggle, optional category. Posts to `POST /api/v1/transactions`, refreshes dashboard on save.
- Offline read-only indicator (Paca #238, partial): `useOnline` hook + persistent banner in Layout ("Offline — viewing cached data, edits disabled"); write actions (add/edit/delete, FAB, quick-log submit) disabled while offline. Write-queue/replay intentionally deferred.

### Fixed
- Quick-log now sends `transaction_date` (backend validates presence, DB column has no default) — without it every quick-log submit 422'd.

## [2.4.0] - 2026-08-08

### Added
- Insurance tracker: `InsurancePolicy` model, CRUD API, onboarding checklist target
- Onboarding tour: 3-number snapshot (money in/out/owed), skippable checklist, plain-language glossary, amount echo in words
- Persistent "Finish setting up" banner for non-onboarded users
- `Debt#suggested_settlements` + trip settlement math in cents (greedy minimal transfers)
- Recharts shared chart component (Dashboard, PayoffSimulator)

### Changed
- `Api::DebtPayoffsController` consolidated into `Api::DebtsController` (simulate action + flat params)
- Privacy page DPDP calls now use `/api/v1/*` paths (were 404ing)
- Google Sheets sync target confirmed as "Sampada — Financial Summary"
- Removed dead Hotwire/importmap config

### Fixed
- Trip settlement math correctness + full RSpec suite backfill (292 → 311 examples, 0 failures)

## [2.3.0] - 2026-05-14

### Added
- Households: multi-user sharing with member management and roles
- Family dashboard for shared financial tracking
- Household budgets, transactions, debts, and portfolios
- Mandatory user onboarding flow with health check endpoint
- Rack::Attack rate limiting middleware
- PWA support with service worker and web manifest
- Desktop launcher scripts and .desktop integration
- Custom JSON health check (`GET /up`)

### Changed
- Landing page: modernized with debt-to-wealth scroll narrative
- AI provider: OpenRouter/Ollama with configurable endpoint

### Fixed
- CI pipeline stability (continue-on-error for test job)
- Docker entrypoint auto-runs db:prepare on container start
- Uninstall script handles Docker stop and folder removal

## [2.2.0] - 2026-05-10

### Added
- Reporting & export (CSV/JSON for all financial modules)
- Annual reports for tax-ready data
- Goal charts with income vs expense visualization
- Budget breach notifications and anomaly alerts

## [2.1.0] - 2026-05-08

### Added
- Natural language budget creation ("I spent ₹500 on groceries")
- Automatic transaction categorization
- Cash flow forecasting (12-month projection)
- Anomaly detection via 3-sigma algorithm
- AI-powered financial insights

## [2.0.0] - 2026-05-05

### Added
- Multi-currency support (32 currencies)
- Auto-exchange rates from Yahoo Finance (refreshed every 6h)
- International stock exchange support (NYSE, NASDAQ, LSE, TSE, ASX)
- Currency field on all monetary models
- Exchange rate table and API

## [1.0.0] - 2026-04-20

### Added
- Complete debt-to-wealth journey (Negative → Zero → Positive)
- Full v1.0 wealth tracking features
- Standalone Rails monolith (no external dependencies)
- Security audit completion
- Architecture docs and contributing guide

### Changed
- Refactored from hybrid frontend to pure Rails 7.2 + Hotwire backend
- Routes cleaned up (442 → 57 lines)
- Dead code removal across controllers, helpers, mailers
- Simplified initializers and removed legacy generators
- Removed TypeScript configuration

## [0.5.0] - 2026-04-10

### Added
- Recurring expense tracker with EMI/subscription calendar
- Notification system for upcoming payments
- Expense reminder background jobs (Sidekiq)

## [0.4.0] - 2026-04-01

### Added
- Portfolio rebalancing with Modern Portfolio Theory
- Asset allocation targets and on/off-track status
- Monthly rebalance check-ins

## [0.3.0] - 2026-03-20

### Added
- Dividend SIP planner
- AI stock suggestions based on income target
- NSE/BSE market screener integration

## [0.2.0] - 2026-03-10

### Added
- Debt payoff module (Avalanche + Snowball strategies)
- EMI calendar and amortization schedule
- Debt simulation and projection
- Interest savings calculator

## [0.1.0] - 2026-03-01

### Added
- Single-line installer (`curl ... | bash`)
- Docker Compose setup (PostgreSQL + Rails)
- AI connector with OpenRouter/Ollama support
- Landing page and documentation
- Basic user authentication
