# Sampada frontend — ponytail audit (live preview: e82bcae3.sampada.pages.dev)

Date: 2026-11-19. Scope: `frontend/` source + built `dist/` + live browser + existing LHCI runs.
This is a **breakage/perf audit**, not a redesign wish-list (that's `UI_UX_AUDIT_REPORT.md`).

## Verdict

Two symptoms, two separate root causes. Neither is "the codebase is too big".

| Symptom | Root cause | Confidence |
|---|---|---|
| Dark screen, only raw text | JSX uses Tailwind syntax, but there is **no Tailwind in the build** | certain |
| Blank first paint | `Reveal` never animated: callers pass `delay={100}` (ms) to Motion (seconds), and switching `animate` from `undefined` to an object didn't start an animation — sections sat at `opacity:0` for 100–600 s | certain |
| Slow load | Desktop-only 921 KB WebGL hero + SW precaching every asset + eager motion chunk; preview 502 is config | high |

---

## Fixes applied (one shot, 2026-11-19)

| # | Change | Files |
|---|---|---|
| 1 | Tailwind v4 via `@tailwindcss/vite`, preflight off, layered after legacy CSS; semantic colors mapped through `--raw-*` token aliases (no cycles) | `package.json`, `vite.config.js`, new `src/styles/app.css`, `src/styles/tokens.css`, `src/main.jsx` |
| 2 | Dropped the 3D hero: static `HeroPoster` only; removed `Hero3D.jsx`, `HeroVisual.jsx`, `@react-three/fiber`, `three`, 950 KB size-limit entry | `src/pages/Landing.jsx`, `package.json` |
| 3 | `Reveal` simplified to always animate with normalized ms→s delay; removes the inView state machinery that left content invisible | `src/lib/motion-primitives.jsx` |
| 4 | `Card` now forwards `className` in the legacy path (it was silently dropped everywhere) | `src/components/ui/Card.jsx` |
| 5 | SW registration after `window.load`; precache shell only | `src/main.jsx`, `public/sw.js` |
| 6 | `/me` only on `/dashboard/*` routes; public pages make no auth request | `src/lib/auth.jsx` |

**Verified locally** (Playwright, production build, `npm run preview`): landing renders two-column desktop / one-column mobile, 11 styled cards, `font-size:60px` hero, zero invisible reveals, no `/me` or Hero3D requests, no console errors; dark theme applies correctly; `/dashboard` still redirects to `/login`. FCP 76–204 ms. `npm run build`, `npm run lint` (0 errors), `npm test` (5/5) all pass.

**Not fixed (needs deploy config):** `WORKER_URL` on the Pages preview — set it in Cloudflare Pages → Settings → Environment variables (Production + Preview) to the Worker origin, matching `docs/deployment/DEPLOYMENT.md`. Until then `/api/worker/*` legitimately 502s on the preview.

---

## 1. "Dark screen + only text" — root cause: CSS classes don't exist

**Evidence**
- `package.json` has no tailwind/postcss/tailwindcss dep; `vite.config.js` has no tailwind plugin.
- Built stylesheet `dist/assets/index-BX3CYAnQ.css` is 53 KB of hand-rolled utilities. It contains **no** `lg:`/`sm:` variants, no `space-y-*`, no arbitrary values (`text-[10px]`), no opacity modifiers (`bg-bg-elevated/50`), no `text-ink`, no `bg-border-soft`.
- Static scan of all `src/**/*.jsx`: **~256 distinct className tokens across 23 files have no matching CSS rule**. Most common: `text-ink` (23 files), `space-y-5` (21), `sm:grid-cols-2` (16), `text-border` (14), `border-border-soft` (11), `lg:grid-cols-3` (7).
- `src/pages/Landing.jsx` alone: 31 of 78 spot-checked classes are missing (`max-w-[1024px]`, `lg:grid-cols-2`, `lg:text-6xl`, `bg-gradient-to-r`, `mt-auto`, …).
- Live browser at 1365 px: hero grid computes to `grid-template-columns: 1333px` (one column, should be two); `nav` gap is `normal`; `.card-shell` rules never apply to landing cards.

**Why it looks dark:** `useTheme()` correctly applies `data-theme="dark"` when the OS is dark. The unstyled page then gets `body background: oklch(0.09 ...)` with near-white raw text — a dark screen with a dump of text. `Reveal` sections start at `opacity:0` and only appear after the 500 ms fallback timer, which adds a blank-first-paint impression.

**Lazy fix options**
- **A (recommended, global):** add Tailwind v4 (`@tailwindcss/vite`, `preflight: false`) and map the existing tokens into `@theme inline` so `text-ink`, `bg-bg-elevated/50`, `border-border-soft` etc. resolve. ~3 files. Must verify no conflict with the existing hand-rolled utilities in `primitives.css`.
- **B (no new dep):** hand-add aliases to `primitives.css`. Fixes semantic names (`text-ink` → `var(--ink)`) but you'd be writing ~150 utilities by hand, including responsive variants. More code than A.

---

## 2. Slow load — root cause: work that CI never exercises

**Measured**
- Live browser: TTFB 3.5 s, DOMContentLoaded 9.2 s, FCP 12.7 s (headless, 2 cores).
- `curl` to the same URLs: HTML TTFB 0.48 s, main JS 0.44 s, auth 502 in 0.23 s. So a big slice of the browser number is this session's proxy/network, not the app.
- Existing local LHCI runs (9 runs, today): FCP 0.8 s, scores 0.98–1.00. **CI has 2 cores → `canRender3D()` returns false → the 921 KB hero never loads.** That is why CI is green while the user's desktop is slow.

**Code-level culprits, ranked**
1. **`src/landing/hero3d/HeroVisual.jsx:8-18, 24-32`** — on any desktop with >4 cores, WebGL available and no reduced-motion, `requestIdleCallback` mounts `Hero3D`. That pulls **`dist/assets/Hero3D-*.js` = 921 KB** and starts a scene with `dpr={[1,3]}`, `frameloop="always"`, a 1024² canvas texture and an infinite `rotation.y += delta` loop (`Hero3D.jsx:9-25, 117-152, 206-228`). It never pauses when scrolled away. This is the single biggest desktop cost, and it lands right after first paint.
2. **`src/main.jsx:18-20` + `public/sw.js:7-18`** — the service worker is registered at module evaluation, and on install it refetches `/` and precaches **every hashed asset referenced in the HTML** (main JS, motion chunk, CSS, fonts). Duplicate downloads compete with first paint on first visit.
3. **`src/lib/motion-primitives.jsx` + `src/lib/motion.jsx`** — `motion/react` ships as a 128 KB `modulepreload` on every page, only to power fade-up and a config wrapper. Nothing else uses `m`/`useInView`.
4. **`src/lib/auth.jsx:9-22`** — `workerAuth.me()` fires on every page load, including the public landing page. On this preview it 502s (config below). Wasted round trip + console noise for anonymous visitors.
5. Fonts: 118 KB of woff2 preloaded; the "preloaded but not used" warnings were a side effect of the 12 s FCP, not a bad preload tag.

**Lazy fixes**
- Delete the 3D hero from the landing page and keep the static SVG poster (`HeroPoster.jsx`) — removes 921 KB, the WebGL warning, the `THREE.Clock` deprecation and the infinite rAF loop in one diff. **Ask first: is the 3D coin a product requirement?** If yes: drop `dpr` to `[1,2]`, pause the frameloop when the hero is offscreen, shrink the face texture to 512, and gate on `window.load` not idle.
- `registerServiceWorker()` inside `window.load`/idle; precache only the shell, let hashed assets cache on use.
- Remove `motion/react`: `Reveal` is already 90% an IntersectionObserver + a 500 ms timer; the CSS handles the rest.
- Skip `me()` on public routes (or call it only once before entering `/dashboard/*`).

---

## 3. The 502 — config, not a bug

`GET /api/worker/api/v1/auth/me → 502`. `functions/[[path]].js:59-60` returns 502 when the `WORKER_URL` binding is absent, and `docs/deployment/DEPLOYMENT.md:66-67` documents exactly this. The preview deploy has no `WORKER_URL`; production presumably does. Nothing to fix in code except not calling `me()` on public pages.

## 4. Low priority / ignore

- `THREE.Clock` deprecation comes from three r187 internals via R3F; our code already uses `clock.getElapsedTime()`. Only disappears if the 3D hero goes away or three is pinned back.
- WebGL `drawElementsInstanced` rect warning — canvas sizing/dpr artefact; harmless.
- `App.jsx:81` and `:85` both declare `<Route path="goals">`; dead duplicate.
- `index.html` `theme-color` is hardcoded light even in dark mode.

## Fix menu

- **One shot (recommended):** Tailwind v4 wiring + drop/defer 3D hero + SW timing + skip auth on public routes. Touches ~8 files.
- **One by one:** start with #1 (visual) — without it nothing else matters visually.
- **Visual only / perf only:** say which.
