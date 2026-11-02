# Rebalance v2 — Audit (T0)

Generated per `rebalance-v2/REBALANCE_V2_SPEC.md` §10 T0.

## 1. Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Rails 8.1.3.1 (API-only), Ruby 3.3+, PostgreSQL 16 |
| Frontend | React 19 + Vite 8 (SPA), hand-rolled CSS (no Tailwind), `recharts`, `lucide-react` |
| Auth | Better-Auth (session cookies), `useAuth` hook |
| Deployment | Frontend → Cloudflare Pages (`sampada.vayalabs.in`), Backend → Docker on oradb (`sampada:latest`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) — RuboCop, Brakeman, bundle-audit, RSpec, frontend lint/test/build/size/Lighthouse/axe |

## 2. Existing Portfolio / Rebalancing Surface

### Backend
- **Models**
  - `Portfolio` (belongs_to :user, has_many :investments, :dividend_sips)
  - `Investment` (belongs_to :portfolio, fields: `symbol`, `name`, `shares`, `buy_price`, `current_price`, `dividend_yield`, `sector`, `investment_type` [stock|etf|mutual_fund|bond|other], `exchange`, `currency_code`)
- **Services**
  - `PortfolioService` — Modern Portfolio Theory optimizer (expected_return/volatility → weights, Sharpe, efficient frontier). Used by current `/rebalance`.
  - `PriceRefreshJob` — Background quote fetcher (Yahoo Finance via `yahoo_symbol`), cached in Rails.cache (5s timeout/symbol).
- **Controllers**
  - `Api::PortfoliosController`
    - `GET /api/v1/portfolios` — list with nested investments + dividend_sips
    - `POST /api/v1/portfolios/:id/rebalance` — calls `PortfolioService.optimize`, returns `optimal_weights`, `expected_return`, `volatility`, `sharpe_ratio`
    - `GET /api/v1/portfolios/:id/prices` — returns cached LTPs, kicks `PriceRefreshJob`
  - `Api::InvestmentsController` — CRUD for investments (index/create/update/destroy)

### Frontend
- **Pages**
  - `Portfolios.jsx` — list portfolios, show total value/P&L, per-portfolio card with investments, "Refresh Prices" button, Edit/Delete, PortfolioFormModal
  - `Investments.jsx` — flat list of all investments across portfolios, InvestmentFormModal
- **Components**
  - `PortfolioFormModal` — create/edit portfolio (name, goal, risk_tolerance, currency)
  - `InvestmentFormModal` — create/edit investment (portfolio, symbol, type, shares, buy_price, exchange, sector, notes)
- **Data Fetching**
  - `useResource(listPath)` hook — shared CRUD pattern (list, modal, delete, refetch)
  - `api.request(path, opts)` — same-origin fetch via CF Pages Functions proxy (`/api/v1/...`)

### Existing Rebalancing (v1 — MPT)
- Endpoint: `POST /api/v1/portfolios/:id/rebalance`
- Input: portfolio's stock/ETF investments → `expected_return` (from `dividend_yield` or 10%), `volatility` (fixed 20%)
- Output: `optimal_weights[]`, `expected_return`, `volatility`, `sharpe_ratio`, `efficient_frontier`
- **Does not** consider user contribution, dividend/growth split, caps, or whole shares.
- **Spec goal**: Replace this with v2 (buy-only contribution-based) behind a "Compare with v1" toggle.

## 3. Design System & Components (Reusable)

| Primitive | File | Notes |
|-----------|------|-------|
| `Button` | `components/ui/Button.jsx` | primary/secondary/ghost, loading, sizes |
| `Card` | `components/ui/Card.jsx` | interactive hover lift |
| `Stat` | `components/ui/Stat.jsx` | label + value (tabular), count-up, delta |
| `Progress` | `components/ui/Progress.jsx` | 6px bar, accent/success variants |
| `Badge` | `components/ui/Badge.jsx` | neutral/success/warning/danger/accent |
| `Dialog` | `components/ui/Dialog.jsx` | focus trap, Esc close, bottom-sheet mobile |
| `Tabs` | `components/ui/Tabs.jsx` | ARIA tablist, arrow keys |
| `Tooltip` | `components/ui/Tooltip.jsx` | hover + focus |
| `Toast` | `components/ui/Toast.jsx` | module store + `ToastHost`, auto-dismiss |
| `Skeleton` | `components/ui/Skeleton.jsx` | CLS prevention, shimmer |
| `EmptyState` | `components/ui/EmptyState.jsx` | icon + title + action |
| `Input` | `components/ui/Input.jsx` | Input/Select/Textarea/InputField (16px min) |
| `Table` | `components/ui/Table.jsx` | sticky header, numeric columns, hover |
| `PageHeader` | `components/ui/PageHeader.jsx` | display title, serif page num, action right |

Tokens: `tokens.css` (single source, `:root` + `[data-theme="dark"]`), purpose-named (`--accent`, `--muted`, `--border`, etc.) + legacy aliases.

## 4. State Management & Data Flow

- **Server state**: `useResource` → `api.request` → Rails API → JSON
- **Client state**: React `useState`/`useRef`/`useEffect` in page components
- **No global store** (Redux/Zustand/Jotai) — spec says "do not add"
- **Forms**: `useModalForm` hook (InvestmentFormModal, PortfolioFormModal, DebtFormModal, etc.)
- **Persistence**: All settings (per-stock, config) must go to backend (new columns or JSONB on `investments`/`portfolios`)

## 5. Price / LTP Source

- **Primary**: `PriceRefreshJob` (Sidekiq) → Yahoo Finance via `Investment#yahoo_symbol` (appends `.NS`/`.BO`/etc.)
- **Cache**: `Rails.cache` (keyed by portfolio_id), 5s timeout per symbol
- **Frontend**: `GET /api/v1/portfolios/:id/prices` returns cached LTPs; kicks async refresh
- **Fallback**: `Investment.current_price` column (editable in form, stored with "as of" time implicitly)
- **Spec requirement**: LTP editable with stale-price warning; `mom6m`/`trend` optional from same adapter

## 6. Test Setup

| Layer | Runner | Location |
|-------|--------|----------|
| Frontend | `node --test` | `frontend/test/honeypot.test.js` (7 tests), Playwright for Lighthouse/axe/visual |
| Backend | RSpec | `spec/` (models, services, requests, jobs) |
| Engine ref | Node (ESM) | `rebalance-v2/reference/rebalanceEngine.test.mjs` (golden v1/v2 + 300 random invariants) |

## 7. Conflicts / Questions for Owner — **RESOLVED**

| # | Decision | Rationale |
|---|----------|-----------|
| **1** | Keep MPT as `/rebalance_v1` for compare toggle | Spec requires compare toggle with golden metrics |
| **2** | JSONB `rebalance_settings` on `investments` | Single flexible column for target_weight, conviction, paused, trend, mom6m, type |
| **3** | Explicit `instrument_sub_type` enum + heuristic default | User can override; default from dividend_yield > 0 |
| **4** | Free-text + reference `sectors` table | Autocomplete + consistent 25% sector cap |
| **5** | Extend `PriceRefreshJob` for `mom6m`/`trend` | Cache alongside LTP; return via `/prices` |
| **6** | `RebalanceConfig` model + JSONB on investments | Global config in model; per-stock in JSONB |
| **7** | Add all 3 routes: `rebalance_v2`, `rebalance_config`, `import_investments` | Full feature support |
| **8** | Backend preview + apply (`?preview=true`) | Validation before commit |
| **9** | Nested route `/dashboard/portfolios/:id/rebalance` | Portfolio context, consistent with existing patterns |
| **10** | `monthly_contribution` on `RebalanceConfig` | Editable in UI KPI bar |
| **11** | Per-portfolio currency | Engine uses `portfolio.currency_code` for fmtINR |

## 8. Integration Plan Summary

| Spec Task | Integration Point | Notes |
|-----------|------------------|-------|
| **T1 Engine** | `frontend/src/lib/rebalance/` (TypeScript port) | Pure, no UI imports; tests match golden numbers exactly |
| **T2 Data** | Map `Investment` → `HoldingPosition`; persist config/settings | New `RebalanceConfig` model + JSONB on `investments` |
| **T3 Main Screen** | New page `PortfolioRebalance.jsx` under `/dashboard/portfolios/:id/rebalance` | Use primitives: `PageHeader`, `Stat` (KPI), `Progress`, `Card`, `Table`, `Badge`, `Input`, `Select`, `Dialog` (holdings drawer) |
| **T4 v1 Compare** | Toggle calls existing `/rebalance` (v1) + new `/rebalance_v2` | Side-by-side table with golden metrics |
| **T5 Holdings Drawer** | `Dialog` + `Table` + CSV parse (PapaParse or native) | Validation + preview before `POST /import` |
| **T6 Polish** | Memoised recalc (<10ms/200 rows), a11y, states | `useMemo`/`useCallback` for engine; `Reveal` for sections |

## 9. Files to Create / Modify

### New
- `frontend/src/lib/rebalance/` — engine port + tests
- `frontend/src/pages/PortfolioRebalance.jsx` — main screen
- `frontend/src/components/RebalanceTable.jsx` — table/cards + reasons chips
- `frontend/src/components/RebalanceControls.jsx` — KPI bar + config controls
- `frontend/src/components/HoldingsDrawer.jsx` — drawer + CSV import
- `frontend/src/components/BeforeAfterPanel.jsx` — sleeve mix, top-5, drift
- `app/models/rebalance_config.rb` — config persistence
- `app/controllers/api/portfolios_controller.rb` — add `rebalance_v2`, `rebalance_config`, `import_investments`
- `db/migrate/..._add_rebalance_fields_to_investments.rb` — per-stock settings
- `db/migrate/..._create_rebalance_configs.rb` — config table

### Modify
- `frontend/src/App.jsx` — add route
- `frontend/src/pages/Portfolios.jsx` — link to rebalance page
- `frontend/src/lib/api.js` — add new endpoints
- `app/models/investment.rb` — add `investment_sub_type` (Dividend/Growth) or similar

## 10. Next Step

**T0 complete.** Awaiting owner answers on Questions 1–11 above before starting **T1 (Engine port)**.