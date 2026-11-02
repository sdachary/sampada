# Rebalancing v2: feature spec for Claude Code / OpenCode

Add an investment rebalancing feature to the existing app, using an improved allocation engine.
This replaces the v1 logic in `rebalance.md` (kept only behind a "Compare with v1" toggle).
It suggests how to deploy a monthly contribution. It never sells and never places orders.
Not investment advice; defaults are placeholders the user must review.

## 0. Read this first (audit before coding)

1. Do **T0** in section 10 first: read the repo, find the stack, where holdings data lives, the design system and component library, state management, test setup, and how prices (LTP) are obtained.
2. Reuse what exists. Do not add a second design system, state library or test runner. Match the app's existing visual style and components.
3. The reference engine is in `reference/` (`rebalanceEngine.mjs`, `rebalanceEngine.test.mjs`, `seed.mjs`). It is the source of truth for behaviour. Port it to the app's language (TypeScript) without changing results; the tests contain golden numbers.
4. If something here conflicts with the repo, say so in `docs/rebalance-audit.md` and ask; do not choose silently.

## 1. What is wrong with v1 (why v2 exists)

Checked by running v1 on the seed portfolio (₹21,000 contribution, 60/40 split):

1. **"Momentum" is return since your average cost.** That reflects when you bought, not current trend. It sends about two-thirds of the growth pool to the two biggest winners.
2. **No weights or caps.** HFCL is already about 15% of the portfolio and still gets 12 more shares (₹2,637).
3. **Equal rupees per dividend stock** ignores how big each position already is.
4. **Cash gets stuck.** CUMMINSIND is allocated about ₹2.9k but one share costs ₹4,434, so that cash falls into the leftover pool.
5. **Dip bonus averages down on every stock below -10%**, whatever its trend or your conviction: ₹7,086 went into such stocks.
6. **Leftover cash is rebuilt only through dip stocks**, leaving ₹900 unspent after 16 small orders. Many tiny orders add charges and noise.
7. **Undefined cases:** the "shortfall" input has no definition, and a missing sleeve (no dividend stocks, no positive growth stocks) silently strands its pool.

## 2. What v2 does

Buy-only, contribution-based rebalancing: new cash goes to the most underweight positions, inside guard rails.

- Keeps the user's **Dividend / Growth contribution split** (default 60/40).
- Inside each sleeve, targets come from `targetMode`: `equal` (default), `current` (spread by current value), `invested` (by cost), or a per-stock `targetWeight` (always wins).
- Cash flows to each stock's **gap** (target value minus current value), scaled to the pool. Surplus goes pro rata by target weight.
- **Guards:** max position weight (default 10%), max sector weight (default 25%, only if sectors are set), max share of a sleeve pool per stock (30%), min order value (₹500), max orders per run (8), a per-stock **Pause**.
- **Dip boost** is opt-in: a stock below the dip threshold gets a target-weight boost only if the user marks it **conviction** or its trend is `up`. Otherwise it gets no boost and the table says why.
- **Whole shares:** buy where at least half a share is still owed, then sweep leftover cash into still-underweight stocks. Leftover ends below the price of one share of an eligible stock.
- **Explainable:** every row carries reasons ("Underweight by ₹3,090", "At position cap: no buy", "Paused by you").
- Cash held back for charges (`feeReservePct`, default 0.3%). Verify against your broker's contract note.

Optional tilts (only if data is supplied): `mom6m` (6-month return) tilts targets by z-score (needs 3+ stocks); `trend: 'down'` without conviction halves the target weight.

## 3. Types

```ts
type InstrumentType = 'Dividend' | 'Growth';

interface HoldingPosition {
  instrument: string;
  quantity: number;            // whole shares; 0 is allowed (watchlist)
  avgCost: number;
  ltp: number;                 // 0 or missing => excluded with a warning
  type: InstrumentType;
  // optional, all default to unset
  sector?: string;
  targetWeight?: number;       // relative weight inside its sleeve, > 0
  conviction?: boolean;        // "I would average down on this one"
  paused?: boolean;            // "do not buy this month"
  trend?: 'up' | 'down';
  mom6m?: number;              // e.g. 0.12 = +12% over 6 months
}

interface RebalanceConfig {
  contribution: number; dividendRatio: number; growthRatio: number;
  dipThreshold: number;        // -0.10
  dipBoost: number;            // 1.25
  trendDownPenalty: number;    // 0.5
  momentumTilt: number;        // 0.25
  maxPositionWeight: number;   // 0.10 of portfolio after the buy
  maxSectorWeight: number;     // 0.25
  maxAddShare: number;         // 0.30 of a sleeve pool per stock
  feeReservePct: number;       // 0.003
  minOrderValue: number;       // 500
  maxOrders: number;           // 8
  targetMode: 'equal' | 'current' | 'invested';
}
```

Result rows add: `performancePct, weightBefore, weightAfter, dividendAllocation, growthAllocation, totalAllocation, suggestedQty, actualCost, action ('BUY'|'HOLD'), reasons[]`.
Summary adds: pools, `totalActualCost`, `leftoverCash`, `orders`, `portfolioBefore/After`, concentration (top 1, top 5, HHI) before and after, `driftBefore/After`, sleeve mix before and after. `warnings[]` for excluded instruments and moved pools.

## 4. Algorithm (matches `rebalanceV2` in the reference)

1. **Value:** `V = sum(qty * ltp)` over priced rows. `spendable = contribution * (1 - feeReservePct)`. `Vafter = V + contribution`.
2. **Pools:** normalise the ratios; `Dividend pool = spendable * share`, `Growth pool = the rest`. A sleeve with no priced stock moves its pool to the other sleeve (warn).
3. **Weights per sleeve:** base = `targetWeight` or the `targetMode` value. Paused = 0. Apply momentum tilt, trend-down penalty, and the gated dip boost. Normalise.
4. **Gaps:** `target_i = w_i / sum(w) * (sleeve value + pool)`; `gap_i = max(0, target_i - value_i)`. `headroom_i = min(max(0, maxPositionWeight * Vafter - value_i), max(maxAddShare, 1/n) * pool)`.
5. **Water-fill:** if total wanted (gap limited by headroom) >= pool, scale it down; else fill gaps, then spread the surplus by weight within remaining headroom (iterate). Unplaced cash carries to the other sleeve.
6. **Order limits:** keep allocations >= `minOrderValue`, at most `maxOrders` (largest first; keep at least one). Re-run step 5 over survivors only.
7. **Whole shares, pass 1:** repeatedly buy one share of the stock with the most of a share still owed (>= 0.5), unless blocked (paused, price > cash, position cap, sector cap).
8. **Whole shares, pass 2 (sweep):** with leftover cash, repeatedly buy one share of the stock with the largest remaining target gap (new orders only while under `maxOrders`).
9. **Output rows, summary and reasons.** All money values rounded to 2 decimals.

Rounding is per-share, never fractional. The function is pure and deterministic: no randomness, no I/O, no UI imports.

## 5. Golden results (seed portfolio, ₹21,000, defaults)

| | v1 | v2 |
|---|---|---|
| Spent | ₹20,099.58 | ₹20,936.57 |
| Left over | ₹900.42 | ₹63.43 (reserve for charges) |
| Orders | 16 | 8 |
| Added to positions already above the 10% cap | ₹2,637 | ₹0 |
| Added to the two biggest winners | ₹2,637 | ₹0 |
| Top-5 weight after | 47.0% | 44.1% |
| HHI after | 0.0708 | 0.0664 |
| Distance from equal weights inside sleeves | 24.9% | 21.4% |
| Added to stocks down more than 10% | ₹7,086 | ₹5,661 |

v2 buys: APOLLOTYRE 5, BIRET 6, EMBASSY 5, HINDZINC 7, IDEA 199, ITC 5, ONGC 17, POWERGRID 14.

**Be honest about two things in the UI and docs:**
- With default **equal** targets the smallest positions look the most underweight, so cheap, weak stocks (IDEA here) still attract cash. That is why per-stock **Target weight** and **Pause** are first-class controls, and why the UI should prompt the user to review targets before relying on the output.
- Buy-only cannot reduce an existing overweight (HFCL stays about 13.6% after). It only stops adding to it.
- "Better" means better allocation quality: less concentration, less idle cash, fewer orders, explainable choices. It does not promise higher returns.

Other target modes on the same data: `invested` spent ₹20,901.11 (orders: COALINDIA, HINDZINC, IEX, ITC, ONGC, POWERGRID, RCF, RVNL); `current` spent ₹18,553.25 with more cash left over.

## 6. UI requirements

Match the existing app's design system, layout and components. Mobile first.

1. **KPI bar:** Contribution (editable, default ₹21,000), Dividend pool, Growth pool, Total actual cost, Leftover cash, Orders count, Charges reserve.
2. **Controls:** split slider (default 60/40), dip threshold slider (default -10%), target mode, max position weight, max sector weight (shown only when sectors are set), max orders, min order value, charges reserve %. A "Reset to defaults" action.
3. **Per-stock controls:** Type (Dividend / Growth), Target weight, Pause, Conviction, optional Sector.
4. **Rebalance table** (cards on narrow screens): Instrument, Type, Qty, Avg cost, LTP, Performance % (green/red plus an icon or sign, not colour alone), Weight now, Target weight, Allocation, Suggested qty (bold), Cost, Weight after, Action badge (BUY / HOLD), Why (reasons as short chips). Sortable; BUY rows first by default.
5. **Before / after panel:** sleeve mix, top-5 weight, drift. Small, no heavy charts.
6. **Compare with v1** toggle (reference `rebalanceV1`): show v1 and v2 side by side with the golden-table metrics.
7. **Holdings drawer:** Instrument, Qty, Avg cost, LTP, Invested, Current value, P&L, Net change %. "Add stock" and "Import CSV" (paste or file) with validation and a preview before applying.
8. **Warnings area** for excluded instruments, moved pools and stale prices.
9. **Formatting:** `en-IN`, `₹`, 2 decimals (for example ₹20,099.58). Percentages to 1 decimal.
10. States: empty, loading, error. Keyboard accessible. Recalculate live on every input change.
11. Footer note: suggestions only, check live prices and charges before ordering, not investment advice.

## 7. Prices and data

- Default: LTP is editable and stored with an "as of" time. Show a stale-price warning past a configurable age.
- A live price source is optional and goes behind an adapter. Use the app's existing source if it has one. Do not scrape any site without checking its terms. `mom6m` and `trend` are optional inputs from the same adapter and may be absent.
- Persist per-stock settings (type, targetWeight, conviction, paused, sector) and the config with the app's existing storage. Add a migration if the app uses a database.

## 8. Edge cases and validation (all must be covered by tests)

Zero contribution; tiny contribution; contribution larger than everything affordable; no Dividend stocks; no Growth stocks; all stocks paused; `ltp` 0 or missing; quantity 0 (watchlist); all stocks at the position cap; sector above its cap already; ratios not summing to 1 (normalise); both ratios 0 (reject); duplicate instruments (reject with a message); non-integer quantity (floor, warn); one share costs more than the whole contribution.

## 9. Tests

Port `reference/rebalanceEngine.test.mjs` unchanged in meaning: golden v1 and v2 numbers, invariants on 300 random portfolios (cost <= contribution, leftover >= 0, integer quantities, orders <= limit, paused never bought), determinism, sector cap, conviction gating. Add UI tests for recalculation on input, the v1 toggle, CSV import validation and the formatting.

## 10. Tasks

**T0. Audit (no code).** Write `docs/rebalance-audit.md`: stack, routes, data model for holdings, existing components and tokens, state and storage, test runner, price source, and any conflicts with this spec. Questions for the owner go at the end. *Done when* committed. Stop and report.

**T1. Engine.** Port the engine and types to `lib/rebalance/` (pure, no UI imports). Port the tests. *Done when* the golden numbers match exactly and all tests pass.

**T2. Data wiring.** Map existing holdings to `HoldingPosition`. Persist per-stock settings and config. *Done when* settings survive a reload.

**T3. Main screen.** KPI bar, controls, table or cards, reasons, before/after panel. *Done when* every input recalculates live and matches engine output.

**T4. Compare with v1.** Toggle and metrics. *Done when* the golden table is reproduced on the seed.

**T5. Holdings management.** Drawer, add, edit, CSV import with preview and validation. *Done when* bad rows are reported, not silently dropped.

**T6. Polish.** States, accessibility, narrow screens, performance (recalculation under 10 ms for 200 rows; memoise), disclaimer. *Done when* the checks in section 8 pass in the UI.

**T7 (optional, later).** Price and momentum adapter; a history simulation comparing v1 and v2 over past months, if the app stores contribution history.

Report after each task: files changed, tests run and results, anything unverified, and the next task.

## 11. Seed data

`reference/seed.mjs` holds the 23-instrument portfolio from `rebalance.md`. Use it for tests and as the demo default only. It is sample data; never ship it as a user's real portfolio.
