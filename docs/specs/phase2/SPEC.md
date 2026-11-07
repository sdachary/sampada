# Phase 2 — Ecosystem (Weeks 5–12) — SPEC PLACEHOLDER

Detailed specs are authored at phase kickoff, one week before build starts. Outlines below are
the committed scope; the task list in Notion carries the estimates.

## Scope
| # | Feature | Model | Notes |
|---|---------|-------|-------|
| 2.1 | Account Aggregator (Sahamati) | FREE — partner covers per-consent costs | Requires AA license partner agreement BEFORE build. Consent artifact flow, FI data fetch, webhook sync. |
| 2.2 | Direct MF investment (BSE StarMF/MF Central) | FREE — trail revenue | Requires AMC/distributor code + RIA/ARNA approvals FIRST (compliance-dependent, not eng-dependent). Order lifecycle, eNACH mandates, NAV sync. |
| 2.3 | Recurring expense lifecycle | FREE | Auto-generation on due dates (sidekiq-cron, idempotency keys), skip/pause, calendar expiry, ICS export. |

## Hard external dependencies (long lead time — start now)
- AA partner agreement + sandbox credentials (4–8 wks: Sahamati onboarding).
- ARN registration + StarMF API key (6–12 wks, AMFI/Nuvama/RF process).
Both are business tasks, not engineering. If either slips, Phase 2 swaps in advanced recurring
automation (leads: unlimited templates, envelope rollover) to keep the sprint cadence.

## Build rules
- Same gates as Phase 1. Provider creds live server-side only; never in FE. Every provider call
  wrapped in a Faraday client, webmock'd in tests.
- Cost model: AA per-consent ~₹2–4 (partner-funded); StarMF per-order ~₹0. Trail: 0.5–1% p.a.
  of AUM streams to ARN holder — at ₹10 Cr AUM ⇒ ₹50–100K/mo recurring.
