# Sampada — Implementation Plan

**Generated from an architecture discovery session grounded in the actual `sdachary/sampada` repository (not assumptions), plus the AcharyaLab infrastructure map. This document is the execution guide for Claude Code / Opencode.**

---

## 1. Executive Summary

Sampada is a Ruby on Rails 7.2 API backend + separate React 19/Vite SPA frontend, currently mid-transition from a hobby/self-hosted "personal finance OS" toward a **hosted, free-forever, multi-user SaaS product**. The codebase is substantially more mature than a typical side project — debt payoff planning, dividend/SIP investing, portfolio tracking, trip expense splitting, DPDP compliance flows, and an AI chat assistant are all real, working features — but it carries real gaps between what the code *appears* to do (per its API contracts) and what it *actually* does. Several headline numbers (net worth, budget usage, debt-free date, annual net-worth change) contain calculation bugs. Several features (portfolio rebalance, journey milestones, AI-triggered actions) are stubs returning placeholder data. This plan sequences fixing those gaps alongside the infrastructure and product decisions made during discovery.

## 2. Vision

Sampada is a **free-forever, hosted personal finance web app** for signed-up users (not a self-hosted tool). It follows a "debt-first" philosophy (negative → zero → positive) and is built and operated by one person/small team on modest, cost-conscious infrastructure shared with several other independent products (Bepara, Sadhan, Chitragupta, etc.) under the same operator. AI features require the user's own API key (BYOK) so the product never carries AI cost. The product must remain approachable for non-technical users, particularly around privacy/DPDP controls.

## 3. Repository Analysis (Summary)

- **Stack:** Rails 7.2 API-only backend (Postgres 16, Redis, Sidekiq) + React 19/Vite SPA (deployed on Cloudflare Pages, confirmed live).
- **Strengths:** clean service-object architecture (`app/services/`), config-driven AI provider abstraction, pluggable market-data adapters (Yahoo Finance/Alpha Vantage), token-based session auth, unusually mature DPDP compliance scaffolding (consent, erasure, grievance models with granular per-feature consent already supported).
- **Weaknesses found during discovery:** stale README (still describes Hotwire as the frontend), no frontend CI, a broken `validate-installer` CI job, `CORS_ORIGINS=*` default, gitleaks set to `continue-on-error`, zero test coverage on Trip mode/auth/households, and — most significantly — a cluster of "looks complete, isn't" bugs across the wealth-building, budgeting, and household features (see §17 for the full list, discovered via direct code reading, not assumption).
- **Real infrastructure (from the AcharyaLab map, not guessed):** Sampada runs on a 1GB VM (`oradb`) alongside a shared Postgres instance (7 schemas across multiple products), shared Redis, a shared **Better-Auth** identity service, Nginx, PostgREST, Mail-Relay, two other apps' backends (Bepara, Sadhan), and two monitoring tools (Headroom, Uptime Kuma). A second 1GB VM (`oradev`) hosts an AI/agent tier (MCP Hub, Paca, NIM Proxy, Minio, etc.). The earlier assumption of a generous "Oracle Free Tier 24GB" was wrong — the real constraint is VM co-tenancy across ~10+ services, not Sampada's own memory footprint.

## 4. Analysis of Attached/Referenced Documents

No separate planning documents were actually attached to the original session (the one uploaded file was the session's own instructions). In their place, this plan validates against: the repo's own `DESIGN.md` / `frontend/DESIGN-PLAN.md` (UI design tokens — still valid, no conflicts found), `docs/roadmap-updated.md` (broadly still valid; pluggable market-data-provider and PWA-readiness items are already partially built), and the AcharyaLab infrastructure map (`aham.pages.dev/manacitra`), which was the single most decision-changing input in the whole session — it corrected several assumptions made before it was available (VM capacity, existing shared auth service, real co-tenancy).

**Important scope note on two later-uploaded documents:** `SAMPADA_PORTAL_IMPLEMENTATION_BRIEF.md` and `SAMPADA_PORTAL_ROADMAP_AND_SPEC.md` were also provided during this engagement. Both describe **"Sampada Portal" — an explicitly separate, ground-up rewrite** (TypeScript/Hono/Cloudflare Workers, no Rails, user-owned Google Sheets as the data store instead of a central database, zero-knowledge credential vault). That architecture is **not** adopted here and is **explicitly out of scope for this plan** — it was evaluated and consciously not pursued in favor of continuing with the existing Rails codebase. The **one idea deliberately carried over** from those documents is the onboarding/guided-tour UX pattern (3-number snapshot, skippable checklist, plain-language glossary, "echoed back in words" confirmation) — a portable copy/UX design, adapted into §9.9a below for the existing Rails + React Sampada, with no dependency on the Portal's Workers/Sheets architecture. Anyone implementing this plan should treat the Portal documents as **UX reference only**, not as an architecture to build toward.

## 5. Consolidated Decisions

| # | Decision |
|---|---|
| 1 | Hosted SaaS only. No self-host distribution. |
| 2 | Data isolation: one shared database, rows scoped by `user_id`/`household_id`. `Tenant.db_url` (physical per-tenant DB switching) demoted to unused/future-optional, not a core dependency. |
| 3 | Self-host installer scripts removed entirely (`installer/`, `kubera-start.sh`, `kubera-stop.sh`, `kubera.desktop`, `uninstall.sh`), along with the `validate-installer` CI job. |
| 4 | Database backups: high priority, sequenced early. |
| 5 | AI: BYOK required. Core product (manual entry, budgets, debts, portfolios, dashboards) works with zero AI key configured. |
| 6 | Monetization: free forever. No freemium, no `plan` column, no billing integration, ever. |
| 7 | Infra target: dozens–low hundreds of users on existing 1GB VMs; no premature horizontal scaling. |
| 8 | Hotwire fully removed. Rails views limited to ActionMailer templates only. |
| 9 | Auth: migrate to the shared Better-Auth service via JWT verification (signature + expiry + `app == "sampada"` claim check). 15-minute tokens with silent refresh; no revocation blocklist for v1. Removes `bcrypt`, `argon2`, `omniauth*` gems and the `Session` model. |
| 10 | Frontend: confirmed already live on Cloudflare Pages; no migration needed. |
| 11 | Blueprint scope: Sampada's own repository only (`app/`, `frontend/`, Gemfile, Docker setup). Better-Auth's own codebase, and other AcharyaLab products, are out of scope. |
| 12 | Backend language: stay on Ruby/Rails. Measure real memory after the Better-Auth migration + jemalloc/gem-trimming before revisiting Go/Rust with actual data. |
| 13 | Encryption: "private" per-entry toggle (Option B) — excludes a note from AI processing, still encrypted at rest, still recoverable via normal password reset. No true end-to-end/zero-knowledge encryption. |
| 14 | Trip mode: add "simplify debts" minimum-transfer settlement suggestion (greedy algorithm). |
| 15 | Visualizations: adopt Recharts; consolidate the two duplicated hand-rolled SVG chart implementations (Dashboard, PayoffSimulator) into one shared component. |
| 16 | Fix debt-free date discrepancy — unify all consumers around `DebtPayoffService`'s interest-aware simulation. |
| 17 | Fix Portfolio `rebalance` stub and Journey `milestones`/`trajectory` stubs — implement real logic or remove the UI element until they're real. |
| 18 | Rename `Api::DebtPayoffsController` (actually manages `Debt` records) to reflect its true responsibility; `Api::PayoffPlansController` (manages `DebtPayoff` plans) is correctly named as-is. |
| 19 | Dividend "buy/hold" stock recommendations: flag for legal review before wider launch; add a clear disclaimer in the meantime. |
| 20 | Dexter research feature (external `dexter` CLI binary, shelled out via `Open3`, not present in Dockerfile/compose): status unconfirmed, pending operator verification in production (see §16 for the diagnostic commands). |
| 21 | Fix net worth liabilities calculation — use `Debt#remaining_amount` (`amount - paid_amount`), not `Debt#amount`, in both `NetWorthSnapshot.create_snapshot` and any household aggregation. |
| 22 | Fix budget period bug — `Budget#spent_this_month`/`#usage_percentage`/`#on_track?` must respect `weekly`/`quarterly`/`yearly` periods, not just assume monthly. |
| 23 | Fix AI action-triggering — the `[CREATE_TRANSACTION]`/`[CREATE_BUDGET]`/`[CATEGORIZE]` tag-matching in `AiService#ask_with_actions` has no corresponding instruction in the system prompt and likely never fires with a real AI provider. Either wire the system prompt to emit these tags, or remove the dead matching code in favor of the working regex fallback (`Ai::CommandParser`). |
| 24 | Update the AI system prompt — remove the stale "this is a single-user personal finance OS" claim; align the "never give specific stock picks" guardrail with `DividendScreenerService` (ties to decision #19). |
| 25 | Delete the dead, broken `Household#aggregated_net_worth` model method (implicit-return bug drops the liabilities total; unused in practice — `HouseholdDashboardService#aggregated_net_worth` is the correct, live implementation). |
| 26 | Add a scheduled daily `NetWorthSnapshot` job so `AnnualReportService`'s start/end-of-year net-worth-change calculation actually has data to find (currently relies on an exact-date snapshot match with no cron creating one). |
| 27 | Fix DPDP `full_export` — currently silently truncates to 500 transactions / 100 net worth snapshots; needs genuine completeness (real pagination or an explicit "showing most recent N of TOTAL" disclosure) to meet a real right-to-portability standard. |
| 28 | Rename the Google Sheets sync target from "Kubera — Financial Summary" to "Sampada — Financial Summary" (leftover from the pre-rebrand product name). |
| 29 | Add a first-login guided onboarding tour (no such flow exists today — confirmed via code inspection; `User#onboarded` is an unused boolean). Skippable from the start, not forced — a persistent "Finish setting up" banner/nudge instead of a hard gate. |
| 30 | Onboarding content: a 3-number opening snapshot (money in / money out / total owed), rendering Sampada's existing "debt-first: negative → zero → positive" progress view immediately; a skippable checklist (Loans & EMIs, Investments & Portfolio, Insurance, Set a Budget); a plain-language term glossary with example placeholders; numbers echoed back in words before saving. Adapted from the Sampada Portal roadmap document's onboarding design (copy/UX pattern only — not its Cloudflare Workers/Google Sheets architecture, which remains explicitly out of scope for this codebase). |
| 31 | Add a lightweight Insurance tracker (new model) so the onboarding checklist's "Insurance" item has something real to point to — Sampada currently has no insurance-related model at all. |

## 6. Design Principles

1. **Correctness of headline numbers over new features.** Net worth, debt-free date, and budget usage are the numbers users trust most and check most often — fix disagreements between calculation paths before adding anything new.
2. **No feature should look done via its API contract unless it is.** Stubbed endpoints must either be implemented or visibly marked unavailable — never a silent empty success response.
3. **BYOK, always.** No architecture decision should reintroduce a shared AI cost burden on the operator.
4. **Cheapest lever first.** Prefer configuration/consolidation (Better-Auth migration, gem trimming, jemalloc) over rewrites; measure before optimizing further.
5. **Non-technical users are the default persona**, especially for privacy/DPDP controls — no jargon, no unrecoverable-by-design footguns unless explicitly and separately opted into.
6. **One production deployment, not "self-hostable software."** Every design choice should assume Sampada is deployed once, by the operator, for many independent signed-up users.

## 7. Target Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────────────────┐
│  Cloudflare Pages (frontend) │──API──▶│  oradb VM (1GB) — shared AcharyaLab host  │
│  React 19 + Vite SPA         │        │  ├─ Nginx (reverse proxy)                 │
│  + Recharts (new)             │        │  ├─ Postgres 16 (shared, 7 schemas)       │
└─────────────────────────────┘        │  ├─ Redis (shared cache/queue)            │
                                        │  ├─ Better-Auth (shared identity)         │
        Auth handshake (JWT)  ─────────▶│  ├─ Sampada API (Rails 7.2 + Sidekiq)     │
                                        │  ├─ Bepara API / Sadhan Server (other apps)│
                                        │  └─ Headroom / Uptime Kuma (monitoring)   │
                                        └──────────────────────────────────────────┘
```

Sampada's own Rails app becomes a pure API + background-job service: no server-rendered UI beyond ActionMailer templates, no local password/session storage (delegated to Better-Auth), one shared Postgres database scoped by `user_id`/`household_id`.

## 8. Technology Decisions

- **Backend:** Ruby on Rails 7.2 (unchanged) — confirmed via discussion, not revisited until real post-optimization memory data exists.
- **Auth:** Better-Auth (external, shared, out of this repo's scope) + JWT verification inside Sampada.
- **Frontend charts:** Recharts, replacing hand-rolled SVG in Dashboard and PayoffSimulator.
- **Frontend data-fetching (recommended, not yet decided in discussion — flag as open):** consider TanStack Query for Dashboard/Transactions to replace ad hoc `useEffect` fetching.
- **Deployment:** unchanged Docker Compose on the existing `oradb` VM; no managed DB/Redis migration (already shared/multi-app via Postgres schemas).

## 9. Module-by-Module Refactoring Plan

### 9.1 Authentication (`app/models/user.rb`, `app/models/session.rb`, `app/controllers/api/auth_controller.rb`)
- Remove: `bcrypt`, `argon2`, `omniauth`, `omniauth-google-oauth2`, `omniauth-github`, `omniauth-rails_csrf_protection` from `Gemfile`.
- Remove: `Session` model entirely; most of `auth_controller.rb`'s register/login/logout/forgot-password/reset-password actions (now handled by Better-Auth, called directly from the frontend).
- Add: `better_auth_user_id` column on `User`, replacing `password_digest` as the identity anchor.
- Add: JWT-verification concern in `Api::BaseController` — verify signature → verify not expired → **verify `app == "sampada"` claim** → just-in-time provision a local `User` row on first sighting of a new `better_auth_user_id`.

### 9.2 Debt Payoff (`app/models/debt.rb`, `app/services/debt_payoff_service.rb`, `app/controllers/api/debt_payoffs_controller.rb`, `app/controllers/api/payoff_plans_controller.rb`)
- Rename `Api::DebtPayoffsController` → `Api::DebtsController` (routes updated accordingly); confirm no frontend calls reference the old path without updating.
- Retire or clearly re-label `Debt#months_remaining`/`#debt_free_date` (naive linear calculation) — replace all dashboard/journey/goal-chart consumers with `DebtPayoffService`'s interest-aware simulation output.
- Fix the Hash-equality bug in `DebtPayoffService#calculate_plan` (`debt == debts.find { ... }`) — use index-based or object-identity comparison instead of value equality.

### 9.3 Portfolio & Journey (`app/controllers/api/portfolios_controller.rb`, `app/controllers/api/journey_controller.rb`, `app/services/portfolio_service.rb`)
- Implement real logic for `PortfoliosController#rebalance` (currently `render_success({ optimal_weights: {} })`) using `PortfolioService`, or remove the corresponding frontend UI element until implemented.
- Implement real `milestones` and `trajectory`/`net_worth_trajectory` data in `JourneyController#progress`/`#net_worth` (currently hardcoded `[]`), or remove those UI elements meanwhile.
- Make `nw_target` (currently hardcoded `5000000`) user-configurable.
- Either clarify in-app copy that `PortfolioService#optimize` is a simple risk-weighted heuristic (not full Markowitz mean-variance optimization with a covariance matrix), or build the real thing — a larger lift, decide based on priority.

### 9.4 Household (`app/models/household.rb`, `app/services/household_dashboard_service.rb`)
- Delete `Household#aggregated_net_worth` (dead, broken duplicate — implicit-return bug drops liabilities). Confirm no callers before removal (none found during discovery).
- Fix `NetWorthSnapshot.create_snapshot` and any household-level aggregation to use `Debt#remaining_amount`, not `Debt#amount`.

### 9.5 Budgets (`app/models/budget.rb`)
- Rework `spent_this_month`/`remaining`/`usage_percentage`/`on_track?` to compute against the budget's actual `period` (weekly/monthly/quarterly/yearly), not an assumed calendar month.

### 9.6 AI (`app/services/ai_service.rb`, `app/services/ai/*`)
- Update `system_prompt`: remove "this is a single-user personal finance OS"; add explicit "never recommend specific securities" alignment with `DividendScreenerService`.
- Decide and implement one of: (a) instruct the system prompt to emit `[CREATE_TRANSACTION]`/`[CREATE_BUDGET]`/`[CATEGORIZE]` tags so `ask_with_actions` actually fires with a real AI provider, or (b) remove the dead tag-matching code and rely solely on the working `Ai::CommandParser` regex fallback.
- `DividendScreenerService`: add a disclaimer to its output; hold "buy"/"hold" language pending legal review (§5, decision 19).

### 9.7 Trip Mode (`app/models/trip.rb`)
- Add a `suggested_settlements` computed method (greedy debt-simplification algorithm — see §13 Epic breakdown for detail) alongside the existing `balances`/`budget_vs_actual`.
- Tighten `TripExpense#split_shares` to cents-based integer math for precision, consistent with `money-rails` conventions elsewhere.
- Backfill specs: `spec/models/trip*`, `spec/requests/trip*` (currently zero coverage).

### 9.8 Reports & Notifications (`app/services/annual_report_service.rb`, `app/controllers/dpdp_controller.rb`)
- Add a scheduled daily `NetWorthSnapshot` creation job (Sidekiq-Cron), so `AnnualReportService`'s exact-date snapshot lookups actually have data.
- Remove the unused `transactions` local variable in `AnnualReportService#full_summary`.
- Fix `DpdpController#full_export` — replace the hard 500/100 truncation with genuine completeness (pagination or an explicit disclosure of what's included).
- Move `app/controllers/dpdp_controller.rb` into the `Api::` namespace/folder for consistency with every other controller (it already inherits `Api::BaseController` but lives outside `app/controllers/api/`).

### 9.9 Frontend (`frontend/src/pages/*`)
- Build one shared chart component (Recharts-based) consumed by Dashboard's net-worth trend, the 60-month projection, and PayoffSimulator's debt comparison, replacing the two independent hand-rolled SVG implementations.
- Build the "Privacy & Your Data" page per the full spec in §14.
- Remove any leftover Hotwire-era frontend artifacts if present (confirm none exist given the SPA is fully separate).

### 9.9a Onboarding Tour + Insurance Tracker (new)
- **New model:** `InsurancePolicy` (`belongs_to :user`, inherits `TenantRecord` for consistency with other financial models) — fields: `policy_type` (health / term_life / vehicle / other), `provider_name`, `premium_amount`, `premium_frequency` (monthly/quarterly/yearly), `coverage_amount`, `renewal_date`, `notes`. New migration, new `Api::InsurancePoliciesController` (standard CRUD, mirroring the existing `DebtsController`/`PortfoliosController` pattern), new spec coverage from day one (unlike Trip mode, don't repeat the zero-coverage mistake).
- **New frontend page:** `Onboarding.jsx` — 3-number snapshot step (money in / money out / total owed) rendering an immediate progress view using existing `Transaction`/`Debt` data; skippable checklist linking to focused mini-forms for Loans & EMIs (`Debt`), Investments & Portfolio (`Portfolio`/`Investment`), Insurance (`InsurancePolicy`, new), and Budget (`Budget`).
- **Persistent nudge:** a dismissable-but-reappearing "Finish setting up" banner in `Layout.jsx` for users with `onboarded: false`, linking back into whichever checklist items remain incomplete. Never blocks navigation.
- **Plain-language layer:** a single strings/glossary file (e.g. `frontend/src/i18n/en.json`, following the Portal doc's Section 3.4 pattern) mapping technical terms (`interest_rate`, `EMI`, `net worth`, `SIP`, etc.) to plain-language primary labels + example placeholders, referenced by key from onboarding and checklist mini-forms — not a UI rewrite of the whole app, just the onboarding/checklist surfaces for now, with room to extend later.
- **Confirmation pattern:** entered amounts echoed back in words before saving (e.g., "That's ₹2,50,000 — two lakh fifty thousand") on the onboarding snapshot step and the new Insurance mini-form.
- Sets `User#onboarded = true` (field already exists, currently unused) on checklist completion or explicit dismissal.

### 9.10 Rails Views / Hotwire cleanup
- Delete all non-mailer files under `app/views/` and any unused importmap/Stimulus/Turbo entries. Keep only what `ActionMailer` requires.

### 9.11 CI/CD
- Remove the `validate-installer` CI job (paths reference files being deleted anyway).
- Add a frontend CI job: `npm run lint && npm run build` (currently missing entirely).
- Remove `continue-on-error: true` from the gitleaks secret-scanning step — a leaked secret should fail the build.
- Tighten default `CORS_ORIGINS` away from `*`.

## 10. Frontend Roadmap
1. Recharts adoption + shared chart component (replaces duplicated SVG logic).
2. Privacy & Your Data page (full build, see §14).
3. Trip mode: surface `suggested_settlements` in the Trips UI.
4. Onboarding tour (3-number snapshot + skippable checklist + glossary/example-placeholder layer + persistent "Finish setting up" banner) and new Insurance mini-form — see §9.9a.
5. (Open, not yet decided) Consider TanStack Query for Dashboard/Transactions data-fetching.

## 11. Backend Roadmap
1. Better-Auth migration (auth stack removal + JWT verification).
2. Fix cluster: net worth liabilities calc, budget period bug, debt-free date discrepancy.
3. Fix cluster: Portfolio rebalance stub, Journey milestones/trajectory stubs.
4. AI system prompt update + action-triggering fix.
5. Trip mode: simplify-debts algorithm + spec backfill.
6. DPDP full-export completeness + daily net worth snapshot job.
7. Cleanup: delete dead `Household#aggregated_net_worth`, rename controllers, rename Kubera→Sampada spreadsheet, remove unused variables.
8. Memory measurement pass (jemalloc, gem trimming, `docker stats` before/after) — informs the Go/Rust go/no-go decision.
9. New `InsurancePolicy` model + `Api::InsurancePoliciesController` + specs, to back the onboarding checklist's Insurance item.
10. Onboarding snapshot endpoint (aggregates existing `Transaction`/`Debt` data into the "money in / money out / total owed" view) + `User#onboarded` write path.

## 12. API Evolution
No versioning changes are in scope for this plan (still `/api/v1`-equivalent as currently routed). Document the "what happens at v2" policy (header-based vs. new namespace) as a one-paragraph decision in `ARCHITECTURE.md` — a "decide once" item, not urgent.

## 13. Database & Storage Strategy
- No migration off the shared Postgres instance — it already serves multiple AcharyaLab products via separate schemas, which is a reasonable pattern to keep.
- New migration: add `better_auth_user_id` to `User`; drop `password_digest` and related auth columns once the Better-Auth migration is complete and verified.
- New migration: add a `purpose`/granularity check on `ConsentRecord` if not already present (confirmed during discovery that `ConsentRecord::FEATURES` already supports per-feature granularity — verify schema matches before assuming no migration needed).
- Active Storage / market data / exchange rate caching: unchanged.
- New migration: `create_insurance_policies` (`user_id`, `policy_type`, `provider_name`, `premium_amount`, `premium_frequency`, `coverage_amount`, `renewal_date`, `notes`, timestamps) — inherits `TenantRecord` for consistency with `Debt`/`Portfolio`/`Budget`.

## 14. Authentication Strategy (detail)
- **Token type:** JWT issued by Better-Auth, 15-minute expiry.
- **Refresh:** frontend silently re-fetches a fresh token from Better-Auth's `/token` endpoint shortly before expiry.
- **Verification (Sampada side):** local signature verification against Better-Auth's public key (JWKS) — no per-request network call to the auth service. Verify, in order: (1) signature valid, (2) not expired, (3) `app` claim equals `"sampada"` (prevents a token issued for Bepara/Sadhan/etc. from being replayed against Sampada's API).
- **Revocation:** bounded to token lifetime (≤15 minutes) for v1; no blocklist. Revisit if an incident-response scenario later demands instant kill-switch capability.
- **Identity linkage:** Sampada's own `User` row keyed by `better_auth_user_id`, created just-in-time on first sighting of a new authenticated request.

## 15. Deployment Strategy
No topology change — Sampada continues to run via Docker Compose on the `oradb` VM alongside its existing neighbors. The hardcoded IP (`10.0.1.46`) and `network_mode: host` in `docker-compose.yml`, previously flagged as a possible bug, are confirmed intentional production configuration for this specific deployment, not a self-host generic-ness bug (there is no self-host use case anymore per decision #1).

## 16. Infrastructure Strategy
1. Complete the Better-Auth migration (removes `bcrypt`/`argon2`/`omniauth*` gem weight from every Sampada process).
2. Apply jemalloc as Ruby's memory allocator (Dockerfile change, no app code changes).
3. Lazy-load infrequently-used gems (e.g., `google-apis-sheets_v4`/`googleauth`) so they don't sit in every process's baseline memory.
4. **Measure real memory** with `docker stats` and/or `docker exec <container> ps aux --sort=-rss` before and after steps 1–3.
5. Only after real numbers exist, revisit whether a narrow Rust/Go sidecar for one specific hot path is warranted — not a full rewrite.
6. **Operator diagnostic — Dexter research status (decision #20, unresolved):** run, in order of speed:
   ```bash
   docker exec <sampada_container> which dexter
   docker logs <sampada_container> 2>&1 | grep "\[Dexter\]"
   docker exec -it <sampada_container> rails runner \
     'ResearchAnalysis.order(researched_at: :desc).limit(5).pluck(:ticker, :status, :error_message)'
   ```
   If confirmed broken: either install/ship the `dexter` binary in the Dockerfile, or remove the feature (job, service, wrapper, controller actions) until it can be properly supported.

## 17. Security Improvements
- Fix `CORS_ORIGINS=*` default → restrictive, domain-derived default.
- Remove `continue-on-error: true` from gitleaks CI step.
- JWT `app` claim check (see §14) to prevent cross-app token replay.
- Legal review of `DividendScreenerService`'s "buy"/"hold" language (decision #19) before wider launch.
- DPDP full-export completeness (decision #27) — a compliance issue as much as a security one.

## 18. Performance Improvements
- Memory: jemalloc, gem trimming, Better-Auth migration (removes duplicate auth-processing weight) — see §16.
- No server-side performance work is indicated beyond memory; network-bound calls (Yahoo Finance, AI provider) are the actual latency drivers and aren't fixed by backend optimization.

## 19. Accessibility Plan
Not deeply explored during this session — flagged as an open item. Recommended minimum: confirm ARIA labeling survives the Recharts migration (existing hand-rolled SVG charts do have `aria-label`s; verify Recharts output preserves equivalent screen-reader support), and audit the `.fin`/tabular-nums currency styling for contrast and screen-reader behavior.

## 20. Testing Strategy
Priority order, based on what's live vs. broken:
1. Trip mode: `spec/models/trip*`, `spec/requests/trip*` (currently zero coverage, real money-splitting logic).
2. Auth: new specs covering JWT verification (signature, expiry, `app` claim rejection) post-Better-Auth migration.
3. Regression specs for every "Fix" item in §5/§9 (net worth, budget period, debt-free date, rebalance, journey milestones) — write the failing spec first, then fix, to lock in the corrected behavior.
4. Frontend: introduce a test runner (none currently exists in `package.json`) — start with the new shared chart component and the Privacy page.

## 21. CI/CD Plan
- Remove `validate-installer` job.
- Add frontend lint+build job.
- Remove gitleaks `continue-on-error`.
- No deploy-automation build-out is in scope for this plan (manual/ops-script deploys to the existing VM continue as-is) unless prioritized separately.

## 22. Documentation Plan
- Correct README: remove Hotwire/self-host framing entirely; describe Sampada as hosted-only, free-forever, BYOK-for-AI.
- Add `ARCHITECTURE.md`: document the Better-Auth integration, the API-versioning policy (§12), and the shared-VM topology (for the operator's own future reference).
- Document the Trip mode feature in the README (currently unmentioned despite being fully built).

## 23. Migration Strategy
Sequenced to minimize risk of a broken production auth path:
1. Build Better-Auth JWT verification alongside the existing `Session`-based auth (dual-running), behind a feature flag or environment toggle.
2. Migrate existing users' credentials/sessions to Better-Auth-issued identities (exact mechanism depends on Better-Auth's own migration tooling — verify before this step).
3. Cut over; monitor; only then remove the old `Session` model and auth gems.
4. All other fixes (§9.2–9.8) can proceed independently and in parallel, as they don't touch the auth path.

## 24. Phased Roadmap

**Phase A — Foundation (do first, blocks/de-risks everything else)**
- Better-Auth migration (auth stack).
- DB backup/restore path.
- CI fixes (frontend lint/build, remove `continue-on-error`, remove `validate-installer`).
- CORS hardening.

**Phase B — Correctness (headline numbers before anything user-facing/new)**
- Net worth liabilities fix.
- Budget period fix.
- Debt-free date unification.
- Portfolio rebalance / Journey milestone-trajectory stubs.
- Dead code removal (`Household#aggregated_net_worth`, unused variable in `AnnualReportService`).
- Daily net worth snapshot job.
- DPDP full-export completeness.

**Phase C — AI & compliance**
- System prompt update.
- AI action-triggering fix.
- Dividend Screener legal review + disclaimer.
- Dexter research status resolution.

**Phase D — Product polish**
- Trip mode simplify-debts + spec backfill.
- Recharts migration + shared chart component.
- Privacy & Your Data page.
- Onboarding tour + Insurance tracker (§9.9a).
- Hotwire cleanup.
- Kubera→Sampada rename (Sheets).
- Controller renaming.

**Phase E — Measurement & revisit**
- Memory measurement post-Phase A.
- Go/Rust decision revisited with real data (not before).

## 25. Epic → Feature → Task Breakdown (representative sample; full breakdown to be expanded during implementation)

**Epic: Identity Migration**
- Feature: JWT verification layer
  - Task: Add JWT-verification concern to `Api::BaseController`
  - Task: Add `app` claim check
  - Task: Add `better_auth_user_id` column + JIT provisioning
- Feature: Auth stack removal
  - Task: Remove `Session` model + migration
  - Task: Remove `bcrypt`/`argon2`/`omniauth*` gems
  - Task: Update `auth_controller.rb` to delegate to Better-Auth

**Epic: Headline Number Correctness**
- Feature: Net worth accuracy
  - Task: Fix `NetWorthSnapshot.create_snapshot` liabilities sum
  - Task: Fix household-level equivalent
  - Task: Regression spec
- Feature: Budget period accuracy
  - Task: Rework `Budget#spent_this_month` to branch on `period`
  - Task: Regression specs for weekly/quarterly/yearly

**Epic: Trip Mode Completion**
- Feature: Settlement suggestions
  - Task: Implement greedy debt-simplification method on `Trip`
  - Task: Expose via `trips#show` response
  - Task: Frontend UI for suggested settlements
- Feature: Test coverage backfill
  - Task: Model specs for balance/settlement math
  - Task: Request specs for all four trip controllers

**Epic: Guided Onboarding**
- Feature: Insurance tracker (new)
  - Task: `InsurancePolicy` model + migration
  - Task: `Api::InsurancePoliciesController` + specs (written alongside, not after)
- Feature: Onboarding tour
  - Task: 3-number snapshot step + progress view
  - Task: Skippable checklist (Debt/Portfolio/Insurance/Budget mini-forms)
  - Task: Plain-language glossary/example-placeholder strings file
  - Task: "Echoed back in words" amount confirmation component
  - Task: Persistent "Finish setting up" banner in `Layout.jsx`

*(Continue this pattern for each Phase B–D item during actual implementation — kept representative here rather than exhaustively enumerated, to keep this document a usable starting point rather than an unreadable wall.)*

## 26. Expected File-Level Changes (representative)

- `Gemfile` — remove `bcrypt`, `argon2`, `omniauth*`; Dockerfile — add jemalloc.
- `app/models/session.rb` — deleted.
- `app/models/user.rb` — remove password columns, add `better_auth_user_id`.
- `app/controllers/api/base_controller.rb` — add JWT verification concern.
- `app/controllers/api/auth_controller.rb` — trimmed to whatever (if anything) Sampada still needs directly.
- `app/controllers/api/debt_payoffs_controller.rb` → renamed.
- `app/controllers/api/portfolios_controller.rb` — `rebalance` implemented.
- `app/controllers/api/journey_controller.rb` — `milestones`/`trajectory` implemented.
- `app/controllers/dpdp_controller.rb` → moved into `app/controllers/api/`, `full_export` reworked.
- `app/models/household.rb` — `aggregated_net_worth` removed.
- `app/models/net_worth_snapshot.rb` — liabilities calc fixed.
- `app/models/budget.rb` — period-aware calculations.
- `app/models/debt.rb`, `app/services/debt_payoff_service.rb` — bug fix + consumers unified.
- `app/models/trip.rb` — settlement-suggestion method added.
- `app/services/ai_service.rb` — system prompt updated, action-triggering resolved.
- `app/services/annual_report_service.rb` — dead variable removed; relies on new snapshot job.
- `config/initializers/sidekiq_schedule.rb` — daily net worth snapshot job added.
- `app/views/**` — non-mailer files deleted.
- `installer/**`, `kubera-start.sh`, `kubera-stop.sh`, `kubera.desktop`, `uninstall.sh` — deleted.
- `.github/workflows/ci.yml` — `validate-installer` removed, frontend job added, gitleaks tightened.
- `frontend/package.json` — Recharts added.
- `frontend/src/pages/Dashboard.jsx`, `PayoffSimulator.jsx` — refactored onto shared chart component.
- `frontend/src/pages/Privacy.jsx` (new) — full page per §14 of the original discussion.
- `app/models/insurance_policy.rb` (new), `db/migrate/*_create_insurance_policies.rb` (new).
- `app/controllers/api/insurance_policies_controller.rb` (new) + `spec/requests/api/insurance_policies_spec.rb` (new).
- `frontend/src/pages/Onboarding.jsx` (new), `frontend/src/i18n/en.json` (new glossary/strings file), `frontend/src/pages/Layout.jsx` (banner added).
- `README.md`, new `ARCHITECTURE.md` — rewritten/added.

## 27. Validation Checklist
- [ ] JWT verification rejects tokens with wrong `app` claim (test with a token minted for a different AcharyaLab product).
- [ ] Net worth for a partially-paid debt matches manual calculation (`amount - paid_amount`, not `amount`).
- [ ] A yearly/weekly/quarterly budget shows correct usage against its actual period, not the calendar month.
- [ ] Dashboard and Payoff Simulator report the same debt-free date for the same debt.
- [ ] Portfolio rebalance returns real weights, not `{}`.
- [ ] Journey milestones/trajectory return real data, not `[]`.
- [ ] DPDP full export contains a user's complete transaction/snapshot history, or explicitly discloses what's included if paginated.
- [ ] Annual report's net-worth-change is non-zero for a user with a full year of activity (once the daily snapshot job has run).
- [ ] Google Sheets sync creates/finds a spreadsheet named "Sampada — Financial Summary."
- [ ] CI fails on a leaked secret (no more `continue-on-error`).
- [ ] CI fails on a broken frontend build.
- [ ] A new user sees the onboarding snapshot/checklist but is never blocked by it — every step is skippable, banner reappears rather than forces.
- [ ] Insurance checklist item successfully creates a real `InsurancePolicy` record.
- [ ] Onboarding amount fields echo back in words before saving, matching the entered value.
- [ ] `User#onboarded` flips to `true` on checklist completion/dismissal and is reflected in the login response.

## 28. Acceptance Criteria
Each Phase A/B item is considered done when its corresponding Validation Checklist item passes AND a regression spec exists preventing recurrence. Phase A (Better-Auth migration) is additionally considered done only after a full dual-running verification period with no authentication regressions reported.

## 29. Future Enhancements (explicitly out of the "do now" scope, captured for later)
- TanStack Query adoption for frontend data-fetching.
- Real Modern Portfolio Theory (covariance-based) optimization, if the current heuristic proves insufficient.
- Bank/statement import (CSV/OFX).
- Recurring-transaction ↔ budget reconciliation loop.
- API versioning policy formalization (write the one-paragraph decision whenever v2 becomes concrete).
- Multi-language (Hindi/regional) i18n, distinct from the existing multi-currency support.

## 30. Out-of-Scope Items
- Any self-hosting distribution path (explicitly decided against).
- Any freemium/billing implementation (explicitly decided against — free forever).
- Full end-to-end/zero-knowledge encryption (explicitly decided against in favor of the per-entry "private" toggle).
- Changes to Better-Auth's own codebase, or to Bepara/Sadhan/other AcharyaLab products.
- A full Go/Rust rewrite (explicitly deferred pending real measurement).

## 31. Open Questions Requiring Future Decisions
1. **Dexter research feature** — confirmed broken, working, or partially working? (Diagnostic commands in §16.)
2. **AI action-triggering direction** — wire up the system prompt to emit tags, or remove the dead code path in favor of the regex fallback? (Both are valid; needs a call once implementation starts.)
3. **API versioning policy** — not urgent, but undocumented; write it down whenever v2 becomes concrete.
4. **TanStack Query adoption** — discussed as a good idea, never formally decided.
5. **Real MPT/covariance-based portfolio optimization** — build it properly, or keep and clearly label the current heuristic?

---

*This plan reflects a full architecture discussion grounded in direct repository inspection (via tarball, not GitHub's blocked web scraping), the AcharyaLab infrastructure map, and iterative decision-making with the project owner. It is intended as a living document — revisit and amend it as implementation surfaces new information, consistent with how this discovery session itself repeatedly corrected earlier assumptions once real data arrived.*
