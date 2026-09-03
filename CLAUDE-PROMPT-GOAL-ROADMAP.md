# CLAUDE-PROMPT — Sampada: Goal Roadmap (investment planning module)

Implement a **goal-based investment planning** module in the sampada repo at
`/home/deepak/Work/sampada`. This ports the ideas in
`/home/deepak/Work/wiki/plans/goal-roadmap.html` into the live sampada app.

Repo stack: Rails 7/8-ish backend (`app/`) + React (Vite) frontend (`frontend/`)
with `recharts` already installed. Auth is a shared Better-Auth backend; all
frontend API calls go through `frontend/src/lib/api.js` (`api.request(path)`),
Rails controllers live under `app/controllers/api/` returning JSON via helpers
like `render_success`.

## Verify before you write (read these — costs little, prevents duplication)
1. `app/services/wealth_journey_tracker.rb` — already has `sip_progress`,
   `net_worth_trajectory`, `wealth_growth_projection` (single fixed 10%/yr CAGR).
2. `app/services/goal_chart_service.rb` — `GoalChartService#wealth_growth`.
3. `frontend/src/pages/Journey.jsx`, `frontend/src/pages/Sips.jsx`,
   `frontend/src/pages/Portfolios.jsx` — existing UI + how they call the API
   and render charts (recharts).
4. `app/models/dividend_sip.rb` + `app/controllers/api/dividend_sips_controller.rb`
   + `app/services/dividend_sip_service.rb` — the existing SIP/passive-income model.
5. `config/routes.rb` — how routes are declared (namespace `api/v1` etc.).
6. `frontend/src/App.jsx` — how pages/routes/`ProtectedRoute` work.
7. `app/controllers/application_controller.rb` + one API controller (e.g.
   `api/dashboard_controller.rb`) — auth (`current_user`) + `render_success` shape.

Reuse existing projection/serialization logic where possible. Do NOT reinvent
currency conversion or SIP month math if it already exists.

## What to build — Goald planning module
A new "Goals" feature: user defines **named goals** (target amount + target year),
a **monthly investment (SIP)** + optional **periodic top-up**, picks an
**asset-class allocation** (conservative/moderate/aggressive) with **editable
per-class CAGR** (equity/debt/gold), and sees a **corpus projection vs goal target**
chart plus a **risk-mix comparison** across allocations.

### Backend (Rails)
- New model `Goal` (or `SavingsGoal`) with fields: name, target_amount,
  target_year (or target_date), currency_code, monthly_sip,
  top_up_amount + top_up_frequency (or top_up_monthly_equivalent), allocation
  (enum: conservative/moderate/aggressive), and per-class CAGRs
  (equity_growth, debt_growth, gold_growth) — persist custom CAGR overrides.
  Follow the existing model conventions (see `app/models/dividend_sip.rb`).
- New controller `api/goals_controller.rb` — RESTful `index/show/create/update/destroy`
  for the current_user's goals, following `dividend_sips_controller.rb`
  conventions (auth + `render_success`/validation error shape). Register routes
  in `config/routes.rb` under the same namespace as other resources.
- The projection math (SIP + top-up compounding with per-allocation blended CAGR)
  can live as a plain Ruby service `app/services/goal_forecast_service.rb`
  (unit-testable). Return series of `{year, label, projected_corpus, goal_target}`
  and, for comparison, projected corpus per allocation preset.
- Write `spec/` (RSpec, matching existing `spec/services/*_spec.rb`,
  `spec/requests/*_spec.rb` style) for the forecast service and the API.

### Frontend (React + recharts)
- New page `frontend/src/pages/Goals.jsx` + route in `App.jsx` (add a nav entry
  like the existing sidebar links in `Layout.jsx`).
- Form to create/edit a goal (name, target amount + year, currency, monthly SIP,
  top-up, allocation, CAGR overrides) — follow the styling of the other pages
  (CSS variables `--paper`, `--ink`, etc.).
- Chart(s) with recharts: (a) corpus projection line vs flat goal-target line,
  (b) a comparison of the three risk-mix projections, and (c) current allocation
  breakdown. Match existing chart styling in Journey/Portfolios.
- Respect the app's existing conventions: no inline comments unless prefixed
  `// ponytail:`; match surrounding component patterns and `api.js` usage.

## Constraints (non-negotiable)
- **Owner rule: NO code comments unless prefixed `// ponytail:`** (frontend) or
  `# ponytail:` (Ruby). Do not add explanatory comments.
- Keep it a self-contained, coherent feature. Match existing code style exactly.
- i18n: sampada uses `frontend/src/i18n` — add English (and existing-language
  keys if a translate function is used by sibling pages) strings for any new UI
  text, matching how sibling pages localize.
- Do not touch nidhiflow/prayog (separate legal decision).

## Verify before pushing
- `cd /home/deepak/Work/sampada && bin/rails db:migrate` (for the new model) and
  confirm the migration is present in `db/migrate/`.
- Run the Rails test suite (RSpec) — should still be green with your new specs:
  `bundle exec rspec` (or `bin/rspec` if that's the convention). At minimum run
  your new specs; fix any regressions you introduce.
- Frontend typecheck/lint/build: `cd frontend` and use the package.json scripts
  (e.g. `npm run build`, `npm run lint`/oxlint). Fix what you break. Do not leave
  the build broken.
- If a domain value (e.g. default CAGRs) needs a decision you can't infer, pick a
  sensible default and note it in your final report — do NOT block.

## Deliverable
Make commits per logical step with clear messages, push to origin. In your final
report (~15 lines max): list the files added/changed per commit (with SHAs), the
forecast math/formula you used, the default CAGRs you chose and where, whether
the test suite/build is green, and anything you could not do or that needs the
owner's decision. Keep the report terse — do not paste large diffs.
