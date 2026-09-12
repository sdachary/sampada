# Sampada Frontend

React 19 + Vite SPA for Sampada — the user interface companion to the Rails 8.1 API-only backend. See `../docs/ARCHITECTURE.md` and `../DESIGN.md` (design system) for full context.

## Stack

- **React 19**, **Vite 8** (`vite.config.js` proxies `/api` → `http://localhost:3002` in dev)
- **Hand-rolled CSS** — design tokens from `../DESIGN.md`, nothing pre-made (no Tailwind, no component library)
- **recharts** — charts (dashboard, goal projections); **lucide-react** — icons
- **Cloudflare Pages** — deployment via `wrangler.toml` (`sampada.pages.dev`); security headers in `public/_headers`
- **PWA** — service worker (`public/sw.js`), manifest, offline read-only indicator

## Layout

```
frontend/
├── src/
│   ├── pages/        # route pages (Dashboard, Debts, Portfolio, Trips, …)
│   ├── components/   # shared components
│   ├── lib/          # api.js (VITE_API_URL), chart utils, i18n
│   └── App.jsx       # router
├── public/           # _headers, sw.js, manifest, icons, legal pages (privacy/terms)
├── wrangler.toml     # Pages build config
└── vite.config.js
```

## Develop

```bash
npm install      # use the installed Vite version; no lockfile churn
npm run dev      # http://localhost:5173, API proxied to localhost:3002
VITE_API_URL=... # set only when not using the local dev proxy; see .env.example
```

## Deploy

Build (`npm run build` → `dist/`) and push the `frontend/` directory with Cloudflare Pages; the backend URL goes in `VITE_API_URL` at build time.

## Legal pages

`public/privacy.html` and `public/terms.html` are the AcharyaLab-standard DPDP legal pages shipped in the SPA build (linked from the landing footer). Keep them byte-consistent with the AcharyaLab template and in sync with `../docs/PRIVACY_POLICY.md`.