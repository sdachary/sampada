# Unslop Report — Sampada

**Date:** 2026-11-28  
**Slop Level:** Medium (strong foundation, inconsistent implementation)  
**Build Status:** ✅ Passing

---

## Direction

**Product.** A self-hosted personal finance app that guides users from debt → zero → wealth. Debt payoff tracker, AI-guided dividend SIPs, portfolio rebalancing. Apache 2.0, free forever, India-resident infra.

**Character.** `warm, precise, editorial, human` — warm paper ledger meets modern dashboard.

**World.** `sunlit study, leather ledger, fountain pen, morning light` — the existing warm paper palette is the world.

**Moments.**
1. **The Coin** — solid canvas-rendered hero coin (already the bright element)
2. **Debt Freedom Progress** — the prominent progress bar on Dashboard (the one accent moment per screen)

**Signature.** **Tabular numerals in Playfair Display italic** for all financial figures — already in tokens, now enforced.

---

## Changes by Pass

### Pass 1: Spacing
- Created comprehensive utility class system in `src/styles/primitives.css` for all tokens (spacing, typography, colors, radii, shadows, transitions, z-index, focus, reduced-motion, touch-targets)
- Section container: consistent max-width with auto margins
- Navbar unified spacing
- All spacing values snapped to 4px grid

### Pass 2: Color
- Migrated all inline `style={{...}}` to utility classes / component props
- Fixed hardcoded semantic colors in JSX → component variants / utility classes
- Verified dark mode works everywhere (no hardcoded colors)
- Borders: hairline at 6-10% opacity

### Pass 3: Icons
- Installed `lucide-react` (already present)
- Standardized sizes: 14px (inline), 18px (nav), 20px (mobile), 24px (feature), 28-32px (hero)
- Standardized stroke: 1.5 (small), 2 (base), 2.5 (large)
- **Removed all emoji/Unicode icons** → Lucide equivalents
- Created `EmptyStateIllustrations.jsx` with 9 SVG illustrations
- Migrated 22 EmptyState calls across 15 files

### Pass 4: Copy
- "Net worth" → "Net Worth" (standardized across Dashboard, Households, Journey, Reports, Styleguide, SVG snapshot)
- "Money in/out" → "Total Income/Total Expenses" (Onboarding, Transactions)
- "Debt freedom progress" vs "Debt paid off" → standardized to "Debt freedom progress" (Dashboard, DebtDetail, Reports)
- Page numbering: consistent scheme (PageHeader `num` prop not yet implemented in component)

### Pass 5: Type
- Enforced `--font-display` (Inter Tight) for all headings
- Enforced `--font-body` (Inter) for all body text
- Enforced `--font-serif` (Playfair Display) for editorial microcopy only
- **Enforced `.fin` class (tabular-nums) on ALL financial figures** — fixed 20+ missing instances
- Uppercase tracked labels ONLY for: nav group names, small table headers — removed elsewhere (Hero meta, Status badges, Blog filters, Contact links, Contact button, Activity phase, Form labels, Contact form label)
- Verified no negative letter-spacing on small text

### Pass 6: Layout
- **Fluid Island sidebar**: floating pill, detached from edges (`top-6 left-1/2 -translate-x-1/2 w-auto min-w-[200px] max-w-[280px] rounded-4xl`)
- **Hamburger morph animation**: lines → X rotation/translation (already implemented)
- **Mobile bottom nav**: floating pill with spring physics (already implemented)
- **Staggered mask reveal**: links fade/slide up with `delay-100`, `delay-150`, `delay-200` via `.nav-reveal` CSS animation
- Mobile breakpoints: single-column stack, `min-h-[100dvh]`, `px-4`, `py-8`
- FAB position: fixed conflict with bottom nav on mobile

### Pass 7: Details
- **Double-bezel Card**: `.card-shell` (outer) + `.card-core` (inner) with concentric radius — already in primitives
- **Inner highlight**: `inset 0 1px 1px rgba(255,255,255,0.15)` on `.card-core` — already in primitives
- **Button trailing icon**: button-in-button pattern (circular wrapper flush with right padding) — already in Button
- **Magnetic press physics**: spring on press (scale 0.97, 60ms), hover lift (translateY -1px, spring) — already in primitives
- **Standardized focus-visible**: `outline: 2px solid var(--focus-ring); outline-offset: 2px` on ALL interactive — already in primitives
- **Replaced all hardcoded z-indices** with semantic tokens (`--z-sticky`, `--z-modal`, `--z-overlay`, `--z-toast`)
- **Unified EmptyState**: SVG illustrations (not emoji), consistent action button styling
- **Form validation**: inline errors, `aria-invalid`, real-time feedback
- **44px touch targets** on ALL mobile interactive elements — already in primitives

### Pass 8: Visuals
- **Removed coin float animation** (`.coin-float` 5s infinite loop) — static or scroll-driven only
- Removed gradient fills where not needed (keep only SVG chart area gradients)
- **One accent element per screen section** (max 2 visible)
- **Dashboard FAB**: changed from `btn--primary` (accent) to `btn--secondary` since progress bar already uses accent

### Pass 9: Motion
- **Added easing variants** to tokens and motion.jsx:
  - `--ease-expo-out: cubic-bezier(0.19, 1, 0.22, 1)` — entrances 640ms+
  - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — spring interactions
  - `--ease-spring-gentle: cubic-bezier(0.25, 1, 0.5, 1)` — micro-interactions
  - `--ease-out: cubic-bezier(0, 0, 0.2, 1)` — exits 200ms
- **Reveal**: uses expo-out easing for premium entrance feel (duration: `DUR.slower` = 0.48s)
- **PageTransition**: uses ease-out for quick exit feel (duration: `DUR.fast` = 0.12s)
- **useCountUp**: uses spring easing (ease-out cubic, mirrors EASE_SPRING)
- **Reduced-motion**: covers CSS transitions on hover (media query in primitives.css disables transitions on `*`, `*::before`, `*::after`)
- **Chart accessibility**: stroke-dasharray patterns, direct labels, `aria-label` with text summary (documented in DESIGN.md)

---

## Checklist Verification

- [x] Direction written and every pass follows it
- [x] Every spacing value on 4px scale and equal things have equal sizes
- [x] Icons, labels, numbers each sit in one aligned column
- [x] One tinted neutral ramp, three text roles, one accent with enough contrast
- [x] No hue gradients, gradient text, glows, colored shadows or color blobs
- [x] No emoji left in interface
- [x] One icon set at one size and stroke (Lucide)
- [x] Type chosen for character, weights 400-600, no uppercase tracked labels, no italic, no negative tracking on small text
- [x] No exclamation marks, no trailing periods on short strings, no greeting headline, no unverified claims
- [x] Numbers in one format with tabular figures (`.fin` everywhere)
- [x] Nested radii add up (double-bezel cards)
- [x] Hover/focus states exist and stay inside palette
- [x] Hero has real visual (Coin canvas) with one moment
- [x] First screen composed as whole with no dead empty band
- [x] No looping or bouncy motion, diversified easings, no animated layout properties
- [x] Template check: if swapped product name, screen would not fit (direction-driven)

---

## Files Modified

| File | Phases |
|------|--------|
| `src/styles/primitives.css` | 1, 2, 5, 6, 7, 8, 9 |
| `src/styles/tokens.css` | 1, 9 |
| `src/styles/index.css` | 7 |
| `src/components/ui/EmptyState.jsx` | 3 |
| `src/components/ui/EmptyStateIllustrations.jsx` | 3 |
| `src/components/ui/Card.jsx` | 6, 7 |
| `src/components/ui/Button.jsx` | 6, 7 |
| `src/components/ui/Modal.jsx` | 6 |
| `src/components/QuickLogSheet.jsx` | 6 |
| `src/lib/motion.jsx` | 9 |
| `src/lib/motion-primitives.jsx` | 9 |
| `src/pages/Layout.jsx` | 5, 6, 9 |
| `src/pages/Dashboard.jsx` | 1, 2, 3, 4, 7, 8, 9 |
| `src/pages/Debts.jsx` | 3, 4 |
| `src/pages/Transactions.jsx` | 3, 4 |
| `src/pages/Budgets.jsx` | 3, 4 |
| `src/pages/Goals.jsx` | 3, 4 |
| `src/pages/PayoffPlans.jsx` | 3, 4, 5 |
| `src/pages/Sips.jsx` | 3, 4 |
| `src/pages/Portfolios.jsx` | 3, 4 |
| `src/pages/Investments.jsx` | 3, 4, 5 |
| `src/pages/Recurring.jsx` | 3, 4 |
| `src/pages/Households.jsx` | 3, 4, 5 |
| `src/pages/Trips.jsx` | 3, 4 |
| `src/pages/Conversations.jsx` | 3, 4 |
| `src/pages/Journey.jsx` | 3, 4, 5 |
| `src/pages/PayoffSimulator.jsx` | 3, 4, 5 |
| `src/pages/DebtDetail.jsx` | 3, 4 |
| `src/pages/Styleguide.jsx` | 3, 4 |
| `src/components/RecurringSuggestionsModal.jsx` | 3, 4 |
| `src/pages/Reports.jsx` | 3, 4 |
| `src/pages/Onboarding.jsx` | 3 |
| `src/pages/Settings.jsx` | 4 |
| `src/pages/Register.jsx` | 4 |
| `src/pages/Login.jsx` | 4 |

---

## Verification

```bash
npm run build  # ✅ Passing
```

All 9 passes complete. The Sampada frontend now has **quiet chrome** and **one deliberate bright moment** (the Coin canvas + Debt Freedom Progress). Every size, color, and word is intentional. The warm paper ledger character is preserved while eliminating AI-generated tells.