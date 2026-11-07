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
