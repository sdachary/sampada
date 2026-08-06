# Sampada

> Auto-loaded by OpenCode at session start. Last updated: 2026-06-20

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Ruby | 3.3 |
| Framework | Rails | 7.2 |
| Database | PostgreSQL | 16 |
| Deploy | Oracle Cloud Mumbai / Hostinger India | — |
| Auth | Better-Auth (email + Google/GitHub social) | — |

---

## Architecture

Personal finance & expense management SaaS. Multi-tenant, email/password + Google OAuth + GitHub OAuth auth, DPDP-compliant India hosting. Uses Rails 7.2 API + views pattern with Sidekiq for async jobs (backups, deletion workflows). Includes Trip Expense Mode for group trip tracking, and extensive DPDP compliance infrastructure (consent_records, erasure with Sheet backup, DPO page). Fully Docker-deployable to India-based VMs — zero external SaaS dependencies post-migration.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | India-only (Oracle/Hostinger) | DPDP Act data localization requirement |
| Auth | Email/password + Google OAuth + GitHub OAuth | Full auth chain for testing before OAuth creds |
| Pricing | Free forever | Non-profit personal finance tool |
| Consent | Opt-in per feature | DPDP Act §6 — explicit consent for each purpose |
| DPDP | Full compliance (Phase 14-15) | Finance data is MEDIUM risk; complete consent/erasure/DPO |
| Database | Self-hosted PG 16 | No Supabase/RDS; full control for DPDP |
| Job queue | Sidekiq + Redis | Async backups, deletion processing |

---

## Data Model

| Entity | Key Fields | PII? | Retention |
|--------|-----------|------|-----------|
| User | email, name, google_uid | Yes | Until erasure request |
| ConsentRecord | user_id, purpose, granted_at | Yes | Duration of service |
| Transaction | amount, category, date | No | Until erasure |
| Trip | name, destination, dates | No | Until erasure |
| TripExpense | amount, paid_by, split_type | No | Until erasure |
| DeletionRequest | user_id, status, scheduled_at | Yes | Deleted after processing |
| Debt | amount, creditor, interest_rate | No | Until erasure |
| Investment | ticker, shares, cost_basis | No | Until erasure |

---

## External Dependencies

| Service | Purpose | Data Shared | DPDP Status |
|---------|---------|-------------|-------------|
| Google OAuth | Authentication | email, name, google_uid | Compliant (opt-in) |
| GitHub OAuth | Authentication | email, name, github_uid | Compliant (opt-in) |
| PostgreSQL 16 | Primary database | All user data | Self-hosted India |
| Redis | Sidekiq queue, cache | Job metadata | Self-hosted India |
| Google Sheets API | Weekly backup export | User's financial data | Compliant (user-owned) |

---

## Security

| Measure | Status |
|---------|--------|
| CSP headers | Configured |
| Rate limiting | Rack::Attack |
| Audit logging | Consent records only |
| Encryption at rest | PG data at rest (filesystem) |
| Encryption in transit | TLS via Nginx/Cloudflare |
| RLS/Permissions | Pundit policies per resource |
| DPDP compliance phase | Phase 14-15 complete |

---

## Session History

Significant decisions and changes from past sessions:

- **2026-06-20 (Part 2)**: Phases 15 (Docker/India deployment), 16 (Trip Mode) complete.
- **2026-06-20**: Phases 14 (Auth overhaul — Google OAuth, SessionsController, DPDPController), 5 migrations, 4 Sidekiq jobs. Sampada committed.
- **2026-06-12**: DPDP compliance overhaul — US Supabase/Render dropped for India hosting. Consent, erasure, DPO, Sheet backup added.
