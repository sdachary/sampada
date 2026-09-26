# Sampada refactor tasks (audit 2026-09-24)

## P1 — `useResource` hook for CRUD pages
**Files:** `frontend/src/pages/Debts.jsx`, `DebtDetail.jsx`, `PayoffPlans.jsx`, `Portfolios.jsx`, `Investments.jsx`, `Transactions.jsx`
**Action:** All six hand-roll the same `fetch()` + modal + `onSave={() => { setModal(null); fetch() }}` shape. Extract `frontend/src/lib/useResource.js` (list/create/update/remove + modal state) and migrate one page per commit.
**Verify:** `npm run build` + click-through each migrated page.

## P1 — Central currency formatters
**Files:** `Investments.jsx:70`, `Reports.jsx:160`, `Trips.jsx:84,108,126`, `Portfolios.jsx:57` (inline `toLocaleString('en-IN')` + `toFixed` chains)
**Action:** Add `fmtINR`/`fmtPct` next to `inWords` in `frontend/src/lib/amounts.js`; replace inline chains.
**Verify:** `npm run build` + visual check of amounts on those pages.

## P2 — Form-modal boilerplate
**Files:** `DebtFormModal.jsx`, `InsuranceFormModal.jsx`, `InvestmentFormModal.jsx`, `PayoffPlanModal.jsx`, `PortfolioFormModal.jsx`, `TransactionFormModal.jsx` (~5K each, same useState/field/onSave skeleton on top of shared `Modal`/`Field`)
**Action:** Extract a `useModalForm(initial)` hook for state + change handlers; migrate modals one per commit.
**Verify:** `npm run build` + create/edit round-trip per modal.

## P2 — Backend controller audit (not yet verified)
**Action:** Audit `app/controllers/api/v1/` for duplicated index/show/create/update/destroy + scoping chains; propose shared `Api::V1::BaseController` concerns. Research-only first.
**Verify:** `bundle exec rspec` green before and after.
