# Sampada Frontend

React 19 + Vite SPA for Sampada — the user interface for the Cloudflare Worker/D1 API. See [`../docs/architecture/ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md) and [`../docs/design/DESIGN.md`](../docs/design/DESIGN.md) (design system) for full context.

## Stack

- **React 19**, **Vite 8** (`vite.config.js` proxies `/api/worker` → `http://localhost:8787` / `wrangler dev` in dev)
- **Hand-rolled CSS** — design tokens from [`../docs/design/DESIGN.md`](../docs/design/DESIGN.md), nothing pre-made (no Tailwind, no component library)
- **recharts** — charts (dashboard, goal projections); **lucide-react** — icons
- **Cloudflare Pages** — deployment via `wrangler.toml` (`sampada.vayalabs.in`); security headers in `public/_headers`
- **PWA** — service worker (`public/sw.js`), manifest, offline read-only indicator

## Layout

```
frontend/
├── src/
│   ├── pages/            # route pages (Dashboard, Debts, Portfolio, Trips, …)
│   ├── components/       # shared components
│   │   └── ui/           # primitives (Button, Card, Stat, Progress, Badge, Dialog, Tabs, Tooltip, Toast, Skeleton, EmptyState, Input, Table, PageHeader)
│   ├── lib/              # api.js, chartTheme, motion-primitives, amounts
│   ├── landing/hero3d/   # 3D hero (Hero3D, HeroPoster) — landing route only
│   └── App.jsx           # router (route-split, PageTransition)
├── public/               # _headers, sw.js, manifest, icons, legal pages
├── wrangler.toml         # Pages build config
├── vite.config.js
├── lighthouserc.json     # Lighthouse CI config
└── package.json
```

## Design System

- Tokens: `src/styles/tokens.css` (single source, imported first in `main.jsx`)
- Primitives: `src/styles/primitives.css` + `src/components/ui/*`
- Motion: `src/lib/motion.jsx` (LazyMotion provider) + `src/lib/motion-primitives.jsx` (Reveal, PageTransition, useCountUp)
- Charts: `src/lib/chartTheme.jsx` (palette, axis, tooltip, a11y)

## Develop

```bash
npm install      # use the installed Vite version; no lockfile churn
# in a second terminal, run the Worker locally: cd ../worker && npx wrangler dev
npm run dev      # http://localhost:5173, API proxied to the local Worker on :8787
VITE_API_URL=... # set only when not using the local dev proxy; see .env.example
npm run lint     # oxlint
npm test         # node --test
npm run build    # production build to dist/
npm run size     # size-limit check
```

## CI Gates (run on PR)

```bash
npm run lhci      # Lighthouse CI (perf ≥0.85, a11y ≥0.9, LCP/FCP ≤1.5s, TBT ≤250ms)
npm run size      # bundle size check (main ≤500 KB, 3D ≤1 MB)
npx playwright test test/accessibility.test.js
npx playwright test test/visual-smoke.test.js
```

## Deploy

Build (`npm run build` → `dist/`) and push the `frontend/` directory with Cloudflare Pages. Pages Functions in `functions/[[path]].js` proxy `/api/worker/*` to the Worker via the `WORKER_URL` binding, so production uses the same-origin default (`VITE_API_URL=/api/worker`); no backend hostname is baked into the build.

## Legal pages

`public/privacy.html` and `public/terms.html` are the AcharyaLab-standard DPDP legal pages shipped in the SPA build (linked from the landing footer). Keep them byte-consistent with the AcharyaLab template and in sync with [`../docs/legal/PRIVACY_POLICY.md`](../docs/legal/PRIVACY_POLICY.md).

## Screenshots

See [`../docs/design/ui-after.md`](../docs/design/ui-after.md) for before/after comparison (Steps 0–11).