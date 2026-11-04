# Phase 3 — Intelligence (Weeks 13–20) — SPEC PLACEHOLDER

Detailed specs authored at phase kickoff. Scope commitments:

| # | Feature | Model | Notes |
|---|---------|-------|-------|
| 3.1 | AI transaction categorization | PRO (₹99/mo) | Learns from user corrections; LightGBM via ONNX or cheap LLM batch; confidence ≥0.85 auto-applies, else review queue. |
| 3.2 | Family plan (household) | PRO (₹149/mo) | Extends existing `households` + `household_members` — this is already partly built (free today); Pro adds invites beyond N, activity feed, per-member roles. **Do not gate core household sharing** — only the advanced layer. |
| 3.3 | Tax optimizer | PRO (₹199/mo or ₹999/yr) | 80C/80D/24(b) coverage, regime compare, capital gains (FIFO), tax-loss harvesting simulations. Versioned FY rule packs. Disclaimer: informational, not advice. |

Infra delta: ~$50/mo (LLM batching + small GPU-less model hosting on existing servers).
Philosophy: AI assists silently (categorization, insights) — it never gates free actions.
