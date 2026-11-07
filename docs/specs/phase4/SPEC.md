# Phase 4 — Platform (Weeks 21–28) — SPEC PLACEHOLDER

Detailed specs authored at phase kickoff. Scope commitments:

| # | Feature | Model | Notes |
|---|---------|-------|-------|
| 4.1 | Public API v1 (OpenAPI 3.1, OAuth 2.1 + PKCE) | PRO | Extends existing `api_credentials` model. Scopes: read:transactions, write:budgets etc. |
| 4.2 | Webhooks + HMAC delivery logs | PRO | transaction.created / budget.exceeded / bill.due / goal.achieved; exponential-backoff retries + DLQ; replay API. |
| 4.3 | Conversational assistant | PRO | Extends existing conversations/messages + ai_service (already present). Function calling → create budget, set alert. Existing guardrails apply. |
| 4.4 | White-label SDK | B2B (custom pricing) | Builds on existing `tenants` table — note: multi-tenancy scaffolding ALREADY exists in the schema (tenants, tenant_records). Scope = theming + custom domain + billing, not new tenancy. |

Infra delta: ~$100/mo (webhook workers + SDK docs hosting). Revenue per tenant: ₹25–75K/mo.
