# 1.1 Backend — Bank Statement PDF Import

Status: ready · Free · Est: 18 pts · Flag: `pdf_import`

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
- The table is found from its **header row**: the labels map to columns
  (`date`, `description`, `debit`, `credit`, `balance`) through a label map, so "Withdrawal /
  Deposit / Particulars / Closing Balance" parse like "Debit / Credit / Description / Balance".
  A cell belongs to the nearest header to its left (statements left-align their columns).
- Extraction per row: `{transaction_date, description, merchant, amount, transaction_type,
  confidence, duplicate, source: "bank_pdf", page}` — a `Import::BankPdfParser::Transaction`
  struct. The debit column present ⇒ `expense`, the credit column ⇒ `income`. Interest/charges
  rows are **not** pruned: the metadata (`source`, page) lets the UI flag them, and a row the
  parser cannot read is skipped rather than guessed.
- Statement-level integrity check: if balance deltas match row amounts in ≥90% of rows, trust
  level high; else cut global base confidence (UI shows "verify carefully" banner).
- Confidence per row `0.0–1.0`:
  - +0.9 base for a clean tabular row whose `balance[i] − balance[i-1]` equals the row amount
  - +0.7 when there is no balance to compare against (first row, or no balance column)
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
- `spec/services/import/bank_pdf_parser_spec.rb`: the statements are **generated, not committed**
  — `spec/support/pdf_statement_builder.rb` writes a minimal but valid PDF (one page, Helvetica,
  positioned cells) so the fixture content stays readable inside the spec and no extra gem
  (Prawn) is needed. Cases: ICICI-shaped table, other column labels (SBI), unknown bank,
  encrypted PDF, garbage bytes, a page without a header row, fuzzy date, fallback amount,
  duplicate rows, a balance that does not add up, rows that cannot be read.
- `request_spec.rb`: happy path (upload→poll→confirm 0 dup), duplicate re-upload returns same id,
  confirm idempotency (two same confirms ⇒ one row set), unauthorized 401, oversized 422.
- `job_spec.rb`: enqueue on create, failure marks failed with error json.

## Rollback
Feature flag hides FE entry & endpoint returns 501 when off. Migration is additive only
(`DROP TABLE statement_imports` reverts safely, no FK into transactions beyond jsonb).
