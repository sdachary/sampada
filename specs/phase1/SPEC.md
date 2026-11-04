# Phase 1 — Foundation (Weeks 1–4, ALL FREE)

Goal: ship 4 features that remove the biggest friction (manual data entry) and harden
trust/security (passkeys, offline), without any Pro gating.

## Stack reality (read before implementing)
- Backend: Rails 8.1 API, Postgres, UUID PKs, Sidekiq + sidekiq-cron, Redis, RSpec.
- Auth: bearer session tokens (`sessions` table), `Api::BaseController` handles auth.
- Frontend: Vite 8 + React 19 `frontend/`, design tokens in `src/styles/tokens.css`.
- Shared UI **must** use: `Button`, `Card`, `EmptyState`, `ResponsiveModal` (`components/ui/`).
- Existing models to extend, NOT recreate: `transaction.rb` (has `merchant`, `metadata` jsonb,
  `recurring_expense_id`), `recurring_expense.rb` (has `frequency`, `next_due_date`, `auto_debit`).

## Deliverables
| # | Feature | Free/Pro | Infra delta | Owner docs |
|---|---------|----------|-------------|------------|
| 1.1 | Bank Statement PDF Import | FREE | ~0 (parse CPU only) | `backend/bank-pdf-import.md`, `frontend/bank-pdf-import-ui.md` |
| 1.2 | Recurring Detection from history | FREE | ~0 | `backend/recurring-detection.md`, `frontend/recurring-detection-ui.md` |
| 1.3 | Passkeys (WebAuthn) | FREE | ~0 | `backend/passkeys-auth.md`, `frontend/passkeys-ui.md` |
| 1.4 | PWA Offline-First | FREE | ~0 | `frontend/pwa-setup.md` |

## Build order & dependencies
```
1.4 PWA setup          (no deps, offline shell first so later features work offline)
1.2 Recurring detection (no deps; uses existing transactions)
1.1 Bank PDF import     (no deps, but review UX reuses 1.2 review pattern)
1.3 Passkeys            (no deps)
```
1.1 and 1.2 are independent; 1.1's "detect recurring from import" simply calls the 1.2 service
on the imported rows — implement 1.2 first to avoid a stub.

## Budget & cost
- No new paid services. No API keys needed. Infra cost delta ≈ $0.
- Only new dependencies:
  - Backend: `pdf-reader` (pure Ruby, no native build), `webauthn-ruby`.
  - Frontend: **none** (hand-rolled service worker + `navigator.credentials`).

## Quality gates (unchanged repo gates +)
- Rails: `bundle exec rspec` green, `rubocop` clean for touched files.
- Frontend: build passes, oxlint 0 errors, size-limit < 500 KB, mount smoke test green.
- Feature flags: `feature-bank-pdf-import`, `feature-recurring-detection`, `feature-passkeys`
  (env / Setting rows; kill = hide UI + reject endpoint).
- Every PR: one branch per feature, CI green, squash-merge to main.
