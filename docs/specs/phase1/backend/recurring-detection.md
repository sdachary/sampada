# 1.2 Backend — Recurring Transaction Detection

Status: ready · FREE · Est: 13 pts · Flag: `recurring_detection`
Infra cost: $0 (pure SQL/Ruby over existing data).

## What
A one-click "Detect from history" that scans the user's existing transactions and proposes
`recurring_expenses` records. Extends the **existing** `RecurringExpense` +
`RecurringExpenseService` — no new tables except one small detection-cache table.

## Dependencies
- Existing `transactions` table (has `description`, `merchant`, `amount`, `transaction_type`,
  `recurring_expense_id` unique-index link).
- Existing `recurring_expenses` CRUD API (`Api::RecurringExpensesController`) — proposed records
  are created through the normal create path so permissions/validations stay single-sourced.

## New migration
```ruby
create_table :recurring_detections, id: :uuid do |t|
  t.references :user, type: :uuid, null: false
  t.jsonb   :suggestions, default: []
  # [{merchant_norm, amount_avg, amount_sd, frequency, next_due_date,
  #   example_tx_ids:[uuid], confidence: 0.0-1.0, status:"pending"|"accepted"|"rejected"}]
  t.string  :result_version, null: false, default: "v1"
  t.timestamps
end
add_index :recurring_detections, [:user_id, :result_version], unique: true
```
One row per user, overwritten per run. If pending suggestions exist, `POST /detect` returns
409 with existing pending set unless `force: true` (prevents accidental re-run wiping review).

## Algorithm — `app/services/recurring_detection_service.rb`
Pure, synchronous, no Sidekiq (users have ≤ tens of thousands of txns; a single query-set +
in-memory pass is <100 ms; if p95 >250 ms later, move to job —
`# ponytail: sync run, job only if measured slow`).

Steps on user's txns from last 12 months, `transaction_type: "expense"`:
1. **Normalize merchant**: lowercase, strip digits, card masks (`XXXX1234`), UPI refs
   (`UPI/.../payee/...` → take the payee token), whitespace collapse → `merchant_norm`.
2. **Cluster** rows by `merchant_norm`; drop clusters with <3 occurrences.
3. **Frequency fit** per cluster: median gap in days; classify
   `daily (~1)` / `weekly (7±2)` / `monthly (28–32)` / `quarterly (88–95)` / `yearly (355–375)`;
   else omit.
4. **Amount trim**: median amount, drop >25% outliers, require coefficient of variation ≤ 0.2.
   Spec note: real bills fluctuate; ±20% is the correct bound — ±5% was unrealistic.
5. **Rule-overlap guard**: skip clusters whose members are already linked to an active
   `recurring_expense` (`recurring_expense_id` present) — idempotent re-runs safe.
6. **Confidence** = `0.4*frequency_fit + 0.3*amount_score + 0.3*regularity_score`
   (regularity = 1 − (stdev of gaps / median gap)). Suggest only ≥ 0.6, ranked desc.
7. `next_due_date` = last tx date + median gap (clamped to a future date).

Suggestions are **proposals only**. Nothing is created until the user accepts (frontend POSTs
through the existing create endpoint per accepted row, with
`metadata: {source: "detection", detection_id, example_tx_ids}` to link txns; linking marks those
txns `recurring=true` via the existing association).

## API
```
POST /api/v1/recurring_detection/detect            → runs scan, returns suggestions
GET  /api/v1/recurring_detection                    → last saved suggestions + statuses
PUT  /api/v1/recurring_detection/suggestions/:idx   → {status: accepted|rejected|edited(+fields)}
```
`accepted` with `create_recurring: true` (default) goes through the normal
`RecurringExpenseService` create + txn linking in one DB transaction; failures return 422 with
the row untouched.

## Error handling
- <3 txns total ⇒ `200 {suggestions: []}` (frontend shows "not enough history yet").
- Huge user (>50k txns) ⇒ `422 {error: "sync_limit"}`; job-ify later if real.
- Concurrent detect (double click) ⇒ 409 unless `force: true`.

## Tests (RSpec)
- `recurring_detection_service_spec.rb`: synthetic txns — clean monthly rent, income excluded,
  UPI noise merchant, already-linked cluster skipped, quarterly recognized, CV>0.2 rejected.
- `request_spec.rb`: detect→accept creates recurring_expense + links txns (unique-index holds),
  double-accept is 409, `force` re-run keeps accepted/rejected decisions.
