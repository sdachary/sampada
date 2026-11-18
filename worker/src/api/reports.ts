// Api::ReportsController — /annual, /cash_flow_forecast, /anomalies,
// /goal_charts (net_worth is chunk-2: zero SPA call sites). Service ports:
// AnnualReportService, CashFlowForecastService, AnomalyDetectionService,
// GoalChartService (+ WealthJourneyTracker pieces they use).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { convertAmount } from '../jobs/data';
import {
  addMonthsClamped, createSnapshot, currentSnapshot, monthLabel,
  num, round1, round2, symbolFor, success, todayIso,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type SumRow = { currency_code: string; t: number | null };

/** Rails `sum { convert(amount, currency) }` over a query already grouped by
 *  currency — identical math (rates are stable within a request), N lookups
 *  instead of N rows. sql must select currency_code + SUM(...) AS t. */
async function convertedSum(c: Ctx, base: string, sql: string, params: unknown[]): Promise<number> {
  const rows = await c.env.DB.prepare(sql).bind(...params).all<SumRow>();
  let sum = 0;
  for (const r of rows.results) {
    sum += await convertAmount(c.env, num(r.t), r.currency_code, base);
  }
  return sum;
}

function ym(date: string): string {
  return date.slice(0, 7);
}

/** RecurringExpense#monthly_amount (DividendSip's lacks weekly/daily). */
function monthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'monthly': case 'daily': return amount;
    case 'quarterly': return amount / 3.0;
    case 'yearly': return amount / 12.0;
    default: return 0;
  }
}

/** Currency.symbol_for + Integer truncation (anomaly formatting). */
function formatAmount(base: string, amount: number): string {
  return `${symbolFor(base)}${Math.trunc(amount)}`;
}

// ---------------------------------------------------------------------------
// GET /reports/annual
// ---------------------------------------------------------------------------

router.get('/annual', async (c) => {
  const user = c.get('user');
  const base = user.currency ?? 'INR';
  const yearParam = c.req.query('year');
  const parsed = Number.parseInt(yearParam ?? '', 10);
  const year = Number.isFinite(parsed) ? parsed : new Date().getUTCFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const today = todayIso();
  const endKey = yearEnd < today ? yearEnd : today;

  const [incomeRows, expenseRows] = await Promise.all([
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'income' AND transaction_date >= ? AND transaction_date < ? GROUP BY currency_code",
      [user.id, yearStart, `${year + 1}-01-01`]),
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'expense' AND transaction_date >= ? AND transaction_date < ? GROUP BY currency_code",
      [user.id, yearStart, `${year + 1}-01-01`]),
  ]);
  const totalIncome = incomeRows;
  const totalExpenses = expenseRows;

  const startNw = await c.env.DB.prepare(
    'SELECT net_worth FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date = ?',
  ).bind(user.id, yearStart).first<{ net_worth: number | null }>();
  const endNw = await c.env.DB.prepare(
    'SELECT net_worth FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date = ?',
  ).bind(user.id, endKey).first<{ net_worth: number | null }>();

  // monthly_breakdown — converted per-month sums, folded from one grouped query.
  const monthlyRows = await c.env.DB.prepare(
    `SELECT substr(transaction_date, 1, 7) AS m, currency_code, transaction_type, SUM(amount) AS t
     FROM transactions WHERE user_id = ? AND transaction_date >= ? AND transaction_date < ?
     AND transaction_type IN ('income', 'expense')
     GROUP BY m, currency_code, transaction_type`,
  ).bind(user.id, yearStart, `${year + 1}-01-01`).all<SumRow & { m: string; transaction_type: string }>();
  const monthlyByType: Record<string, Record<string, number>> = {};
  for (const r of monthlyRows.results) {
    monthlyByType[r.transaction_type] ??= {};
    monthlyByType[r.transaction_type][r.m] =
      (monthlyByType[r.transaction_type][r.m] ?? 0)
      + (await convertAmount(c.env, num(r.t), r.currency_code, base));
  }

  // categories — per-category converted totals + counts for the year.
  const catRows = await c.env.DB.prepare(
    `SELECT bc.id, bc.name, t.currency_code, SUM(t.amount) AS t, COUNT(t.id) AS cnt
     FROM budget_categories bc
     LEFT JOIN transactions t ON t.budget_category_id = bc.id AND t.user_id = ?
       AND substr(t.transaction_date, 1, 4) = ?
     WHERE bc.user_id = ? AND bc.active = 1
     GROUP BY bc.id, t.currency_code`,
  ).bind(user.id, String(year), user.id).all<{ id: string; name: string; currency_code: string | null; t: number | null; cnt: number | null }>();
  const catMap = new Map<string, { category: string; total: number; transaction_count: number; percentage: number }>();
  for (const r of catRows.results) {
    const entry = catMap.get(r.id) ?? { category: r.name, total: 0, transaction_count: 0, percentage: 0 };
    entry.total += r.currency_code ? await convertAmount(c.env, num(r.t), r.currency_code, base) : 0;
    entry.transaction_count += num(r.cnt);
    catMap.set(r.id, entry);
  }
  const categories = [...catMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((e) => ({ ...e, total: round2(e.total) }));
  const catTotalSum = categories.reduce((s, e) => s + e.total, 0);
  for (const e of categories) e.percentage = catTotalSum > 0 ? round1((e.total / catTotalSum) * 100) : 0;

  const nwTrajectory = await c.env.DB.prepare(
    'SELECT snapshot_date AS date, net_worth FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC',
  ).bind(user.id, yearStart).all<{ date: string; net_worth: number | null }>();

  const [debtTotal, debtGrouped, portfolioAgg, goalRows] = await Promise.all([
    convertedSum(c, base,
      'SELECT currency_code, SUM(amount - paid_amount) AS t FROM debts WHERE user_id = ? GROUP BY currency_code',
      [user.id]),
    c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM debts WHERE user_id = ? GROUP BY status')
      .bind(user.id).all<{ status: string; n: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) AS n, COALESCE(SUM(i.shares * i.current_price), 0) AS t FROM portfolios p LEFT JOIN investments i ON i.portfolio_id = p.id WHERE p.user_id = ?',
    ).bind(user.id).first<{ n: number; t: number | null }>(),
    c.env.DB.prepare('SELECT goal, COUNT(*) AS n FROM portfolios WHERE user_id = ? GROUP BY goal')
      .bind(user.id).all<{ goal: string | null; n: number }>(),
  ]);
  const debtByCategory: Record<string, number> = {};
  const catCountRows = await c.env.DB.prepare('SELECT category, COUNT(*) AS n FROM debts WHERE user_id = ? GROUP BY category')
    .bind(user.id).all<{ category: string | null; n: number }>();
  for (const r of catCountRows.results) debtByCategory[r.category ?? 'null'] = num(r.n);
  const byGoal: Record<string, number> = {};
  for (const r of goalRows.results) byGoal[r.goal as string] = num(r.n);

  const startNwVal = startNw?.net_worth == null ? 0 : Number(startNw.net_worth);
  const endNwVal = endNw?.net_worth == null ? 0 : Number(endNw.net_worth);

  const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return success(c, {
    year,
    generated_at: new Date().toISOString(),
    currency: base,
    currency_symbol: symbolFor(base),
    summary: {
      total_income: round2(totalIncome),
      total_expenses: round2(totalExpenses),
      net_savings: round2(totalIncome - totalExpenses),
      savings_rate: totalIncome > 0 ? round1(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
      start_net_worth: startNwVal,
      end_net_worth: endNwVal,
      net_worth_change: round2(endNwVal - startNwVal),
    },
    monthly_breakdown: MONTHS_ABBR.map((label, idx) => {
      const m = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const income = monthlyByType.income?.[m] ?? 0;
      const expenses = monthlyByType.expense?.[m] ?? 0;
      return {
        month: label,
        income: round2(income),
        expenses: round2(expenses),
        net: round2(income - expenses),
      };
    }),
    categories,
    net_worth_trajectory: nwTrajectory.results.map((r) => ({ date: r.date, net_worth: Number(r.net_worth ?? 0) })),
    debts: {
      total: round2(debtTotal),
      active_count: num(debtGrouped.results.find((r) => r.status === 'active')?.n),
      paid_off: num(debtGrouped.results.find((r) => r.status === 'paid_off')?.n),
      by_category: debtByCategory,
    },
    investments: {
      total_value: round2(num(portfolioAgg?.t)),
      count: num(portfolioAgg?.n),
      by_goal: byGoal,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /reports/cash_flow_forecast — CashFlowForecastService
// ---------------------------------------------------------------------------

function periodStartIso(today: string, period: string): string {
  const [y, m, d] = today.split('-').map(Number);
  let ny = y, nm = m, nd = 1;
  if (period === 'weekly') {
    // Rails beginning_of_week = Monday.
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    nd = d - dow;
    if (nd < 1) { nm -= 1; if (nm < 1) { ny -= 1; nm = 12; } nd = new Date(Date.UTC(ny, nm, 0)).getUTCDate() + nd; }
  } else if (period === 'quarterly') {
    nm = Math.floor((m - 1) / 3) * 3 + 1;
  } else if (period === 'yearly') {
    nm = 1;
  }
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${ny}-${p2(nm)}-${p2(nd)}`;
}

/** Ruby Float#to_s in interpolation: round(1) values always print one decimal
 *  ("100.0% used", not "100%"). */
function rubyFloat(v: number): string {
  return v.toFixed(1);
}

router.get('/cash_flow_forecast', async (c) => {
  const user = c.get('user');
  const base = user.currency ?? 'INR';
  const monthsParam = c.req.query('months');
  const months = monthsParam === undefined ? 12 : (Number.parseInt(monthsParam, 10) || 0);

  // recurring_cash_flows — expenses convert AFTER monthly_amount (frequency
  // varies per row, so this can't group).
  const recExp = await c.env.DB.prepare(
    'SELECT amount, frequency, currency_code FROM recurring_expenses WHERE user_id = ? AND active = 1',
  ).bind(user.id).all<{ amount: number; frequency: string; currency_code: string | null }>();
  let recurringExpenses = 0;
  for (const e of recExp.results) {
    const monthly = monthlyAmount(Number(e.amount), e.frequency);
    // Unknown frequency → Rails monthly_amount is nil → convert crashes. Skip.
    if (!Number.isFinite(monthly)) continue;
    recurringExpenses += await convertAmount(c.env, monthly, e.currency_code || base, base);
  }
  const recurringIncome = await convertedSum(c, base,
    "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'income' AND recurring = 1 GROUP BY currency_code",
    [user.id]);

  // historical_averages — 6.months.ago.. (clamped month math).
  const today = todayIso();
  const sixAgo = addMonthsClamped(today, -6);
  const [exp6, inc6] = await Promise.all([
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'expense' AND transaction_date >= ? GROUP BY currency_code",
      [user.id, sixAgo]),
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'income' AND transaction_date >= ? GROUP BY currency_code",
      [user.id, sixAgo]),
  ]);
  const avgMonthlyExpenses = exp6 / 6.0;
  const avgMonthlyIncome = inc6 / 6.0;

  // savings_buffer — all-time converted income − expenses.
  const [allInc, allExp] = await Promise.all([
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'income' GROUP BY currency_code",
      [user.id]),
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'expense' GROUP BY currency_code",
      [user.id]),
  ]);
  const savingsBuffer = allInc - allExp;

  const projectedNet = recurringIncome - recurringExpenses;
  const runwayMonths = projectedNet > 0
    ? null
    : Math.floor(savingsBuffer / Math.max(Math.abs(projectedNet), 1));
  const health = projectedNet > 0
    ? (projectedNet > recurringExpenses * 0.2 ? 'healthy' : 'stable')
    : (projectedNet > -recurringExpenses * 0.1 ? 'caution' : 'critical');

  const summary = {
    monthly_income: avgMonthlyIncome,
    monthly_expenses: avgMonthlyExpenses,
    recurring_income: recurringIncome,
    recurring_expenses: recurringExpenses,
    discretionary: avgMonthlyIncome - recurringExpenses,
    net_monthly: round2(projectedNet),
    base_currency: base,
    runway_months: runwayMonths,
    savings_buffer: round2(savingsBuffer),
    health,
  };

  // projected(base, recurring, m): [base*(1−0.01m)+recurring, base*decay].max
  const projected = (b: number, rec: number, m: number): number =>
    Math.max(b * (1 - 0.01 * m) + rec, b * (1 - (m - 1) * 0.02));

  const forecast = [];
  for (let m = 1; m <= months; m++) {
    const monthDate = addMonthsClamped(today, m);
    const pInc = projected(avgMonthlyIncome, recurringIncome, m);
    const pExp = projected(avgMonthlyExpenses, recurringExpenses, m);
    forecast.push({
      month: monthDate.slice(0, 7),
      label: monthLabel(new Date(`${monthDate}T00:00:00Z`)),
      projected_income: round2(pInc),
      projected_expenses: round2(pExp),
      net_cash_flow: round2(pInc - pExp),
      confidence: Math.max(100 - (m - 1) * 8, 20),
    });
  }

  return success(c, { summary, forecast });
});

// ---------------------------------------------------------------------------
// GET /reports/anomalies — AnomalyDetectionService (Transaction.detect_anomalies)
// ---------------------------------------------------------------------------

/** calculate_severity — ratio of the raw amount to the raw category month sum. */
function anomalySeverity(amount: number, categoryTotal: number): number {
  if (categoryTotal <= 0) return 1;
  const ratio = amount / categoryTotal;
  if (ratio > 3) return 9;
  if (ratio > 2) return 7;
  if (ratio > 1.5) return 5;
  return 3;
}

router.get('/anomalies', async (c) => {
  const user = c.get('user');
  const base = user.currency ?? 'INR';
  const today = todayIso();

  const anomalies: Record<string, unknown>[] = [];

  // 1) unusual_transaction — ≥5 expenses in 90d, |amount − mean| > 3σ.
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const recent = await c.env.DB.prepare(
    "SELECT id, description, amount, currency_code, transaction_date, budget_category_id FROM transactions WHERE user_id = ? AND transaction_type = 'expense' AND transaction_date >= ?",
  ).bind(user.id, ninetyAgo).all<{ id: string; description: string | null; amount: number; currency_code: string; transaction_date: string; budget_category_id: string | null }>();
  if (recent.results.length >= 5) {
    const amounts = recent.results.map((t) => Number(t.amount));
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);

    // Batch category names + raw current-month category totals.
    const catIds = [...new Set(recent.results.map((t) => t.budget_category_id).filter((x): x is string => x !== null))];
    const catName = new Map<string, string>();
    const catMonth = new Map<string, number>();
    if (catIds.length > 0) {
      const placeholders = catIds.map(() => '?').join(',');
      const cats = await c.env.DB.prepare(
        `SELECT id, name FROM budget_categories WHERE id IN (${placeholders})`,
      ).bind(...catIds).all<{ id: string; name: string }>();
      for (const r of cats.results) catName.set(r.id, r.name);
      const monthKey = today.slice(0, 7);
      const spent = await c.env.DB.prepare(
        `SELECT budget_category_id AS cat, SUM(amount) AS t FROM transactions
         WHERE user_id = ? AND budget_category_id IN (${placeholders}) AND substr(transaction_date, 1, 7) = ?
         GROUP BY budget_category_id`,
      ).bind(user.id, ...catIds, monthKey).all<{ cat: string; t: number | null }>();
      for (const r of spent.results) catMonth.set(r.cat, num(r.t));
    }

    for (const t of recent.results) {
      const amount = Number(t.amount);
      if (!(amount > 0) || !(Math.abs(amount - mean) > 3.0 * std)) continue;
      const cat = (t.budget_category_id && catName.get(t.budget_category_id)) || 'Uncategorized';
      const catTotal = t.budget_category_id ? catMonth.get(t.budget_category_id) ?? 0 : 0;
      anomalies.push({
        type: 'unusual_transaction',
        severity: anomalySeverity(amount, catTotal),
        title: `Unusual ${cat} transaction`,
        description: `${formatAmount(base, amount)} on ${t.description ?? ''} (${t.transaction_date}) is significantly above normal`,
        date: t.transaction_date,
        amount,
        currency_code: t.currency_code,
        category: cat,
        transaction_id: t.id,
      });
    }
  }

  // 2) spending_surge — converted month sums, current vs previous.
  const prevKey = addMonthsClamped(today, -1);
  const monthSum = async (key: string): Promise<number> =>
    convertedSum(c, base,
      "SELECT currency_code, SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'expense' AND substr(transaction_date, 1, 7) = ? GROUP BY currency_code",
      [user.id, key]);
  const [currentMonth, prevMonth] = await Promise.all([monthSum(today.slice(0, 7)), monthSum(prevKey.slice(0, 7))]);
  if (prevMonth > 0 && currentMonth > prevMonth * 1.5) {
    anomalies.push({
      type: 'spending_surge',
      severity: 6,
      title: 'Spending surge this month',
      // Ruby interpolates a Float (round(0)) — always one decimal.
      description: `Current month spending (${formatAmount(base, currentMonth)}) is ${(Math.round((currentMonth / prevMonth - 1) * 100)).toFixed(1)}% higher than last month`,
      date: today,
      amount: round2(currentMonth - prevMonth),
      currency_code: base,
    });
  }

  // 3) budget_breach — active budgets (start/end window) over 90% usage.
  const budgets = await c.env.DB.prepare(
    `SELECT b.id, b.budget_category_id AS cat_id, b.monthly_limit, b.period, b.currency_code, bc.name AS cat FROM budgets b
     JOIN budget_categories bc ON bc.id = b.budget_category_id
     WHERE b.user_id = ? AND (b.start_date IS NULL OR b.start_date <= ?) AND (b.end_date IS NULL OR b.end_date >= ?)`,
  ).bind(user.id, today, today).all<{ id: string; cat_id: string; monthly_limit: number; period: string; currency_code: string; cat: string }>();
  for (const b of budgets.results) {
    const limit = b.period === 'weekly' ? Number(b.monthly_limit) / 4
      : b.period === 'quarterly' ? Number(b.monthly_limit) * 3
      : b.period === 'yearly' ? Number(b.monthly_limit) * 12
      : Number(b.monthly_limit);
    if (limit <= 0) continue; // usage_percentage → 0.0, never > 90
    const spentRow = await c.env.DB.prepare(
      'SELECT SUM(amount) AS t FROM transactions WHERE budget_category_id = ? AND user_id = ? AND transaction_date >= ? AND transaction_date <= ?',
    ).bind(b.cat_id, user.id, periodStartIso(today, b.period), today).first<{ t: number | null }>();
    const spent = num(spentRow?.t);
    const usage = Math.min(round1((spent / limit) * 100), 100);
    if (!(usage > 90)) continue;
    anomalies.push({
      type: 'budget_breach',
      severity: usage > 100 ? 7 : 4,
      title: `${b.cat} budget nearly exhausted`,
      description: `${rubyFloat(usage)}% used (${formatAmount(base, spent)} of ${formatAmount(base, Number(b.monthly_limit))})`,
      date: today,
      amount: spent,
      currency_code: b.currency_code,
      budget_id: b.id,
      category: b.cat,
    });
  }

  // sort_by(-severity) — JS sort is stable, matching Ruby's concat order.
  anomalies.sort((a, b) => (b.severity as number) - (a.severity as number));
  return success(c, {
    total_anomalies: anomalies.length,
    critical: anomalies.filter((a) => (a.severity as number) >= 8).length,
    warnings: anomalies.filter((a) => (a.severity as number) >= 4 && (a.severity as number) < 8).length,
    info: anomalies.filter((a) => (a.severity as number) < 4).length,
    anomalies: anomalies.slice(0, 10),
  });
});

// ---------------------------------------------------------------------------
// GET /reports/goal_charts — GoalChartService (+ WealthJourneyTracker pieces)
// ---------------------------------------------------------------------------

router.get('/goal_charts', async (c) => {
  const user = c.get('user');
  const base = user.currency ?? 'INR';
  const today = todayIso();

  // --- debt_free_progress ---
  const debts = await c.env.DB.prepare(
    "SELECT amount, paid_amount, emi_amount FROM debts WHERE user_id = ? AND status = 'active'",
  ).bind(user.id).all<{ amount: number; paid_amount: number; emi_amount: number | null }>();
  const total = debts.results.reduce((s, d) => s + Number(d.amount), 0);
  const paid = debts.results.reduce((s, d) => s + Number(d.paid_amount), 0);
  // months_remaining: 0 when emi nil/≤0 or amount ≤0, else ceil(remaining/emi).
  const monthsRemaining = (d: { amount: number; paid_amount: number; emi_amount: number | null }): number => {
    const emi = Number(d.emi_amount ?? 0);
    if (emi <= 0 || Number(d.amount) <= 0) return 0;
    return Math.ceil((Number(d.amount) - Number(d.paid_amount)) / emi);
  };
  const months = debts.results.reduce((mx, d) => Math.max(mx, monthsRemaining(d)), 0);
  // Rails `debts.sum(&:emi_amount)` crashes on nil emi — degrade nil → 0.
  const monthlyEmi = debts.results.reduce((s, d) => s + Number(d.emi_amount ?? 0), 0);
  const projection = [];
  for (let m = 0; m <= Math.min(months, 60); m++) {
    const monthDate = addMonthsClamped(today, m);
    projection.push({
      month: monthDate.slice(0, 7),
      label: monthLabel(new Date(`${monthDate}T00:00:00Z`)),
      remaining: round2(Math.max(total - paid - monthlyEmi * m, 0)),
      target: 0,
    });
  }
  // debt_progress#progress_percentage: mean of per-debt paid/amount (raw).
  const debtProgressPct = debts.results.length > 0
    ? debts.results.reduce((s, d) => {
        const amount = Number(d.amount);
        return s + (amount <= 0 ? 0 : Math.min(round1((Number(d.paid_amount) / amount) * 100), 100));
      }, 0) / debts.results.length
    : 100.0;

  // --- wealth_growth ---
  // NetWorthSnapshot.current auto-creates when none exists.
  const snapshot = (await currentSnapshot(c.env, user.id)) ?? (await createSnapshot(c.env, user.id, base));
  const currentNw = Number(snapshot?.net_worth ?? 0);
  // Rails bug kept for parity: DividendSip.where(status:'active') is NOT
  // user-scoped — every user's projection includes the global SIP total.
  // Flag for chunk-2 review; data today (1 sip row) makes it moot.
  const sips = await c.env.DB.prepare(
    "SELECT amount, frequency, currency_code FROM dividend_sips WHERE status = 'active'",
  ).all<{ amount: number; frequency: string; currency_code: string }>();
  let monthlyContribution = 0;
  for (const s of sips.results) {
    const amount = Number(s.amount);
    const monthly = s.frequency === 'monthly' ? amount : s.frequency === 'quarterly' ? amount / 3.0 : s.frequency === 'yearly' ? amount / 12.0 : NaN;
    if (!Number.isFinite(monthly)) continue; // Rails would crash on weekly/daily
    monthlyContribution += await convertAmount(c.env, monthly, s.currency_code || base, base);
  }
  const wealthGrowth = [];
  for (let y = 1; y <= 30; y++) {
    const yearDate = addMonthsClamped(today, 12 * y);
    const year = Number(yearDate.slice(0, 4));
    const proj = currentNw * Math.pow(1.10, y) + monthlyContribution * 12 * y * Math.pow(1.05, y);
    wealthGrowth.push({
      year,
      label: String(year),
      projected: round2(proj),
      conservative: round2(proj * 0.97),
      aggressive: round2(proj * 1.02),
    });
  }

  // --- budget_chart ---
  // Monthly spending is unconverted + category-scoped; budgets.active window.
  const cats = await c.env.DB.prepare(
    'SELECT id, name, color FROM budget_categories WHERE user_id = ? AND active = 1',
  ).bind(user.id).all<{ id: string; name: string; color: string }>();
  const monthKey = today.slice(0, 7);
  const placeholders = cats.results.length > 0 ? cats.results.map(() => '?').join(',') : "''";
  const [spendRows, budgetRows] = await Promise.all([
    cats.results.length > 0 ? c.env.DB.prepare(
      `SELECT budget_category_id AS cat, SUM(amount) AS t FROM transactions
       WHERE user_id = ? AND budget_category_id IN (${placeholders}) AND substr(transaction_date, 1, 7) = ?
       GROUP BY budget_category_id`,
    ).bind(user.id, ...cats.results.map((x) => x.id), monthKey).all<{ cat: string; t: number | null }>() : Promise.resolve({ results: [] as Array<{ cat: string; t: number | null }> }),
    c.env.DB.prepare(
      `SELECT budget_category_id, monthly_limit FROM budgets b
       WHERE user_id = ? AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
       ORDER BY rowid ASC`,
    ).bind(user.id, today, today).all<{ budget_category_id: string; monthly_limit: number }>(),
  ]);
  const spentMap = new Map(spendRows.results.map((r) => [r.cat, num(r.t)]));
  const budgetMap = new Map<string, number>();
  for (const r of budgetRows.results) {
    if (!budgetMap.has(r.budget_category_id)) budgetMap.set(r.budget_category_id, Number(r.monthly_limit));
  }
  const budgetChart = cats.results.map((cat) => {
    const spent = spentMap.get(cat.id) ?? 0;
    const budgeted = budgetMap.get(cat.id) ?? 0;
    return {
      category: cat.name,
      spent,
      budgeted,
      remaining: round2(budgeted - spent),
      color: cat.color,
    };
  });

  // --- income_vs_expenses — Transaction.monthly_totals(user_id, months: 12) ---
  const keys = Array.from({ length: 12 }, (_, i) => addMonthsClamped(today, -i).slice(0, 7));
  const keyList = keys.map(() => '?').join(',');
  const totals = await c.env.DB.prepare(
    `SELECT substr(transaction_date, 1, 7) AS m, transaction_type, SUM(amount) AS t
     FROM transactions WHERE user_id = ? AND substr(transaction_date, 1, 7) IN (${keyList})
     GROUP BY m, transaction_type`,
  ).bind(user.id, ...keys).all<{ m: string; transaction_type: string; t: number | null }>();
  const sumMap = new Map<string, { income: number; expense: number }>();
  for (const r of totals.results) {
    const e = sumMap.get(r.m) ?? { income: 0, expense: 0 };
    if (r.transaction_type === 'income') e.income = num(r.t);
    else if (r.transaction_type === 'expense') e.expense = num(r.t);
    sumMap.set(r.m, e);
  }
  const incomeVsExpenses = keys.map((key, i) => {
    const date = addMonthsClamped(today, -i);
    const e = sumMap.get(key) ?? { income: 0, expense: 0 };
    return {
      month: key,
      label: monthLabel(new Date(`${date}T00:00:00Z`)),
      expenses: e.expense,
      income: e.income,
      net: e.income - e.expense,
    };
  });

  return success(c, {
    debt_free_progress: {
      total_debt: total,
      paid_so_far: paid,
      remaining: total - paid,
      progress_pct: debtProgressPct,
      projection,
    },
    wealth_growth: wealthGrowth,
    budget_chart: budgetChart,
    income_vs_expenses: incomeVsExpenses,
  });
});

export default router;
