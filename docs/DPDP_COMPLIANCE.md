# Sampada — DPDP Act 2023 Compliance Analysis

> **Deadline**: May 14, 2027 (18 months from Rules notification). Build for sooner — MeitY proposed compressing to 12 months.
> **Penalty**: Up to ₹250 crore per contravention.
> **Sampada status**: Non-profit SaaS, India-only, Google OAuth, self-hosted PG in India.

## Compliance Summary

| # | DPDP Requirement | Sampada Status | What's Needed | Priority | Effort |
|---|-----------------|---------------|---------------|----------|--------|
| D1 | **Privacy notice** — standalone, plain language, at every collection point | ❌ Not done | Publish on `/privacy` and at signup. English + Hindi on demand. Describe categories, purposes, retention, rights, Board complaint channel | 🔴 Critical | 0.5 day |
| D2 | **Granular consent** — free, specific, informed, unconditional, unambiguous (§6) | ⚠️ Decided (opt-in per feature) | Build `consent_records` table. Per-feature toggles (financial_tracking, trip_data, email_updates). No pre-checked boxes. Log grant/revoke with timestamps and consent version | 🔴 Critical | 1 day |
| D3 | **Consent withdrawal** — as easy as giving consent (§6) | ⚠️ Decided | Settings page toggle immediately propagates: stop processing, notify processors, log revocation | 🔴 Critical | 0.5 day |
| D4 | **Consent audit trail** — who, when, what version | ❌ Not done | `consent_records` must store consent version ID, IP, user-agent. Retention: 7 years (Consent Manager rule) | 🔴 Critical | Part of D2 |
| D5 | **Notice in Indian languages** — English + any of 22 scheduled languages on request | ❌ Not done | Offer language selector on privacy notice. Start with English + Hindi. Serve from locale files | 🟡 High | 0.5 day |
| D6 | **Data Processing Agreements (DPAs)** — with every vendor/processor (§8(2)) | ❌ Not done | DPAs with: Oracle/Hostinger (infra), Google (OAuth + Sheets API), SendGrid/SMTP (if email), Docker registries. Restrict sub-processing, mandate breach notification, enforce deletion on termination | 🔴 Critical | 1 day |
| D7 | **Encryption at rest** — personal data encrypted in DB (§8(5)) | ❌ Not done | Enable `pgcrypto` or use Rails `encrypts` for PII columns. Encrypt backups | 🔴 Critical | 1 day |
| D8 | **Encryption in transit** — TLS everywhere (§8(5)) | ⚠️ Partial | Nginx + Let's Encrypt (in Phase 15 plan). Verify HSTS, disable weak ciphers | 🔴 Critical | 0.5 day |
| D9 | **Role-based access control** — minimum privilege (§8(5)) | ❌ Not done | Rails admin roles (user vs admin vs superadmin). No shared credentials. Audit log for all PII access | 🟡 High | 1 day |
| D10 | **MFA for admin access** (§8(5)) | ❌ Not done | Google OAuth already provides 2FA option — enforce for admin accounts. Add TOTP as fallback | 🟡 High | 0.5 day |
| D11 | **Security audit logs** (§8(5)) | ❌ Not done | Log all PII access (read, write, delete). Rails `audited` gem or `paper_trail`. Retain minimum 1 year | 🟡 High | 1 day |
| D12 | **Regular VAPT** — vulnerability assessment (§8(5)) | ❌ Not done | Annual external VAPT on web app + API. Fix findings within SLA (critical: 7 days, high: 30 days) | 🟡 High | Ongoing |
| D13 | **Breach detection** — SIEM/monitoring of personal data stores (§8(6)) | ❌ Not done | Log monitoring on PostgreSQL: failed logins, mass exports, unusual query patterns. Alert within hours | 🔴 Critical | 2 days |
| D14 | **72-hour breach notification** — to Data Protection Board + affected users (§8(6)) | ❌ Not done | Pre-drafted templates. Escalation RACI: developer → DPO → legal. Two-stage: immediate intimation + detailed report within 72h | 🔴 Critical | 1 day |
| D15 | **Retention schedules** — defined per data category (§8(4)) | ❌ Not done | User accounts: active + 90 days after deletion request. Transactions: 7 years (legal). Logs: 1 year. Backups: 90 days. Document in policy | 🟡 High | 0.5 day |
| D16 | **Automated deletion** — delete when purpose accomplished (§8(4)) | ❌ Not done | Cron job: hard-delete users past 90-day window. Purge orphaned trip data. Propagate to backups | 🟡 High | 1 day |
| D17 | **Pre-deletion notification** — 48-hour notice before erasure (Rules) | ⚠️ Decided | Email user 48h before scheduled hard delete with "cancel deletion" link. Part of right to deletion workflow | 🟡 High | 0.5 day |
| D18 | **Data principal rights portal** — self-service access, correction, erasure, grievance (§11-14) | ❌ Not done | Settings page: "Download my data" (CSV/JSON), "Correct my info", "Delete my account", "Raise a grievance". 90-day SLA. Log all requests | 🔴 Critical | 2 days |
| D19 | **Right to access** — user can request all personal data held (§11) | ❌ Not done | Export all user data across tables (accounts, transactions, trips, consent records, activity log). Machine-readable format | 🟡 High | 1 day |
| D20 | **Right to correction** — user can correct inaccurate data (§12) | ❌ Not done | In-app edit for profile fields. Formal correction request for historical transactions with audit trail | 🟡 High | 0.5 day |
| D21 | **Right to erasure (right to be forgotten)** — full deletion (§13) | ✅ Done | Hard-delete workflow: 48h cancel window, DPDP export served in-app via `DpdpController#full_export` during the window, then account anonymized + request closed (SEC-06 dropped the Google Sheet materialization). Must still propagate to any future processors/backups | 🔴 Critical | 1 day |
| D22 | **Grievance redressal** — mechanism to file complaints (§14) | ❌ Not done | Grievance form at `/grievance`. Acknowledge within 24h, resolve within 90 days. Publish annual grievance report | 🟡 High | 1 day |
| D23 | **DPO / Contact person** — for privacy matters | ⚠️ Decided (`dpo@sampada.app`) | Publish DPO contact on website. Train on breach notification and rights handling | 🟡 High | 0.5 day |
| D24 | **Consent Manager integration** — registered interface for consent (§6, Rules) | ❌ Not done | By Nov 2026: integrate with registered Consent Managers. Interoperable, data-blind consent platform | 🟡 Medium | Future |
| D25 | **Cross-border transfer documentation** (§16) | ✅ Compliant | No personal data leaves India. Document this as policy | 🟢 Low | 0.5 day |
| D26 | **Children's data** — parental consent for under-18 (§9) | ✅ N/A | Sampada is a personal finance OS — terms should prohibit under-18. Add age gate at signup | 🟢 Low | 0.5 day |
| D27 | **Employee training** — annual DPDP awareness (§8(1)) | ❌ Not done | If Sampada has employees/contributors, annual training on data protection basics | 🟡 Medium | Ongoing |
| D28 | **Data inventory & flow mapping** — document all personal data, where it lives, how it flows | ❌ Not done | One-time exercise: map every table with PII, every third-party API that touches personal data, every backup location | 🟡 High | 1 day |
| D29 | **Data Protection Board complaint channel** — inform users they can complain to DPB | ❌ Not done | Add to privacy notice: "You may file a complaint with the Data Protection Board of India at [URL/email]" | 🟡 High | 0.5 day |
| D30 | **Annual DPDP audit** — self-assessment or third-party | ❌ Not done | Run compliance checklist annually. Document findings and remediation | 🟡 Medium | Ongoing |

## Priority-Mapped Implementation Plan

### 🔴 Critical (Before Launch / Phase 14-15)
| Item | Phase | Days |
|------|-------|------|
| D1 — Privacy notice | Phase 14 | 0.5 |
| D2 — Granular consent + audit trail | Phase 14 | 1 |
| D3 — Consent withdrawal | Phase 14 | 0.5 |
| D6 — DPAs with vendors | Phase 14 | 1 |
| D7 — Encryption at rest | Phase 14 | 1 |
| D8 — Encryption in transit | Phase 15 | 0.5 |
| D13 — Breach detection | Phase 14 | 2 |
| D14 — Breach notification playbook | Phase 14 | 1 |
| D18 — Rights portal (basic) | Phase 14 | 2 |
| D21 — Right to erasure | Phase 14 | 1 |
| **Total critical** | | **10.5 days** |

### 🟡 High (Before Launch or Shortly After)
| Item | Phase | Days |
|------|-------|------|
| D5 — Multi-language notice | Phase 14 | 0.5 |
| D9 — RBAC + audit log | Phase 14 | 1 |
| D10 — MFA for admin | Phase 14 | 0.5 |
| D11 — Security audit logging | Phase 14 | 1 |
| D12 — VAPT schedule | Phase 14 | 0.5 |
| D15 — Retention schedules | Phase 14 | 0.5 |
| D16 — Automated deletion cron | Phase 14 | 1 |
| D17 — Pre-deletion notification | Phase 14 | 0.5 |
| D19 — Data access export | Phase 14 | 1 |
| D20 — Data correction | Phase 14 | 0.5 |
| D22 — Grievance mechanism | Phase 14 | 1 |
| D23 — DPO contact published | Phase 14 | 0.5 |
| D28 — Data inventory | Phase 14 | 1 |
| D29 — DPB complaint channel | Phase 14 | 0.5 |
| **Total high** | | **9.5 days** |

### 🟢 Low / Future
| Item | Timeline |
|------|----------|
| D24 — Consent Manager integration | By Nov 2026 (when registry opens) |
| D25 — Cross-border policy doc | Phase 15 |
| D26 — Age gate | Phase 14 |
| D27 — Employee training | Ongoing |
| D30 — Annual audit | Post-launch |

## Total DPDP Implementation Effort
- **Critical**: 10.5 days
- **High**: 9.5 days
- **Total**: 20 days (with significant overlap with existing Phase 14 tasks)

## Key Assumptions for Risk Acceptance

For a non-profit personal finance OS at MVP stage, risk acceptance is reasonable for:
- **Consent Manager integration** — Not mandatory until registry opens (Nov 2026)
- **Multi-language notice** — Start with English, add Hindi on request. Full 22-language support can scale later
- **Formal VAPT** — Annual cycle starts post-launch. First run can be in-house using OWASP ZAP
- **SIEM-grade breach detection** — Start with basic PostgreSQL audit logging and alerting, not full SIEM

## References
- DPDP Act 2023, Sections 4-16 (core obligations)
- DPDP Rules 2025 (operational detail)
- Data Protection Board of India — enforcement from 2026
- RingSafe, ConsentOS, TCSA — industry compliance guides (June 2026)
