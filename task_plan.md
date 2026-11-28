# Unslop Sampada — Implementation Plan

**Goal:** Apply unslop methodology to fix implementation consistency gaps while preserving the strong design system. Slop level: Medium.

---

## Phase 0: Setup & Baseline
- [ ] 0.1 Create planning files
- [ ] 0.2 Snapshot current build (`npm run build`)
- [ ] 0.3 Verify dev server runs

---

## Phase 1: Spacing + Color (Pass 1-2) — Foundation
*Utility class system, migrate inline styles to tokens, enforce token usage*

- [ ] 1.1 Create comprehensive utility classes in `src/styles/primitives.css` for all tokens (spacing, typography, colors, radii, shadows)
- [ ] 1.2 Replace Tailwind-like syntax with semantic utility classes across all pages
- [ ] 1.3 Migrate all inline `style={{...}}` to utility classes / component props
- [ ] 1.4 Fix hardcoded semantic colors in JSX → component variants / utility classes
- [ ] 1.5 Verify dark mode works everywhere (no hardcoded colors)

---

## Phase 2: Icons (Pass 3) — Standardize
*One icon set (Lucide), one size/stroke per context*

- [ ] 2.1 Audit all icon usage across pages
- [ ] 2.2 Standardize sizes: 14px (inline), 18px (nav), 20px (mobile), 24px (feature), 28-32px (hero)
- [ ] 2.3 Standardize stroke: 1.5 (small), 2 (base), 2.5 (large)
- [ ] 2.4 Remove all emoji/Unicode icons → Lucide equivalents
- [ ] 2.5 Ensure icon color = text role (muted/faint for decorative, accent for active)

---

## Phase 3: Copy (Pass 4) — Consistency
- [ ] 3.1 Fix "Net worth" vs "Net Worth" → standardize
- [ ] 3.2 Fix page numbering scheme (006/016, etc.) → consistent
- [ ] 3.3 Fix "Money in/out" vs "Total Income/Expenses" → consistent
- [ ] 3.4 Fix "Debt freedom progress" vs "Debt paid off" → consistent

---

## Phase 4: Type (Pass 5) — Enforce
*Font stack, uppercase only where spec allows*

- [ ] 4.1 Enforce `--font-display` (Inter Tight) for all headings
- [ ] 4.2 Enforce `--font-body` (Inter) for all body text
- [ ] 4.3 Enforce `--font-serif` (Playfair Display) for editorial microcopy only
- [ ] 4.4 Enforce `.fin` class (tabular-nums) on ALL financial figures
- [ ] 4.5 Uppercase tracked labels ONLY for: nav group names, small table headers — remove elsewhere
- [ ] 4.6 Verify no negative letter-spacing on small text

---

## Phase 5: Layout (Pass 6) — Fluid Island
*Sidebar as floating pill, mobile fixes*

- [ ] 5.1 Redesign desktop sidebar as Fluid Island (floating pill, detached from edges, `mt-6 mx-auto w-max rounded-full`)
- [ ] 5.2 Add hamburger morph animation (lines → X rotation/translation)
- [ ] 5.3 Fix mobile bottom nav as floating pill with spring physics
- [ ] 5.4 Add staggered mask reveal on menu open (links fade/slide with delay-100, delay-150, delay-200)
- [ ] 5.5 Fix mobile breakpoints on ALL pages (single-column stack, `min-h-[100dvh]`, `px-4`, `py-8`)
- [ ] 5.6 FAB position: fix conflict with bottom nav on mobile

---

## Phase 6: Details (Pass 7) — Craft
*Double-bezel cards, button-in-button, magnetic press, empty states*

- [ ] 6.1 Implement double-bezel Card: `.card-shell` (outer) + `.card-core` (inner) with concentric radius
- [ ] 6.2 Add inner highlight to `.card-core` (`inset 0 1px 1px rgba(255,255,255,0.15)`)
- [ ] 6.3 Fix Button trailing icon → button-in-button pattern (circular wrapper flush with right padding)
- [ ] 6.4 Add magnetic press physics: spring on press (scale 0.97, 60ms), hover lift (translateY -1px, spring)
- [ ] 6.5 Standardize focus-visible: `outline: 2px solid var(--focus-ring); outline-offset: 2px` on ALL interactive
- [ ] 6.6 Replace all hardcoded z-indices with semantic tokens (`--z-sticky`, `--z-modal`, etc.)
- [ ] 6.7 Unified EmptyState: SVG illustrations (not emoji), consistent action button styling
- [ ] 6.8 Fix form validation: inline errors, `aria-invalid`, real-time feedback
- [ ] 6.9 Ensure 44px touch targets on ALL mobile interactive elements

---

## Phase 7: Visuals (Pass 8) — Polish
*Remove decorative loops, fix empty states, one accent per screen*

- [ ] 7.1 Remove coin float animation (`.coin-float` 5s infinite loop) — static or scroll-driven only
- [ ] 7.2 Remove gradient fills where not needed (keep only SVG chart area gradients)
- [ ] 7.3 Ensure ONE accent element per screen section (max 2 visible)
- [ ] 7.4 Fix Dashboard FAB: not accent if progress bar is already accent

---

## Phase 8: Motion (Pass 9) — Refine
*Diversify easings, Reveal everywhere, reduced-motion complete*

- [ ] 8.1 Add easing variants: `--ease-expo-out` (enter 640ms+), `--ease-spring` (interactions), `--ease-out` (exit 200ms)
- [ ] 8.2 Add `<Reveal>` to ALL page sections (Dashboard, Transactions, Settings, Debts, Goals, Budgets, etc.)
- [ ] 8.3 Fix reduced-motion: cover CSS transitions on hover, not just animations
- [ ] 8.4 Ensure `useCountUp` respects reduced-motion (already does, verify)
- [ ] 8.5 Chart accessibility: stroke-dasharray patterns, direct labels, `aria-label` with text summary

---

## Phase 9: Check & Report
- [ ] 9.1 Run checklist against audit list
- [ ] 9.2 Build and verify no regressions
- [ ] 9.3 Visual diff: compare before/after
- [ ] 9.4 Write report

---

## Files to Modify (Priority Order)

| File | Phases |
|------|--------|
| `src/styles/primitives.css` | 1, 6, 8 |
| `src/styles/tokens.css` | 1, 8 |
| `src/components/ui/Card.jsx` | 6 |
| `src/components/ui/Button.jsx` | 6 |
| `src/components/ui/EmptyState.jsx` | 6 |
| `src/components/ui/Input.jsx` | 6 |
| `src/components/ui/Progress.jsx` | 6 |
| `src/components/ui/Stat.jsx` | 1, 4 |
| `src/lib/motion-primitives.jsx` | 8 |
| `src/lib/motion.jsx` | 8 |
| `src/pages/Layout.jsx` | 2, 5 |
| `src/pages/Dashboard.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Landing.jsx` | 1, 2, 4, 7, 8 |
| `src/pages/Transactions.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Settings.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Debts.jsx` / `DebtDetail.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Budgets.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Goals.jsx` | 1, 4, 5, 6, 8 |
| `src/pages/Onboarding.jsx` | 1, 4, 6, 8 |
| `src/pages/AuthLayout.jsx` + auth pages | 1, 4, 5, 6, 8 |
| All other pages | 1, 4, 5, 6, 8 |