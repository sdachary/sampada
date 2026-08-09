<div align="center">


### Zero is better than negative.

**A free-forever, hosted personal finance web app that takes you from debt → zero → wealth.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Ruby on Rails](https://img.shields.io/badge/Ruby%20on%20Rails-7.2-CC0000?logo=rubyonrails&logoColor=white)](https://rubyonrails.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Hosted](https://img.shields.io/badge/Hosted%20SaaS-free%20forever-2fa39a)](https://sampada.pages.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

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
- 🔄 **Portfolio rebalancing** — Modern Portfolio Theory, monthly check-ins, on/off-track status
- 🔔 **Recurring expense reminders** — EMI/subscription calendar, never miss a due date
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
<summary><b>Release history (v0.1 → v2.3)</b></summary>

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
| Phase 5 | Optimization — modular AI namespace, standardized API responses, 100% schema sync |

</details>

---

## Why Sampada? (vs. other finance apps)

| Feature | **Sampada** | YNAB | Mint† | Empower | Rocket Money |
|---|---|---|---|---|---|---|
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
| Open source (AGPL-3.0) | ✅ | ❌ | ❌ | ❌ | ❌ |
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
Sign up at [https://sampada.pages.dev](https://sampada.pages.dev) — no installation needed.

### For Developers

```bash
git clone https://github.com/sdachary/sampada.git
cd sampada
cp .env.example .env
# Edit .env — set SECRET_KEY_BASE, POSTGRES_PASSWORD, BETTER_AUTH_VERIFY_URL at minimum
docker compose up -d
open http://localhost:3002
```

**Note:** The frontend is deployed separately on Cloudflare Pages. For local development, run the frontend separately:

```bash
cd frontend
npm install
npm run dev
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

Sampada is a **Rails 7.2 API-only backend** + **React 19/Vite SPA frontend**, deployed as a hosted SaaS.

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router, Recharts (charts) |
| **Backend** | Ruby on Rails 7.2 (API-only), PostgreSQL 16, Redis, Sidekiq |
| **Background jobs** | Sidekiq + Sidekiq-Cron (market data, exchange rates, maintenance) |
| **Auth** | Better-Auth (shared identity service, JWT verification) |
| **AI** | Modular `Ai::` namespace, pluggable providers (Ollama, OpenRouter, etc.), BYOK |
| **API** | Standardized JSON response layer (`Api::BaseController`) with global exception handling |
| **Multi-currency** | Exchange rates cached from Yahoo Finance/Alpha Vantage, refreshed every 6 hours |
| **Export** | CSV and JSON export across all financial modules |
| **Households** | Multi-user sharing with role-based access control |
| **DPDP Compliance** | Granular consent, full data export, erasure workflow, grievance redressal |
| **Deployment** | Docker Compose on shared VM (oradb) alongside other AcharyaLab products |

---

## Roadmap

Full plan: [`docs/roadmap-updated.md`](docs/roadmap-updated.md)

- ✅ v0.1 — Installer + Docker setup + AI connector
- ✅ v0.2 — Debt payoff module
- ✅ v0.3 — Dividend SIP planner
- ✅ v0.4 — Portfolio rebalancing
- ✅ v0.5 — Recurring expense tracker
- ✅ v1.0 — Security audit & standalone architecture
- ✅ Phase 6 — Architecture refinement
- ✅ v2.0 — Multi-currency & international markets
- ✅ v2.1 — Advanced AI features
- ✅ v2.2 — Reporting & export
- ✅ v2.3 — Collaboration & sharing
- ✅ v2.4 — Onboarding tour, Insurance tracker, correctness fixes
- ✅ Phase 5 — Optimization & refactoring
- 🔜 **v2.5** — PWA, offline support, push notifications
---

## Why Open Source?

1. **Your data stays yours** — open source, AGPL-3.0, you can self-host if you want
2. **Audit your finances** — full transparency, inspect the code that handles your money
3. **No vendor lock-in** — fork it, modify it, host it forever
4. **Community-driven** — features serve users, not shareholders
5. **AGPL-3.0 licensed** — any hosted version must share improvements back
6. **Free AI options** — unlike commercial apps, no forced subscription for AI features
7. **Contribute back** — add exchange support, improve debt algorithms, share with everyone

---

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

The short version: contributions should serve the philosophy — debt first, then wealth. Features that undermine that priority won't be merged, regardless of technical quality.

---

## License

[AGPL-3.0](LICENSE) — fork freely, contribute back when you can.

---

<div align="center">

*Sampada (संपदा) means wealth in Sanskrit.*
*The name is aspirational — but you have to get to zero first.*

</div>