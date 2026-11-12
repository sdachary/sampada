# Sampada — UAT Testing Plan

**Version:** 1.0  
**Date:** 2026-11-12  
**Based On:** UI/UX Audit Report findings  
**Target:** Pre-backend-integration validation

---

## Testing Philosophy

> **"Test the experience, not the code."**  
> Every scenario must be executable by a non-technical stakeholder. Pass/Fail criteria are user-observable, not implementation-specific.

---

## Test Environment Requirements

| Requirement | Specification |
|-------------|---------------|
| **Frontend URL** | `http://localhost:4173` (Vite preview) or deployed preview |
| **Backend API** | Mock API or staging backend (`VITE_API_URL`) |
| **Browsers** | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| **Viewports** | 390×844 (iPhone 15), 768×1024 (iPad), 1280×844 (Desktop), 1536×864 (Wide) |
| **Test Accounts** | Fresh register, Pre-onboarded user, User with debts/goals, Admin (if applicable) |
| **Network** | Online, Offline (DevTools), Slow 3G (DevTools) |
| **Accessibility** | Screen reader (NVDA/VoiceOver), Keyboard-only, High contrast mode, Reduced motion |

---

## Test Suite Structure

```
UAT/
├── 01_AUTH_FLOW/           # Registration → Login → Onboarding
├── 02_DASHBOARD/           # Main dashboard + Journey
├── 03_TRANSACTIONS/        # CRUD, Import, Filtering
├── 04_DEBTS/               # Debts → Detail → Payoff Plans → Simulator
├── 05_BUDGETS/             # Envelope/List views, CRUD
├── 06_GOALS/               # Goals with projections + risk comparison
├── 07_INVESTMENTS/         # Portfolios, SIPs, Rebalancing
├── 08_REPORTS_EXPORTS/     # Reports, Exports, DPDP
├── 09_SOCIAL/              # Trips, Households, Conversations
├── 10_SETTINGS/            # Profile, AI, Passkeys, API Keys, Push, Privacy
├── 11_RESPONSIVE/          # Breakpoint-specific tests
├── 12_ACCESSIBILITY/       # A11y-specific tests
├── 13_PERFORMANCE/         # Lighthouse, Core Web Vitals
├── 14_PWA_OFFLINE/         # Service worker, offline queue, install
└── 15_CROSS_BROWSER/       # Browser-specific quirks
```

---

## 01_AUTH_FLOW — Registration → Login → Onboarding

### TC-01.1: New User Registration
| Step | Action | Expected | Pass/Fail |
|------|--------|----------|-----------|
| 1 | Navigate to `/register` | Page loads, centered card, brand mark visible | |
| 2 | Fill first/last name, valid email, strong password (≥8 chars, mixed case, number, symbol), confirm | Password strength meter shows "Strong" (4 bars, green) | |
| 3 | Submit | Account created, redirected to AI setup step | |
| 4 | Skip AI setup | Redirected to `/dashboard/onboarding` | |
| 5 | Verify email received (if SMTP configured) | Welcome email in inbox | |

**A11y Checks:**
- [ ] All inputs have visible labels
- [ ] Password toggle announces "Show/Hide password"
- [ ] Error messages announced by screen reader
- [ ] Tab order logical (name → email → password → confirm → submit)
- [ ] Focus visible on all interactive elements

### TC-01.2: Registration Validation
| Scenario | Input | Expected Error |
|----------|-------|----------------|
| Short password | `abc` | "Password must be at least 8 characters" |
| Mismatch confirm | `Pass1234!` / `Pass1234@` | "Passwords do not match" |
| Invalid email | `not-an-email` | Browser native validation |
| Duplicate email | Existing account email | "Email already registered" (API) |
| Honeypot filled | (bot) | Silent reject, no error shown |

### TC-01.3: Login Flow
| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/login` | Centered card, "Welcome back" |
| 2 | Enter valid credentials | Redirected to `/dashboard` (or onboarding if new) |
| 3 | Enter invalid credentials | Inline error banner: "Invalid email or password" |
| 4 | Click "Forgot password?" | Navigate to `/forgot-password` |
| 5 | Use Passkey (if registered) | "Use passkey" button triggers WebAuthn flow |

### TC-01.4: Onboarding Checklist
| Step | Action | Expected |
|------|--------|----------|
| 1 | Land on `/dashboard/onboarding` | 3-number snapshot (Money in/out, Total owed) |
| 2 | Click "Loans & EMIs" | Navigate to `/dashboard/debts` |
| 3 | Add a debt → return | Checklist shows "Done" for Loans |
| 4 | Click "Investments" → add portfolio → return | Checklist shows "Done" |
| 5 | Click "Insurance" → add policy → return | Checklist shows "Done" |
| 6 | Click "Set a Budget" → add budget → return | Checklist shows "Done" |
| 7 | Click "Finish setup" | `onboardingComplete` API called, banner dismissed |
| 8 | Click "Skip for now" | Same result, no checklist completion required |

**Visual Checks:**
- [ ] Snapshot cards use `.fin` tabular numerals
- [ ] Progress text: "You owe ₹X. The goal: get this to zero..."
- [ ] Glossary pills open definition card on click
- [ ] "Skip for now" visually distinct from primary action

---

## 02_DASHBOARD — Main Dashboard + Journey

### TC-02.1: Dashboard Load & Hero
| Check | Expected |
|-------|----------|
| Page title | "Dashboard" with "Download snapshot" button |
| Net worth card | Large display font (36px+), `.fin` numerals, INR formatted |
| Debt freedom progress | Prominent progress bar, % label, projected debt-free date |
| Stat grid (4 cards) | Total Debt, Investments, Monthly Expenses, Wealth Score — all with count-up animation on entry |
| Net worth trend chart | Area chart (accent color), shows if ≥2 snapshots |
| 60-month projection | 3 lines (Debt=accent, Investments=success, Net Worth=ink), table fallback in `<details>` |
| Quick actions | "Add transaction", "Log payment" — FAB bottom-right |
| Offline banner | Shows when offline, displays queued count |

### TC-02.2: Dashboard Interactions
| Action | Expected |
|--------|----------|
| Click "Download snapshot" | SVG downloads with current net worth, stage, debt-free date |
| Toggle "Hide amounts" | All ₹ values become `••••••` instantly |
| Click FAB (or Alt+Q) | QuickLogSheet opens from bottom |
| Log transaction via QuickLog | Toast "Transaction logged ✓", dashboard refreshes |
| Pull-to-refresh (mobile) | Reloads dashboard data |
| Navigate away → back | PageTransition fade (200ms), no flash |

### TC-02.3: Journey Page (`/dashboard/journey`)
| Check | Expected |
|-------|----------|
| Timeline view | Chronological financial milestones |
| Debt payoff markers | Visual indicators on timeline |
| Investment milestones | SIP starts, rebalance events |
| Responsive | Single column on mobile, comfortable reading |

---

## 03_TRANSACTIONS — CRUD, Import, Filtering

### TC-03.1: Transaction List
| Check | Expected |
|-------|----------|
| Month totals (3 cards) | Income (green), Expenses (red), Net (color-coded) |
| Filter dropdown | All / Expense / Income — filters list instantly |
| Transaction cards | Description, category·date·merchant, amount (red/green), Edit/Delete |
| Empty state | "No transactions yet" with "Add Transaction" action |
| Transaction count | Shows "N txns" badge |

### TC-03.2: Add/Edit Transaction (Modal)
| Field | Validation |
|-------|------------|
| Description | Required, max 200 chars |
| Amount | Required, positive number, 2 decimals max |
| Type | Expense / Income (radio) |
| Category | Required, searchable select |
| Date | Required, date picker, not future |
| Merchant | Optional |
| Recurring | Checkbox → shows frequency options |
| Tags | Optional, comma-separated |

### TC-03.3: CSV Import
| Step | Expected |
|------|----------|
| Click "Import CSV" | File picker opens (accepts .csv) |
| Select valid CSV | Preview modal shows parsed rows, import button |
| Click Import | Progress → Result card: "Imported N transactions · X skipped" |
| Select invalid CSV | Error: "Import failed: [reason]" |
| Cancel import | Modal closes, no changes |

### TC-03.4: Delete Transaction
| Action | Expected |
|--------|----------|
| Click Delete | Confirm dialog: `Delete "Description"?` |
| Confirm | Transaction removed, list updates, toast shown |
| Cancel | No change |

---

## 04_DEBTS — Debts → Detail → Payoff Plans → Simulator

### TC-04.1: Debts List
| Check | Expected |
|-------|----------|
| Page header | "Debts" + "Add" + "Payoff plan" link |
| Total debt | Shows "Total: ₹X" above list |
| Debt cards | Name, category·APR, total amount, progress bar, % paid, EMI, status badge |
| Empty state | "No debts tracked yet" with "Add Debt" |
| Click "View" | Navigate to `/dashboard/debts/:id` |
| Click "Edit" | Opens DebtFormModal |
| Click "Delete" | Confirm → remove |

### TC-04.2: Debt Detail Page
| Section | Expected |
|---------|----------|
| Header | Name, category·APR·currency, status badge (accent/success/neutral) |
| Summary row | Total / Paid / Remaining (large `.fin` numerals) |
| Progress bar | % paid off, debt-free date + months remaining |
| Inline editable fields | Click any field → inline input → Enter/Blur saves via PATCH |
| Fields: Amount, EMI, Interest, Paid, Started, Category, Status, Due Date, Notes | All editable, currency fields use `.fin` |
| Payment timeline | Chronological dots with amount + remaining, last dot green if paid off |
| "Open in Simulator" | Links to `/dashboard/debt-payoffs?debtId=` |

### TC-04.3: Payoff Plans (`/dashboard/debt-payoffs`)
| Check | Expected |
|-------|----------|
| Strategy selector | Avalanche / Snowball / Custom |
| Plan table | Month-by-month: Debt, Payment, Interest, Remaining |
| Summary | Total interest, months to freedom, debt-free date |
| Comparison | Side-by-side Avalanche vs Snowball |

### TC-04.4: Simulator (`/dashboard/debt-payoffs` with params)
| Check | Expected |
|-------|----------|
| Extra payment slider | Adjusts plan in real-time |
| What-if scenarios | "What if I pay ₹X extra?" shows new freedom date |
| Export | Download CSV of plan |

---

## 05_BUDGETS — Envelope/List Views

### TC-05.1: Budgets Overview
| Check | Expected |
|-------|----------|
| View toggle | "Envelopes" / "List" select |
| Summary card | Total Budget / Spent / On Track (X/Y) + overall progress bar |
| Envelope view | Grid of cards: category, limit, progress bar, spent, % used, status (on track/over/nearing) |
| List view | Detailed rows with same data |
| Color coding | Border-top color cycles through palette (danger→warning→accent→success) |
| Over budget | Red progress variant, "⚠ Over budget" label |
| Empty state | "No budgets set yet" |

### TC-05.2: Add/Edit Budget (Modal)
| Field | Expected |
|-------|----------|
| Category | Required select |
| Monthly limit | Required, positive number |
| Period | Monthly / Quarterly / Yearly |
| Alert threshold | % (default 80%) |
| Rollover | Checkbox |

---

## 06_GOALS — Goals with Projections

### TC-06.1: Goals List
| Check | Expected |
|-------|----------|
| Page header | "Goals" + "Add" button |
| Goal cards | Name, target·year·allocation, Monthly SIP, Projected Corpus, Blended CAGR, Progress bar |
| On track | Green progress (100%+), "on track" label |
| Behind | Red progress, "over budget" label |
| Charts | Corpus projection vs target (line), Risk mix comparison (3 lines), Allocation pie |
| Edit/Delete | Buttons top-right of card |

### TC-06.2: Add/Edit Goal (Inline Form)
| Field | Validation |
|-------|------------|
| Goal Name | Required |
| Target Amount | Required, positive |
| Target Year | Required, ≥ current year |
| Monthly SIP | Required, positive |
| Top-up Amount/Frequency | Optional |
| Allocation | Conservative / Moderate / Aggressive |
| Currency | INR/USD/EUR/GBP/JPY |
| Growth rates | Equity/Debt/Gold % (pre-filled by allocation) |

### TC-06.3: Chart Accessibility
| Check | Expected |
|-------|----------|
| Line charts | Stroke dash patterns for each line (not color-only) |
| Pie chart | Direct labels or legend with values |
| All charts | `role="img" aria-label="..."` with text summary |
| Tooltip | Shows formatted values on hover/focus |

---

## 07_INVESTMENTS — Portfolios, SIPs, Rebalancing

### TC-07.1: Portfolios
| Check | Expected |
|-------|----------|
| List view | Portfolio cards: name, value, XIRR, holdings count |
| Add portfolio | Modal with name, currency, broker |
| Holdings drawer | Slide-in from right, editable quantities |

### TC-07.2: Rebalancing v2 (`/dashboard/portfolio-rebalance`)
| Check | Expected |
|-------|----------|
| Contribution engine | "Buy-only" — no sell recommendations |
| Guard rails | Max drift %, max single trade %, min trade value |
| Reason chips | Each suggested buy shows reason (drift, new cash, etc.) |
| CSV import | Import holdings from broker CSV |
| V1 Compare | Toggle to compare with legacy rebalancer |
| Apply | Creates transactions in bulk |

### TC-07.3: SIPs
| Check | Expected |
|-------|----------|
| List | SIP name, amount, frequency, next date, status |
| Add/Edit | Modal with all fields |
| Pause/Resume | Toggle in list |

---

## 08_REPORTS_EXPORTS — Reports, Exports, DPDP

### TC-08.1: Reports (`/dashboard/reports`)
| Report | Expected |
|--------|----------|
| Spending by category | Bar chart + table |
| Income vs Expenses | Monthly trend |
| Net worth history | Line chart |
| Debt payoff progress | Timeline |
| Custom date range | Date picker applies to all |

### TC-08.2: Exports (`/dashboard/exports`)
| Export | Format | Expected |
|--------|--------|----------|
| Transactions | CSV/JSON | All fields, date range filter |
| Net worth snapshots | CSV | Date, net_worth, debt, investments |
| Full DPDP export | JSON | Complete user data (Settings → Download) |

### TC-08.3: Privacy (`/dashboard/privacy`)
| Check | Expected |
|-------|----------|
| Consent records | List with purpose, granted date, revoke button |
| Data deletion | Request deletion → confirmation → 30-day grace |
| Export log | History of all exports |

---

## 09_SOCIAL — Trips, Households, Conversations

### TC-09.1: Trips (`/dashboard/trips`)
| Check | Expected |
|-------|----------|
| Trip cards | Name, dates, members, total expenses, settle up button |
| Add trip | Modal: name, dates, currency, members |
| Expenses | Split equally / by shares / custom |
| Settlement | Shows who owes whom, mark paid |

### TC-09.2: Households (`/dashboard/households`)
| Check | Expected |
|-------|----------|
| Current household | Name, members with roles (admin/member/viewer) |
| Invite member | Email + role → invite sent |
| Leave household | Confirm → leave (admin must transfer) |

### TC-09.3: Conversations (`/dashboard/conversations`)
| Check | Expected |
|-------|----------|
| Thread list | Recent messages, unread badges |
| AI chat | Works if AI configured (Settings) |
| Natural language entry | "I spent ₹500 on groceries" → creates transaction |

---

## 10_SETTINGS — Profile, AI, Passkeys, API Keys, Push, Privacy

### TC-10.1: Profile
| Action | Expected |
|--------|----------|
| Click "Edit" | Fields become inputs, "Save"/"Cancel" appear |
| Change name/currency | Save → toast "Profile updated", UI reflects |
| Cancel | Reverts to view mode |

### TC-10.2: AI Assistant
| Scenario | Expected |
|----------|----------|
| Off → Select Gemini + valid key → Enable | Toast "AI assistant enabled", badge shows "On" |
| On → Disable | Toast "AI assistant disabled", badge shows "Off" |
| Invalid key | Inline error near field |

### TC-10.3: Passkeys
| Action | Expected |
|--------|----------|
| "Add passkey" | WebAuthn registration → biometric/PIN prompt → success toast |
| List shows | Label, transport (platform/security key), last used |
| Remove last passkey | Disabled (prevents lockout) |

### TC-10.4: API Keys
| Action | Expected |
|--------|----------|
| Add key | Provider select, label, key value → encrypted storage |
| List | Label, provider, masked key, Remove button |
| Remove | Confirm → deleted |

### TC-10.5: Push Notifications
| Action | Expected |
|--------|----------|
| Enable (supported browser) | Permission prompt → subscribe → toast "enabled" |
| Disable | Unsubscribe → toast "disabled" |
| Unsupported browser | Card hidden |

### TC-10.6: Logout
| Action | Expected |
|--------|----------|
| Click "Sign out" | Session cleared, redirect to `/` |

---

## 11_RESPONSIVE — Breakpoint Tests

### VP-11.1: Mobile (390×844)
| Page | Checks |
|------|--------|
| All | No horizontal scroll |
| Dashboard | FAB above bottom nav (not overlapping), stats stack single column |
| Transactions | Month totals stack, transaction cards full width |
| Debts | Cards full width, inline fields stack |
| Settings | Profile edit stacks (1fr), forms single column |
| Goals | Charts responsive, form fields stack |
| Landing | Hero stacks (text above visual), feature grid 1-col, comparison table horizontal scroll |
| Auth | Card max-width 360px, centered, `min-h-[100dvh]` |
| Nav | Bottom nav visible, sidebar hidden (hamburger in header if any) |

### VP-11.2: Tablet (768×1024)
| Page | Checks |
|------|--------|
| Dashboard | 2-col stat grid, charts side-by-side |
| Transactions | 2-col month totals |
| Settings | 2-col profile edit |
| Landing | Hero 2-col, feature grid 2-col |

### VP-11.3: Desktop (1280×844)
| Page | Checks |
|------|--------|
| All | Sidebar visible, bottom nav hidden |
| Dashboard | 4-col stat grid, comfortable whitespace |
| Landing | Full layout, 3D visual at max width |

### VP-11.4: Wide (1536×864)
| Page | Checks |
|------|--------|
| All | Max-width containers (960px-1200px), centered |
| Charts | Generous width, readable labels |

---

## 12_ACCESSIBILITY — A11y Tests

### TC-12.1: Keyboard Navigation
| Test | Expected |
|------|----------|
| Tab through entire app | Visible focus ring on every interactive element |
| Skip links | "Skip to main content" (if present) |
| Modal focus trap | Tab cycles within modal, Escape closes |
| Dropdown/Menu | Arrow keys navigate, Enter/Space selects, Escape closes |
| Charts | Focusable, arrow keys navigate data points (if supported) |

### TC-12.2: Screen Reader (NVDA/VoiceOver)
| Test | Expected |
|------|----------|
| Page titles | Unique, descriptive (`Dashboard — Sampada`) |
| Headings | Hierarchical (h1 → h2 → h3), no skipped levels |
| Labels | All inputs have `<label>` or `aria-label` |
| Buttons | Announce name + state (expanded/collapsed, loading) |
| Live regions | Toasts announced (`aria-live="polite"`), errors (`aria-live="assertive"`) |
| Charts | `role="img" aria-label="Line chart showing net worth trend from ₹X to ₹Y over 12 months"` |
| Empty states | Announce "No transactions yet. Add transaction button." |

### TC-12.3: Reduced Motion
| Test | Expected |
|------|----------|
| OS setting: Reduce motion ON | All animations disabled (0.01ms), Reveal shows final state, PageTransition instant, CountUp shows final value |
| Button hover | No transform/scale |
| Card hover | No transform/shadow transition |

### TC-12.4: High Contrast / Color Blind
| Test | Expected |
|------|----------|
| Windows High Contrast | Borders visible, focus ring visible, no invisible elements |
| Protanopia/Deuteranopia | Status colors (red/green) have icons/text labels, not color-only |
| Charts | Patterns + colors, direct labels |

### TC-12.5: Touch Targets
| Element | Minimum |
|---------|---------|
| All buttons/links | 44×44px |
| Form inputs | 44px height |
| Checkboxes/radios | 44×44px hit area (label clickable) |
| Navigation items | 44px height |
| Pagination | 44×44px |

---

## 13_PERFORMANCE — Core Web Vitals

### TC-13.1: Lighthouse CI (Run on `dist` build)
| Metric | Target | Threshold |
|--------|--------|-----------|
| Performance | ≥ 90 | ≥ 80 |
| Accessibility | ≥ 95 | ≥ 90 |
| Best Practices | ≥ 90 | ≥ 85 |
| SEO | ≥ 90 | ≥ 85 |
| LCP | ≤ 2.5s | ≤ 4.0s |
| CLS | ≤ 0.1 | ≤ 0.25 |
| TBT | ≤ 200ms | ≤ 600ms |
| SI | ≤ 3.0s | ≤ 5.0s |

### TC-13.2: Bundle Size
| Check | Target |
|-------|--------|
| Main JS (gzipped) | ≤ 500 KB (per size-limit config) |
| CSS (gzipped) | ≤ 50 KB |
| Fonts | WOFF2, preloaded, `font-display: swap` |
| Images | WebP/AVIF, lazy-loaded, dimensions set |

### TC-13.3: Runtime Performance
| Scenario | Check |
|----------|-------|
| Dashboard with 100 transactions | No jank on scroll, 60fps |
| Goals with 5 projections | Charts render < 500ms |
| Rebalance with 50 holdings | Drawer opens < 200ms |
| QuickLog open/close | < 100ms |

---

## 14_PWA_OFFLINE — Service Worker

### TC-14.1: Installability
| Check | Expected |
|-------|----------|
| Manifest | Valid, icons 192/512, `display: "standalone"` |
| Install prompt | Shows on eligible browsers |
| Installed app | Opens in standalone mode, no browser UI |

### TC-14.2: Offline Behavior
| Scenario | Expected |
|----------|----------|
| Load app offline | Cached shell loads, "Offline — viewing cached data" banner |
| Navigate cached routes | Works (Dashboard, Transactions, etc.) |
| Edit offline | "Edits disabled" in banner, changes queued |
| Come online | Queue flushes, toast "N changes synced" |
| Background sync | Registered, fires when online |

### TC-14.3: Cache Strategy
| Resource | Strategy |
|----------|----------|
| HTML/JS/CSS | Stale-while-revalidate |
| API GET | Network-first, fallback to cache |
| API POST/PUT/DELETE | Queue offline, replay online |
| Fonts/Images | Cache-first |

---

## 15_CROSS_BROWSER — Browser Quirks

| Browser | Known Issues to Verify |
|---------|------------------------|
| Safari (macOS/iOS) | `100dvh` support, backdrop-filter, WebAuthn, PWA install |
| Firefox | `dialog` element styling, scrollbar styling, CSS Grid gaps |
| Edge | Same as Chrome (Chromium) |
| Chrome | Baseline — all features should work |

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backend API running (staging or mock)
- [ ] Frontend built (`npm run build`) and served (`npm run preview`)
- [ ] Test accounts created (fresh, onboarded, with data)
- [ ] Lighthouse CI configured
- [ ] Playwright installed (`npx playwright install`)
- [ ] Screen reader available (NVDA/VoiceOver)

### Test Run Order
1. **Smoke:** TC-01.1, TC-02.1, TC-03.1, TC-04.1, TC-05.1, TC-06.1, TC-10.1 (15 min)
2. **Core Flows:** All TC-01 through TC-10 happy paths (60 min)
3. **Responsive:** VP-11.1 through VP-11.4 (30 min)
4. **Accessibility:** TC-12.1 through TC-12.5 (45 min)
5. **Performance:** TC-13.1 through TC-13.3 (15 min + CI)
6. **PWA/Offline:** TC-14.1 through TC-14.3 (20 min)
7. **Cross-browser:** Spot-check on Safari/Firefox (20 min)

**Total Estimated Time:** ~3.5 hours for full UAT pass

---

## Bug Reporting Template

```markdown
## [UAT-XXX] Title

**Suite:** 02_DASHBOARD / TC-02.2
**Viewport:** 390×844 (Mobile)
**Browser:** Chrome 120
**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected:** ...
**Actual:** ...

**Screenshot/Video:** [attach]
**Console Errors:** [paste]
**Network:** [HAR if relevant]
```

---

## Sign-Off Criteria

| Gate | Requirement |
|------|-------------|
| **Smoke Pass** | All 7 smoke tests pass |
| **Critical Flows** | 0 Critical/High bugs open |
| **Responsive** | 0 layout-breaking bugs at any breakpoint |
| **Accessibility** | 0 WCAG 2.1 AA violations (automated + manual) |
| **Performance** | Lighthouse Performance ≥ 80, LCP ≤ 4s |
| **PWA** | Installable, offline shell loads, queue flushes |
| **Cross-browser** | No functional regressions on Safari/Firefox |

**Only when ALL gates pass → Backend integration phase begins.**

---

## Appendix: Test Data Seeds

### Fresh User
```json
{ "email": "uat-fresh@test.com", "password": "Test1234!", "first_name": "UAT", "last_name": "Fresh" }
```

### Onboarded User (with data)
```json
{
  "email": "uat-onboarded@test.com",
  "password": "Test1234!",
  "debts": [
    { "name": "Credit Card", "amount": 50000, "interest_rate": 36, "emi_amount": 10000, "category": "credit_card" },
    { "name": "Personal Loan", "amount": 200000, "interest_rate": 12, "emi_amount": 15000, "category": "loan" }
  ],
  "goals": [
    { "name": "Emergency Fund", "target_amount": 100000, "target_year": 2026, "monthly_sip": 10000, "allocation": "conservative" }
  ],
  "budgets": [
    { "category": "Food", "monthly_limit": 15000 },
    { "category": "Transport", "monthly_limit": 5000 }
  ]
}
```

---

*End of UAT Testing Plan*