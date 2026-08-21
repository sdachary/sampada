# Sampada

> Category: Financial Dashboard
> Warm editorial personal-finance app — think warm paper ledger meets modern dashboard.
> Existing palette is intentional and human-designed; maintain its character.

## Visual Theme & Atmosphere
Warm, tactile, personal. Like a leather-bound ledger kept in a sunlit study.
Paper-toned background, high-contrast ink, coral as the single accent voice.
No cold finance-grade blues or sterile greys. Content is the decoration.

## Color Palette & Roles
- **Background:** `#f7f1de` (warmed paper) — cards use `#faf9f7`
- **Surface:** `#faf9f7` (slightly lighter than bg) — cards, modals, dropdowns
- **Foreground:** `#15140f` (near-black ink) — body, headings
- **Soft foreground:** `#2a2620` — secondary text
- **Muted:** `#5a5448` — captions, labels
- **Faint:** `#8b8676` — placeholders, hints
- **Accent:** `#ed6f5c` (coral) — primary CTAs, key metrics, one hero element per screen
- **Accent soft:** `#f08e7c` — hover states
- **Success:** `#2d7d6a` (emerald) — green states, progress fill
- **Border:** `rgba(21,20,15,0.12)` — card outlines
- **Border soft:** `rgba(21,20,15,0.06)` — dividers, skeleton
- Never pure black; never pure white.

## Typography Rules
- **Display / Sans headings:** `'Inter Tight', -apple-system, system-ui, sans-serif` — weight 600, letter-spacing -0.02em
- **Serif accent:** `'Playfair Display', Georgia, serif` — italic for page numbers, decorative microcopy
- **Body:** `'Inter', -apple-system, system-ui, sans-serif` — weight 400, line-height 1.55
- **Monospace tabular:** no dedicated mono — use `font-variant-numeric: tabular-nums` on `.fin` class
- Scale (px): 10.5 · 12 · 13 · 14 · 16 · 18 · 20 · 22 · 24 · 36
- Line-height: 1.55 for body, 1.1 for display values
- Letter-spacing: headings ≥24px: -0.02em to -0.03em; uppercase labels: 0.08em to 0.15em; body: 0

## Component Stylings
- **Buttons:** 999px radius (pill), 10px vertical / 22px horizontal padding, 14px font, weight 500. Primary = coral fill, white label. Ghost = 1px border, transparent fill.
- **Cards:** `#faf9f7` surface, 1px solid border, 12px radius, 18–20px internal padding. Hover: translateY(-2px), shadow. No left-border accent (use progress bars or headers inside).
- **Inputs:** `#faf9f7` bg, 1px border, 8px radius, 11px padding, 16px font. Focus: border-color ink.
- **Links:** inherit ink color, no underline by default, underline on hover. Coral on active/current.
- **Progress bar:** 6px height, 3px radius, line bg, coral fill. Emerald variant for green states.

## Layout Principles
- Sidebar + main content area. Sidebar 220px, sticky, full height. Main max-width 960px, 28px/32px padding.
- No grid system — use flexbox + auto-fill grid for stat cards.
- Sections: 20px bottom spacing.
- Whitespace as separator. Dividers only in sidebar between sections.

## Depth & Elevation
Two levels:
- **Flat (0):** default card state — 1px border, no shadow.
- **Hover (1):** `translateY(-2px)` + `box-shadow: 0 20px 50px -24px rgba(21,20,15,0.15)` — card hover only.
- **Modal (2):** 0 24px 80px rgba(21,20,15,0.2) — overlay with backdrop blur.
No neumorphism, no glassmorphism.

## Do's and Don'ts
- ✅ Coral accent on one element per screen section (not more than 2 visible accent uses)
- ✅ Tabular-nums for all financial figures via `.fin` class
- ✅ Serif italic for editorial touches (page numbers)
- ✅ Progress bars inside cards for debt/investment tracking
- ❌ No left-border colored accent on cards — use progress bars or content hierarchy instead
- ❌ No gradients (except SVG chart gradients for area fills)
- ❌ No pure `#2d7d6a` outside `var(--success)` — use CSS variable
- ❌ No emoji as feature icons
- ❌ No more than 2 accent-colored elements per screen

## Responsive Behavior
- **Desktop ≥ 1024px:** sidebar visible, main area padded
- **Tablet / Phone < 1024px:** sidebar hidden, bottom nav bar appears (5 items)
- Mobile: 16px padding, stacked layout, max-width 100%
- Prevent iOS zoom: inputs/selects/textareas at 16px font minimum

## Agent Prompt Guide
- The existing Sampada palette is intentionally warm. Do not introduce cool blues or greys.
- Cards should never have a left-border accent line. Use the coral color sparingly — progress fill, CTA, one stat per grid.
- Progress bars inside debt cards are the canonical way to show payoff status — not border colors.
- Financial figures always use `.fin` class for `font-variant-numeric: tabular-nums`.
- The `--ink` variable is `#15140f` (not black) — use it for all primary text.
- When adding semantic colors (success, warning, danger), use purpose-named CSS variables, never hardcoded hex.
