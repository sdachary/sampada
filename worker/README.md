# sampada-worker

Cloudflare Worker (Hono) replacing the Rails API; D1 `sampada-db` = 43-table port of `db/schema.rb`.

## npm scripts
- `npm run dev` / `deploy` — local wrangler / deploy to Cloudflare
- `npm run tsc` — typecheck; `npm test` — vitest
- `npm run db:migrate:local|remote` — apply D1 migrations

Epic A phase: A1 = scaffold + D1 schema port; chunks 1-2 landed (PR #100 auth/onboarding/journey/push/flags/sectors/reports, PR #101 money CRUD + idempotency); chunk 3 = rebalance trio + import_investments; A5.4 cutover flips the SPA to the worker.
