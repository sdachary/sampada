# Performance & Latency Baseline

> Task #258b (ACHA-258). Measured 2026-08-12 via public URL
> `http://sampada.140.245.227.176.nip.io`. Fresh user, empty data set.

## Environment

| Item | Value |
|------|-------|
| VM | oradb (140.245.227.176), 956 MiB RAM, 2 GiB swapfile |
| Before fix | 1 GiB swap in use, 11.1M swap-ins since boot, ~1445 KB/s swap-out during sample |
| After fix (#346) | 0 containers Restarting, swap activity 8–20 KB/s |

## Endpoint timing (seconds, `curl -w time_total`)

### `/up` (public, no auth)
| Run | Time |
|-----|------|
| 1 | 0.237 |
| 2 | 0.234 |
| 3 | 0.248 |

### `/api/v1/dashboard` (Bearer auth, fresh user)
| Run | Time | Note |
|-----|------|------|
| 1 | 2.422 | Cold — includes BetterAuth `/verify` round-trip (cached 300s) |
| 2 | 1.345 | |
| 3 | 0.605 | |
| 4 | 0.280 | warm |
| 5 | 0.277 | warm |

Warm repeat (5 runs): **0.216–0.320 s**

### `/api/v1/dashboard/projection` (Bearer auth)
| Run | Time |
|-----|------|
| 1 | 0.229 |
| 2 | 0.223 |
| 3 | 0.698 |

## Observations

- **Cold first call is dominated by BetterAuth verification** (~2 s once, then cached 5 min). Not a Rails issue.
- **Warm dashboard ≈ 220–280 ms** for an empty user. Real users with debts/portfolios/transactions will be heavier — re-measure with a populated account after query cleanup (#258e).
- Test user `perftest-opencode@example.com` (throwaway, app=sampada) used for these runs.

## How to re-measure

```bash
TOKEN=$(curl -s -X POST http://sampada.140.245.227.176.nip.io/auth/v2/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"perftest-opencode@example.com","password":"<pw>","app":"sampada"}' \
  | jq -r .token)
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  http://sampada.140.245.227.176.nip.io/api/v1/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

Compare against the table above after any perf-related change.

## Post-cutover baseline (A7.5, 2026-11-19)

Measured after the A5.4/A5.5 cutover — the live app is now the `sampada-api-production` Worker + D1 behind the CF Pages SPA; the oradb Rails/:3002 stack no longer exists.

### Lighthouse CI (local `vite preview` build, 3 runs per URL)

| URL | Perf | a11y | FCP | LCP | CLS | TBT |
|-----|------|------|-----|-----|-----|-----|
| `/` | 98 | 94 | 762 ms | 762 ms | 0.000 | 146 ms |
| `/dashboard` | 100 | 90 | 757 ms | 757 ms | 0.000 | 45 ms |
| `/dashboard/debts` | 100 | 90 | 757 ms | 757 ms | 0.000 | 37 ms |

9/9 assertions passed. `lighthouserc.json` budgets were tightened from perf 0.7/FCP 2500/LCP 3500/CLS 0.1/TBT 300 to **0.85 / 1500 / 1500 / 0.05 / 250** — roughly 2× headroom over the measured values so CI hardware variance doesn't flake. a11y stays at 0.90 (dashboard measured exactly 0.90); best-practices 0.8, SEO 0.5 and TTI 4000 ms unchanged.

> **Caveat:** LHCI visits unauthenticated pages, so these are shell/paint numbers — they validate the bundle and render path, not a populated D1 dashboard.

### Live API latency (`curl -w time_total`, 3 runs)

| Endpoint | Runs | Compare to old Rails baseline |
|----------|------|-------------------------------|
| Worker `/up` | 0.395 / 0.426 / 0.516 s | n/a (no Rails equivalent) |
| Worker `/api/v1/dashboard` (unauth → 401) | 0.332 / 0.335 / 0.351 s | old warm dashboard 0.216–0.320 s (authenticated, empty account) |
| Pages proxy `/api/worker/up` | 0.941 / 1.017 / 0.530 s | adds the Pages→Worker hop |

> **Caveat:** the worker probes are unauthenticated (no D1 read), so they are not a like-for-like comparison with the old authenticated warm timings. An authenticated D1-backed dashboard measurement is still outstanding — re-run with a short-lived session when a populated account is available.

### Playwright suite

`mount.test.js` is the hard gate in CI; `accessibility.test.js` + `visual-smoke.test.js` remain warn-only. `dashboard-audit.test.js` (overlap check) and `passkey-ceremony.test.js` (needs `VITE_WORKER_AUTH=true`) run manually, not in CI.

