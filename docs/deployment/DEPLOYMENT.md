# Deploying Sampada

Sampada runs entirely on Cloudflare: a Hono Worker (`sampada-api-production`)
with D1 + R2 bindings, and a React SPA on Cloudflare Pages (`sampada.vayalabs.in`).
There is no VM, Docker host, Postgres, Redis, or self-managed auth service.

Production identifiers:

- Worker: `sampada-api-production`
- D1 database: `sampada-db`
- R2 bucket: `sampada-storage`
- Pages project: `sampada` (`https://sampada.vayalabs.in`)
- Cloudflare account: `58282ee997b7a801c27e7d0276f9ae8e`

---

## Prerequisites

- Wrangler authenticated for the Cloudflare account (OAuth token with D1/R2/Workers/Pages scope).
- Node/npm installed in `worker/` and `frontend/`.
- Secrets available (Worker secrets / SOPS — never in git): `TURNSTILE_SECRET_KEY`,
  `RESEND_API_KEY`, `D1_PROBE_TOKEN`.

---

## Deploy the Worker

```bash
cd worker
npx tsc --noEmit          # type check
npm test                  # Vitest suite
npm run deploy            # wrangler deploy -> sampada-api-production
```

Bindings, vars and cron triggers are declared in `worker/wrangler.toml`. Set or
rotate secrets with:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put D1_PROBE_TOKEN
```

Migrations are forward-only; apply with `npm run db:migrate:remote`.

> D1 note: run D1 commands with the Wrangler OAuth token from
> `~/.config/.wrangler/config/default.toml`. The SOPS Cloudflare token is not
> authorized for D1 (`7403 account not valid`). Clear `CLOUDFLARE_API_TOKEN` /
> `CLOUDFLARE_ACCOUNT_ID` from the environment when using the OAuth profile:
> `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID npx wrangler d1 ...`

---

## Deploy the Frontend

```bash
cd frontend
npm run build             # -> dist/
npx wrangler pages deploy dist --project-name sampada
```

Configuration:

- `VITE_API_URL=/api/worker` (same-origin; no backend hostname baked into the build).
- Pages Function `frontend/functions/[[path]].js` proxies `/api/worker/*` to the
  Worker using binding `WORKER_URL`, and hard-404s the retired `/api/auth/*`.
  If `WORKER_URL` is missing, `/api/worker/*` returns `502 Worker origin not configured`.
- Security headers are in `frontend/public/_headers`.

---

## Verify

```bash
# Worker health via the Pages proxy (the Worker custom domain is intentionally absent)
curl -s https://sampada.vayalabs.in/api/worker/up
# => {"status":"ok","service":"sampada-api"}

# Auth-gated route returns 401 without a session (proves the router is mounted)
curl -s -o /dev/null -w '%{http_code}\n' https://sampada.vayalabs.in/api/worker/api/v1/goals
# => 401

# Frontend + headers
curl -s -o /dev/null -w '%{http_code}\n' https://sampada.vayalabs.in/login       # => 200
curl -sI https://sampada.vayalabs.in/ | grep -i content-security-policy
```

For authenticated checks, use a real session cookie from a passkey/magic-link
sign-in; do not create test users in production (signups must stay clean for UAT).

---

## Rollback

- **Frontend:** Cloudflare Pages → previous build.
- **Worker:** `npx wrangler deployments list` then `npx wrangler rollback` in `worker/`.
- **Database:** D1 migrations are forward-only; hotfix via a new migration.
- **Data:** R2 `sampada-storage` objects and D1 exports are retained as rollback data;
  no objects are purged.

---

## Production Checklist

- [ ] Worker secrets set (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `D1_PROBE_TOKEN`)
- [ ] Pages binding `WORKER_URL` set to the Worker origin
- [ ] D1 migrations applied (`npm run db:migrate:remote`)
- [ ] `GET /api/worker/up` returns ok
- [ ] Representative `/api/v1/*` route returns 401 unauthenticated (not 404)
- [ ] `https://sampada.vayalabs.in/login` returns 200
- [ ] CSP `connect-src` is `'self'` (no external API host)
- [ ] No test users/rows created in production after the UAT data wipe
