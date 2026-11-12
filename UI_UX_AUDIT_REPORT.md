# Sampada — UI/UX Audit Report

**Date:** 2026-11-12  
**Auditor:** Principal UI/UX Architect (Awwwards-tier standards)  
**Scope:** All frontend pages (`frontend/src/pages/*.jsx`) + component library (`frontend/src/components/ui/*`) + design tokens (`frontend/src/styles/tokens.css`, `primitives.css`)

---

## Executive Summary

Sampada has a **strong, well-architected design system** with excellent token foundations (OKLCH colors, fluid typography, spring physics). However, **implementation consistency gaps** prevent it from reaching "$150k agency" tier. The design language is defined in tokens but **not enforced across pages** — many pages use inline styles that bypass the token system, creating visual inconsistency.

**Overall Grade: B+** (Strong foundation, inconsistent execution)

---

## Critical Issues (Must Fix Before UAT)

### 1. Token System Bypass — Inline Style Proliferation
**Location:** Nearly every page (`Dashboard.jsx`, `Transactions.jsx`, `Settings.jsx`, `Debts.jsx`, `DebtDetail.jsx`, `Budgets.jsx`, `Goals.jsx`, `Onboarding.jsx`, `Landing.jsx`, `AuthLayout.jsx`)

**Problem:** Pages extensively use inline `style={{...}}` with hardcoded values instead of semantic tokens:
```jsx
// Current (bypasses tokens)
style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
padding: '14px 18px'
borderLeft: `3px solid ${t.transaction_type === 'expense' ? 'var(--danger)' : 'var(--success)'}`

// Should use utility classes or component props
className="fin text-sm font-medium text-fg"
className="card card--pad-base border-l-3 border-l-danger"
```

**Impact:** 
- Design tokens become documentation, not enforcement
- Dark mode inconsistencies (some hardcoded colors don't adapt)
- Maintenance burden — changing a token requires grep across 20+ files
- No single source of truth for spacing, typography, colors

**Fix:** Migrate all inline styles to:
- CSS utility classes (`.text-sm`, `.fin`, `.card--pad-base`, etc.)
- Component prop APIs (`<Card padding="base" variant="bordered">`)
- Tailwind-like utility classes in `primitives.css`

---

### 2. Inconsistent Card Architecture — Missing Double-Bezel Pattern
**Location:** `primitives.css` defines `.card--glass` with double-bezel intent, but **no page uses it correctly**

**Current State:** 
- `.card` has single border + background
- No outer shell + inner core separation
- No concentric radius compensation (`calc(var(--radius-lg) - 2px)`)

**Required (per high-end-visual-design spec):**
```css
/* Outer shell */
.card-shell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-1.5); /* creates the bezel */
}

/* Inner core */
.card-core {
  background: var(--color-bg-elevated);
  border-radius: calc(var(--radius-xl) - var(--space-1.5));
  /* inner highlight */
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15);
}
```

**Pages affected:** All dashboard cards, debt cards, budget envelopes, goal cards, settings sections

---

### 3. Navigation — Not "Fluid Island" Pattern
**Location:** `Layout.jsx` (sidebar + bottom nav)

**Issues:**
| Current | Required (Fluid Island) |
|---------|------------------------|
| Sidebar fixed to left edge (`aside.sidebar`) | Floating pill detached from edges (`mt-6 mx-auto w-max rounded-full`) |
| No hamburger morph animation | Hamburger lines → X rotation/translation |
| Mobile bottom nav is static bar | Should be floating pill with spring physics |
| No staggered mask reveal on menu open | Links fade/slide up with `delay-100`, `delay-150`, `delay-200` |

**Code evidence (Layout.jsx:152-185):** Sidebar is full-height fixed, not a floating island.

---

### 4. Button Architecture — Missing "Button-in-Button" Trailing Icon
**Location:** `Button.jsx` + `primitives.css` (.btn__arrow)

**Current:** Trailing arrow is inline SVG with simple `translateX(2px)` on hover

**Required:** Nested circular wrapper flush with button's right padding:
```jsx
<span className="btn__icon btn__icon--trailing" aria-hidden="true">
  <span className="btn__icon-wrapper">
    <svg className="btn__arrow">...</svg>
  </span>
</span>
```

```css
.btn__icon-wrapper {
  width: 2rem; height: 2rem; /* matches button height */
  border-radius: 50%;
  background: rgba(0,0,0,0.08);
  display: flex; align-items: center; justify-content: center;
  transition: transform var(--transition-transform), background var(--transition-color);
}
.btn:not(:disabled):hover .btn__icon-wrapper {
  transform: translateX(2px) scale(1.05);
  background: rgba(0,0,0,0.15);
}
```

---

### 5. Magnetic Button Physics — Missing Press Feedback
**Location:** `primitives.css` (.btn--primary:active)

**Current:** Only `transform: translateY(0) scale(0.98)` — no spring snap-back

**Required:** Spring physics on press + release:
```css
.btn:not(:disabled):active {
  transform: scale(0.97);
  transition: transform 60ms cubic-bezier(0.2, 1.6, 0.3, 1);
}
.btn:not(:disabled):hover {
  transform: translateY(-1px);
  transition: transform var(--duration-base) var(--ease-spring);
}
```

---

### 6. Scroll Entry Animations — Inconsistent/Partial
**Location:** `motion-primitives.jsx` has `Reveal` component, but **usage is spotty**

| Page | Uses Reveal? | Issues |
|------|--------------|--------|
| Landing.jsx | ✅ Yes | Good — staggered delays |
| Dashboard.jsx | ❌ No | Static on load |
| Transactions.jsx | ❌ No | Static on load |
| Settings.jsx | ❌ No | Static on load |
| Debts.jsx | ❌ No | Static on load |
| Goals.jsx | ❌ No | Static on load |
| Budgets.jsx | ❌ No | Static on load |

**Required:** Every major section must use `<Reveal delay={...}>` with `y=16`, `blur-md`, `duration-slower` (640ms+)

---

### 7. Mobile Breakdowns — Layout Collapse Failures
**Location:** Multiple pages

| Page | Viewport Issue |
|------|----------------|
| Dashboard.jsx | FAB at `bottom: calc(84px + env(safe-area-inset-bottom))` — conflicts with bottom nav on mobile |
| Transactions.jsx | Month total cards: `flex: '1 0 160px'` — too narrow on mobile, wraps awkwardly |
| Settings.jsx | Profile edit grid: `gridTemplateColumns: '1fr 1fr'` — should stack on mobile |
| Goals.jsx | Form grid: `minmax(200px, 1fr)` — too wide for mobile, causes horizontal scroll |
| Landing.jsx | Hero grid: `gridTemplateColumns: '1fr 1fr'` — no mobile stack, 3D visual overflows |

**Universal Rule (per spec):** Below 768px → `w-full`, `px-4`, `py-8`, single column stack. Never `h-screen` — use `min-h-[100dvh]`.

---

## High Priority Issues

### 8. Typography — Mixed Font Stack Usage
**Location:** Throughout pages

**Issues:**
- Some pages use `fontFamily: 'var(--font-display)'` inline (correct)
- Others use bare `fontFamily: 'Inter Tight'` or nothing (falls back to system)
- `fontFamily: 'var(--font-serif)'` used in Landing.jsx hero but nowhere else
- Monospace for financial numbers: `.fin` class exists but not consistently applied

**Evidence:** 
- `Dashboard.jsx:138` — `fontFamily: 'var(--font-display)'` ✅
- `Transactions.jsx:75` — `fontFamily: 'var(--font-display)'` ✅
- `DebtDetail.jsx:141` — `fontSize: 22` no font-family ❌
- `Settings.jsx:245` — `fontSize: 14` no font-family ❌

---

### 9. Color Semantics — Hardcoded Coral/Success/Danger
**Location:** Pages using `var(--accent)`, `var(--success)`, `var(--danger)` directly in inline styles

**Problem:** These should be **component-level semantic variants**, not raw tokens in JSX:
```jsx
// Current
<Card style={{ borderLeft: `3px solid ${type === 'expense' ? 'var(--danger)' : 'var(--success)'}` }>

// Should be
<Card variant={type === 'expense' ? 'danger' : 'success'} />
// Or utility
<Card className={`border-l-3 ${type === 'expense' ? 'border-l-danger' : 'border-l-success'}`} />
```

**Affected:** Transaction cards, Debt cards, Budget envelopes, Progress variants

---

### 10. Focus States — Inconsistent Ring Offset
**Location:** `primitives.css` + `tokens.css`

**Tokens define:** `--focus-ring-offset: 2px`  
**But buttons use:** `outline-offset: var(--focus-ring-offset)` (correct)  
**Inputs use:** `box-shadow: 0 0 0 3px ...` (no outline-offset)  
**Cards/Interactive elements:** No focus styles at all

**Required:** Unified focus-visible system:
```css
.focus-visible:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
/* Applied to ALL interactive elements: buttons, links, cards, inputs, tabs */
```

---

### 11. Reduced Motion — Incomplete Coverage
**Location:** `tokens.css:440-447` + `primitives.css:525-527`

**Current:** Only disables animations on `*`, `*::before`, `*::after`  
**Missing:** 
- `PageTransition` respects it ✅
- `Reveal` respects it ✅
- But `useCountUp` in `motion-primitives.jsx` has its own `prefersReducedMotion()` check (duplicate)
- CSS transitions on `:hover` (cards, buttons) not covered by media query

---

### 12. Z-Index Discipline — Arbitrary Values
**Location:** `Layout.jsx`, `Settings.jsx`, `Dashboard.jsx`

| Element | Current z-index | Spec Layer |
|---------|----------------|------------|
| Sidebar | implicit (no z-index) | `--z-sticky: 200` |
| Mobile More sheet | `zIndex: 1000` | `--z-modal: 400` |
| Onboarding banner | `zIndex: 900` | `--z-toast: 700` |
| QuickLog FAB | `zIndex: 120` | `--z-popover: 500` |
| Command Palette | (via component) | `--z-command-palette: 800` |
| Dialog/Modal | (via .dialog-overlay) | `--z-modal: 400` |

**Fix:** Replace all hardcoded z-indices with semantic token references.

---

### 13. Empty States — Inconsistent Visual Language
**Location:** `EmptyState` component used in Dashboard, Transactions, Debts, Budgets, Goals

**Issues:**
- Icons: Mix of emoji (`📋`, `□`, `◎`), Lucide icons, raw Unicode (`↗`)
- No consistent illustration style
- Action button styling varies
- Some have `icon={<AlertCircle size={32} />}` others `<span style={{fontSize: 48}}>📋</span>`

**Required:** Unified empty state illustration system (SVG illustrations, not emoji)

---

### 14. Form Validation — Missing Inline Error Patterns
**Location:** `Login.jsx`, `Register.jsx`, `Settings.jsx`, `Goals.jsx`

**Issues:**
- Login: Error banner at top (good) but no field-level `aria-invalid`
- Register: Password strength meter (good) but confirm password no real-time match check
- Settings: AI key save — error shown below form, not near field
- Goals: No validation on required fields before submit

**Required:** Per ui-ux-pro-max §8: Visible labels, error near field, helper text, progressive disclosure

---

### 15. Touch Targets — Sub-44px on Mobile
**Location:** Multiple

| Element | Current Size | Min Required |
|---------|--------------|--------------|
| Sidebar nav links | `padding: '6px 12px'` ≈ 32px height | 44px |
| Bottom nav items | `padding: '8px 0 4px'` ≈ 36px height | 44px |
| Settings toggles | Native checkbox (tiny) | 44×44px hit area |
| DebtDetail inline fields | Clickable `div` no min-height | 44px |
| Pagination/page numbers | Not present but would be small | 44px |

**Fix:** `@media (max-width: 48rem) { .btn { min-height: 44px; } }` exists in primitives but not applied to all interactive elements.

---

## Medium Priority Issues

### 16. Motion Choreography — Single Easing Curve
**Location:** `motion.jsx:6` → `EASE = [0.2, 0, 0, 1]` (expo-out)

**Problem:** One easing for everything. Spec requires:
- Enter: `ease-expo-out` (0.19, 1, 0.22, 1) — 640ms+
- Exit: faster than enter (200ms)
- Spring interactions: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Micro-interactions: `ease-spring-gentle` (0.25, 1, 0.5, 1)

---

### 17. Chart Accessibility — Color-Only Encoding
**Location:** `Goals.jsx` (recharts), `Dashboard.jsx` (Chart component)

**Issues:**
- Line charts use color only (accent, success, ink) — no pattern/dash differentiation for colorblind
- Pie charts: `PIE_COLORS` only, no labels on slices
- No `aria-label` on chart containers describing the data trend

**Fix:** Add stroke-dasharray patterns, direct labels, and `role="img" aria-label="..."` with text summary.

---

### 18. Loading States — Skeleton Mismatches
**Location:** All pages with `loading` state

**Issues:**
- Dashboard: Skeleton heights (100px) don't match actual card heights
- Transactions: Skeleton `skeleton-wide` class doesn't exist in primitives
- Debts: Skeleton 100px vs actual ~140px card
- Goals: Skeleton 130px vs actual ~400px expanded card

**Required:** Skeletons must match final content dimensions exactly.

---

### 19. Onboarding Flow — UX Gaps
**Location:** `Onboarding.jsx`

**Issues:**
- Checklist items: Insurance uses `Button` (looks like action), others use `Link` (looks like navigation) — inconsistent affordance
- "Skip for now" vs "Finish setup" — destructive action not visually distinct
- Glossary buttons: `variant="ghost"` but styled as pills — confusing
- No progress indicator (steps 1-4)

---

### 20. Auth Pages — Visual Hierarchy Weak
**Location:** `AuthLayout.jsx`, `Login.jsx`, `Register.jsx`

**Issues:**
- `AuthLayout` uses `minHeight: '100vh'` (spec: use `min-h-[100dvh]`)
- Card padding hardcoded `padding: 32` (should use token `--card-padding-lg`)
- Register: Password strength bars use hardcoded colors, not token variants
- No `Reveal` entrance animations on auth forms

---

## Low Priority / Polish

### 21. Micro-copy Inconsistencies
- "Net worth" vs "Net Worth" (Dashboard vs Landing)
- "Money in/out" vs "Total Income/Expenses" (Onboarding vs Transactions)
- "Debt freedom progress" vs "Debt paid off" (Dashboard vs DebtDetail)
- PageHeader `num`: "006 / 016", "005 / 016", "013 / 016" — inconsistent numbering scheme

### 22. Icon Consistency
- Mix of Lucide React + emoji + raw Unicode
- Size varies: 14, 16, 18, 20, 26, 32px
- Stroke width varies: 1.75, 2, 2.5

### 23. Print Styles — Missing
No `@media print` styles for dashboard, reports, exports.

---

## Component Library Gaps

| Missing Component | Needed By |
|-------------------|-----------|
| `Avatar` (with fallback initials) | Layout user menu, Conversations |
| `DropdownMenu` / `Popover` | User menu, More sheet, Command palette items |
| `Tooltip` (trigger on focus+hover) | Icon-only buttons, truncated text |
| `Tabs` (fully accessible) | Settings sections, Budget views |
| `Pagination` | Transactions, Reports |
| `Breadcrumb` | Deep pages (DebtDetail, PortfolioRebalance) |
| `DataTable` (sortable, filterable) | Transactions, Reports, Exports |
| `DatePicker` / `DateRangePicker` | Transactions filter, Reports |
| `Slider` / `RangeSlider` | Budget allocation, Goal risk |
| `Switch` (accessible toggle) | Settings push notifications, Theme toggle |
| `RadioGroup` | Goal allocation, Budget period |
| `Accordion` | Settings sections, Help/FAQ |

---

## Design Token Violations (Automated Checklist)

Run this check across all `.jsx` files:
```bash
# Find hardcoded pixel values (should use tokens)
grep -rn "px\b" frontend/src/pages/ --include="*.jsx" | grep -v "var(--"

# Find hardcoded colors (should use semantic variants)
grep -rn "var(--accent\|var(--success\|var(--danger\|var(--warning\|var(--muted\|var(--faint)" frontend/src/pages/ --include="*.jsx"

# Find inline font-family (should use .fin, .text-display, etc.)
grep -rn "fontFamily:" frontend/src/pages/ --include="*.jsx"

# Find hardcoded z-index
grep -rn "zIndex:" frontend/src/pages/ --include="*.jsx"

# Find missing Reveal on page sections
grep -rn "return (" frontend/src/pages/ --include="*.jsx" -A 5 | grep -v "Reveal"
```

---

## Recommended Fix Order (Lazy Senior Dev Approach)

### Phase 1: Foundation (1-2 days)
1. **Create utility class system** in `primitives.css` for all tokens (spacing, typography, colors, radii)
2. **Migrate Card to double-bezel** (add `.card-shell` + `.card-core` structure)
3. **Fix Button trailing icon** to button-in-button pattern
4. **Standardize focus-visible** across all interactive elements
5. **Replace all hardcoded z-indices** with semantic tokens

### Phase 2: Layout & Navigation (1 day)
6. **Redesign sidebar** as Fluid Island (floating pill, hamburger morph, staggered reveal)
7. **Fix mobile bottom nav** as floating pill
8. **Add Reveal to all page sections** (Dashboard, Transactions, Settings, Debts, Goals, Budgets)

### Phase 3: Page Consistency (2-3 days)
9. **Migrate all inline styles** to utility classes / component props
10. **Fix mobile breakpoints** on all pages (single-column stack, `min-h-[100dvh]`)
11. **Standardize EmptyState** illustrations and actions
12. **Fix form validation** patterns (inline errors, `aria-invalid`, real-time feedback)
13. **Ensure 44px touch targets** on all mobile interactive elements

### Phase 4: Motion & Polish (1 day)
14. **Diversify easing curves** (enter/exit/spring/micro)
15. **Fix chart accessibility** (patterns, labels, aria)
16. **Align skeleton dimensions** with final content
17. **Unify micro-copy** and page numbering

### Phase 5: Component Library (Ongoing)
18. Build missing components as needed by pages

---

## UAT Testing Plan (Next Step)

See `UAT_TESTING_PLAN.md` for detailed test scenarios covering:
- Critical user journeys (auth → onboarding → dashboard → transactions → debts → goals)
- Responsive breakpoints (390px, 768px, 1280px, 1536px)
- Accessibility (keyboard, screen reader, reduced motion, high contrast)
- Performance (LCP, CLS, TBT, bundle size)
- Offline/PWA behavior
- Cross-browser (Chrome, Firefox, Safari, Edge)

---

## Appendix: File Reference Map

| Category | Files |
|----------|-------|
| **Layout** | `Layout.jsx`, `AuthLayout.jsx` |
| **Auth** | `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` |
| **Onboarding** | `Onboarding.jsx` |
| **Dashboard** | `Dashboard.jsx`, `Journey.jsx` |
| **Transactions** | `Transactions.jsx`, `TransactionFormModal.jsx` |
| **Budgets** | `Budgets.jsx`, `BudgetFormModal.jsx` |
| **Debts** | `Debts.jsx`, `DebtDetail.jsx`, `DebtFormModal.jsx`, `PayoffPlans.jsx`, `PayoffSimulator.jsx` |
| **Investments** | `Portfolios.jsx`, `Investments.jsx`, `Sips.jsx`, `PortfolioRebalance.jsx` |
| **Goals** | `Goals.jsx` |
| **Reports/Exports** | `Reports.jsx`, `Exports.jsx` |
| **Social** | `Trips.jsx`, `Households.jsx`, `Conversations.jsx` |
| **Settings** | `Settings.jsx`, `Privacy.jsx` |
| **Landing** | `Landing.jsx`, `landing/hero3d/HeroVisual.jsx` |
| **UI Components** | `components/ui/*.jsx` |
| **Styles** | `styles/tokens.css`, `styles/primitives.css`, `styles/base.css`, `styles/fonts.css` |
| **Motion** | `lib/motion.jsx`, `lib/motion-primitives.jsx` |
| **Tests** | `test/*.test.js` |

---

*End of Audit Report*