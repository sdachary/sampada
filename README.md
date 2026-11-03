<div align="center">


### Zero is better than negative.

**A free-forever, hosted personal finance web app that takes you from debt → zero → wealth.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Ruby on Rails](https://img.shields.io/badge/Ruby%20on%20Rails-8.1-CC0000?logo=rubyonrails&logoColor=white)](https://rubyonrails.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Hosted](https://img.shields.io/badge/Hosted%20SaaS-free%20forever-2fa39a)](https://sampada.vayalabs.in)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

[Features](#what-is-sampada) · [Why Sampada](#why-sampada-vs-other-finance-apps) · [Architecture](#architecture) · [Contributing](#contributing)

</div>

---

## What is Sampada?

Most finance apps are either budgeting tools *or* investment dashboards — rarely both, and never in a defined order. Sampada is the full arc, with one rule baked into the product philosophy:

> **Clear your liabilities before building wealth.**

```
Negative   →    Zero    →   Positive
(in debt)      (free)       (wealthy)
```

The app never blocks you from doing whatever you want with your money — but debt-freedom progress is always front and center on the dashboard, and investment features only carry more weight in the AI's suggestions once debt is under control.

### Core capabilities

- 💳 **Debt payoff tracker** — loans, EMIs, avalanche/snowball strategies, month-by-month payoff simulation
- 📈 **Dividend SIP planner** — AI suggests stocks based on your income target and timeline
- 🔄 **Portfolio rebalancing (v2)** — buy-only contribution engine: position/sector caps, min-order guard rails, a reason chip on every suggestion, CSV import, holdings drawer, and one-click compare with v1
- 💰 **Net-worth overview** — net worth, total debt and investments with recent snapshots on the dashboard
- 🗂️ **Budgets** — monthly per-category limits with usage tracking and on-track status
- 🔔 **Recurring expense reminders** — EMI/subscription calendar, never miss a due date; recurring expenses auto-log their transaction on the due date
- ⚡ **Quick-log** — floating action button + bottom sheet to record an expense in seconds
- 📴 **Offline read-only mode** — cached data stays visible; edits are disabled until you reconnect
- 🤖 **Free AI, by default** — works with free models via OpenRouter, or fully local via Ollama (BYOK — bring your own key)
- 🌍 **Multi-currency** — 32 currencies, auto exchange rates, international exchanges (NYSE, NASDAQ, LSE, TSE, ASX, and more)
- 🇮🇳 **Built for Indian markets** — native NSE/BSE support, EMIs, SIPs, ₹ throughout
- 💬 **Natural-language transactions** — *"I spent ₹500 on groceries"* auto-creates a categorized transaction
- 🔍 **Anomaly detection** — flags unusual spending and budget breaches automatically
- 📊 **Reporting & export** — CSV/JSON export, annual tax-ready reports, goal-progress charts
- 👨‍👩‍👧‍👦 **Household sharing** — multi-user households with role-based access and a shared family dashboard
- ✈️ **Trip expense splitting** — group travel with simplified debt settlement
- 🛡️ **Insurance tracker** — health/term-life/vehicle policies with premium and renewal tracking
- 🎓 **Onboarding tour** — 3-number money snapshot, skippable checklist, plain-language glossary
- 🛡️ **DPDP compliance** — granular consent, data export, erasure requests, grievance redressal

<details>
<summary><b>Release history (v0.1 → today)</b></summary>

| Version | Milestone |
|---|---|
| v0.1 | One-line installer, Docker setup, AI connector |
| v0.2 | Debt Payoff Module (avalanche/snowball, EMI calendar) |
| v0.3 | Dividend SIP Planner (AI stock suggestions, NSE/BSE screener) |
| v0.4 | Portfolio Rebalancing (Modern Portfolio Theory) |
| v0.5 | Recurring Expense Tracker (calendar + notifications) |
| v1.0 | Security audit & standalone architecture |
| Phase 6 | Architecture refinement — routes cleanup (442→57 lines), dead code removal |
| v2.0 | Multi-Currency & International Markets (32 currencies, live exchange rates) |
| v2.1 | Advanced AI — NL budgets, auto-categorization, cash flow forecasting, anomaly detection |
| v2.2 | Reporting & Export — CSV/JSON, annual reports, goal charts |
| v2.3 | Collaboration & Sharing — households, member roles, family dashboard |
| v2.4 | Onboarding tour, Insurance tracker, trip settlement math, Recharts, spec suite 311 green |
| v2.5 | Quick-log expense entry, offline read-only indicator |
| v2.6 | Recurring auto-log on due date, net-worth overview, budget health strip, UI dedup + CSS sweep |
| UI modernization | Design tokens, self-hosted fonts, motion foundation, primitive components + dev styleguide, responsive app shell, themed charts, 3D hero, CI quality gates (#27) |
| Rebalance v2 | Buy-only contribution engine with guard rails, reason chips, CSV import, holdings drawer, sector caps, V1 compare (#27) |
| Reliability | Landing white-page crash fixed (static icon map); mount smoke test hard-gated in CI (#28–#30) |
| Phase 5 | Optimization — modular AI namespace, standardized API responses, 100% schema sync |

</details>

---

## Why Sampada? (vs. other finance apps)

| Feature | **Sampada** | YNAB | Mint† | Empower | Rocket Money |
|---|---|---|---|---|---|
| **Free forever (hosted)** | ✅ | ❌ ~$15/mo | Was free | Freemium | Freemium |
| **Debt-first philosophy** | ✅ Core | Partial | ❌ | ❌ | ❌ |
| Multi-currency | ✅ 32 currencies | ❌ | ❌ | ❌ | ❌ |
| International exchanges | ✅ NYSE/NASDAQ/LSE/TSE | ❌ | ❌ | ❌ | ❌ |
| Indian markets (NSE/BSE) | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| NL transaction creation | ✅ *"I spent ₹500"* | ❌ | ❌ | ❌ | ❌ |
| Anomaly detection | ✅ 3-sigma algorithm | ❌ | ❌ | ❌ | ❌ |
| Cash flow forecasting | ✅ 12-month projection | ❌ | ❌ | ✅ | ❌ |
| Household sharing | ✅ Multi-user | ❌ | ❌ | ❌ | ✅ |
| Free AI options (BYOK) | ✅ OpenRouter/Ollama | ❌ | ❌ | ❌ | ❌ |
| Local AI (Ollama) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Open source (Apache 2.0) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Portfolio rebalancing | ✅ | Limited | Basic | ✅ | ❌ |
| SIP planning | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reporting & export | ✅ CSV/JSON/annual | ✅ | ❌ | ✅ | ✅ |
| DPDP/GDPR compliance | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |

<sub>† Mint shut down March 2024</sub>

**What makes Sampada different:**

1. **Philosophy-first** — "debt first, then wealth" isn't a feature, it's the foundation
2. **Free forever** — hosted SaaS with no subscription, no data mining, no surveillance capitalism
3. **Free AI from day one** — BYOK (bring your own key) means no AI cost burden on you or us
4. **Multi-currency from day one** — 32 currencies, live exchange rates, global market support
5. **Built for India** — NSE/BSE, EMIs, SIPs, ₹ currency, not bolted on as an afterthought
6. **Privacy-first** — DPDP compliant, granular consent, full data portability, erasure on request
7. **Community-driven** — features serve users, not shareholders

---

## The Journey

**Phase 1 — Debt Freedom.** List all loans and EMIs. Sampada suggests a payoff order — avalanche (highest interest first) or snowball (smallest balance first) — tracks monthly progress, and projects your debt-free date.

**Phase 2 — Foundation Building.** Once debt is healthy, SIP suggestions activate. Set a monthly contribution — even ₹500 works — and the AI picks 2–3 dividend stocks aligned with your timeline and goals.

**Phase 3 — Income Target.** Define the goal: *"₹25,000/month passive income by 2030."* Sampada reverse-engineers the path — SIP amount, stock picks, rebalance cadence — and checks in every month.

---

## Getting Started

### For Users
Sign up at [https://sampada.vayalabs.in](https://sampada.vayalabs.in) — no installation needed.

### For Developers

```bash
git clone https://github.com/sdachary/sampada.git
cd sampada
cp .env.example .env
# Edit .env — set SECRET_KEY_BASE, POSTGRES_PASSWORD, BETTER_AUTH_VERIFY_URL at minimum
docker compose up -d
curl http://localhost:3002/up          # API health check
```

**Frontend (run separately — it deploys to Cloudflare Pages, not Rails):**

```bash
cd frontend
npm install
npm run dev                            # http://localhost:5173, proxies /api → :3002
```

---

## AI Assistant — Bring Your Own Key

Sampada works with any OpenAI-compatible endpoint, and the free options work great out of the box.

| Provider | Cost | Notes |
|---|---|---|
| **OpenRouter** | Free tier | Llama 3.1 70B, Gemma 2, Mistral — all free |
| **Ollama** | Free (local) | Runs on your own machine, no data leaves |
| **Anthropic** | Paid | Claude — best quality |
| **OpenAI** | Paid | GPT-4o mini — good balance |
| **Custom** | Varies | Any OpenAI-compatible endpoint |

Configure under **Settings → AI Assistant** in the app.

---

## Architecture

Sampada is a **Rails 8.1 API-only backend** + **React 19/Vite SPA frontend**, deployed as a hosted SaaS.

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7, hand-rolled CSS design tokens (no framework), motion (LazyMotion) animations, Recharts 3, lucide-react, lazy Three.js/R3F hero |
| **Backend** | Ruby on Rails 8.1 (API-only), PostgreSQL 16, Redis, Sidekiq |
| **Background jobs** | Sidekiq + Sidekiq-Cron (market data, FX sync, recurring auto-log, backups, reminders) |
| **Auth** | Better-Auth (shared identity service, JWT verification per request) |
| **AI** | Modular `Ai::` namespace, pluggable providers (Ollama, OpenRouter, etc.), BYOK |
| **API** | Standardized JSON response layer (`Api::BaseController`) with global exception handling |
| **Multi-currency** | Exchange rates fetched from Yahoo Finance, cached in DB, refreshed every 6 hours |
| **Export** | CSV and JSON export across all financial modules |
| **Households** | Multi-user sharing with role-based access control |
| **DPDP Compliance** | Granular consent, full data export, erasure workflow, grievance redressal |
| **Testing** | RSpec + FactoryBot + SimpleCov (413 examples green); frontend: oxlint, node --test, Playwright |
| **CI gates** | RuboCop, Brakeman, gitleaks, RSpec; size-limit, Lighthouse CI, mount smoke test (hard gate), axe + visual smoke (warn only) |
| **Deployment** | Docker Compose + sops secrets on shared VM (oradb); frontend on Cloudflare Pages |

---

## Roadmap

Full plan: [`docs/roadmap-updated.md`](docs/roadmap-updated.md). Everything already shipped is in the [release history](#what-is-sampada) above.

**Upcoming (no locked date):**

- 🔜 **PWA polish** — full offline support beyond the read-only indicator (shipped v2.5), true offline queueing
- 🔜 **Biometric auth** — platform biometrics on supported devices

**Won't do:**

- ❌ **Push notifications** (2026-09-12) — email reminders already cover EMI/due-date notifications; not in the roadmap

---

## Why Open Source?

1. **Your data stays yours** — open source, Apache 2.0, you can self-host if you want
2. **Audit your finances** — full transparency, inspect the code that handles your money
3. **No vendor lock-in** — fork it, modify it, host it forever
4. **Community-driven** — features serve users, not shareholders
5. **Apache 2.0 licensed** — permissive open-source license, free to use and modify
6. **Free AI options** — unlike commercial apps, no forced subscription for AI features
7. **Contribute back** — add exchange support, improve debt algorithms, share with everyone

---

## Contributing

Read [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) before opening a PR.

The short version: contributions should serve the philosophy — debt first, then wealth. Features that undermine that priority won't be merged, regardless of technical quality.

---

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

*Sampada (संपदा) means wealth in Sanskrit.*
*The name is aspirational — but you have to get to zero first.*

</div>