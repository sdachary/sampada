# Kubera — File Map

> Auto-loaded by OpenCode at session start. Last updated: 2026-06-20

---

## Entry Points

| Purpose | Path |
|---------|------|
| Application boot | `config/application.rb` |
| Rack config | `config.ru` |
| Docker entry | `docker-compose.yml` |
| Gem dependencies | `Gemfile` |

---

## Routes / Pages

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `/` | `app/controllers/pages_controller.rb#dashboard` | Google OAuth | Main dashboard |
| `/login` | `app/controllers/sessions_controller.rb#new` | Public | Login page |
| `/auth/google_oauth2/callback` | `app/controllers/sessions_controller.rb#create` | Public | OAuth callback |
| `/auth/logout` | `app/controllers/sessions_controller.rb#destroy` | Auth | Logout |
| `/account` (DELETE) | `app/controllers/sessions_controller.rb#destroy_account` | Auth | Account deletion |
| `/privacy` | `app/controllers/pages_controller.rb#privacy` | Public | Privacy policy |
| `/dpo` | `app/controllers/pages_controller.rb#dpo` | Public | DPO contact page |
| `/onboarding` | `app/controllers/onboarding_controller.rb` | Auth | First-use setup |
| `/trips/:id` | `app/controllers/trips_controller.rb` | Auth | Trip detail |
| `/conversations/:id` | `app/controllers/conversations_controller.rb` | Auth | AI chat interface |

---

## API Endpoints

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/api/dpdp/consent` | `dpdp#consent` | Auth |
| GET | `/api/dpdp/consent` | `dpdp#consent_status` | Auth |
| POST | `/api/dpdp/erasure` | `dpdp#erasure` | Auth |
| POST | `/api/dpdp/cancel-deletion` | `dpdp#cancel_deletion` | Auth |
| GET | `/api/v1/dashboard` | `api/dashboard#show` | Auth |
| GET | `/api/v1/dashboard/projection` | `api/dashboard#projection` | Auth |
| CRUD | `/api/v1/debts` | `api/debts_controller` | Auth |
| CRUD | `/api/v1/portfolios` | `api/portfolios_controller` | Auth |
| CRUD | `/api/v1/investments` | `api/investments_controller` | Auth |
| CRUD | `/api/v1/dividend_sips` | `api/dividend_sips_controller` | Auth |
| CRUD | `/api/v1/recurring_expenses` | `api/recurring_expenses_controller` | Auth |
| CRUD | `/api/v1/notifications` | `api/notifications_controller` | Auth |
| GET | `/api/v1/journey` | `api/journey#show` | Auth |
| POST | `/api/v1/portfolios/:id/rebalance` | `api/portfolios#rebalance` | Auth |
| POST | `/api/v1/debt_payoffs/:id/simulate` | `api/debt_payoffs#simulate` | Auth |
| GET | `/api/v1/dividend_sips/:id/suggest` | `api/dividend_sips#suggest` | Auth |

---

## Models / Schema

| Entity | File | Key Relationships |
|--------|------|-------------------|
| User | `app/models/user.rb` | has_many: transactions, trips, conversations, consent_records |
| ConsentRecord | `app/models/consent_record.rb` | belongs_to: user |
| Transaction | `app/models/transaction.rb` | belongs_to: user, optionally: trip |
| Trip | `app/models/trip.rb` | has_many: trip_members, trip_expenses, trip_settlements |
| TripMember | `app/models/trip_member.rb` | belongs_to: trip, user |
| TripExpense | `app/models/trip_expense.rb` | belongs_to: trip, paid_by (user) |
| TripSettlement | `app/models/trip_settlement.rb` | belongs_to: trip, from_user, to_user |
| Debt | `app/models/debt.rb` | belongs_to: user |
| DebtPayoff | `app/models/debt_payoff.rb` | has_many: debt_payoff_debts |
| Investment | `app/models/investment.rb` | belongs_to: portfolio |
| Portfolio | `app/models/portfolio.rb` | belongs_to: user |
| DividendSip | `app/models/dividend_sip.rb` | belongs_to: user |
| Conversation | `app/models/conversation.rb` | has_many: messages |
| DeletionRequest | `app/models/deletion_request.rb` | belongs_to: user |
| RecurringExpense | `app/models/recurring_expense.rb` | belongs_to: user |

---

## Configuration

| File | Purpose |
|------|---------|
| `config/routes.rb` | All routes (auth, DPDP, Trip, API v1, Sidekiq) |
| `config/database.yml` | PostgreSQL connection (hosted on India VM) |
| `config/environments/*.rb` | Per-environment settings |
| `app/controllers/api/auth_controller.rb` | Better-Auth (email + Google/GitHub social) proxy + auth API |
| `config/initializers/sidekiq.rb` | Sidekiq Redis connection |

---

## Deployment

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Multi-container deployment (app + PG + Redis) |
| `Dockerfile` | Rails app container image |
| `.dockerignore` | Build context exclusions |
| `docs/DEPLOYMENT.md` | Deployment guide for India VM |

---

## Key Files Quick Reference

| What | Where |
|------|-------|
| Routes | `config/routes.rb` |
| Auth (Google OAuth) | `app/controllers/sessions_controller.rb` |
| DPDP endpoints | `app/controllers/dpdp_controller.rb` |
| Trips controller | `app/controllers/trips_controller.rb` |
| Trip expenses | `app/controllers/trip_expenses_controller.rb` |
| Trip members | `app/controllers/trip_members_controller.rb` |
| Trip settlements | `app/controllers/trip_settlements_controller.rb` |
| Dexter wrapper | `lib/dexter/wrapper.rb` |
| Dexter analysis | `lib/dexter/analysis.rb` |
| Dexter service | `app/services/dexter_research_service.rb` |
| Dexter Sidekiq job | `app/sidekiq/dexter_research_job.rb` |
| Dexter weekly research | `app/sidekiq/weekly_research_job.rb` |
| ResearchAnalysis model | `app/models/research_analysis.rb` |
| Sheet backup job | `app/sidekiq/google_sheet_backup_job.rb` |
| Weekly backup | `app/sidekiq/weekly_backup_job.rb` |
| Deletion processing | `app/sidekiq/process_deletion_job.rb` |
| Check deletions | `app/sidekiq/check_deletions_job.rb` |
| API v1 handlers | `app/controllers/api/` |
| Models | `app/models/` |
| RSpec tests | `spec/` |
| Factory definitions | `spec/factories/` |
| Deployment docs | `docs/DEPLOYMENT.md` |
