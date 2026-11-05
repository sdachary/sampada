# 1.1 Backend — Bank Statement PDF Import

Status: shipped (parser + API) · Free · Est: 18 pts · Flag: `pdf_import`

## What
User uploads a bank statement PDF (max 10 MB, 4 pages typical). We extract transactions,
score confidence, and return them for review before anything is saved.

## Dependencies
- **New gem:** `pdf-reader` (pure Ruby, no native deps, MIT). Added in #61.
- Rails + Sidekiq only. No AI, no external service, no ML.

## Architecture
```
POST /api/v1/imports/bank-statement        (auth required, multipart, PDF)
  → Api::ImportsController#create validates mime/size/content
  → stores the bytes as an ActiveStorage attachment, enqueues ImportStatementJob
  → returns { import_id, status: "queued" }
GET  /api/v1/imports/:id                    (poll, 2s interval)
  → { status: queued|processing|done|failed, bank, trust, transactions: [...],
      duplicate_count, period: {from,to} }

POST /api/v1/imports/:id/confirm
  → body: { transactions: [ {transaction_date, description, merchant?, amount,
             transaction_type, category_id?, skip? } ] }
  → creates Transactions in bulk, marks the import confirmed, returns the counts
```
The flag `pdf_import` is checked first: when it is off the endpoints answer **501** and the
frontend hides the entry.

## New table (migration)
```ruby
create_table :statement_imports, id: :uuid do |t|
  t.references :user, type: :uuid, null: false, foreign_key: true
  t.string  :status, null: false, default: "queued"  # queued|processing|done|failed
  t.string  :bank, null: false, default: "unknown"   # icici|hdfc|sbi|axis|kotak|unknown
  t.string  :file_digest, null: false                 # sha256, dedupe
  t.integer :file_size, null: false
  t.jsonb   :result, default: {}                      # parsed rows + confidence + trust
  t.jsonb   :error, default: {}
  t.datetime :confirmed_at                            # server-side idempotency
  t.integer :confirmed_count, null: 0, default: 0
  t.timestamps
end
add_index :statement_imports, [:user_id, :file_digest], unique: true
```
Re-upload of the same file returns the existing import (no new row, no new job). Ponytail note:
`# ponytail: one digest index — add a per-bank index only if users import many banks' statements`.

## Raw bytes — ActiveStorage, never the database
The uploaded PDF is an ActiveStorage attachment (`has_one_attached :source_file`), not a
column. `ImportStatementJob` purges it as soon as the parse finishes — success or handled
failure. A parse that *raises* keeps the file so Sidekiq can retry it. The attachment is
purged again by `CleanupStatementImportsJob` for imports that never got parsed.

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
- Job: `ImportStatementJob` (Sidekiq, queue `imports`, retry 1, hard cap via parse timeout
  `Timeout.timeout(90)`; on timeout write `error = "parse_timeout"` and mark failed).
- **Never keep the raw PDF bytes after the parse** — expunge after `result` is written
  (privacy/limits: parsed only, then delete file). 24h retention on `done`/`failed` imports,
  then cleanup by sidekiq-cron (`CleanupStatementImportsJob`, hourly at :45).

## Duplicate detection
The parser is handed the user's **20 000 most recent transactions** — not date-filtered, a
statement may cover any period — and compares on
`(transaction_date, amount, normalized merchant prefix 12 chars)` in memory. `duplicate_count`
is reported and the rows are flagged, never blocked. Ponytail note:
`# ponytail: the duplicate index is bounded by the newest rows — index the rest if statements
older than 20k rows ever arrive`.

## Confirm is idempotent on the server
The import row itself carries the state: `confirmed_at` + `confirmed_count`. A second confirm
answers `{created: <count>, already_confirmed: true}` and writes nothing — the guarantee does
not depend on a client header being replayed.

## Error handling (API contract)
| Case | Code | Body |
|---|---|---|
| No file | 422 | `{error: "invalid_file", reason: "missing_file"}` |
| >10 MB | 422 | `{error: "invalid_file", reason: "too_large"}` |
| Right mime/name, wrong bytes | 422 | `{error: "invalid_file", reason: "not_a_pdf"}` |
| Not a PDF at all | 422 | `{error: "not_a_pdf"}` |
| Encrypted PDF | 200 `failed` | `{error: "encrypted_pdf"}` |
| Parse timeout / 0 txns | 200 `done` | `{status: done, transactions: []}` (UI shows "couldn't find table") |
| Duplicate hash re-upload | 200 | existing import record (`duplicate: true`) |
| Feature flag off | 501 | flag contract (see #57) |

A row the user confirms that we cannot make sense of is **rejected on its own** — the import
still succeeds and the response lists `{index, reason: "invalid"}` for that row.

## Tests (RSpec)
- `spec/services/import/bank_pdf_parser_spec.rb`: the statements are **generated, not committed**
  — `spec/support/pdf_statement_builder.rb` writes a minimal but valid PDF (one page, Helvetica,
  positioned cells) so the fixture content stays readable inside the spec and no extra gem
  (Prawn) is needed. Cases: ICICI-shaped table, other column labels (SBI), unknown bank,
  encrypted PDF, garbage bytes, a page without a header row, fuzzy date, fallback amount,
  duplicate rows, a balance that does not add up, rows that cannot be read.
- `spec/requests/statement_imports_api_spec.rb`: happy path (upload→poll→confirm 0 dup),
  duplicate re-upload returns same id, confirm idempotency (two same confirms ⇒ one row set),
  unauthorized 401, oversized 422, flag off 501, a foreign import 404.
- `spec/jobs/import_statement_job_spec.rb`: parse + result, the file is purged after the parse,
  an encrypted file fails, a file it cannot read fails, the rows the user already has are
  flagged, an import is not parsed twice.

## Rollback
Feature flag hides FE entry & endpoint returns 501 when off. Migration is additive only
(`DROP TABLE statement_imports` reverts safely, no FK into transactions beyond jsonb).
