# Changelog

All notable changes to Sampada are documented in this file.

## [Unreleased]

### Added
- **Phase 1 foundation — feature flags** (#53): `FeatureFlags` module (`app/lib/feature_flags.rb`) over the per-user `Setting` model — kill switches for `pdf_import`, `recurring_detection`, `passkeys` (enabled unless `<key>_enabled` is `'off'`). API: `GET /api/v1/feature_flags`, `PATCH /api/v1/feature_flags/:key` (unknown key → 404). Frontend gate helper `frontend/src/lib/flags.js` (fetch + localStorage cache so gates evaluate offline).
- **PWA offline, phase 1** (#54/#55): service worker upgraded to `sampada-v2` — `/api/*` network-first with a 3s timeout and cached fallback (only 2xx cached), `/assets/` + `/fonts/` cache-first, navigation network-first → cache → app shell; broken `/offline.html` fallback removed. Offline mutation queue (`frontend/src/lib/offlineQueue.js`, IndexedDB) enqueues mutating calls that fail while offline and replays them oldest-first on the `online` event with `credentials: 'include'` and a per-entry `Idempotency-Key`; the offline banner shows the queued count. Backend `IdempotencyKeyReplay` middleware (`app/middleware/`, inserted before `ActionDispatch::Executor`) replays `/api/v1/*` POST responses for 24h via Redis and fails open on Redis errors.
- **Rebalance v2** (#27): buy-only contribution engine — target modes (equal/current/invested/per-stock weight), guard rails (max position 10%, max sector 25%, 30% sleeve-pool cap, ₹500 min order, max 8 orders, per-stock pause), opt-in dip boost with conviction/trend checks, whole-share buying with leftover-cash sweep, fee reserve, explainable reason chip on every row. Plus: CSV import with preview/validation, holdings drawer with full CRUD, sector view, one-click "compare with v1" toggle, concentration (top-1/top-5/HHI) + drift metrics. Golden engine tests (10/10) + unit tests (7/7).
- **UI modernization** (#27): design tokens (`tokens.css`, AA contrast), self-hosted variable fonts, motion foundation (LazyMotion/Reveal/PageTransition), primitive component library + dev-only `/styleguide`, responsive app shell (sidebar ≥1024px, bottom nav below), themed Recharts palette, landing page rebuild, lazy hardware-gated Three.js hero (250 KB separate chunk), CI quality gates (Lighthouse CI, size-limit, axe, visual smoke).
- **Mount smoke test** (#30): Playwright assertion that `#root` mounts, renders the landing h1, and stays populated through lazy-chunk settle with zero pageerrors — hard-gated in CI so a render crash fails the build.

### Changed
- Frontend deps (dependabot #26): React 19.2, Vite 8, React Router 7, Recharts 3, three/R3F, motion 14, lucide-react 1.65.
- Backend deps (dependabot #25, #19–#22): rack 3.2.8 (GHSA-5v64-555j-wjxm), redis 6, webpush 1.1, simplecov 1.3.2, bundler group.
- Refactors: `ScopedCrud` concern (goals/portfolios/budgets), `useResource`/`useFormModal` hooks, shared `fmtINR` formatters, zero oxlint warnings + no-undef guard, CI on pull requests (Node 24 / actions v7).

### Fixed
- **Landing white-page crash** (#28/#29): `FeatureCard` called `React.lazy()` during render with promises resolving to the icon itself (no `.default`) → React threw "Element type is invalid" and unmounted the tree. Replaced with a static lucide icon map.
- Sign-out force-clears `__Secure-*` better-auth cookies and sends a JSON body so the session actually clears; landing never auto-redirects after auth.
- `useModalForm` refactor regressions; 10 RuboCop offenses on `recurring_expense`; smoke test authenticates via Better-Auth (removed Rails login route).

### Security
- Explicit ActiveRecord encryption keys stored in sops (were derived from `SECRET_KEY_BASE`).
- Rails 8.1.4 + Ruby 3.3.13 base; `source-map-js` 1.2.2 (npm audit high); frontend lockfile refresh.

## [2.6.0] - 2026-09-25

### Added
- **Recurring auto-log**: recurring expenses write their transaction on the due date — unique index + idempotent `ExpenseReminderJob#log_due_transaction!`.
- **Net-worth overview**: dashboard snapshot exposes `total_assets`/`total_liabilities`; hero shows net worth with stage + debt-free target; downloadable SVG snapshot.
- **Budget health strip** via `GET /api/v1/budgets/overview`.
- Shared `ThemeToggle` on landing + auth shell; coral-S brand mark, paper theme, head meta.
- SEO: `robots.txt` + sitemap (landing only, app disallowed).

### Changed
- Auth/API hosts: oradb primary with `api.vayalabs.in` fallback; CSP `connect-src` updated; smoke test hits the canonical domain.
- Docs: canonical `*.vayalabs.in` domains, stale MASTER_SPEC/IMPLEMENTATION_PLAN archived, `CONTEXT.md` session history.

### Fixed
- DPDP: consent withdrawal actually works, dead credential columns dropped, signup honeypot, legal pages (privacy/terms) restored.
- Deploy: `deploy.sh` migrates after converge (was running the old image's migrations and skipping new ones).
- Recurring expense JSON (`monthly_amount`, `next_due_days`).

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
