# Sampada Free Forever - Master Implementation Plan

## Executive Summary

**Vision**: Build a premium personal finance app that's **free forever** for core features, sustainable through optional Pro features and ecosystem partnerships.

**Core Philosophy**: 
- **Free Forever** = Core financial management (tracking, budgeting, debt, net worth) always free
- **Pro Features** = AI/ML, advanced analytics, family sharing, tax optimization (optional, subsidizes free users)
- **Partnerships** = Account Aggregator, MF trail commissions, affiliate (subsidize infrastructure)
- **B2B White-label** = Enterprise revenue (banks, NBFCs embed Sampada)

---

## 💰 Financial Model (Free Forever Sustainability)

### Infrastructure Costs at Scale
| Users | Monthly Infra | Cost/User | Pro Revenue (5%) | Partnership Rev | Net Margin |
|-------|--------------|-----------|------------------|-----------------|------------|
| 10K   | $232/mo      | $0.023    | $2,000           | $2,000          | +$3,768    |
| 100K  | $1,102/mo    | $0.011    | $18,000          | $15,000         | +$31,898   |
| 1M    | $5,502/mo    | $0.0055   | $180,000         | $150,000        | +$324,498  |

**Break-even**: ~3,000 Pro users (3% conversion at 100K users)

---

## Phase Overview

| Phase | Duration | Theme | Key Deliverable | Free/Pro |
|-------|----------|-------|-----------------|----------|
| **Phase 1** | Weeks 1-4 | Foundation | Bank PDF Import, Recurring Detection, Passkeys, PWA | FREE |
| **Phase 2** | Weeks 5-12 | Ecosystem | Account Aggregator, Direct MF, Recurring, Bank Import | FREE + Partner |
| **Phase 3** | Weeks 13-20 | Intelligence | AI Categorization (Pro), Family Plan, Tax Optimizer | PRO |
| **Phase 4** | Weeks 21-28 | Platform | API, Webhooks, White-label, Advanced AI | PRO + B2B |

---

## Cross-Phase Dependencies

```
Phase 1 (Foundation)
    │
    ├── Auth System (Passkeys) ──→ Phase 2: AA Integration
    ├── Bank PDF Parser ────────→ Phase 2: Auto-recurring detection
    ├── ResponsiveModal ────────→ All Phases: Modals
    └── Stat Component ─────────→ Phase 2/3: Dashboard/Insights

Phase 2 (Ecosystem)
    │
    ├── AA Integration ──────────→ Phase 3: Auto-categorization (ML training data)
    ├── Recurring Engine ────────→ Phase 3: Smart budgets, cash flow forecasting
    └── MF Investment ───────────→ Phase 4: Portfolio rebalancing, tax harvesting

Phase 3 (Intelligence)
    │
    ├── AI Categorization ───────→ Phase 4: Predictive insights
    ├── Family Plan ─────────────→ Phase 4: Multi-user collaboration
    └── Tax Optimizer ───────────→ Phase 4: Advanced tax planning

Phase 4 (Platform)
    │
    ├── Public API ──────────────→ Ecosystem apps
    ├── Webhooks ────────────────→ Real-time integrations
    ├── White-label SDK ─────────→ B2B Revenue
    └── Advanced AI ─────────────→ Predictive, conversational
```

---

## Task Template for Notion

Each task in Notion should have these properties:

```yaml
Task Properties:
  - Name: string (format: "[Phase X] Feature Name - Component")
  - Phase: Select (Phase 1/2/3/4)
  - Component: Select (Backend/Frontend/Shared/DevOps)
  - Priority: Select (P0/P1/P2/P3)
  - Status: Select (Backlog/Ready/In Progress/Review/Done)
  - Free/Pro: Select (Free/Pro/Both)
  - Dependencies: Relation (self-referencing)
  - Blocked By: Relation (self-referencing)
  - Blocks: Relation (self-referencing)
  - Estimate: Number (Story Points: 1,2,3,5,8,13)
  - Assignee: Person
  - Sprint: Select (Sprint 1-14)
  - Spec Link: URL (link to spec doc)
  - Test Plan: Text
  - Rollback Plan: Text
  - Feature Flag: Text (e.g., "feature-bank-pdf-import")
  - Rollback Commit: Text
```

---

## Specification Files Structure

```
specs/
├── MASTER.md                          # This file
├── shared/
│   ├── ARCHITECTURE.md               # System architecture
│   ├── DATA_MODELS.md                # Database schemas
│   ├── API_CONTRACTS.md              # REST/GraphQL contracts
│   ├── DESIGN_SYSTEM.md              # Design tokens, components
│   └── SECURITY.md                   # Auth, encryption, compliance
├── phase1/
│   ├── SPEC.md                       # Phase 1 master spec
│   ├── backend/
│   │   ├── bank-pdf-import.md
│   │   ├── recurring-detection.md
│   │   ├── passkeys-auth.md
│   │   └── pwa-offline.md
│   ├── frontend/
│   │   ├── bank-pdf-import-ui.md
│   │   ├── passkeys-ui.md
│   │   ├── pwa-setup.md
│   │   └── recurring-detection-ui.md
│   └── shared/
│       ├── pdf-parser-spec.md
│       └── recurring-engine-spec.md
├── phase2/
│   ├── SPEC.md
│   ├── backend/
│   │   ├── account-aggregator.md
│   │   ├── direct-mf-investment.md
│   │   └── recurring-engine.md
│   ├── frontend/
│   │   ├── aa-integration-ui.md
│   │   ├── mf-investment-ui.md
│   │   └── recurring-management-ui.md
│   └── shared/
│       ├── aa-integration-spec.md
│       └── mf-investment-spec.md
├── phase3/
│   ├── SPEC.md
│   ├── backend/
│   │   ├── ai-categorization.md
│   │   ├── family-plan.md
│   │   └── tax-optimizer.md
│   ├── frontend/
│   │   ├── ai-insights-ui.md
│   │   ├── family-plan-ui.md
│   │   └── tax-optimizer-ui.md
│   └── shared/
│       ├── ml-pipeline-spec.md
│       └── family-sharing-spec.md
└── phase4/
    ├── SPEC.md
    ├── backend/
    │   ├── public-api.md
    │   ├── webhooks.md
    │   ├── white-label-sdk.md
    │   └── advanced-ai.md
    ├── frontend/
    │   ├── api-docs-ui.md
    │   ├── webhook-management.md
    │   └── white-label-admin.md
    └── shared/
        ├── api-spec.md
        └── white-label-spec.md
```

---

## Quality Gates (Every PR Must Pass)

```yaml
Quality Gates:
  Pre-commit:
    - oxlint: clean (zero errors, warnings allowed only for pre-existing)
    - TypeScript: strict mode, no errors
    - Prettier: formatted
    - Tests: unit tests pass (npm test)
  
  CI Pipeline:
    - Build: succeeds
    - TypeScript: strict mode passes
    - Lint: oxlint clean
    - Tests: 100% pass (unit + integration)
    - Size-limit: < 500KB main bundle, < 1MB Hero3D
    - Accessibility: axe-core (WCAG 2.1 AA)
    - Visual regression: Chromatic/Playwright screenshots
  
  Pre-merge:
    - Code review: 2 approvals (1 senior)
    - All CI checks green
    - Feature flag added (if new feature)
    - Migration tested (if DB changes)
    - Rollback plan documented
  
  Post-deploy:
    - Smoke test: mount test passes
    - Error rate: < 0.1% (Sentry)
    - Performance: LCP < 2.5s, CLS < 0.1
    - Error budget: < 1% per sprint
```

---

## Notion Database Setup

### 1. **Tasks Database** (Primary)
- Properties as defined in Task Template above
- Views: Kanban (Status), Calendar (Sprint), Table (All), Kanban (Phase)

### 2. **Specs Database** (Reference)
- Properties: Name, Phase, Component, Status, Link to Task, Last Updated
- One page per spec file

### 3. **Architecture Decisions (ADR) Database**
- Properties: ID, Title, Status, Date, Context, Decision, Consequences, Links

### 4. **Feature Flags Database**
- Properties: Name, Description, Default (On/Off), Rollout %, Targeting Rules, Owner

### 5. **Incidents/Retrospectives Database**
- Properties: Date, Severity, Root Cause, Action Items, Owner, Status

---

## AI Agent Instructions (For Claude Code / Local AI / OpenCode)

### How to Use These Specs

```markdown
## Instructions for AI Agent

1. **Read the spec first**: Always read the relevant SPEC.md and component specs before writing code
2. **Follow the architecture**: Use existing patterns, components, utilities
3. **Write tests first**: Unit test → implementation → integration test
4. **Quality first**: Run lint, typecheck, tests before committing
5. **Feature flags**: Wrap new features in feature flags
6. **Rollback ready**: Every migration has rollback plan
6. **Document**: Update spec if implementation differs
```

### Standard Workflow for AI Agent

```bash
# 1. Read spec
cat specs/phase1/backend/bank-pdf-import.md

# 2. Check existing patterns
ls src/lib/
grep -r "useModalForm" src/

# 3. Write tests first
# 4. Implement
# 6. Run quality checks
npm run lint && npm run build && npm test

# 7. Commit with conventional message
git commit -m "feat(bank-pdf): add PDF parser for ICICI statements"
```

### Code Style Rules

```typescript
// Component pattern
export default function ComponentName({ prop1, prop2 }: Props) {
  // Early returns
  if (!data) return <Skeleton />
  
  // Hooks at top
  const { data, loading } = useResource('/api/...')
  
  // Event handlers
  const handleClick = useCallback(() => {...}, [deps])
  
  // Render
  return (
    <div className={cls}>
      {/* ... */}
    </div>
  )
}

// CSS: Use CSS variables from tokens.css
// Animations: Use motion primitives (Reveal, PageTransition)
// State: useModalForm, useResource, useOnline
```

---

## Phase 1 Detailed Specs (Weeks 1-4)

### Phase 1: Foundation (FREE)

#### 1.1 Bank Statement PDF Import (FREE)

**Backend Spec**: `specs/phase1/backend/bank-pdf-import.md`
- Parse ICICI, HDFC, SBI, Axis, Kotak statement PDFs
- Extract: date, description, amount, type, balance, category hint
- Confidence scoring, manual review queue
- API: `POST /api/v1/import/bank-statement`

**Frontend Spec**: `specs/phase1/frontend/bank-pdf-import-ui.md`
- Drag-drop upload with progress
- Preview parsed transactions (editable table)
- Confidence badges, bulk edit, categorization
- Save → creates transactions + recurring rules

**Shared Spec**: `specs/phase1/shared/pdf-parser-spec.md`
- PDF.js + custom regex patterns per bank
- Confidence scoring algorithm
- Error handling, fallback to manual entry

#### Dependencies
- `pdf-parse` / `pdfjs-dist` (backend)
- `react-dropzone` (frontend)
- Feature flag: `feature-bank-pdf-import`

#### Tasks (Notion)
| Task | Component | Estimate | Dependencies |
|------|-----------|----------|--------------|
| [P1] PDF Parser Service | Backend | 5 pts | - |
| [P1] ICICI/HDFC/SBI Parsers | Backend | 8 pts | PDF Parser |
| [P1] Upload API + Validation | Backend | 3 pts | PDF Parser |
| [P1] Upload UI + Drag Drop | Frontend | 5 pts | - |
| [P1] Preview Table + Edit | Frontend | 8 pts | Upload UI |
| [P1] Categorization + Save | Frontend | 5 pts | Preview |
| [P1] Tests + Docs | Both | 3 pts | All above |

---

#### 1.2 Recurring Transaction Detection (FREE)

**Backend**: `specs/phase1/backend/recurring-detection.md`
- Analyze transaction history for patterns
- Frequency detection: daily/weekly/monthly/quarterly/yearly
- Amount variance tolerance (±5%)
- Merchant normalization (fuzzy matching)
- Generate recurring expense records + next due dates

**Frontend**: `specs/phase1/frontend/recurring-detection-ui.md`
- "Found X recurring expenses" banner
- Review modal: confirm/edit/reject each
- Auto-create recurring expense records
- Settings: sensitivity, lookback period

**Shared**: `specs/phase1/shared/recurring-engine-spec.md`
- Detection algorithm (frequency, amount variance, merchant fuzzy match)
- Confidence scoring
- Idempotency (re-run safe)

#### Tasks
| Task | Component | Estimate | Dependencies |
|------|-----------|----------|--------------|
| [P1] Recurring Detection Engine | Backend | 8 pts | Transaction API |
| [P1] Detection API | Backend | 3 pts | Engine |
| [P1] Detection Banner UI | Frontend | 5 pts | - |
| [P1] Review Modal | Frontend | 8 pts | Banner |
| [P1] Settings Panel | Frontend | 3 pts | Modal |
| [P1] Tests | Both | 3 pts | All above |

---

#### 1.3 Passkeys/WebAuthn (FREE)

**Backend**: `specs/phase1/backend/passkeys-auth.md`
- WebAuthn registration/authentication
- Credential management (add/remove/list)
- Fallback to password/email
- Device trust, sync across devices

**Frontend**: `specs/phase1/frontend/passkeys-ui.md`
- Setup flow in Settings > Security
- Device management (rename, remove)
- Fallback authentication
- Recovery codes

**Dependencies**: `@simplewebauthn/server`, `@simplewebauthn/browser`

---

#### 1.4 PWA Offline-First (FREE)

**Frontend**: `specs/phase1/frontend/pwa-setup.md`
- Service Worker: Workbox
- Cache strategies: NetworkFirst (API), CacheFirst (assets)
- Offline queue: mutations stored in IndexedDB, replay on reconnect
- Background sync for mutations
- Install prompt, update notification

**Shared**: `specs/phase1/shared/pwa-offline-spec.md`
- Cache strategies per route
- Conflict resolution (last-write-wins + server wins)
- Offline indicator UI component

---

## Phase 2: Ecosystem (Weeks 5-12)

### 2.1 Account Aggregator (AA) Integration (FREE - Partner Pays)

**Backend**: `specs/phase2/backend/account-aggregator.md`
- AA Framework integration (Sahamati/ReBit)
- Consent management (create, fetch, revoke)
- FI data fetch (accounts, transactions, balance)
- Consent artifacts, expiry, renewal
- Webhook for real-time updates

**Frontend**: `specs/phase2/frontend/aa-integration-ui.md`
- "Connect Bank" flow (AA consent journey)
- Connected accounts dashboard
- Sync status, manual refresh, error handling
- Consent expiry notifications

**Shared**: `specs/phase2/shared/aa-integration-spec.md`
- AA spec compliance (v1.1/2.0)
- Consent artifact structure
- FI data schemas
- Error codes, retry logic

---

### 2.2 Direct Mutual Fund Investment (FREE - Trail Revenue)

**Backend**: `specs/phase2/backend/direct-mf-investment.md`
- MF Central / BSE StarMF integration
- SIP/STP/SWP order management
- Order validation, payment gateway (UPI/netbanking)
- Portfolio sync (holdings, NAV, P&L)
- SIP mandate registration (eNACH)

**Frontend**: `specs/phase2/frontend/mf-investment-ui.md`
- Fund explorer (search, filter, compare)
- SIP calculator + goal-based recommendation
- Order flow: select → amount → mandate → confirm
- Portfolio dashboard (holdings, XIRR, allocation)

**Shared**: `specs/phase2/shared/mf-investment-spec.md`
- MF Central / BSE StarMF API contracts
- Order lifecycle states
- NAV sync schedule (daily 9 PM)
- SIP mandate flow (eNACH)

---

### 2.3 Recurring Expense Management (FREE)

**Backend**: `specs/phase2/backend/recurring-engine.md`
- CRUD for recurring expenses
- Auto-generation on due date (cron + idempotency key)
- Skip/pause/modify single occurrence
- Calendar integration (ICS export)
- Notifications (push, email, in-app)

**Frontend**: `specs/phase2/frontend/recurring-management-ui.md`
- Recurring expenses list (filter: active/paused/overdue)
- Create/edit modal (frequency, amount, category, auto-debit)
- Calendar view (monthly grid with due dates)
- ICS export, Google Calendar sync

**Shared**: `specs/phase2/shared/recurring-engine-spec.md`
- Recurrence rules (RRULE subset)
- Idempotency keys for auto-generation
- Timezone handling (user timezone)
- Retry logic, dead letter queue

---

## Phase 3: Intelligence (Pro Differentiation)

### 3.1 AI Categorization (PRO)

**Backend**: `specs/phase3/backend/ai-categorization.md`
- Train on user-corrected transactions
- Merchant + amount + user pattern → category
- Online learning (incremental updates)
- Confidence threshold → auto-apply vs review queue

**Frontend**: `specs/phase3/frontend/ai-insights-ui.md`
- "AI suggests: 5 transactions re-categorized"
- Review queue: accept/reject/bulk-apply
- Model confidence, feature importance
- Feedback loop (correct → retrain)

**Shared**: `specs/phase3/shared/ml-pipeline-spec.md`
- Feature engineering (merchant, amount, time, user history)
- Model: LightGBM / XGBoost (ONNX for edge)
- Training pipeline: daily batch, A/B testing
- Drift detection, retraining triggers

---

### 3.2 Family Plan (PRO)

**Backend**: `specs/phase3/backend/family-plan.md`
- Household entity (owner, members, roles)
- Invite flow (email/link, roles: admin/member/viewer)
- Shared budgets, debts, goals
- Permissions matrix (view/edit/admin)

**Frontend**: `specs/phase3/frontend/family-plan-ui.md`
- Family dashboard (shared net worth, budgets)
- Member management (invite, remove, role change)
- Shared budget envelope view
- Activity feed (who spent what)

**Shared**: `specs/phase3/shared/family-sharing-spec.md`
- Invitation tokens (JWT, expiry, revocation)
- Role-based permissions matrix
- Data isolation (user vs household scope)
- Audit log for shared actions

---

### 3.3 Tax Optimizer (PRO)

**Backend**: `specs/phase3/backend/tax-optimizer.md`
- Section 80C/80CCD/80D/24(b) optimization
- Capital gains: LTCG/STCG, grandfathering, indexation
- Tax-loss harvesting (identify, simulate, execute)
- Regime comparison (old vs new regime)
- Form 16 / AIS / TIS parsing

**Frontend**: `specs/phase3/frontend/tax-optimizer-ui.md`
- Tax dashboard (liability, savings, actions)
- "Save ₹X by investing ₹Y in ELSS"
- Capital gains dashboard (realized/unrealized)
- Regime comparison calculator
- Export: ITR-ready CSV, tax summary PDF

**Shared**: `specs/phase3/shared/tax-engine-spec.md`
- Tax rules engine (versioned per FY)
- Regime comparison engine
- Capital gains calculator (FIFO, grandfathering)
- Form 16 / AIS parser

---

## Phase 4: Platform (Weeks 21-28)

### 4.1 Public API (PRO + B2B)

**Backend**: `specs/phase4/backend/public-api.md`
- REST API v1 (OpenAPI 3.1 spec)
- OAuth 2.1 + PKCE, scopes (read:transactions, write:budgets)
- Rate limiting, API keys, webhooks
- SDKs: TypeScript, Python, Go

**Frontend**: `specs/phase4/frontend/api-docs-ui.md`
- API docs (Scalar/Redoc)
- API key management (create, rotate, revoke, scopes)
- Webhook dashboard (logs, retry, dead letter)
- API playground (try it out)

---

### 4.2 Webhooks & Real-time (PRO + B2B)

**Backend**: `specs/phase4/backend/webhooks.md`
- Event types: transaction.created, budget.exceeded, bill.due, goal.achieved
- HMAC signatures, retry with exponential backoff
- Dead letter queue, replay API
- Delivery logs, search, replay

**Frontend**: `specs/phase4/frontend/webhook-management.md`
- Webhook endpoint management (create, test, disable)
- Delivery logs (status, payload, response, timing)
- Retry manual/auto, signature verification

---

### 4.3 White-label SDK (B2B Revenue)

**Backend**: `specs/phase4/backend/white-label-sdk.md`
- Multi-tenant architecture (tenant isolation)
- Custom branding (colors, logo, domain, favicon)
- Feature toggles per tenant
- SSO (SAML/OIDC), custom domain

**Frontend**: `specs/phase4/frontend/white-label-admin.md`
- Tenant admin dashboard
- Branding customizer (colors, logo, CSS variables)
- Feature flags per tenant
- Analytics dashboard (usage, errors, performance)
- Custom domain setup (DNS, SSL)

**Shared**: `specs/phase4/shared/white-label-spec.md`
- Tenant isolation (DB schema, cache, storage)
- Theme system (CSS variables + Tailwind config)
- Feature flag system (LaunchDarkly-style)
- Billing integration (Stripe Connect)

---

### 4.4 Advanced AI (PRO + B2B)

**Backend**: `specs/phase4/backend/advanced-ai.md`
- Conversational AI: "How much did I spend on food last month?"
- Predictive: "You'll exceed dining budget by ₹3,000"
- Anomaly detection: "Unusual ₹15,000 spend at 2 AM"
- Portfolio optimization: "Rebalance now: equity 75% → 60%"

**Frontend**: `specs/phase4/frontend/ai-chat-ui.md`
- Chat interface (sidebar, floating button)
- Streaming responses, citations
- Action buttons: "Create budget", "Set alert", "Rebalance"
- Voice input (Web Speech API)

**Shared**: `specs/phase4/shared/ai-pipeline-spec.md`
- RAG pipeline (user data → embeddings → LLM)
- Function calling (create budget, set alert, place order)
- Guardrails: no financial advice, data privacy
- Evaluation framework (accuracy, hallucination rate)

---

## Shared Infrastructure (All Phases)

### Database Migrations
- All migrations: versioned, reversible, tested
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Rollback tested in CI

### API Versioning
- URL versioning: `/api/v1/`, `/api/v2/`
- Deprecation policy: 12 months notice
- Sunset headers: `Sunset: Sat, 01 Jan 2026 00:00:00 GMT`

### Feature Flags
- LaunchDarkly-style (custom implementation)
- Targeting: user segment, percentage, geography
- Kill switch (< 30s disable)

### Observability
- **Logs**: Structured JSON (pino), correlation IDs
- **Metrics**: Prometheus + Grafana (RED metrics)
- **Traces**: OpenTelemetry (Jaeger)
- **Errors**: Sentry (alerting, grouping, release tracking)
- **Business Metrics**: Custom events (Mixpanel/PostHog)

---

## Notion Task Creation Script

```bash
#!/bin/bash
# create-notion-tasks.sh
# Reads specs and creates Notion tasks via API

# Usage: ./create-notion-tasks.sh specs/phase1/backend/bank-pdf-import.md
```

---

## Getting Started for AI Agents

```bash
# 1. Clone repo
git clone https://github.com/sdachary/sampada.git
cd sampada

# 2. Read master spec
cat specs/MASTER.md

# 2. Read phase spec
cat specs/phase1/SPEC.md

# 3. Read component spec
cat specs/phase1/backend/bank-pdf-import.md

# 4. Check existing patterns
ls src/lib/
grep -r "useModalForm" src/

# 6. Write test → implement → test → lint → commit
```

---

## Escalation & Support

- **Architecture Questions**: Tag @architect in Notion
- **Design Questions**: Tag @designer in Figma/Notion
- **Security/Compliance**: Tag @security in Notion
- **Incidents**: Create Incident page, tag @oncall
- **Blockers**: Update task status → "Blocked", tag blocker

---

*Last Updated: 2026-11-04 | Version 1.0 | Next Review: Sprint Planning*