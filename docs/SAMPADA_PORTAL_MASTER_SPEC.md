# Sampada Portal — Master Spec (Architecture + Implementation + Roadmap)

> **Single source of truth.** This file consolidates and supersedes the earlier separate documents (architecture note, implementation brief, roadmap/spec). Hand this whole file to opencode or Claude Code with "implement phase by phase" — it contains the *why*, the *what stack*, the *exact tasks*, and the *what's next*, in one place.

---

## 0. Product Definition

**Sampada Portal** is a new, standalone product — not a refactor of the existing self-hosted Rails Sampada (`sdachary/sampada`), which remains a separate, stable product for people who want to run their own server. Portal is for **everyone else**: a multi-tenant, plain-language personal finance app for people with **no financial literacy and no technical literacy** — a school/college passout signing up for the first time, a parent who's never used a budgeting app, someone who dropped out before finishing school. Every decision below is filtered through that lens.

**The three properties that make this different from a normal SaaS:**

1. **Zero sustained load on the operator's infra.** Nothing runs as a long-lived process on AcharyLab's Oracle Always Free VMs. The whole thing is static frontend + serverless edge functions that scale to zero.
2. **Zero financial data custody.** The operator (you) never stores a user's transactions, balances, loans, or portfolio. Users choose where their data lives; you only ever hold encrypted credentials, never plaintext data.
3. **Zero-configuration by default, fully optional power-user path.** A brand-new, non-technical user needs to make exactly two decisions to get value (where data lives, three numbers). AI, BYO keys, local models, and alternate data stores are real features — just hidden behind an optional, collapsed "Advanced Settings" panel that never blocks or appears in the required flow.

---

## 1. Current State (what exists today, in the Rails app, worth reusing)

From `sdachary/sampada` (Rails 7.2, Tailwind + Hotwire, Postgres, Redis/Sidekiq, AGPL-3.0):

- **Reusable domain logic** (needs porting to TypeScript, not reinventing): debt avalanche/snowball calculator, SIP suggestion engine, cash-flow forecasting, 3-sigma anomaly detection, multi-currency/exchange-rate handling.
- **Already BYOK-friendly**: a pluggable `Ai::` namespace supporting Ollama, OpenRouter, OpenAI, Anthropic, or any OpenAI-compatible endpoint. This concept carries over directly — Portal just needs to move the *call* client-side and make the *default* path require zero configuration.
- **What does not carry over**: the Rails process model itself, Postgres as the store of record for user data, and Sidekiq for background jobs — all replaced below because they assume a long-lived, operator-run server, which is the opposite of "zero load on my micro instances."

---

## 2. Target Architecture

**Old model:** `Browser → Rails app → Postgres (your disk) → Redis/Sidekiq (your CPU)` — one deployment holds everyone's data, and your compute runs 24/7 regardless of traffic.

**New model:** `Browser (does the work) → tiny Credential Vault (yours, serverless) → user's own chosen data store` and `→ user's own or a shared free AI proxy → AI provider`.

The single biggest idea: push compute and data to the edges you don't pay for — the user's browser, the user's own account (Google/Supabase/etc.), the user's AI provider. Your servers should only ever touch encrypted credentials and stateless token-exchange requests (needed because Google OAuth requires a `client_secret` that can't live in a browser).

### 2.1 Tech stack decision — Rails is dropped entirely for Portal

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite, Tailwind | Matches your existing Kubera/Prayog conventions; ships as static files, no server to run it. |
| "Backend" | **Hono** on **Cloudflare Workers** | Edge-native, serverless, scales to zero — no process ever idles, unlike Rails/Puma or a VM-hosted Node/Express server. The actual mechanism that delivers "zero load on my Oracle boxes." |
| Credential storage | **Cloudflare D1** | Free tier (5GB, 5M reads/day) is enormous for a credentials-only table. |
| Rate limiting / shared AI proxy counters | **Cloudflare KV** | Cheap, simple, fine for "N free AI calls/day" counters. |
| User's actual financial data | Google Sheets API v4 (default) / browser IndexedDB (device-only) / Sampada's own encrypted D1 store (opt-in, still zero-knowledge) | User chooses at signup — see Section 4. |
| Scheduled/shared tasks | Cloudflare Cron Triggers | Replaces Sidekiq; used only for genuinely non-personal shared data (e.g., exchange rate cache). |
| Hosting (frontend) | Cloudflare Pages | Same account/pattern as your other AcharyLab apps — $0, familiar deploy flow. |

**One language throughout (TypeScript, frontend + edge backend)** — matters most for a solo maintainer with limited weekly hours.

### 2.2 Data layer — Bring Your Own Storage (three options, all first-class)

Users pick one of these at signup — not buried in settings, since "I don't want Google touching my finances" is a legitimate, common answer that deserves an equally easy alternative:

| Option | Where data lives | Trade-off, stated plainly to the user |
|---|---|---|
| **Save to your Google account** | User's own Google Drive (a private Sheet) | Syncs across devices; requires a Google account. |
| **Just keep it on this device** | Browser IndexedDB only | Zero accounts needed; doesn't sync, and clearing the browser/losing the device loses the data. |
| **Let Sampada store it (encrypted)** | Your Cloudflare D1, but as ciphertext only | Syncs across devices without Google; you (the operator) can see there's data but never its contents — same zero-knowledge model as the credential vault. |

All three are implemented as a common client-side adapter interface (`read()/write()/query()`), so later adapters (Supabase, Notion — see roadmap) plug into the same shape.

### 2.3 Encryption model (zero-knowledge, applies to both the credential vault and the "Sampada encrypted storage" option)

- Key derived client-side from a passphrase (PBKDF2/Argon2 via WebCrypto, ≥600,000 iterations); **never sent to the server**.
- All sensitive data (OAuth refresh tokens, AI keys, and — if chosen — the user's actual financial rows) encrypted client-side (AES-GCM) before being sent anywhere.
- Your server(s) store only ciphertext. A vault breach exposes unreadable blobs, not financial data.
- **UX handling for non-technical users:** do not force users to invent and remember a passphrase during onboarding. Auto-generate the encryption key, show a one-time printed/downloadable recovery code ("Save this — you'll need it on a new device"), and let normal browser session persistence handle the common case. A self-chosen passphrase is offered only inside Advanced Settings.

### 2.4 AI — zero-config default, BYOK/local model as an optional, hidden path

- **Default path (every user, no setup):** a shared, operator-funded free-tier AI proxy (single Cloudflare Worker route) forwards requests to a fixed free model (e.g., an OpenRouter free-tier model) using an operator-held key. Enforced with a per-user daily quota (KV counters) to keep this at $0 cost. No prompt content is logged — only request counts/timestamps for quota enforcement.
- **Optional path (Advanced Settings only, never in onboarding):** user supplies their own AI key (OpenAI/Anthropic/OpenRouter/custom endpoint) or points to a local Ollama instance. Clearly labeled "for technical users," with plain-language warnings about what running a local model actually requires.

### 2.5 Repository layout (target state)

```
sampada-portal/
  apps/
    web/                        # React + Vite frontend (Cloudflare Pages)
      src/
        adapters/                # google-sheets.ts, local-only.ts, sampada-encrypted.ts
        finance/                 # ported domain logic: debt-payoff.ts, sip-planner.ts, anomaly-detection.ts, forecasting.ts
        ai/client.ts              # calls shared proxy by default, or user's own key/endpoint if configured
        crypto/vault-crypto.ts    # WebCrypto: key derivation + AES-GCM encrypt/decrypt
        i18n/en.json              # ALL user-facing strings, keyed — see Section 5.4
        onboarding/                # storage choice, snapshot step, checklist dashboard
        settings/AdvancedSettings.tsx
  workers/
    vault/                      # Hono: credential vault + OAuth token exchange (D1: credentials table only)
    ai-proxy/                   # Hono: shared free-tier AI relay + rate limiter
    cron-cache/                 # exchange-rate refresh → public KV cache (non-personal data only)
  docs/
    SAMPADA_PORTAL_MASTER_SPEC.md   # this file
    dpdpa-notes.md
  wrangler.toml / package.json (pnpm workspaces)
```

---

## 3. Non-Negotiable Constraints (check every PR against these)

1. No component runs as an always-on process on operator-owned compute.
2. Financial transaction data is never written to a database the operator directly reads in plaintext.
3. User-supplied AI keys and any "Sampada-stored" financial data are encrypted client-side before leaving the browser (zero-knowledge).
4. Local-model/custom-endpoint/BYO-AI-key configuration is optional, collapsed by default, never appears in the first-run flow.
5. Every user-facing string lives in the keyed strings file (Section 5.4) — never hardcoded inline.
6. Total hosting cost: $0/month at expected scale (hundreds–low thousands of users).

---

## 4. Onboarding Flow (final spec)

Hybrid shape: **forced order for the first two steps, free checklist after.**

```
[Forced] Step 1 — Choose where your data lives (3 cards, full copy below)
        ↓
[Forced] Step 2 — Quick snapshot: 3 numbers only
        - Money coming in each month     (example: salary)
        - Money going out each month     (example: rent, food, bills)
        - Total money you owe right now  (example: add up loans roughly)
        → Immediately renders a first progress view: "You're at ₹X — here's your path to Zero."
        ↓
[Free/skippable, any order] Checklist dashboard:
        ☐ Loans & EMIs
        ☐ Bank balances
        ☐ Investments & share portfolio
        ☐ Insurance (health, term life)
        ☐ Set a monthly budget
```

Each checklist item opens a small, focused mini-form (one loan/policy/holding at a time, "Add another" to repeat) — never one giant all-fields-at-once form. **Manual entry only in V1 — no file import** (see roadmap for when/how import is reintroduced).

### 4.1 Step 1 copy spec — each card explained with an example, not just a label

**Card 1 — Save to your Google account**
- Consequence: "Saved as a private file in your own Google Drive. Only you can open it — we never see your numbers."
- Analogy: "Like keeping a diary in your own locker — we just hand you the key each time you visit."
- Best for: "Anyone with a Google account who wants their data to follow them across phone and computer."

**Card 2 — Just keep it on this device**
- Consequence: "Stays only in this browser, on this device. Nothing is sent anywhere — not even to us."
- Analogy: "Like a paper notebook kept in a drawer. If you lose this device or clear your browser history, it's gone — and you won't be able to see it from your phone."
- Best for: "People who only ever use one device and want the simplest, most private option."

**Card 3 — Let Sampada store it (locked/encrypted)**
- Consequence: "We store it scrambled, locked with a key only you have. We can see there's a box — never what's inside."
- Analogy: "Like a bank locker: the bank holds the box, but only you hold the key."
- Best for: "People without a Google account, or who want their data to follow them across devices without using Google."

**Footer on all three cards:** *"You can change this later in Settings. Nothing is permanent."*

---

## 5. Accessibility & Plain-Language Design System (applies to every screen, present and future)

A standing design system — not a one-time onboarding fix. Every future feature is built against these rules.

### 5.1 Language rules
- Every financial term gets a **plain-language primary label**, with the technical term as a small secondary tag — never the reverse.
- Every input field has an **example placeholder** (e.g. "e.g. ₹2,00,000 bike loan"), not just a label.
- Entered numbers are **echoed back in words** before saving (e.g. "That's ₹2,50,000 — two lakh fifty thousand") to catch typos and support people less familiar with digit-grouping.
- Error messages are plain: "That doesn't look like a valid amount — try just numbers, like 5000," never "Invalid input format."

### 5.2 Visual rules
- Base font size **18px minimum** everywhere.
- High contrast only — no light-grey-on-white "clean minimal" patterns.
- Icons always paired with words, never icon-only.
- Status (behind/on-track/ahead) always communicated with **color + word + icon together** (colorblind-safe), never color alone.
- One question per screen on mobile; tap targets 44px minimum.
- Undo available everywhere; no irreversible-feeling confirmations for routine actions.

### 5.3 Term glossary (seed list — extend as features grow)

| Technical term | Plain primary label |
|---|---|
| Liabilities | Money you owe |
| Expenses | Money going out |
| Income | Money coming in |
| EMI | Monthly payment for a loan |
| Portfolio | Shares & investments you own |
| Term life insurance | Insurance that pays your family if you pass away |
| Net worth | What you'd have left if you paid off everything you owe |
| Avalanche strategy | Pay off the most expensive loan first |
| Snowball strategy | Pay off the smallest loan first |
| SIP | Small regular amount invested every month |
| Asset allocation | How your money is spread across different types of investments |

### 5.4 Strings file — why it matters even English-only in V1

All copy (labels, placeholders, analogies, errors) lives in one keyed file, e.g. `apps/web/src/i18n/en.json`, referenced by key everywhere — never hardcoded inline. Costs almost nothing now; makes the V2 regional-language phase a translation task instead of a UI rewrite.

```json
{
  "storage_choice.google.title": "Save to your Google account",
  "storage_choice.google.consequence": "Saved as a private file in your own Google Drive...",
  "storage_choice.google.analogy": "Like keeping a diary in your own locker...",
  "term.liabilities.plain": "Money you owe",
  "term.liabilities.technical": "liabilities"
}
```

---

## 6. Phase-by-Phase Implementation Plan (for opencode / Claude Code)

Work strictly in order — later phases depend on the vault and adapter interfaces built early.

### Phase 0 — Feasibility spike (before any real building)
- [ ] Spike Google OAuth (Sheets scope) end-to-end: bare Vite app → Worker token exchange → write/read a test row.
- [ ] Spike WebCrypto AES-GCM round-trip; confirm key derivation (≥600k PBKDF2 iterations) is under ~500ms on a mid-range Android phone — the target audience is "everyone," not just desktop power users.
- **Acceptance:** both spikes work end-to-end in a throwaway branch.

### Phase 1 — Credential vault + Google sign-in
- [ ] `workers/vault`: Hono routes `POST /oauth/callback`, `GET /vault/:userId`, `POST /vault/:userId`.
- [ ] D1 schema: single table `credentials(user_id, encrypted_refresh_token, adapter_type, encrypted_ai_key NULLABLE, created_at)` — no other tables, ever.
- [ ] `crypto/vault-crypto.ts`: passphrase → derived key → AES-GCM helpers, plus a one-time recovery-code generator.
- [ ] Build the three-card storage-choice screen (Section 4.1) and wire Google's path through the vault.
- **Acceptance:** new user → pick a card → (if Google) OAuth → lands on empty dashboard, zero other prompts seen; recovery code shown exactly once.

### Phase 2 — Snapshot step + checklist shell
- [ ] Build the 3-number snapshot form (Section 4) with plain-language labels/examples/word-echo per Section 5.
- [ ] Build the checklist dashboard shell (5 items, any order, skippable, progress indicator).
- **Acceptance:** entering 3 numbers renders an immediate progress view; checklist items are reorderable/skippable with no dead ends.

### Phase 3 — Port debt payoff module (first real financial feature)
- [ ] `finance/debt-payoff.ts`: port avalanche/snowball logic from Rails as pure, unit-tested functions.
- [ ] `adapters/google-sheets.ts` (and `local-only.ts`, `sampada-encrypted.ts`): implement `read()/write()/appendRow()` against a fixed schema (one tab per module).
- [ ] Loans & EMIs checklist item: one-loan-at-a-time mini-form, "Add another," shows payoff order + projected debt-free date.
- [ ] Automated tests comparing output against known-good values from the Rails implementation.
- **Acceptance:** user adds 2–3 loans manually, sees a correct avalanche/snowball recommendation; underlying storage (Sheet/device/encrypted store) actually contains the data.

### Phase 4 — Zero-config AI + NL transaction entry
- [ ] `workers/ai-proxy`: single route, fixed free-tier model, operator-held key, KV-based daily quota, no prompt logging.
- [ ] `ai/client.ts`: default path hits the shared proxy; if the user has set a personal key in Advanced Settings, calls their provider directly instead.
- [ ] `settings/AdvancedSettings.tsx` (collapsed, never in onboarding): BYO AI key, local model (Ollama, labeled "for technical users" with a plain-language warning), alternate data adapters.
- [ ] Wire NL transaction entry ("I spent ₹500 on groceries") to the AI client.
- **Acceptance:** brand-new user gets a categorized transaction from a plain sentence with zero AI configuration; a power user can find and use Advanced Settings without developer help, and never has to.

### Phase 5 — Remaining checklist items + scheduled shared cache
- [ ] Bank balances, Investments/portfolio, Insurance, Budget categories — same one-item-at-a-time mini-form pattern as loans.
- [ ] `workers/cron-cache`: Cron Trigger every 6 hours, writes exchange rates to a public KV cache (safe to centralize — not personal data). All clients read this shared cache.
- **Acceptance:** all five checklist items functional; exchange-rate-dependent views (if any in V1) read from the shared cache correctly.

### Phase 6 — Testing gate before real users (see Section 7)
- [ ] Run the full Stage A (AI-agent) testing suite below.
- [ ] Fix everything Stage A surfaces before proceeding to Stage B (real users).

---

## 7. Testing Plan — AI Agents First, Then Real Users

### Stage A — AI agent testing (before any human sees it)
- [ ] **Jargon audit**: script/agent scans every string in `en.json` and flags any financial term appearing without its plain-language pairing from the Section 5.3 glossary.
- [ ] **Persona-driven agent walkthroughs**: simulate distinct personas — "18-year-old first jobber, no financial vocabulary," "65-year-old parent, low tech familiarity," "spreadsheet-comfortable small business owner" — each completes onboarding + one checklist item + the debt-payoff view; agent reports any confusion point or dead end.
- [ ] **Numeric round-trip testing**: automated tests for the debt-payoff math, snapshot progress calculation, and word-echo confirmation across realistic Indian currency values (zero debt, very large numbers, decimals).
- [ ] **Accessibility linting**: automated contrast-ratio and font-size checks against Section 5.2 on every screen.

### Stage B — Real user testing (only after Stage A is clean)
- [ ] Recruit 5–8 testers spanning the personas above — deliberately include at least one participant with limited formal education and one older adult unfamiliar with apps generally.
- [ ] Task-based sessions, not opinion surveys: "Sign up and tell me what you think this app is for," "Add your biggest loan," "Tell me what your progress bar means in your own words." Hesitation or "what does this mean?" is a copy failure to fix, not a user failure.
- [ ] Track completion rate: % of testers reaching the first progress view unaided.

A feature graduates from "V1 candidate" to "shipped" only after Stage B feedback is incorporated.

---

## 8. DPDPA & Privacy Notes

| DPDPA principle | How this architecture satisfies it |
|---|---|
| Data minimization | Operator stores only encrypted credentials (and, if chosen, encrypted financial data) — never plaintext. |
| Purpose limitation | Vault data is used only to re-authenticate to the user's own chosen store; documented and schema-enforced. |
| Consent | OAuth consent screens double as DPDPA-compliant consent artifacts — the user grants access to *their own* account, not to the operator. |
| Right to erasure/correction | Deleting a user's vault row deletes 100% of what the operator holds about them. |
| Breach notification burden | A vault/store breach exposes only ciphertext — materially lower severity, easier to reason about in disclosure. |
| Data localization concerns | Financial data lives in the user's own Google/device/encrypted-store account, not on operator infrastructure directly reading plaintext. |

- Privacy policy must state plainly: *"Sampada Portal does not store your financial data in a form we can read. Your data lives in your own Google Sheet, your own device, or our servers in encrypted form only — we cannot read it without your recovery code."*
- The shared AI proxy is the one place operator infrastructure sees user-generated content in transit (the NL prompt text). Log request counts/timestamps only, never prompt bodies; disclose this proxy's existence and no-logging policy in the privacy policy.
- **This is engineering guidance, not legal advice.** Get a DPDPA-focused legal review before monetizing.

---

## 9. Roadmap Beyond V1

### V1.1 — Stabilization (immediately post-launch)
- Incorporate Stage B findings (expect mostly copy/UX fixes, not new features).
- Add aggregate, non-identifying usage analytics to see where real users drop off.
- Harden vault/encryption flows based on anything surfaced in testing.

### V2 — Reach & Depth
- **Regional language support** (Hindi, Odia first) — built on the Section 5.4 strings-file pattern, so this is primarily translation + a language switcher, not a rebuild.
- **File import**, reintroduced carefully: local/heuristic parsing by default for common bank statement/broker CSV formats; AI-assisted parsing only as an explicit per-file opt-in, clearly disclosed, using the user's **own** AI key (never the shared free proxy) given the higher sensitivity of raw statement content.
- Household sharing via native Google Sheets/Drive sharing conventions (no custom ACL system).
- Portfolio rebalancing and cash-flow forecasting, ported from the original Rails logic.

### V3 — Intelligence & Growth
- Anomaly detection, ported and expressed in plain language ("This looks bigger than usual for groceries — is that right?" rather than "3-sigma deviation detected").
- Supabase adapter for power users who outgrow Google Sheets' row/cell ceilings.
- SIP planner with AI-suggested stocks, ported once BYOK usage patterns are well understood from V1/V2.
- Optional monetization — manual UPI/bank transfer billing first (consistent with your bepara/udhyam approach), before any payment gateway integration.

---

## 10. Production Checklist (apply from V1 launch, not deferred)

- [ ] **Monitoring**: uptime checks on Worker endpoints (vault, AI proxy) via a free tool (e.g. Uptime Kuma, consistent with existing AcharyLab observability).
- [ ] **Error tracking**: Sentry free tier or equivalent on the frontend; scrub aggressively so error reports never contain transaction amounts or account details.
- [ ] **Backups**: back up the credential vault (D1) regularly — losing it is an availability problem (users reconnect), not a data-loss problem for their finances, since real data lives in their own chosen store.
- [ ] **Rate limiting**: on both the vault (anti credential-stuffing) and the shared AI proxy (anti cost-blowout).
- [ ] **Secrets management**: operator-held keys (Google OAuth client secret, shared AI proxy's provider key) as Cloudflare Worker secrets, never in source control.
- [ ] **Incident/breach response plan**: written procedure; materially lighter than a typical fintech breach given zero-knowledge encryption, but still required, including DPDPA breach-notification steps.
- [ ] **Legal review before monetization**: privacy policy, terms of service, consent flows reviewed by a DPDPA-aware advisor.

---

## 11. Definition of Done — V1 Ready for Real-User Testing

- [ ] All three storage choices work end-to-end with their explainer copy in place.
- [ ] Snapshot step renders a working progress view immediately after 3 numbers are entered.
- [ ] Checklist dashboard is fully skippable/reorderable; each item opens a focused mini-form.
- [ ] Every user-facing string passes the Stage A jargon audit.
- [ ] Debt payoff math verified correct against known test cases.
- [ ] NL transaction entry works with zero AI configuration.
- [ ] Advanced Settings exists, is collapsed by default, never appears in the required flow.
- [ ] Accessibility linting (contrast, font size) passes on every screen.
- [ ] Zero rows of financial transaction data exist in any database the operator can read in plaintext — verifiable by inspecting the D1 schema.
- [ ] Hosting cost is $0/month at Cloudflare's published free-tier limits.
- [ ] Nothing in the stack runs as a long-lived process on an Oracle Always Free VM.
- [ ] Only after all the above: proceed to Stage B real-user testing.

