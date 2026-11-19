// Api::HouseholdsController + HouseholdDashboardService port.
// SEC-01: update/invite require owner|admin, destroy requires owner, invite
// roles are admin|member|viewer only (never owner).
// SEC-02: invites create a pending membership + an in-app household_invite
// notification; accept/decline act only on the invitee's pending membership.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { convertAmount } from '../jobs/data';
import {
  error, jsonBody, notFound, nowIso, num, round2, success, symbolFor, type AppContext,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = AppContext;

type HouseholdRow = {
  id: string; name: string; currency: string; description: string | null; created_at: string;
};

type MembershipRow = {
  id: string; household_id: string; user_id: string; role: string;
  invite_status: string; joined_at: string | null; created_at: string;
};

type MembershipUserRow = MembershipRow & {
  first_name: string | null; last_name: string | null; email: string;
};

const round4 = (x: number): number => Math.round(x * 10000) / 10000;

const fullName = (u: { first_name: string | null; last_name: string | null }): string =>
  [u.first_name, u.last_name].filter((s): s is string => s != null).join(' ');

const HOUSEHOLD_COLS = 'id, name, currency, description, created_at';
const HOUSEHOLD_COLS_H = `h.${HOUSEHOLD_COLS.split(', ').join(', h.')}`;

async function findHousehold(c: Ctx, householdId: string, userId: string): Promise<HouseholdRow | null> {
  // Rails: current_user.households.find(id) — any membership (pending included).
  return c.env.DB.prepare(
    `SELECT ${HOUSEHOLD_COLS_H}
     FROM households h JOIN household_memberships m ON m.household_id = h.id
     WHERE h.id = ? AND m.user_id = ? LIMIT 1`,
  ).bind(householdId, userId).first<HouseholdRow>();
}

async function findMembership(c: Ctx, householdId: string, userId: string): Promise<MembershipRow | null> {
  return c.env.DB.prepare(
    'SELECT id, household_id, user_id, role, invite_status, joined_at, created_at FROM household_memberships WHERE household_id = ? AND user_id = ? LIMIT 1',
  ).bind(householdId, userId).first<MembershipRow>();
}

async function householdSummary(c: Ctx, h: HouseholdRow) {
  // h.members.count — all memberships, including pending (Rails association).
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM household_memberships WHERE household_id = ?')
    .bind(h.id).first<{ n: number | null }>();
  return {
    id: h.id, name: h.name, currency: h.currency, description: h.description,
    member_count: num(count?.n), created_at: h.created_at,
  };
}

/** ExchangeRateService#convert + the dashboard's `|| amount` fallback. */
async function convert(c: Ctx, amount: number, from: string | null, to: string): Promise<number> {
  if (!from || from === to) return amount;
  return round4(await convertAmount(c.env, amount, from, to));
}

/** Portfolio#total_value — shares * current_price, nulls as 0, NOT FX-converted. */
async function portfolioValue(c: Ctx, portfolioId: string): Promise<number> {
  const row = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(COALESCE(shares, 0) * COALESCE(current_price, 0)), 0) AS total FROM investments WHERE portfolio_id = ?',
  ).bind(portfolioId).first<{ total: number | null }>();
  return num(row?.total);
}

/** RecurringExpense#monthly_amount — nil for unknown frequencies (treated as 0). */
function monthlyAmount(amount: number, frequency: string | null): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'monthly': case 'daily': return amount;
    case 'quarterly': return amount / 3.0;
    case 'yearly': return amount / 12.0;
    default: return 0;
  }
}

/** HouseholdDashboardService#member_finances (transactions key omitted: the
 *  dashboard's member_summaries never reads it). */
async function memberFinances(c: Ctx, userId: string, base: string) {
  const debts = await c.env.DB.prepare('SELECT amount, paid_amount, currency_code FROM debts WHERE user_id = ?')
    .bind(userId).all<{ amount: number | null; paid_amount: number | null; currency_code: string | null }>();
  let debtTotal = 0;
  for (const d of debts.results) {
    debtTotal += await convert(c, num(d.amount) - num(d.paid_amount), d.currency_code, base);
  }

  const portfolios = await c.env.DB.prepare('SELECT id FROM portfolios WHERE user_id = ?')
    .bind(userId).all<{ id: string }>();
  let portfolioTotal = 0;
  for (const p of portfolios.results) portfolioTotal += await portfolioValue(c, p.id);

  const recurring = await c.env.DB.prepare('SELECT amount, frequency FROM recurring_expenses WHERE user_id = ? AND active = 1')
    .bind(userId).all<{ amount: number | null; frequency: string | null }>();
  const monthly = recurring.results.reduce((sum, e) => sum + monthlyAmount(num(e.amount), e.frequency), 0);

  return { debts: debtTotal, portfolios: portfolioTotal, monthly_expenses: monthly };
}

/** HouseholdDashboardService#overview — used by both show and dashboard. */
async function overview(c: Ctx, h: HouseholdRow) {
  const base = h.currency || 'INR';
  const memberships = await c.env.DB.prepare(
    `SELECT m.id, m.household_id, m.user_id, m.role, m.invite_status, m.joined_at, m.created_at,
            u.first_name, u.last_name, u.email
     FROM household_memberships m JOIN users u ON u.id = m.user_id
     WHERE m.household_id = ? ORDER BY m.created_at, m.id`,
  ).bind(h.id).all<MembershipUserRow>();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalMonthly = 0;
  const members = [];
  for (const m of memberships.results) {
    const finances = await memberFinances(c, m.user_id, base);
    totalAssets += finances.portfolios;
    totalLiabilities += finances.debts;
    totalMonthly += finances.monthly_expenses;
    members.push({
      id: m.user_id, name: fullName(m), email: m.email, role: m.role, joined_at: m.joined_at,
      total_debt: round2(finances.debts),
      total_investments: round2(finances.portfolios),
      monthly_expenses: round2(finances.monthly_expenses),
    });
  }

  const householdDebts = await c.env.DB.prepare('SELECT amount, paid_amount, currency_code FROM debts WHERE household_id = ?')
    .bind(h.id).all<{ amount: number | null; paid_amount: number | null; currency_code: string | null }>();
  for (const d of householdDebts.results) {
    totalLiabilities += await convert(c, num(d.amount) - num(d.paid_amount), d.currency_code, base);
  }
  const householdPortfolios = await c.env.DB.prepare('SELECT id FROM portfolios WHERE household_id = ?')
    .bind(h.id).all<{ id: string }>();
  for (const p of householdPortfolios.results) totalAssets += await portfolioValue(c, p.id);
  const householdRecurring = await c.env.DB.prepare('SELECT amount, frequency FROM recurring_expenses WHERE household_id = ? AND active = 1')
    .bind(h.id).all<{ amount: number | null; frequency: string | null }>();
  for (const e of householdRecurring.results) totalMonthly += monthlyAmount(num(e.amount), e.frequency);

  const shared_assets: Record<string, number> = {};
  for (const table of ['debts', 'portfolios', 'recurring_expenses', 'transactions', 'budgets']) {
    const row = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE household_id = ?`)
      .bind(h.id).first<{ n: number | null }>();
    shared_assets[table] = num(row?.n);
  }

  return {
    name: h.name,
    member_count: memberships.results.length,
    currency: base,
    currency_symbol: symbolFor(base),
    net_worth: {
      total_assets: round2(totalAssets),
      total_liabilities: round2(totalLiabilities),
      net_worth: round2(totalAssets - totalLiabilities),
    },
    monthly_spending: { total_monthly: round2(totalMonthly) },
    shared_assets,
    members,
  };
}

// GET /households/pending_invites — collection route, defined before /:id.
router.get('/pending_invites', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT m.id AS membership_id, m.household_id, m.role, m.created_at AS invited_at,
            h.name, h.currency, h.description, h.created_at AS household_created_at
     FROM household_memberships m JOIN households h ON h.id = m.household_id
     WHERE m.user_id = ? AND m.invite_status = 'pending' ORDER BY m.created_at DESC`,
  ).bind(c.get('user').id).all<{
    membership_id: string; household_id: string; role: string; invited_at: string;
    name: string; currency: string; description: string | null; household_created_at: string;
  }>();
  const out = [];
  for (const m of rows.results) {
    out.push({
      id: m.membership_id,
      household: await householdSummary(c, {
        id: m.household_id, name: m.name, currency: m.currency,
        description: m.description, created_at: m.household_created_at,
      }),
      role: m.role,
      invited_at: m.invited_at,
    });
  }
  return success(c, out);
});

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${HOUSEHOLD_COLS_H}
     FROM households h JOIN household_memberships m ON m.household_id = h.id
     WHERE m.user_id = ? ORDER BY h.created_at DESC`,
  ).bind(c.get('user').id).all<HouseholdRow>();
  const out = [];
  for (const h of rows.results) out.push(await householdSummary(c, h));
  return success(c, out);
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const name = body.name == null ? '' : String(body.name);
  if (name.trim() === '') return error(c, 'Validation failed', 422, ["Name can't be blank"]);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO households (id, name, currency, description, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
  ).bind(id, name, body.currency == null ? 'INR' : String(body.currency), now, now).run();
  // add_member(current_user, role: 'owner', invite_status: 'accepted')
  await c.env.DB.prepare(
    `INSERT INTO household_memberships (id, household_id, user_id, role, invite_status, joined_at, created_at, updated_at)
     VALUES (?, ?, ?, 'owner', 'accepted', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), id, user.id, now, now, now).run();

  const h = await c.env.DB.prepare(`SELECT ${HOUSEHOLD_COLS} FROM households WHERE id = ?`)
    .bind(id).first<HouseholdRow>();
  return c.json(await householdSummary(c, h!), 201);
});

router.get('/:id', async (c) => {
  const h = await findHousehold(c, c.req.param('id'), c.get('user').id);
  if (!h) return notFound(c);
  return success(c, await overview(c, h));
});

router.get('/:id/dashboard', async (c) => {
  const h = await findHousehold(c, c.req.param('id'), c.get('user').id);
  if (!h) return notFound(c);
  return success(c, await overview(c, h));
});

router.get('/:id/members', async (c) => {
  const h = await findHousehold(c, c.req.param('id'), c.get('user').id);
  if (!h) return notFound(c);
  const rows = await c.env.DB.prepare(
    `SELECT m.user_id, m.role, m.joined_at, u.first_name, u.last_name, u.email
     FROM household_memberships m JOIN users u ON u.id = m.user_id
     WHERE m.household_id = ? AND m.invite_status = 'accepted' ORDER BY m.created_at, m.id`,
  ).bind(h.id).all<{ user_id: string; role: string; joined_at: string | null; first_name: string | null; last_name: string | null; email: string }>();
  return success(c, rows.results.map((m) => ({
    id: m.user_id, name: fullName(m), email: m.email, role: m.role, joined_at: m.joined_at,
  })));
});

async function updateHousehold(c: Ctx) {
  const user = c.get('user');
  const h = await findHousehold(c, c.req.param('id')!, user.id);
  if (!h) return notFound(c);
  const membership = await findMembership(c, h.id, user.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return error(c, 'Forbidden: owner or admin role required', 403);
  }

  const body = await jsonBody<Record<string, unknown>>(c);
  if (body.name !== undefined && String(body.name ?? '').trim() === '') {
    return error(c, 'Validation failed', 422, ["Name can't be blank"]);
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of ['name', 'currency', 'description'] as const) {
    if (body[key] === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(body[key] == null ? null : String(body[key]));
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE households SET ${sets.join(', ')} WHERE id = ?`).bind(...values, h.id).run();
  }
  const fresh = await c.env.DB.prepare(`SELECT ${HOUSEHOLD_COLS} FROM households WHERE id = ?`)
    .bind(h.id).first<HouseholdRow>();
  return success(c, await householdSummary(c, fresh!));
}

router.put('/:id', updateHousehold);
router.patch('/:id', updateHousehold);

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const h = await findHousehold(c, c.req.param('id'), user.id);
  if (!h) return notFound(c);
  const membership = await findMembership(c, h.id, user.id);
  if (!membership || membership.role !== 'owner') {
    return error(c, 'Forbidden: owner role required', 403);
  }
  // Rails dependent: :nullify / :destroy.
  for (const table of ['debts', 'portfolios', 'recurring_expenses', 'transactions', 'budgets']) {
    await c.env.DB.prepare(`UPDATE ${table} SET household_id = NULL WHERE household_id = ?`).bind(h.id).run();
  }
  await c.env.DB.prepare('DELETE FROM household_memberships WHERE household_id = ?').bind(h.id).run();
  await c.env.DB.prepare('DELETE FROM households WHERE id = ?').bind(h.id).run();
  return c.body(null, 204);
});

router.post('/:id/invite', async (c) => {
  const user = c.get('user');
  const h = await findHousehold(c, c.req.param('id'), user.id);
  if (!h) return notFound(c);
  const membership = await findMembership(c, h.id, user.id);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return error(c, 'Forbidden: owner or admin role required', 403);
  }

  const body = await jsonBody<Record<string, unknown>>(c);
  // Rails order: find_by(email) → 404, then role validation → 422.
  const email = body.email == null ? '' : String(body.email);
  const invitee = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email).first<{ id: string }>();
  if (!invitee) return error(c, 'User not found', 404);

  const role = body.role == null ? 'member' : String(body.role);
  if (!['admin', 'member', 'viewer'].includes(role)) return error(c, 'Invalid role', 422);

  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM household_memberships WHERE household_id = ? AND user_id = ?',
  ).bind(h.id, invitee.id).first<{ id: string }>();
  if (duplicate) return error(c, 'Validation failed', 422, ['User has already been taken']);

  const now = nowIso();
  const membershipId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO household_memberships (id, household_id, user_id, role, invite_status, joined_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).bind(membershipId, h.id, invitee.id, role, now, now, now).run();
  // role.humanize in Rails: 'admin' → 'Admin', etc.
  const humanRole = role.charAt(0).toUpperCase() + role.slice(1);
  await c.env.DB.prepare(
    'INSERT INTO notifications (id, created_at, message, notification_type, read, updated_at, user_id) VALUES (?, ?, ?, ?, NULL, ?, ?)',
  ).bind(
    crypto.randomUUID(), now, `You've been invited to join ${h.name} as ${humanRole}`,
    'household_invite', now, invitee.id,
  ).run();
  return success(c, { membership_id: membershipId }, `Invitation sent to ${email}`);
});

router.post('/:id/accept_invite', async (c) => {
  const userId = c.get('user').id;
  const householdId = c.req.param('id');
  const h = await findHousehold(c, householdId, userId);
  if (!h) return notFound(c);
  const pending = await c.env.DB.prepare(
    "SELECT id FROM household_memberships WHERE household_id = ? AND user_id = ? AND invite_status = 'pending'",
  ).bind(householdId, userId).first<{ id: string }>();
  if (!pending) return error(c, 'No pending invitation found', 404);
  await c.env.DB.prepare("UPDATE household_memberships SET invite_status = 'accepted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), pending.id).run();
  return success(c, {}, `Joined ${h.name}`);
});

router.post('/:id/decline_invite', async (c) => {
  const userId = c.get('user').id;
  const householdId = c.req.param('id');
  const h = await findHousehold(c, householdId, userId);
  if (!h) return notFound(c);
  const pending = await c.env.DB.prepare(
    "SELECT id FROM household_memberships WHERE household_id = ? AND user_id = ? AND invite_status = 'pending'",
  ).bind(householdId, userId).first<{ id: string }>();
  if (!pending) return error(c, 'No pending invitation found', 404);
  await c.env.DB.prepare('DELETE FROM household_memberships WHERE id = ?').bind(pending.id).run();
  return success(c, {}, 'Invitation declined');
});

router.delete('/:id/leave', async (c) => {
  const userId = c.get('user').id;
  const householdId = c.req.param('id');
  const membership = await findMembership(c, householdId, userId);
  if (!membership) return error(c, 'Not a member', 404);
  await c.env.DB.prepare('DELETE FROM household_memberships WHERE id = ?').bind(membership.id).run();
  return success(c, {}, 'Left household');
});

export default router;
