# Sampada UI Modernization — Implementation Spec

> Hand this file to Claude Code or opencode. It is self-contained: read it fully, then execute **one step at a time**, in order. Do not skip ahead.

---

## 0. How the agent must work

1. Create a branch: `feat/ui-modernization`.
2. Execute steps in numeric order. **One step = one commit** (message: `ui(step-N): <title>`).
3. After each step, run the step's **Verify** checklist. If anything fails, fix it before moving on.
4. At the end of each step, print a short report: what changed, files touched, verify results, anything you were unsure about.
5. If a step's assumption does not match the real code (file names, router, CSS approach), **adapt to the code that exists** and note the deviation in the report. Do not invent structure that fights the codebase.
6. Do **not** touch the Rails backend, API contracts, auth, or database. Frontend only (`frontend/`), plus CI config and docs.
7. Do not add dependencies other than those named in this file. Ask before adding anything else.
8. Keep all existing frontend tests passing. Add tests for new primitives where the repo already has a test setup.
9. Stop after Step 11 and wait for review. Do not deploy to production.

---

## 1. Product context

- **Product:** Sampada — a free, hosted personal-finance web app. Philosophy: *debt first, then wealth* (Negative → Zero → Positive). Built for Indian users (₹, NSE/BSE, EMIs, SIPs) but multi-currency.
- **Live:** https://sampada.vayalabs.in — **Repo:** https://github.com/sdachary/sampada
- **Frontend:** React 19 + Vite SPA, React Router, Recharts. Deployed separately on Cloudflare Pages. Backend is a Rails 8.1 API (out of scope).
- **Main areas of the app:** dashboard, debt payoff (loans/EMIs), dividend SIP planner, portfolio rebalancing, recurring expenses, reports/export, households, trips, insurance, onboarding, settings.
- `DESIGN.md` at the repo root is the existing design source of truth. This spec **extends** it; where they conflict, this spec wins, and Step 1 updates `DESIGN.md` to match.

## 2. Goal

Make Sampada look **modern, mature, and detailed** while staying **simple and fast**.

- **One consistent design system** across the landing page and every app page: same colours, same layout, same components.
- **No performance or usability regression.** The app is a tool people use to manage money; clarity and speed beat spectacle.
- **One exception:** the **marketing landing page** gets a lightweight **3D hero**, strictly isolated so app pages never pay for it.

## 3. Non-goals

- No redesign of features, flows, or information architecture.
- No dark/neon fintech look, no glassmorphism, no CSS gradients (see constraints).
- No 3D, GSAP, Lenis, or scroll-hijacking anywhere in the app.
- No backend changes.

## 4. Hard constraints

### 4.1 Visual (from DESIGN.md — keep)
- Warm paper-ledger identity. **No cool blues or sterile greys.** Never pure black or pure white.
- Coral is the single accent: **max 2 accent-coloured elements visible per screen section.**
- No gradients (except SVG chart area fills). No glassmorphism. No neumorphism. No emoji as feature icons (use SVG icons).
- No left-border accent stripes on cards. Show status with progress bars or content hierarchy.
- All financial figures use tabular numerals (`.fin` class → `font-variant-numeric: tabular-nums`).
- Semantic colours (success, warning, danger) are **named CSS variables**, never hard-coded hex in components.
- Inputs are at least 16px font to prevent iOS zoom.

### 4.2 Craft rules (avoid "generated" tells)
- Motion that answers a user action (open, expand, confirm, save) is welcome. **Unprompted motion is rare**: at most one orchestrated entrance per page. Do not fade-and-slide every section or add hover motion to every card.
- All-caps tracked labels only for small table/column headers. No all-caps "eyebrow" above every heading.
- Numbered markers (01/02/03) only when the content is a real sequence.
- Do not make every block an identical rounded card. Vary hierarchy: some content sits directly on the page with whitespace as the separator.
- Body line length under ~75 characters.

### 4.3 Copy
- Sentence case, plain verbs, active voice. Buttons say what happens (`Save changes`, not `Submit`). The same action keeps the same name across button, toast, and confirmation.
- Empty states tell the user the next action. Errors say what went wrong and how to fix it, with no apology.

### 4.4 Performance
- Record a **baseline in Step 0**, then: no app route may regress by more than **10% in initial JS (gzip)** and none may worsen LCP/CLS/INP beyond noise.
- Targets on a mid-tier mobile profile: **LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.**
- Animate only `transform` and `opacity`. Never animate layout properties in lists.
- Route-level code splitting. Fonts subsetted, self-hosted, `font-display: swap`.

### 4.5 Accessibility
- Visible keyboard focus on every interactive element. Contrast ≥ WCAG AA for text (check muted/faint text on the paper background and adjust the *token*, not the component).
- Honour `prefers-reduced-motion` everywhere, including 3D.
- Real `<button>`/`<a>`/`<label>` semantics; dialogs trap focus and close on Esc.

---

## 5. Decisions already made (do not revisit)

| Topic | Decision |
|---|---|
| Visual direction | Keep warm paper/ink/coral identity; modernize through craft, not new colours |
| Consistency | Landing page and all app pages share tokens, primitives, and layout |
| Animation library | **Motion** (formerly Framer Motion): `npm i motion`, import from `motion/react` |
| Scroll libraries | None (no GSAP, no Lenis) |
| 3D | React Three Fiber + drei, **landing hero only**, lazy-loaded, with a static poster fallback |
| Charts | Keep Recharts; apply one shared theme |

---

## Step 0 — Recon and baseline (read-only, no code changes except a report)

**Do:**
1. Read `DESIGN.md`, `frontend/package.json`, the router file, the app shell/layout component, and the global CSS entry. Identify how styling is done (plain CSS, CSS modules, Tailwind, styled-components, inline styles).
2. List every route/page and every shared component. Write the inventory to `docs/ui-inventory.md` (table: route, file, shared components used, charts used).
3. Record baselines in `docs/ui-baseline.md`: production build size per route chunk (gzip), and Lighthouse (mobile) scores + LCP/CLS/INP for the landing page, dashboard, and one data-heavy page.
4. Take screenshots of every page at 390px and 1280px widths into `docs/ui-baseline/` (use Playwright if available; otherwise note manual capture is needed).
5. *(Optional)* If the user has Hallmark installed (`npx skills add nutlope/hallmark`), run `hallmark audit frontend/` and save the punch list to `docs/ui-audit.md`. Hallmark outputs HTML+CSS, so use it for audit/direction only, never copy its output into the app.

**Verify:** the three docs exist; nothing in `src/` changed.

---

## Step 1 — Design tokens (single source of truth)

**Do:**
1. Create `frontend/src/styles/tokens.css` and import it first in the app entry. Use the starter in Appendix A. Reconcile with any existing variables (keep names the code already uses as aliases, then migrate usages later).
2. Add purpose-named tokens: colour, type scale, spacing (4/8 grid), radius, border, shadow, z-index, and motion durations/easing.
3. Check contrast of `--muted` and `--faint` on `--bg`/`--surface`. If either fails AA for the sizes where it's used, darken the token slightly and record the change.
4. Update `DESIGN.md` to document the tokens and the new rules from sections 4.2–4.3 of this spec.

**Verify:** app looks unchanged; `tokens.css` is the only place raw hex values for the palette are defined (grep to confirm for new code).

---

## Step 2 — Fonts and global base styles

**Do:**
1. Fonts in use per DESIGN.md: Inter Tight (display), Inter (body), Playfair Display (serif italic accent). Self-host as variable/woff2 files, subset to Latin (add Devanagari only if the UI actually renders it, e.g. the Sanskrit mark on the landing page). Load Playfair **italic only** if that is the only style used.
2. Preload only the body font and the display font used above the fold. `font-display: swap`. Use a metric-matched fallback stack to avoid layout shift.
3. Create a small base stylesheet: box-sizing, body type, `.fin` tabular numerals class, focus-visible ring using `--accent`, selection colour, scrollbar styling (subtle), `prefers-reduced-motion` global reset.

**Verify:** no FOIT; CLS unchanged or better; keyboard focus visible on a tab-through of the dashboard.

---

## Step 3 — Motion foundation

**Do:**
1. `npm i motion`. Create `frontend/src/lib/motion.tsx` with: a `MotionProvider` that wraps the app in `<LazyMotion features={domAnimation} strict>` and `<MotionConfig reducedMotion="user">`; exported duration/easing constants matching the CSS tokens (Appendix B). Use the `m` component (not `motion`) everywhere so LazyMotion keeps the bundle small.
2. Create hooks/components: `useCountUp` (animates a number, respects reduced motion, renders final value immediately if reduced), `<Reveal>` (single fade-up, opacity+transform only, once), `<PageTransition>` (route fade, ≤200 ms).
3. Document the motion rules in `DESIGN.md`: what may animate, durations, and "no unprompted motion beyond one orchestrated entrance per page".

**Verify:** bundle diff shows only the LazyMotion/domAnimation footprint added; reduced-motion turns everything off.

---

## Step 4 — Primitives (build once, use everywhere)

Create `frontend/src/components/ui/` with typed, accessible primitives that read **only** from tokens. No page may restyle them ad hoc.

| Primitive | Notes |
|---|---|
| `Button` | primary (coral fill), secondary (ink outline), ghost; pill radius; loading + disabled states; 44px min touch target |
| `Card` | surface, 1px border, 12px radius; `interactive` variant has the single hover lift from DESIGN.md |
| `Stat` | label, big figure (`.fin`, optional count-up), optional delta, optional footnote |
| `Progress` | 6px bar; coral and success variants; animates fill on mount only |
| `Input`, `Select`, `Textarea`, `Field` | label, hint, error text, 16px font, ink focus border |
| `Table` | sticky header, right-aligned numeric columns, row hover, responsive (stacks or scrolls at <640px) |
| `Badge` | neutral, success, warning, danger; no left stripes |
| `Dialog` / `Sheet` | focus trap, Esc, backdrop blur only (modal shadow from tokens); sheet on mobile |
| `Tabs`, `Tooltip`, `Toast` | accessible; toast copy follows 4.3 |
| `Skeleton` | matches final layout dimensions to prevent CLS |
| `EmptyState` | icon (SVG), one-line explanation, one primary action |
| `Icon` set | inline SVG, tree-shaken (add `lucide-react` only if no icon system exists; import icons individually) |

**Do:** add a dev-only `/styleguide` route that renders every primitive in every state (excluded from production build or behind `import.meta.env.DEV`).

**Verify:** styleguide renders; keyboard and screen-reader basics pass on Dialog/Tabs/Select; no primitive contains raw hex colours.

---

## Step 5 — App shell and layout

**Do:**
1. Rebuild the shell using primitives and tokens: sidebar 220px sticky on ≥1024px; bottom nav (5 items) below 1024px; main content max-width 960px with 28/32px padding (16px on mobile), per DESIGN.md.
2. Active nav item uses coral text/marker (counts toward the 2-accent limit), not a filled block.
3. Page header pattern shared by all pages: title (display font), optional serif-italic page number, optional primary action on the right.
4. Add `<PageTransition>` at the router outlet. Route-level `React.lazy` for every page if not already present.
5. Ensure the debt-freedom progress stays prominent in the shell/dashboard (core product philosophy).

**Verify:** all existing routes render in the new shell at 390px, 768px, 1280px; no horizontal scroll; Lighthouse CLS ≤ baseline.

---

## Step 6 — Charts theme (Recharts)

**Do:**
1. Create `lib/chartTheme.ts` exporting colours, axis/grid styles, tooltip component, and number formatting (`Intl.NumberFormat`, respects the user's currency).
2. Tooltips and legends use the same `Card`-like surface, tokens, and tabular numerals.
3. Grid lines at `--border-soft`; one coral series max per chart, others ink/muted/success. Area fills may use SVG gradients (allowed exception).
4. Charts get `isAnimationActive` only on first mount, short duration, off for reduced motion. Provide an accessible text summary (`aria-label` or visually-hidden table) for each chart.

**Verify:** every existing chart uses the theme; no chart has inline hex colours.

---

## Step 7 — Migrate pages, one by one

For **each** page in the inventory (`docs/ui-inventory.md`), in this order: **Dashboard → Debt payoff → Recurring expenses → SIP planner → Portfolio rebalancing → Reports/export → Insurance → Trips → Households → Settings/AI → Onboarding → Auth screens**:

1. Replace ad-hoc markup/styles with primitives and tokens.
2. Apply the page-header pattern; ensure numbers use `.fin`; ensure empty/loading/error states use `EmptyState`/`Skeleton`/error copy per 4.3.
3. Dashboard specifics: lead with debt-free progress (Progress + Stat with count-up), then upcoming dues, then net position. Whitespace as separators; not everything in cards.
4. Remove dead CSS for that page.
5. Commit separately: `ui(step-7): migrate <page>`.

**Verify per page:** screenshots at 390 and 1280 vs baseline; keyboard pass; no new JS chunk growth beyond 10%; tests green.

---

## Step 8 — Landing page structure (no 3D yet)

**Do:**
1. Build the landing page from the **same primitives and tokens** (same colours, type, buttons, cards). It lives on its own route chunk.
2. Sections, in order: hero (headline + one primary CTA `Start free` + secondary `See how it works`), the Negative → Zero → Positive idea (a real dashboard `Card` with the debt progress as the visual), core capabilities (SVG icons, not emoji), comparison vs other apps (adapt the README table; keep claims accurate and dated), privacy/DPDP, open source + free forever, final CTA, footer.
3. Motion: one orchestrated hero entrance plus simple `<Reveal>` on below-fold sections (once, opacity+transform). No scroll hijacking.
4. SEO: title, description, canonical, OG image (already at `/og-sampada.png`), JSON-LD `SoftwareApplication`. Ensure meaningful content exists without JS where feasible (consider prerendering the landing route only).
5. Hero reserves a fixed-size slot for the future 3D/poster (to avoid layout shift).

**Verify:** landing LCP ≤ 2.5 s on mobile profile with no 3D; looks consistent with the app.

---

## Step 9 — 3D hero (landing page only)

**Concept:** a matte coral coin bearing the Sanskrit mark **सं** (for संपदा), slowly tilting with the pointer, and as the user scrolls through the hero it descends from below a faint "zero" ring and settles onto it — echoing Negative → Zero → Positive. Calm, warm, on-brand: no bloom, no neon, no glass.

**Do:**
1. `npm i three @react-three/fiber @react-three/drei` (use versions compatible with React 19; verify the peer dependencies resolve).
2. Create `src/landing/hero3d/` with `Hero3D.tsx` (the R3F scene) and `HeroPoster.tsx` (a static WebP/SVG of the same composition, sized to the reserved slot). Use Appendix C as the skeleton.
3. Import `Hero3D` with `React.lazy` **inside the landing route only**, after first paint (`requestIdleCallback` / `setTimeout` fallback). Confirm in the build output that Three.js lives in its own chunk that **no app route imports**.
4. Show `HeroPoster` immediately; cross-fade to the canvas once the first frame renders.
5. Gate rendering: render 3D only if **all** are true: WebGL available, viewport ≥ 768px, `prefers-reduced-motion` is not set, `navigator.connection.saveData` is not true, and `navigator.hardwareConcurrency > 4` (treat unknown as true). Otherwise keep the poster.
6. Performance settings: `dpr={[1, 1.5]}`, `frameloop="demand"` or pause when off-screen (IntersectionObserver), no shadows maps, no post-processing, procedural geometry (cylinder + extruded/texture mark), a single directional + ambient light, materials coloured from tokens. Dispose geometry/materials on unmount. Wrap in an error boundary that falls back to the poster.
7. Scroll link: drive the coin's y-position/rotation from a normalised scroll progress value (Motion's `useScroll`/`useTransform` or a plain scroll listener) — update inside `useFrame`, not via React state per frame.
8. Accessibility: canvas is `aria-hidden`; the hero text conveys all meaning; the poster has appropriate alt text or is decorative.

**Verify:** app routes' bundles unchanged (diff vs Step 0); landing LCP unchanged vs Step 8 (the poster is the LCP element); 3D chunk loads only on landing; disabling WebGL or enabling reduced motion shows the poster with no console errors; steady-state ≥ 55 fps on a mid-tier laptop, no continuous GPU use when scrolled away.

---

## Step 10 — Performance and accessibility gates in CI

**Do:**
1. Add Lighthouse CI (`@lhci/cli`) with `lighthouserc.json` (Appendix D). Separate assertions for the landing route and two app routes. Fail the build on regressions beyond the targets in 4.4.
2. Add a bundle-size check (e.g. `size-limit` or `vite-bundle-visualizer` output compared with the Step 0 baseline).
3. Add `axe` checks (e.g. `@axe-core/playwright`) against the styleguide and key pages; fail on serious/critical issues.
4. Add a Playwright visual smoke test for the primitives styleguide and the landing page at 390 and 1280px.

**Verify:** CI passes on the branch; deliberately breaking a budget makes it fail (then revert).

---

## Step 11 — QA, docs, and rollout preparation

**Do:**
1. Cross-browser check: latest Chrome, Safari (iOS), Firefox. Test on a real or emulated mid-tier Android.
2. Update `DESIGN.md` (final tokens, primitives list, motion rules, 3D constraints), `README.md` screenshots, and add `docs/ui-after.md` with before/after metrics and screenshots versus Step 0.
3. Open a PR to `main` titled `UI modernization`, with the Cloudflare Pages preview URL and the before/after table in the description.
4. List known follow-ups (anything skipped or adapted) at the bottom of `docs/ui-after.md`.

**Verify:** Definition of Done below is fully ticked. **Stop and wait for review.**

---

## Definition of Done

- [ ] Every page uses tokens + primitives; no raw palette hex in components; no dead per-page CSS.
- [ ] Landing page and app are visually consistent (same colour, type, buttons, layout language).
- [ ] 3D exists only on the landing route, in its own chunk, with a static poster fallback and reduced-motion/low-power handling.
- [ ] No app route regresses >10% initial JS; LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms on the mobile profile.
- [ ] Reduced motion respected everywhere; keyboard and axe checks pass.
- [ ] CI enforces the budgets; docs updated; PR open with before/after evidence.

---

## Appendix A — `tokens.css` starter

```css
:root {
  /* Colour (from DESIGN.md) */
  --bg: #f7f1de;
  --surface: #faf9f7;
  --ink: #15140f;
  --ink-soft: #2a2620;
  --muted: #5a5448;      /* verify AA contrast; darken if needed */
  --faint: #8b8676;      /* decorative/hints only unless contrast passes */
  --accent: #ed6f5c;
  --accent-soft: #f08e7c;
  --success: #2d7d6a;
  --warning: #9a6700;    /* proposed: warm amber, check on --bg */
  --danger: #b3402f;     /* proposed: deep warm red, distinct from --accent */
  --border: rgba(21, 20, 15, 0.12);
  --border-soft: rgba(21, 20, 15, 0.06);

  /* Type */
  --font-display: 'Inter Tight', -apple-system, system-ui, sans-serif;
  --font-body: 'Inter', -apple-system, system-ui, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --text-2xs: 10.5px; --text-xs: 12px; --text-sm: 13px; --text-base: 14px;
  --text-md: 16px; --text-lg: 18px; --text-xl: 20px; --text-2xl: 24px; --text-3xl: 36px;
  --leading-body: 1.55; --leading-display: 1.1;

  /* Space (4px grid) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Radius */
  --radius-sm: 8px; --radius-md: 12px; --radius-pill: 999px;

  /* Elevation */
  --shadow-hover: 0 20px 50px -24px rgba(21, 20, 15, 0.15);
  --shadow-modal: 0 24px 80px rgba(21, 20, 15, 0.2);

  /* Motion */
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
  --ease: cubic-bezier(0.2, 0, 0, 1);
}

.fin { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Appendix B — Motion constants and provider

```tsx
// src/lib/motion.tsx
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

export const DUR = { fast: 0.12, base: 0.2, slow: 0.32 } as const;
export const EASE = [0.2, 0, 0, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
// Usage: import { m } from 'motion/react';  <m.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} />
```

## Appendix C — 3D hero skeleton (landing only)

```tsx
// src/landing/HeroVisual.tsx — the only file that knows about 3D
import { lazy, Suspense, useEffect, useState } from 'react';
import HeroPoster from './hero3d/HeroPoster';

const Hero3D = lazy(() => import('./hero3d/Hero3D')); // separate chunk

function canRender3D() {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = window.innerWidth >= 768;
  const nav = navigator as any;
  const saveData = nav.connection?.saveData === true;
  const cores = nav.hardwareConcurrency ?? 8;
  const canvas = document.createElement('canvas');
  const webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  return webgl && wide && !reduced && !saveData && cores > 4;
}

export default function HeroVisual() {
  const [enable, setEnable] = useState(false);
  useEffect(() => {
    const go = () => setEnable(canRender3D());
    const id = 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback(go)
      : window.setTimeout(go, 800);
    return () => ('cancelIdleCallback' in window
      ? (window as any).cancelIdleCallback(id)
      : clearTimeout(id));
  }, []);

  return (
    <div className="hero-visual" style={{ aspectRatio: '1 / 1', position: 'relative' }}>
      <HeroPoster />               {/* always rendered first; this is the LCP element */}
      {enable && (
        <Suspense fallback={null}>
          <Hero3D />               {/* fades in over the poster after first frame */}
        </Suspense>
      )}
    </div>
  );
}

// Hero3D.tsx outline:
// <Canvas dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, powerPreference: 'low-power' }} aria-hidden>
//   <ambientLight intensity={0.8} /><directionalLight position={[3, 4, 5]} intensity={1.2} />
//   <Coin />   // CylinderGeometry, matte coral material from tokens, "सं" via texture or drei <Text>
//   <ZeroRing /> // TorusGeometry (thin), ink at low opacity
//   // useFrame: read scroll progress (ref), lerp coin y/rotation, call invalidate() only while visible
// </Canvas>
// Pause via IntersectionObserver when the hero leaves the viewport. Wrap in an ErrorBoundary -> HeroPoster.
```

## Appendix D — `lighthouserc.json` starter

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173/", "http://localhost:4173/dashboard", "http://localhost:4173/debt"],
      "numberOfRuns": 3,
      "settings": { "preset": "desktop", "formFactor": "mobile", "throttlingMethod": "simulate" }
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interaction-to-next-paint": ["warn", { "maxNumericValue": 200 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```
> Adjust URLs to the real routes found in Step 0. For authenticated routes, use a test session/cookie or run LHCI against the styleguide and public pages only, and note the limitation.
