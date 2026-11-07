# Sampada UI inventory — Step 0 recon

Date: 2026-11-01 · branch `feat/ui-modernization` · HEAD of recon: main+docs only

## Styling approach
- Plain CSS: single global entry `frontend/src/index.css` (307 lines). No Tailwind, no CSS modules,
  no styled-components. Pages use utility classes from `index.css` plus heavy **inline styles**.
- Design tokens already exist as CSS variables (`--paper*`, `--ink*`, `--coral*`, `--line*`,
  `--radius`, `--shadow`) light **and dark** theme (`[data-theme="dark"]`, toggled via `lib/useTheme`).
  ⚠️ `components/Chart.jsx` references `var(--border)` which is **not defined anywhere** (it is
  `--line`) — chart tooltip borders silently don't render.
- Fonts: Google Fonts CDN link in `index.html` (Inter Tight, Inter, Playfair Display — not
  self-hosted, not preloaded).
- Existing primitive-ish components in `src/components/ui/`: `StatCard`, `Field`, `Label`,
  `Modal`, `ConfirmDialog`, `PasswordField`, `Honeypot`.
- Tests: `node --test` on `test/*.test.js` (currently 1 file, 7 passing).

## Router (frontend/src/App.jsx)
`ProtectedRoute` gates a nested `Layout` (app shell) under `/dashboard`. `React.lazy` code
splitting: **none** — every page lands in the single index chunk.

| Route | File | Shared components used | Charts used |
|---|---|---|---|
| `/` | pages/Landing.jsx | — | — |
| `/login` | pages/Login.jsx | AuthLayout | — |
| `/register` | pages/Register.jsx | AuthLayout | — |
| `/forgot-password` | pages/ForgotPassword.jsx | AuthLayout | — |
| `/reset-password` | pages/ResetPassword.jsx | AuthLayout | — |
| `/dashboard` | pages/Dashboard.jsx | Chart, QuickLogSheet | Recharts via `components/Chart.jsx` |
| `/dashboard/onboarding` | pages/Onboarding.jsx | InsuranceFormModal | — |
| `/dashboard/debts` | pages/Debts.jsx | DebtFormModal | — |
| `/dashboard/debts/:id` | pages/DebtDetail.jsx | — | — |
| `/dashboard/payoff-plans` | pages/PayoffPlans.jsx | PayoffPlanModal | — |
| `/dashboard/debt-payoffs` | pages/PayoffSimulator.jsx | Chart | Recharts via Chart wrapper |
| `/dashboard/transactions` | pages/Transactions.jsx | TransactionFormModal | — |
| `/dashboard/budgets` | pages/Budgets.jsx | — | — |
| `/dashboard/recurring` | pages/Recurring.jsx | — | — |
| `/dashboard/portfolios` | pages/Portfolios.jsx | PortfolioFormModal | — |
| `/dashboard/investments` | pages/Investments.jsx | InvestmentFormModal | — |
| `/dashboard/sips` | pages/Sips.jsx | — | — |
| `/dashboard/goals` | pages/Goals.jsx | — | Recharts direct (LineChart, PieChart, Legend, Pie) |
| `/dashboard/journey` | pages/Journey.jsx | — | — |
| `/dashboard/trips` | pages/Trips.jsx | — | — |
| `/dashboard/households` | pages/Households.jsx | — | — |
| `/dashboard/conversations` | pages/Conversations.jsx | — | — |
| `/dashboard/reports` | pages/Reports.jsx | — | — |
| `/dashboard/exports` | pages/Exports.jsx | — | — |
| `/dashboard/settings` | pages/Settings.jsx | components/ui (Modal/Field/ConfirmDialog…) | — |
| `/dashboard/privacy` | pages/Privacy.jsx | — | — |

## Shared components
- `components/` : `Chart` (Recharts Line/Area wrapper — the ONLY chart abstraction),
  `CommandPalette` (⌘K), `QuickLogSheet`, `ThemeToggle`,
  8 form modals (Debt, Investment, Insurance, PayoffPlan, Portfolio, Transaction, + others).
- `components/ui/` : StatCard, Field, Label, Modal, ConfirmDialog, PasswordField, Honeypot.
- App shell: `pages/Layout.jsx` (sidebar 220px + bottom nav <768px + CommandPalette +
  theme toggle + offline banner + onboarding nudge). `pages/AuthLayout.jsx` for auth screens.

## Page sizes (lines)
Settings 331 · Goals 285 · Reports 245 · Trips 237 · DebtDetail 222 · PayoffSimulator 216 ·
Dashboard 205 · Privacy 197 · Landing 180 · Transactions 173 · Layout 339 (shell) — total ~4.3k
lines of page JSX, most of it inline-styled.

## Observations feeding later steps
1. Zero route-level code splitting; one 871 KB (241 KB gzip) JS bundle for every route.
2. Google Fonts fetched on every cold load with no preload → font-driven F/LCP delay.
3. `cookie-banner.js` (public/? see baseline) is the LCP element on landing.
4. Deep utility-class soup in index.css (`.text-13-5-muted-lg`, `.spread-mb16`, …) — dead CSS
   candidates per page during Step 7 migrations.
5. Dark theme exists and must be preserved in the token layer (spec didn't anticipate it — noted
   as a deviation handled in Step 1 via token indirection).
