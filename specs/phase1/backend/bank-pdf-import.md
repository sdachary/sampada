# 1.1 Backend — Bank Statement PDF Import

Status: ready · Free · Est: 18 pts · Flag: `feature-bank-pdf-import`

## What
User uploads a bank statement PDF (max 10 MB, 4 pages typical). We extract transactions,
score confidence, and return them for review before anything is saved.

## Dependencies
- **New gem:** `pdf-reader` (pure Ruby, no native deps, MIT). Add to Gemfile.
- Rails + Sidekiq only. No AI, no external service, no ML.

## Architecture
```
POST /api/v1/imports/bank-statement        (auth required, multipart, PDF)
  → Import::BankStatementController#create validates mime/size
  → enqueues ImportStatementJob, returns { import_id, status: "queued" }
GET  /api/v1/imports/:id                    (poll, 2s interval)
  → { status: done|failed, transactions: [...], duplicate_count, bank, period }

POST /api/v1/imports/:id/confirm            (idempotent via Idempotency-Key header)
  → body: { transactions: [ {transaction_date, description, merchant?, amount,
            transaction_type, category_id?, skip? } ] }
  → creates Transactions in bulk, links import, returns created count
```

## New table (migration)
```ruby
create_table :statement_imports, id: :uuid do |t|
  t.references :user, type: :uuid, null: false
  t.string  :status, null: false, default: "queued"  # queued|processing|done|failed
  t.string  :bank, null: false                        # icici|hdfc|sbi|axis|kotak|unknown
  t.string  :file_digest, null: false                 # sha256, dedupe
  t.integer :file_size, null: false
  t.jsonb   :result, default: {}                      # parsed rows + confidence
  t.jsonb   :error, default: {}
  t.timestamps
end
add_index :statement_imports, [:user_id, :file_digest], unique: true
```
Re-run of the same file returns the existing import (no new job). Ponnytail note:
`# ponytail: single digest index, per-bank dedupe only if users import multiple banks' fixes often`.

## Parser design — `app/services/import/bank_pdf_parser.rb`
- 1 archetype: **tabular credit/debit columns** (ICICI, SBI, Axis variations of it) +
  datetime/amount regex bank map. Start with a generic table-row parser + per-bank regex map —
  not one class per bank; add a bank class only when a statement won't parse generically.
- Extraction per row: `{date, description, ref_no?, debit?, credit?, balance}` where debit is
  present (nil) ⇒ amount sign. Type = debit ? :expense : :income. Prune interest/charges noise
  via metadata (`source: "bank_pdf"`, original page).
- Statement-level integrity check: if balance deltas match row amounts in ≥90% of rows, trust
  level high; else cut global base confidence (UI shows "verify carefully" banner).
- Confidence per row `0.0–1.0`:
  - +0.9 base for a clean tabular row whose `balance[i] − balance[i-1]` equals the row amount
  - −0.3 fuzzy date parse (e.g. "01 Apr, 24" format quirks)
  - −0.5 amount parsed with regex fallback (comma/spacing weirdness)
  - Rows < 0.6 still returned but pre-flagged in the UI for manual edit — never silently dropped.
- Unknown bank ⇒ still try generic parser; mark `bank: "unknown"`, confidence shave ×0.7.
- Job: `ImportStatementJob` (Sidekiq, queue `imports`, retry 1, hard cap 2 min via parse timeout
  `Timeout.timeout(90)`; on timeout write `result.error = "parse_timeout"` and mark failed).
- **Do not ever store the raw PDF bytes after parse** — expunge after `result` is written
  (privacy/limits: parsed only, then delete file). 24h retention on `done` imports, then cleanup
  by sidekiq-cron.

## Error handling (API contract)
| Case | Code | Body |
|---|---|---|
| Not PDF / >10 MB | 422 | `{error: "invalid_file", reason}` |
| Wrong mime but pdf ext | 422 | `{error: "not_a_pdf"}` |
| Encrypted PDF | 422 | `{error: "encrypted_pdf", hint: "Save without password"}` |
| Parse timeout / 0 txns | 200 `done` | `{status: done, transactions: []}` (UI shows "couldn't find table") |
| Duplicate hash re-upload | 200 | existing import record (status whatever it was) |
Duplicate transactions vs DB: compare on
`(user_id, transaction_date, amount, normalized merchant prefix 12 chars)` in-memory set during
parse; `duplicate_count` reported, rows flagged not blocked.

## Tests (RSpec)
- `parser_spec.rb`: fixtures in `spec/fixtures/statements/` — one real-ish PDF per bank (generate
  via script in `lib/tasks/statement_fixtures.rake` using Prawn in dev only) — ICICI, SBI, unknown
  bank, encrypted, garbage-text PDF.
- `request_spec.rb`: happy path (upload→poll→confirm 0 dup), duplicate re-upload returns same id,
  confirm idempotency (two same confirms ⇒ one row set), unauthorized 401, oversized 422.
- `job_spec.rb`: enqueue on create, failure marks failed with error json.

## Rollback
Feature flag hides FE entry & endpoint returns 501 when off. Migration is additive only
(`DROP TABLE statement_imports` reverts safely, no FK into transactions beyond jsonb).
