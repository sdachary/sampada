# 1.2 Frontend — Recurring Detection UI

Status: ready · FREE · Est: 8 pts
No new npm deps. Reuses existing `Recurring.jsx` page + `RecurringFormModal.jsx` +
`ResponsiveModal` + `Badge`.

## Entry points
1. Recurring page banner (above list, only when `recurring_detection` on and
   transactions exist): Card —
   "You've been logging for a while. Let me find patterns." + `Detect recurring` Button.
2. After bank import completes (same banner appears on Recurring page post-import).

## Flow
1. Click `Detect recurring` → button enters loading (sync API, usually <1s).
2. Results open in a `ResponsiveModal` (title "Found N patterns", scrollable):
   - Per suggestion row: merchant/frequency/next-due/avg amount, confidence Badge
     (≥0.8 `success`, 0.6–0.8 `warning`), expandable "show example transactions" (2 rows each).
   - Per-row controls: `Accept` (creates via existing modal prefilled — opens
     `RecurringFormModal` with fields preset so the user can adjust before save),
     `Reject` (row strikes out), `Ignore` ≡ Reject.
3. Accepted rows animate out, count updates. "Reject all remaining" link at bottom.
4. Done: modal closes, toast "Added M recurring expenses", list refreshes via existing
   `useResource`.

## Edge cases
- 0 suggestions: modal body "Not enough history yet — add a few transactions first"
  (EmptyState inside modal, keep it light).
- 409 (pending suggestions) → resume the modal with existing pending set (GET first).
- Mobile: modal becomes bottom sheet (ResponsiveModal already does this), rows stack.

## Files
```
frontend/src/pages/Recurring.jsx                    (banner + trigger + modal wiring)
frontend/src/components/RecurringSuggestionsModal.jsx  (new)
```
API helpers live in existing per-page fetch code — add 3 functions in the same module the
Recurring page already uses (see `useResource`/`lib/api.js` pattern).
