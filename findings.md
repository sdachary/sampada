# Unslop Sampada — Findings

## Audit Sources
1. `UI_UX_AUDIT_REPORT.md` — Principal UI/UX Architect audit (486 lines)
2. `FRONTEND_AUDIT_PONYTAIL.md` — Breakage/perf audit (89 lines)
3. `DESIGN.md` — Design system specification (244 lines)
4. Direct code review of tokens, primitives, pages, components

---

## Slop Signs by Category

### Surfaces & Color (Critical)
| Sign | Location | Fix |
|------|----------|-----|
| ~256 Tailwind-like classes missing from CSS | All pages | Create utility class system in primitives.css |
| Inline styles bypass tokens | Dashboard, Transactions, Settings, Debts, Goals, Budgets, Onboarding, Landing, AuthLayout | Migrate to utility classes / component props |
| Hardcoded semantic colors in JSX | Transaction cards, Debt cards, Budget envelopes, Progress variants | Component variants or utility classes |
| Dark mode inconsistencies | Pages with hardcoded colors | Use only semantic tokens |

### Type (High)
| Sign | Location | Fix |
|------|----------|-----|
| Mixed font stack usage | DebtDetail, Settings, others | Enforce font-display/body/serif tokens |
| `.fin` class not consistently applied | All financial figures | Enforce on ALL money values |
| Uppercase tracked labels where not spec | Nav group names ✅, but also card headers, button labels | Restrict to: nav group names, small table headers only |

### Icons (Medium)
| Sign | Location | Fix |
|------|----------|-----|
| Lucide + emoji + Unicode mix | EmptyState, feature cards, trust badges | Standardize on Lucide |
| Sizes: 14, 16, 18, 20, 26, 32px | Throughout | Standardize per context |
| Stroke: 1.75, 2, 2.5 | Throughout | Standardize: 1.5/2/2.5 |

### Spacing (High)
| Sign | Location | Fix |
|------|----------|-----|
| Hardcoded px values | All pages | Use `--space-*` tokens |
| Arbitrary padding/margin | Inline styles | Utility classes |

### Copy (Low)
| Sign | Location | Fix |
|------|----------|-----|
| "Net worth" vs "Net Worth" | Dashboard vs Landing | Standardize |
| Page numbering inconsistent | PageHeader across pages | Consistent scheme |
| "Money in/out" vs "Total Income/Expenses" | Onboarding vs Transactions | Consistent |
| "Debt freedom progress" vs "Debt paid off" | Dashboard vs DebtDetail | Consistent |

### Components (Critical)
| Sign | Location | Fix |
|------|----------|-----|
| Card missing double-bezel | primitives.css defines .card--glass but unused | Implement .card-shell + .card-core |
| Button trailing icon not button-in-button | Button.jsx, primitives.css | Nested circular wrapper |
| No magnetic press physics | primitives.css .btn--primary:active | Spring snap-back on press |
| EmptyState uses emoji | Dashboard, Transactions, Debts, Budgets, Goals | SVG illustrations |
| Form validation gaps | Login, Register, Settings, Goals | Inline errors, aria-invalid |
| Sub-44px touch targets | Sidebar links, bottom nav, toggles, inline fields | Min 44px on mobile |

### Visuals (Medium)
| Sign | Location | Fix |
|------|----------|-----|
| Coin float animation (5s infinite) | Landing.jsx .coin-float | Remove loop, keep scroll-driven only |
| Multiple accent elements per screen | Dashboard (progress + FAB), feature cards | Max 2 visible, one per section |

### Motion (High)
| Sign | Location | Fix |
|------|----------|-----|
| Single easing curve | motion.jsx EASE = [0.2, 0, 0, 1] | Diversify: enter/exit/spring/micro |
| Reveal spotty | Landing ✅, Dashboard ❌, Transactions ❌, Settings ❌, Debts ❌, Goals ❌, Budgets ❌ | Add Reveal to all page sections |
| Reduced-motion incomplete | CSS transitions on hover not covered | Media query for all transitions |

---

## Design System Strengths (Preserve)
- OKLCH color space with perceptual uniformity
- Warm paper ledger palette (intentional, human-designed)
- Fluid type scale with clamp()
- Spring physics motion library
- Financial-specific tokens (tabular-nums, chart colors)
- Component library with good primitives
- Z-index semantic scale defined

---

## Direction

**Product.** Self-hosted personal finance: debt → zero → wealth. Debt payoff, AI-guided dividend SIPs, portfolio rebalancing. Apache 2.0, free forever.

**Character.** `warm, precise, editorial, human`

**World.** `sunlit study, leather ledger, fountain pen, morning light`

**Moments.**
1. **The Coin** — solid canvas-rendered hero coin
2. **Debt Freedom Progress** — prominent progress bar on Dashboard

**Signature.** Tabular numerals in Playfair Display italic for all financial figures.