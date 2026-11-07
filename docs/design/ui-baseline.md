# Sampada UI baseline — Step 0

Date: 2026-11-01 · build: `vite v8.3.5` production · local preview server (port 4173)

## Production build (gzip, from vite build output)

| Asset | Raw | gzip |
|---|---|---|
| `assets/index-*.js` (single bundle, all routes) | 871.27 kB | **241.14 kB** |
| `assets/index-*.css` | 11.24 kB | 3.01 kB |
| `index.html` | 2.25 kB | 0.85 kB |

Per-route chunk sizes don't exist yet — **zero code splitting**, every route ships the same
241 KB gzip JS. Route-level `React.lazy` is step-gated (Step 5); the per-route table below is
the structure required to track regressions later.

| Route | Initial JS (gzip) | Notes |
|---|---|---|
| every route | 241 KB | single chunk; recharts (~115 KB gzip) + app code in one file |

## Lighthouse (mobile, simulated throttling, headless Chromium 1243)

| Route | Score | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|
| `/` (landing) | 0.81 | **3.5 s** | 0 | 130 ms | 3.3 s |

- **LCP element is the cookie banner** (`div#acharylab-cookie-banner`) — a deferred external
  script is the last thing on screen before LCP.
- a11y 0.94 · best-practices 0.96 · SEO 0.92 (a11y gaps indexed in Step 10 axe pass).
- CLS already 0 — guard with the ≤ baseline rule.
- LCP driver: 241 KB gzip JS on one blocking chain + Google Fonts stylesheet on
  `fonts.googleapis.com`/`fonts.gstatic.com` (render-blocking, no preload).

**INP:** not reported (no user gesture in lab run); TBT 130 ms is the lab proxy. **Targets from
spec §4.4 apply at Step 10 gate time.**

## Limitations (deviation record)
1. **Authenticated routes could not be lab-tested locally** — the SPA redirects to `/login`
   with no Rails session (screenshots `dashboard-*.png` are duplicates of `login-*.png`,
   proving the redirect). LHCI for `/dashboard`, `/dashboard/reports` etc. will run in Step 10
   CI with a test session/cookie, or against the styleguide as the spec's fallback allows.
2. Live https://sampada.vayalabs.in was not hit (keeps baseline deterministic + offline);
   re-hit once in Step 10's CI against preview only.

## Screenshots
`docs/ui-baseline/*.png` — public routes: `/`, `/login`, `/register`, `/forgot-password`
at 390 and 1280 px (Chromium via Playwright CLI). Authed pages: **manual capture needed**
(or via CI test session in Step 10); noted per spec Step 0.4.

## Test suite
`npm test` → 7 pass / 0 fail (honeypot). Green gate for all later steps.
