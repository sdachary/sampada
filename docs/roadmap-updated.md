# Sampada Roadmap

**From debt → zero → wealth.** The roadmap follows the same philosophy: debt first, then wealth.

## ✅ Completed

### v0.1 — Foundation (Installer + Docker + AI)
- Single-line installer (`curl ... | bash`)
- Docker Compose setup (PostgreSQL, Rails, Sidekiq)
- AI connector (OpenAI-compatible: OpenRouter, Ollama, Claude)
- First-boot auto-setup (user creation, migrations)

### v0.2 — Debt Payoff Module
- Debt CRUD (loans, credit cards, EMIs)
- Avalanche & Snowball payoff strategies
- Month-by-month payoff schedule simulation
- Debt-free date projection (zero-day target)

### v0.3 — Dividend SIP Planner
- Dividend stock screener (Yahoo Finance integration)
- Weighted scoring (yield 60% / growth 40%)
- SIP allocation recommendations
- AI-assisted stock suggestions

### v0.4 — Portfolio Rebalancing
- Modern Portfolio Theory (expected return, volatility, Sharpe ratio)
- Asset allocation tracking
- Monthly rebalance check-ins (on/off track)
- Pluggable market data providers (Yahoo Finance, Twelve Data, Alpha Vantage)

### v0.5 — Recurring Expense Tracker
- EMI/subscription calendar
- Notification system (Sidekiq workers)
- Recurring expense CRUD
- Monthly expense aggregation

### v1.0 — Security & Standalone Architecture
- Security audit hardening
- No external dependencies (all data stays local)
- BCrypt/Argon2 authentication
- CORS configuration

### Phase 6 — Architecture Refinement
- **Routes cleanup**: 442→57 lines, removed ~75 dead route entries
- **JS modernization**: importmap-compatible Stimulus, removed dead `services/`/`utils/`
- **Mailer views**: ApplicationMailer + 4 notification templates
- **Dead code removal**: 17 stale rake tasks, 12 stale initializers, UI design tokens package
- **Gemfile cleanup**: Sidekiq, Sidekiq-Cron, Rack-CORS
- **Request specs**: Fixed all 5 request specs to hit correct API URLs
- **Initializers**: Simplified CORS, Sidekiq, Auth; removed stale references

### Landing Page (May 2026)
- Scroll-driven amber→sage color transition (OKLCH)
- Liabilities-to-assets narrative
- Curl command CTA (`curl -s https://api.sampada.com/v1/start`)
- Responsive design, mobile hamburger, reduced-motion support

### v2.0 — Multi-Currency & International Markets
- **32 currencies** seeded (INR, USD, EUR, GBP, JPY, AUD, CAD, etc.) with symbols and decimal places
- **Exchange rate engine** — auto-fetched from Yahoo Finance, cached in DB, refreshed every 6 hours
- **CurrencyCode** column on all monetary models (debts, portfolios, investments, recurring expenses, etc.)
- **International exchange support** — NSE, BSE, NYSE, NASDAQ, LSE, TSE, FRA, ASX, HKEX, TSX with Yahoo Finance suffix mapping
- **YahooFinanceAdapter** upgraded — exchange/currency detection, `EXCHANGE_COUNTRY_MAP`, `CURRENCY_MAP`
- **Currency-aware net worth** — snapshots convert all assets/liabilities to user's base currency
- **Dynamic currency symbol** in UI — dashboard, AI responses, all currency displays adapt to user's setting
- **ExchangeRateService** — rate lookup with auto-inversion, caching, Yahoo Finance integration
- **ExchangeRateSyncWorker** — Sidekiq cron every 6 hours
- **Money library** — existing `lib/money.rb` enhanced with exchange support

### v2.1 — Advanced AI Features
- **Budget Category model** — 16 default categories (Food, Transport, Utilities, Rent, etc.) with color coding and icons
- **Transaction model** — expense/income/tracking with categories, merchants, recurring flags
- **Budget model** — monthly spending limits per category, usage tracking, on-track status
- **Natural language transaction creation** — "I spent ₹500 on groceries" auto-creates categorized transactions
- **NL budget creation** — "Set ₹10,000 budget for Food" creates budgets from chat
- **AI spending categorization** — keyword-based auto-tagging for uncategorized transactions
- **CashFlowForecastService** — 12-month projection using recurring + historical averages, financial health scoring
- **AnomalyDetectionService** — 3-sigma outlier detection, spending surge detection (>50% MoM), budget breach alerts
- **AiService integration** — all NL commands, anomaly reports, cash flow summaries from chat

### v2.2 — Reporting & Export
- **ExportService** — CSV and JSON export for debts, portfolios, transactions, net worth snapshots
- **AnnualReportService** — comprehensive yearly report: monthly breakdowns, category analysis, net worth trajectory, savings rate
- **GoalChartService** — debt-free projection curve, 30-year wealth growth (conservative/moderate/aggressive), budget charts, income vs expenses
- **API endpoints** — `GET /api/exports/{debts,portfolios,transactions,net_worth}`, `GET /api/reports/{annual,cash_flow_forecast,anomalies,goal_charts}`
- Custom date-range filtering for transaction exports

### v2.3 — Collaboration & Sharing
- **Household model** — multi-user groups with shared currency and aggregated finances
- **HouseholdMembership** — role-based access (owner/admin/member/viewer), invite status tracking
- **HouseholdDashboardService** — aggregated net worth, per-member financial summaries, shared asset tracking
- **Shared resources** — debts, portfolios, recurring expenses, transactions, budgets can belong to households
- **API endpoints** — CRUD households, invite/remove members, family dashboard
- Household-level aggregated net worth calculation

## 🔜 Upcoming

### v2.4 — Mobile Companion
- PWA with offline support
- Push notifications (EMI reminders, rebalance alerts)
- Quick-log for expenses
- Biometric auth

## 🧠 Philosophy

Every feature must serve the core philosophy: **clear liabilities before building wealth.** Features that undermine this priority won't be merged regardless of technical quality.
