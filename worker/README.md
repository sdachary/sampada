# sampada-worker

Cloudflare Worker (Hono) replacing the Rails API; D1 `sampada-db` = 43-table port of `db/schema.rb`.

## npm scripts
- `npm run dev` / `deploy` — local wrangler / deploy to Cloudflare
- `npm run tsc` — typecheck; `npm test` — vitest
- `npm run db:migrate:local|remote` — apply D1 migrations

Epic A phase: A1 = scaffold + D1 schema port; chunks 1-3 landed (PR #100 auth/onboarding/journey/push/flags/sectors/reports, PR #101 money CRUD + idempotency, chunk 3 rebalance trio + import_investments); PR #104 mounted the orphaned dashboard + budgets routers. A5.4 cutover landed 2026-11-19 — SPA now calls the worker via `/api/worker`; Rails retained for rollback until A5.5.
