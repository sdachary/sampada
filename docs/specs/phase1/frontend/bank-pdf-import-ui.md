# 1.1 Frontend — Bank PDF Import UI

Status: ready · FREE · Est: 13 pts · Flag: `pdf_import`
No new npm deps. `<input type="file" accept=".pdf">` + drag events (no react-dropzone).

## Entry points
- Transactions page header: `Import` button (same size/variant as existing secondary buttons).
- Empty state on Transactions (uses shared `EmptyState`): "Import a bank statement to start."

## Flow (single screen, 3 steps, no wizard routing)
**Step 1 — Upload** (Card):
- Dashed drop-zone card: drag a PDF or click → file picker; max 10 MB, PDF only.
- On file select: show filename + size, `POST /api/v1/imports/bank-statement` (FormData).
- Progress = indeterminate bar + "Parsing… 10s" elapsed; poll `GET /api/v1/imports/:id` every
  2s. Errors render inline per API error map (`encrypted_pdf` → hint text).

**Step 2 — Review** (the core screen):
- Table (already-responsive pattern from PR #40): Date | Description | Amount | Type | Category
  (select) | Confidence badge | row checkbox.
  - Rows with confidence < 0.6 get `warning` badge and an amber left border.
  - Duplicates: `muted` badge "Already tracked", checkbox unchecked by default.
- Bulk actions bar: select all / none, "Only low-confidence", bulk category assignment.
- Inline edit: click a cell → local edit (no modal per row; keep it light).
- Skip = uncheck row (not delete), preserved in confirm payload (`skip: true`).
- Footer: Card with totals "X new · ₹Y expenses · Z marked duplicate" + `Import N transactions`
  Button (primary). Disabled while a low-confidence row has no category? No — server defaults
  category to budget-matching or "Uncategorized"; don't block the user.

**Step 3 — Done**:
- Success Card: "Added N transactions · M recurring patterns detected" (kicks detection, 1.2).
- CTA to recurring review if N>0 suggestions appear.

## States / edge cases
- Poll timeout >120s → error card with "Try again" (Button) + note to check file.
- Offline (usePWA offline flag): block upload with inline note "Needs connection" — parse is server-side.
- Mobile: table converts to stacked card rows (same responsive-table pattern PR #40), drop-zone
  full-width, footer sticky.
- Modal not needed; use full page section (too much content for ResponsiveModal).

## Files (matches existing repo layout — flat pages/, components/ for modals)
```
frontend/src/pages/Transactions.jsx        (add "Import" entry + ImportPanel render)
frontend/src/components/ImportUploadStep.jsx
frontend/src/components/ImportReviewTable.jsx
frontend/src/lib/statementImportApi.js     (fetch wrappers on top of existing lib/api.js)
```
Route approach: a `BankImport` full-page panel rendered within Transactions flow, nav-consistent
with QuickLogSheet. Flag gating sits in the Transactions page (single place), NOT a routes change.
