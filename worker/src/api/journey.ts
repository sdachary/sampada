// Api::JourneyController — GET / (show), GET /progress. Rails bug-compat:
// debt and investment sums are raw (no currency conversion), and both routes
// auto-create the first net-worth snapshot + journey row like
// NetWorthSnapshot.current / journeys.first_or_create do.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { convertAmount } from '../jobs/data';
import {
  addMonthsClamped, avalanchePlan, createSnapshot, currentSnapshot, monthLabel,
  nowIso, num, round1, round2, success, symbolFor, todayIso, type SnapshotRow,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type DebtRow = {
  id: string; amount: number; paid_amount: number; emi_amount: number | null;
  interest_rate: number | null; currency_code: string;
};

type Ctx = Parameters<typeof success>[0];

async function activeDebts(c: Ctx, userId: string): Promise<DebtRow[]> {
  const rows = await c.env.DB.prepare(
    "SELECT id, amount, paid_amount, emi_amount, interest_rate, currency_code FROM debts WHERE user_id = ? AND status = 'active'",
  ).bind(userId).all<DebtRow>();
  return rows.results;
}

/** DebtPayoffService attrs use RAW values (Rails builds them unconverted). */
function payoffDebts(debts: DebtRow[]) {
  return debts.map((d) => ({
    id: d.id,
    balance: Number(d.amount) - Number(d.paid_amount),
    interest_rate: Number(d.interest_rate ?? 0),
    min_payment: Number(d.emi_amount ?? 0),
  }));
}

async function loadJourneysRow(c: Ctx, userId: string, createIfMissing: boolean) {
  let row = await c.env.DB.prepare(
    'SELECT id, monthly_sip_goal FROM journeys WHERE user_id = ? ORDER BY id ASC LIMIT 1',
  ).bind(userId).first<{ id: string; monthly_sip_goal: number | null }>();
  if (!row && !createIfMissing) return null; // progress uses journeys.first (no create)
  if (!row) {
    // show: current_user.journeys.first || create!(phase: 'negative')
    const now = nowIso();
    await c.env.DB.prepare(
      "INSERT INTO journeys (id, user_id, phase, created_at, updated_at) VALUES (?, ?, 'negative', ?, ?)",
    ).bind(crypto.randomUUID(), userId, now, now).run();
    row = { id: '', monthly_sip_goal: null };
  }
  return row;
}

/** Journey#dividend_sips_sum — SIP amounts via the user's portfolios. */
async function sipTotal(c: Ctx, userId: string): Promise<number> {
  const row = await c.env.DB.prepare(
    'SELECT SUM(ds.amount) AS t FROM dividend_sips ds JOIN portfolios p ON p.id = ds.portfolio_id WHERE p.user_id = ?',
  ).bind(userId).first<{ t: number | null }>();
  return num(row?.t);
}

/** Journey#progress_percentage: [(sip / goal * 100).round(1), 100].min */
function progressPct(goal: unknown, sip: number): number {
  const g = num(goal);
  if (g <= 0) return 0;
  return Math.min(round1((sip / g) * 100), 100);
}

/** build_milestones — journey may be null on /progress (Rails would crash; we
 *  degrade to 0 progress). */
function buildMilestones(
  user: { id: string; currency: string | null },
  journeyGoal: unknown,
  sip: number,
  debts: DebtRow[],
  payoffPlan: { months: number; total_interest: number } | null,
  snapshot: SnapshotRow | null,
) {
  const today = todayIso();
  const milestones: Record<string, unknown>[] = [];

  // Milestone 1: Debt-free
  if (debts.length > 0 && payoffPlan) {
    milestones.push({
      id: 'debt_free',
      title: 'Debt-Free',
      target_date: addMonthsClamped(today, payoffPlan.months),
      description: 'Pay off all active debts',
      progress: progressPct(journeyGoal, sip) || 0,
      status: payoffPlan.months === 0 ? 'completed' : 'in_progress',
    });
  } else {
    milestones.push({
      id: 'debt_free',
      title: 'Debt-Free',
      target_date: null,
      description: "No active debts — you're already debt-free!",
      progress: 100,
      status: 'completed',
    });
  }

  // Milestone 2: First ₹1L net worth
  if (snapshot) {
    const nw = num(snapshot.net_worth);
    milestones.push({
      id: 'net_worth_1l',
      title: '₹1 Lakh Net Worth',
      target_date: null,
      description: 'Build net worth to ₹1,00,000',
      progress: nw >= 100_000 ? 100 : Math.max(round1((nw / 100_000) * 100), 0),
      status: nw >= 100_000 ? 'completed' : 'in_progress',
    });
  }

  // Milestone 3: SIP goal progress
  if (num(journeyGoal) > 0) {
    const progress = progressPct(journeyGoal, sip);
    milestones.push({
      id: 'sip_goal',
      title: 'Monthly SIP Goal',
      target_date: null,
      description: `Reach monthly SIP target of ${symbolFor(user.currency)}${Math.trunc(num(journeyGoal))}`,
      progress,
      status: progress >= 100 ? 'completed' : 'in_progress',
    });
  }

  return milestones;
}

/** WealthJourneyTracker#net_worth_trajectory — trajectory over months. */
async function netWorthTrajectory(
  c: Ctx,
  userId: string,
  snapshot: SnapshotRow,
  debts: DebtRow[],
  baseCurrency: string,
  months = 12,
) {
  // total_emi is CONVERTED here (tracker); per-debt convert == group-convert.
  const emiRows = await c.env.DB.prepare(
    "SELECT currency_code, SUM(emi_amount) AS t FROM debts WHERE user_id = ? AND status = 'active' GROUP BY currency_code",
  ).bind(userId).all<{ currency_code: string; t: number | null }>();
  let totalEmi = 0;
  for (const r of emiRows.results) {
    totalEmi += await convertAmount(c.env, num(r.t), r.currency_code, baseCurrency);
  }

  const payoff = debts.length > 0 ? avalanchePlan(payoffDebts(debts)) : null;
  const maxMonths = payoff && payoff.months > 0 ? payoff.months : 0;

  const today = todayIso();
  const totalAssets = num(snapshot.total_assets);
  const totalLiabilities = num(snapshot.total_liabilities);
  const trajectory = [];
  for (let m = 0; m <= months; m++) {
    const monthDate = addMonthsClamped(today, m);
    const debtReduction = totalEmi * Math.min(m, maxMonths);
    const assetGrowth = totalAssets * Math.pow(1.005, m);
    const liability = Math.max(totalLiabilities - debtReduction, 0);
    trajectory.push({
      month: monthDate.slice(0, 7),
      label: monthLabel(new Date(`${monthDate}T00:00:00Z`)),
      net_worth: round2(assetGrowth - liability),
      assets: round2(assetGrowth),
      liabilities: round2(liability),
    });
  }
  return trajectory;
}

router.get('/', async (c) => {
  const user = c.get('user');
  const journeyRow = await loadJourneysRow(c, user.id, true);
  const sip = await sipTotal(c, user.id);

  const debts = await activeDebts(c, user.id);
  const totalDebt = debts.reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0);
  const totalEmiRaw = await c.env.DB.prepare(
    "SELECT SUM(emi_amount) AS t FROM debts WHERE user_id = ? AND status = 'active'",
  ).bind(user.id).first<{ t: number | null }>();
  const investments = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(i.shares * i.current_price), 0) AS t FROM investments i JOIN portfolios p ON p.id = i.portfolio_id WHERE p.user_id = ?',
  ).bind(user.id).first<{ t: number | null }>();

  const snapshot = (await currentSnapshot(c.env, user.id)) ?? (await createSnapshot(c.env, user.id, user.currency ?? 'INR'));
  const payoffPlan = debts.length > 0 ? avalanchePlan(payoffDebts(debts)) : null;

  return success(c, {
    debt: { total_debt: totalDebt, total_emi: num(totalEmiRaw?.t) },
    sip: {
      monthly_goal: num(journeyRow?.monthly_sip_goal),
      progress: progressPct(journeyRow?.monthly_sip_goal, sip),
    },
    net_worth: {
      net_worth: num(snapshot?.net_worth),
      assets: num(investments?.t),
      liabilities: totalDebt,
    },
    milestones: buildMilestones(user, journeyRow?.monthly_sip_goal, sip, debts, payoffPlan, snapshot),
  });
});

router.get('/progress', async (c) => {
  const user = c.get('user');
  const journeyRow = await loadJourneysRow(c, user.id, false);
  const sip = await sipTotal(c, user.id);

  const debts = await activeDebts(c, user.id);
  const totalDebt = debts.reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0);
  const paidRow = await c.env.DB.prepare(
    "SELECT SUM(amount) AS t FROM debts WHERE user_id = ? AND status = 'paid_off'",
  ).bind(user.id).first<{ t: number | null }>();
  const paid = num(paidRow?.t);
  const originalDebt = totalDebt + paid;
  const reductionPct = originalDebt > 0 ? round1((paid / originalDebt) * 100) : 0;

  const snapshot = (await currentSnapshot(c.env, user.id)) ?? (await createSnapshot(c.env, user.id, user.currency ?? 'INR'));
  const nw = num(snapshot?.net_worth);
  const NW_TARGET = 5_000_000;
  const nwProgressPct = nw > 0 ? Math.min(round1((nw / NW_TARGET) * 100), 100) : 0;

  const payoffPlan = debts.length > 0 ? avalanchePlan(payoffDebts(debts)) : null;
  const trajectory = snapshot
    ? await netWorthTrajectory(c, user.id, snapshot, debts, user.currency ?? 'INR')
    : [];

  return success(c, {
    debt_progress: {
      total_debt: totalDebt, paid_debt: paid, original_debt: originalDebt, reduction_pct: reductionPct,
    },
    sip_progress: {
      monthly_goal: num(journeyRow?.monthly_sip_goal),
      progress: progressPct(journeyRow?.monthly_sip_goal, sip) || 0,
    },
    net_worth_progress: { current: nw, target: NW_TARGET, progress_pct: nwProgressPct },
    net_worth_trajectory: trajectory,
    milestones: buildMilestones(user, journeyRow?.monthly_sip_goal, sip, debts, payoffPlan, snapshot),
  });
});

export default router;
