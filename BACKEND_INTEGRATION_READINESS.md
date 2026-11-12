# Sampada — Backend Integration Readiness Checklist

**Prerequisite:** All UAT gates passed (see `UAT_TESTING_PLAN.md`)

---

## API Contract Verification

### Authentication (`/api/v1/auth/*`)
| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/register` | POST | `{email, password, first_name, last_name}` | `{user, token}` | |
| `/login` | POST | `{email, password}` | `{user, token}` | |
| `/logout` | POST | — | `{success: true}` | |
| `/me` | GET | — | `{user}` | |
| `/profile` | PATCH | `{first_name, last_name, currency}` | `{user}` | |
| `/forgot-password` | POST | `{email}` | `{success: true}` | |
| `/reset-password` | POST | `{token, password, password_confirmation}` | `{success: true}` | |

### Passkeys (`/api/v1/auth/passkeys/*`)
| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/register/options` | GET | — | `{options: PublicKeyCredentialCreationOptions}` | |
| `/register` | POST | `{credential, label}` | `{credential}` | |
| `/auth/options` | GET | `?email=` | `{options: PublicKeyCredentialRequestOptions}` | |
| `/auth/verify` | POST | `{email, credential}` | `{user, token}` | |
| `/` | GET | — | `{credentials: [...]}` | |
| `/:id` | DELETE | — | `{success: true}` | |

### Dashboard (`/api/v1/dashboard*`)
| Endpoint | Method | Response | Status |
|----------|--------|----------|--------|
| `/` | GET | `{net_worth, total_debt, total_investments, monthly_expenses, wealth_score, debt_free_progress_pct, debt_free_date, recent_snapshots[], debt_delta, debt_count, portfolio_count, sip_count, currency_symbol, unread_notifications}` | |
| `/projection` | GET | `{projection: [{month, debt, investments, net_worth}]}` | |

### Transactions (`/api/v1/transactions*`)
| Endpoint | Method | Request/Query | Response | Status |
|----------|--------|---------------|----------|--------|
| `/` | GET | `?transaction_type=&page=&per_page=` | `{transactions: [], pagination}` | |
| `/` | POST | `{description, amount, transaction_type, category_id, date, merchant, recurring, tags}` | `{transaction}` | |
| `/:id` | PATCH | `{...}` | `{transaction}` | |
| `/:id` | DELETE | — | `{success: true}` | |
| `/monthly_totals` | GET | — | `[{month, income, expenses, net, label}]` | |
| `/bulk_create` | POST | `{transactions_csv: string}` | `{imported, errors[]}` | |

### Debts (`/api/v1/debts*`)
| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/` | GET | — | `[{id, name, amount, paid_amount, interest_rate, emi_amount, category, status, due_date, started_at, currency_code, currency_symbol, debt_free_date, months_remaining}]` | |
| `/` | POST | `{name, amount, interest_rate, emi_amount, category, due_date, started_at, currency_code, notes}` | `{debt}` | |
| `/:id` | GET | — | `{debt}` | |
| `/:id` | PATCH | `{...}` | `{debt}` | |
| `/:id` | DELETE | — | `{success: true}` | |

### Budgets (`/api/v1/budgets*`)
| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/overview` | GET | — | `[{id, budget_category_id, category_name, monthly_limit, spent, remaining, usage_pct, on_track, period}]` | |
| `/` | POST | `{budget_category_id, monthly_limit, period, alert_threshold, rollover}` | `{budget}` | |
| `/:id` | PATCH | `{...}` | `{budget}` | |
| `/:id` | DELETE | — | `{success: true}` | |

### Goals (`/api/v1/goals*`)
| Endpoint | Method | Request | Response | Status |
|----------|--------|---------|----------|--------|
| `/` | GET | — | `[{id, name, target_amount, target_year, monthly_sip, top_up_amount, top_up_frequency, allocation, equity_growth, debt_growth, gold_growth, final_corpus, risk_comparison, projection, currency_code}]` | |
| `/` | POST | `{...}` | `{goal}` | |
| `/:id` | PUT | `{...}` | `{goal}` | |
| `/:id` | DELETE | — | `{success: true}` | |

### Portfolios/Investments (`/api/v1/portfolios*`, `/api/v1/investments*`)
| Endpoint | Method | Notes | Status |
|----------|--------|-------|--------|
| `/portfolios` | GET/POST | Portfolio CRUD | |
| `/portfolios/:id/holdings` | GET | Holdings with current prices | |
| `/portfolios/:id/rebalance` | POST | Buy-only engine input | |
| `/investments` | GET | Investment transactions | |
| `/sips` | GET/POST | SIP CRUD | |

### Reports/Exports (`/api/v1/reports*`, `/api/v1/exports*`, `/api/v1/dpdp*`)
| Endpoint | Method | Response | Status |
|----------|--------|----------|--------|
| `/reports/spending` | GET | Category breakdown | |
| `/reports/net-worth` | GET | Historical snapshots | |
| `/exports/transactions` | GET | CSV/JSON stream | |
| `/dpdp/full-export` | POST | Complete user data JSON | |

### Settings (`/api/v1/*`)
| Area | Endpoints | Status |
|------|-----------|--------|
| AI | `/ai_settings` GET/PUT/DELETE | |
| API Credentials | `/api_credentials` GET/POST, `/:id` DELETE | |
| Push | `/push/subscribe`, `/push/unsubscribe` | |
| Onboarding | `/onboarding/snapshot`, `/onboarding/complete` | |

---

## Data Model Alignment

### User
```ruby
# Must match frontend expectations
User:
  id, email, first_name, last_name, currency, onboarded, created_at
```

### Transaction
```ruby
Transaction:
  id, user_id, description, amount, transaction_type, category_id, 
  transaction_date, merchant, recurring, recurring_rule, tags, created_at
```

### Debt
```ruby
Debt:
  id, user_id, name, amount, paid_amount, interest_rate, emi_amount,
  category, status, due_date, started_at, currency_code, notes,
  debt_free_date, months_remaining, created_at
```

### Budget
```ruby
Budget:
  id, user_id, budget_category_id, monthly_limit, period, alert_threshold, rollover
```

### Goal
```ruby
Goal:
  id, user_id, name, target_amount, target_year, monthly_sip, top_up_amount,
  top_up_frequency, allocation, equity_growth, debt_growth, gold_growth,
  final_corpus, risk_comparison, projection, currency_code
```

### Portfolio/Holding
```ruby
Portfolio: id, user_id, name, currency, broker
Holding: id, portfolio_id, symbol, name, quantity, avg_buy_price, current_price, asset_type
```

---

## Error Response Format (Must Match Frontend)

```json
{
  "error": "Human-readable message",
  "details": { "field": "specific issue" },
  "code": "ERROR_CODE"
}
```

Frontend expects:
- `err.message` for toast display
- `err.status` for conditional handling (e.g., 501 = not implemented)
- 422 for validation errors with `details`

---

## Webhook/Async Endpoints

| Event | Endpoint | Payload | Status |
|-------|----------|---------|--------|
| Transaction created | `/webhooks/transactions` | `{transaction}` | |
| Debt payment recorded | `/webhooks/debts/payment` | `{debt_id, amount}` | |
| Goal milestone reached | `/webhooks/goals/milestone` | `{goal_id, pct}` | |
| Rebalance executed | `/webhooks/portfolio/rebalance` | `{portfolio_id, trades[]}` | |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| API p95 latency | ≤ 200ms |
| Dashboard aggregation | ≤ 500ms |
| CSV import (1000 rows) | ≤ 5s |
| Rebalance calculation (50 holdings) | ≤ 1s |
| Full DPDP export | ≤ 10s |

---

## Security Checklist

- [ ] All endpoints require authentication (except register/login/forgot-password)
- [ ] Rate limiting on auth endpoints (rack-attack configured)
- [ ] CORS restricted to frontend origin
- [ ] API credentials encrypted at rest (ActiveRecord encryption)
- [ ] Passkey credentials stored as credential IDs only (no private keys)
- [ ] Push subscription keys encrypted
- [ ] DPDP export includes ALL user data (GDPR Art. 15)
- [ ] Deletion request triggers 30-day grace period (DPDP)
- [ ] Audit logs for sensitive actions (settings changes, exports, deletions)

---

## Database Migrations (Verify Applied)

```bash
# Check migration status
rails db:migrate:status

# Required tables (non-exhaustive)
- users
- transactions
- budget_categories
- budgets
- debts
- goals
- portfolios
- holdings
- investment_transactions
- sips
- api_credentials
- webauthn_credentials
- push_subscriptions
- consent_records
- deletion_requests
- households
- household_memberships
- trips
- trip_members
- trip_expenses
- conversations
- messages
- notifications
- net_worth_snapshots
- recurring_expenses
- recurring_detections
- statement_imports
- insurance_policies
```

---

## Environment Variables (Production)

```bash
# Frontend (Vite)
VITE_API_URL=https://api.sampada.app

# Backend (Rails)
DATABASE_URL=postgresql://...
RAILS_MASTER_KEY=...
SECRET_KEY_BASE=...
BETTER_AUTH_SECRET=...
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_CONTACT=mailto:admin@sampada.app

# Optional AI
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROK_API_KEY=...
OPENROUTER_API_KEY=...

# Exchange Rates
EXCHANGE_RATE_API_KEY=...
```

---

## Deployment Verification

### Health Checks
| Endpoint | Expected |
|----------|----------|
| `GET /up` | 200 OK (Rails health) |
| `GET /api/v1/dashboard` (auth) | 200 with data |

### Smoke Test Script
```bash
#!/bin/bash
# Run after deploy

API="https://api.sampada.app"
FRONTEND="https://sampada.app"

# 1. Health
curl -sf "$API/up" > /dev/null || exit 1

# 2. Auth flow
TOKEN=$(curl -s -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' | jq -r .token)

# 3. Dashboard
curl -sf -H "Authorization: Bearer $TOKEN" "$API/api/v1/dashboard" | jq .net_worth

# 4. Frontend loads
curl -sf "$FRONTEND" | grep -q "Sampada" || exit 1

echo "✅ Deploy verification passed"
```

---

## Rollback Plan

1. **Frontend:** `vercel rollback` or Cloudflare Pages rollback to previous build
2. **Backend:** `cap production deploy:rollback` or Kubernetes rollout undo
3. **Database:** No auto-rollback — migrations are forward-only. Hotfix via new migration.

---

## Post-Integration Monitoring (First 48h)

| Metric | Alert Threshold |
|--------|-----------------|
| API error rate | > 1% |
| API p99 latency | > 2s |
| Failed logins | > 10/min |
| Queue depth (Sidekiq) | > 1000 |
| Database connections | > 80% pool |
| Memory usage | > 85% |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Frontend Lead | | | |
| Backend Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

**Backend integration may begin ONLY after all UAT gates pass AND this checklist is complete.**