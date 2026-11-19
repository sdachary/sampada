// Api::TripsController + nested TripMembers/Expenses/Settlements controllers
// port. Every query is scoped to the owning trip (trip.user_id = current user)
// and nested rows are additionally checked against that trip_id.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, num, success, type AppContext } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = AppContext;

type TripRow = {
  id: string; user_id: string; name: string; destination: string | null;
  start_date: string | null; end_date: string | null; currency: string | null;
  group_type: string | null; status: string | null; total_budget: number | null;
  notes: string | null; created_at: string; updated_at: string;
};

type MemberRow = {
  id: string; trip_id: string; name: string; email: string | null; role: string | null;
  added_at: string | null;
};

type CategoryRow = {
  id: string; trip_id: string; name: string | null; color: string | null;
  budget: number | null; created_at: string; updated_at: string;
};

type ExpenseRow = {
  id: string; trip_id: string; trip_member_id: string; trip_category_id: string | null;
  amount: number | null; description: string | null; expense_date: string | null;
  split_type: string | null; split_details: string | null;
};

type SettlementRow = {
  id: string; trip_id: string; from_trip_member_id: string; to_trip_member_id: string;
  amount: number | null; settled_at: string | null; notes: string | null; created_at: string;
};

const TRIP_KEYS = ['name', 'destination', 'start_date', 'end_date', 'currency', 'group_type', 'status', 'total_budget', 'notes'] as const;
const DEFAULT_CATEGORIES = [
  { name: 'Travel', color: '#3B82F6' },
  { name: 'Commute', color: '#8B5CF6' },
  { name: 'Food', color: '#F59E0B' },
  { name: 'Stays', color: '#10B981' },
  { name: 'Activities', color: '#EC4899' },
  { name: 'Misc', color: '#6B7280' },
];

async function findTrip(c: Ctx, tripId: string): Promise<TripRow | null> {
  return c.env.DB.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?')
    .bind(tripId, c.get('user').id).first<TripRow>();
}

async function ownedTrip(c: Ctx): Promise<TripRow | null> {
  return findTrip(c, c.req.param('tripId')!);
}

function tripJson(t: TripRow) {
  return {
    id: t.id, name: t.name, destination: t.destination, start_date: t.start_date,
    end_date: t.end_date, currency: t.currency, group_type: t.group_type, status: t.status,
    total_budget: t.total_budget == null ? null : num(t.total_budget),
    notes: t.notes, created_at: t.created_at, updated_at: t.updated_at,
  };
}

function memberJson(m: MemberRow) {
  return { id: m.id, name: m.name, email: m.email, role: m.role };
}

function parseSplitDetails(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* Rails jsonb would be null for malformed data */ }
  return {};
}

async function memberNames(c: Ctx, tripId: string): Promise<Map<string, string>> {
  const rows = await c.env.DB.prepare('SELECT id, name FROM trip_members WHERE trip_id = ?')
    .bind(tripId).all<{ id: string; name: string }>();
  return new Map(rows.results.map((m) => [m.id, m.name]));
}

async function expenseJson(c: Ctx, e: ExpenseRow, names?: Map<string, string>) {
  const memberName = names?.get(e.trip_member_id) ?? (await c.env.DB.prepare('SELECT name FROM trip_members WHERE id = ?')
    .bind(e.trip_member_id).first<{ name: string }>())?.name ?? '';
  const categoryName = e.trip_category_id
    ? (await c.env.DB.prepare('SELECT name FROM trip_categories WHERE id = ?')
      .bind(e.trip_category_id).first<{ name: string | null }>())?.name ?? null
    : null;
  return {
    id: e.id, trip_member_id: e.trip_member_id, payer: memberName,
    trip_category_id: e.trip_category_id, category_name: categoryName,
    amount: num(e.amount), description: e.description, expense_date: e.expense_date,
    split_type: e.split_type, split_details: parseSplitDetails(e.split_details),
  };
}

async function settlementJson(c: Ctx, s: SettlementRow, names?: Map<string, string>) {
  const n = names ?? await memberNames(c, s.trip_id);
  return {
    id: s.id, from_trip_member_id: s.from_trip_member_id, from_name: n.get(s.from_trip_member_id) ?? '',
    to_trip_member_id: s.to_trip_member_id, to_name: n.get(s.to_trip_member_id) ?? '',
    amount: num(s.amount), settled_at: s.settled_at, notes: s.notes,
  };
}

// TripExpense#amount_cents + #split_shares — integer cents, remainder to the
// first members. Ruby's round is half-up; all amounts here are non-negative.
function splitShares(e: ExpenseRow, memberIds: string[]): Record<string, number> {
  const totalCents = Math.round(num(e.amount) * 100);
  const details = parseSplitDetails(e.split_details);
  switch (e.split_type) {
    case 'equal': {
      if (memberIds.length === 0) return {};
      const share = Math.floor(totalCents / memberIds.length);
      const remainder = totalCents % memberIds.length;
      const out: Record<string, number> = {};
      memberIds.forEach((id, i) => { out[id] = share + (i < remainder ? 1 : 0); });
      return out;
    }
    case 'percentage':
      if (Object.keys(details).length === 0) return {};
      return Object.fromEntries(
        Object.entries(details).map(([id, pct]) => [id, Math.round((totalCents * Number(pct)) / 100)]),
      );
    case 'custom':
      if (Object.keys(details).length === 0) return {};
      return Object.fromEntries(
        Object.entries(details).map(([id, amt]) => [id, Math.round(Number(amt) * 100)]),
      );
    default:
      return {};
  }
}

// Trip#balances + #suggested_settlements — all arithmetic in integer cents.
async function settlementMath(c: Ctx, tripId: string) {
  // Rails iterates trip.trip_members (insertion order) for equal-split remainders.
  const memberRows = await c.env.DB.prepare('SELECT id FROM trip_members WHERE trip_id = ? ORDER BY created_at, id')
    .bind(tripId).all<{ id: string }>();
  const memberIds = memberRows.results.map((m) => m.id);
  const balances: Record<string, number> = {};
  for (const id of memberIds) balances[id] = 0;

  const expenses = await c.env.DB.prepare('SELECT * FROM trip_expenses WHERE trip_id = ?')
    .bind(tripId).all<ExpenseRow>();
  for (const e of expenses.results) {
    const payer = e.trip_member_id;
    balances[payer] = (balances[payer] ?? 0) + Math.round(num(e.amount) * 100);
    for (const [id, share] of Object.entries(splitShares(e, memberIds))) {
      balances[id] = (balances[id] ?? 0) + Math.trunc(share);
    }
  }

  const settlements = await c.env.DB.prepare('SELECT * FROM trip_settlements WHERE trip_id = ?')
    .bind(tripId).all<SettlementRow>();
  for (const s of settlements.results) {
    const cents = Math.round(num(s.amount) * 100);
    balances[s.from_trip_member_id] = (balances[s.from_trip_member_id] ?? 0) + cents;
    balances[s.to_trip_member_id] = (balances[s.to_trip_member_id] ?? 0) - cents;
  }

  const creditors: Array<{ member_id: string; amount: number }> = [];
  const debtors: Array<{ member_id: string; amount: number }> = [];
  for (const [memberId, balance] of Object.entries(balances)) {
    if (balance === 0) continue;
    if (balance > 0) creditors.push({ member_id: memberId, amount: balance });
    else debtors.push({ member_id: memberId, amount: -balance });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggested: Array<{ from: string; to: string; amount_cents: number }> = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);
    suggested.push({ from: debtor.member_id, to: creditor.member_id, amount_cents: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci += 1;
    if (debtor.amount === 0) di += 1;
  }
  return { balances, suggested };
}

// ---------------------------------------------------------------------------
// /trips
// ---------------------------------------------------------------------------

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC')
    .bind(c.get('user').id).all<TripRow>();
  return success(c, rows.results.map(tripJson));
});

router.post('/', async (c) => {
  const body = await jsonBody<Record<string, unknown>>(c);
  if (body.name == null || String(body.name).trim() === '') {
    return error(c, 'Validation failed', 422, ["Name can't be blank"]);
  }
  const now = nowIso();
  const id = crypto.randomUUID();
  const values: Record<string, string | number | null> = { name: String(body.name) };
  for (const key of TRIP_KEYS) {
    if (key === 'name' || body[key] === undefined) continue;
    values[key] = key === 'total_budget'
      ? (body[key] == null || String(body[key]).trim() === '' ? null : Number(body[key]))
      : (body[key] == null ? null : String(body[key]));
  }
  const columns = Object.keys(values);
  await c.env.DB.prepare(
    `INSERT INTO trips (id, user_id, ${columns.join(', ')}, created_at, updated_at)
     VALUES (?, ?, ${columns.map(() => '?').join(', ')}, ?, ?)`,
  ).bind(id, c.get('user').id, ...columns.map((k) => values[k]), now, now).run();

  // Trip#seed_default_categories (after_create).
  for (const cat of DEFAULT_CATEGORIES) {
    await c.env.DB.prepare(
      'INSERT INTO trip_categories (id, trip_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), id, cat.name, cat.color, now, now).run();
  }
  const trip = await findTrip(c, id);
  return c.json(tripJson(trip!), 201);
});

router.get('/:id', async (c) => {
  const trip = await findTrip(c, c.req.param('id'));
  if (!trip) return notFound(c);

  const [memberRows, expenseRows, settlementRows, categoryRows, total] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM trip_members WHERE trip_id = ? ORDER BY name').bind(trip.id).all<MemberRow>(),
    c.env.DB.prepare('SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY expense_date DESC').bind(trip.id).all<ExpenseRow>(),
    c.env.DB.prepare('SELECT * FROM trip_settlements WHERE trip_id = ? ORDER BY created_at DESC').bind(trip.id).all<SettlementRow>(),
    c.env.DB.prepare('SELECT * FROM trip_categories WHERE trip_id = ? ORDER BY created_at, id').bind(trip.id).all<CategoryRow>(),
    c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM trip_expenses WHERE trip_id = ?')
      .bind(trip.id).first<{ total: number | null }>(),
  ]);
  const names = new Map(memberRows.results.map((m) => [m.id, m.name]));
  const { balances, suggested } = await settlementMath(c, trip.id);

  const budgetVsActual = [];
  for (const cat of categoryRows.results) {
    const spentRow = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS spent FROM trip_expenses WHERE trip_id = ? AND trip_category_id = ?',
    ).bind(trip.id, cat.id).first<{ spent: number | null }>();
    const spent = num(spentRow?.spent);
    const budget = num(cat.budget);
    budgetVsActual.push({
      category: {
        id: cat.id, trip_id: cat.trip_id, name: cat.name, color: cat.color,
        budget: cat.budget, created_at: cat.created_at, updated_at: cat.updated_at,
      },
      budget, spent, remaining: budget - spent,
    });
  }

  return success(c, {
    ...tripJson(trip),
    members: memberRows.results.map(memberJson),
    expenses: await Promise.all(expenseRows.results.map((e) => expenseJson(c, e, names))),
    settlements: await Promise.all(settlementRows.results.map((s) => settlementJson(c, s, names))),
    balances,
    suggested_settlements: suggested,
    budget_vs_actual: budgetVsActual,
    total_spent: num(total?.total),
  });
});

async function updateTrip(c: Ctx) {
  const trip = await findTrip(c, c.req.param('id')!);
  if (!trip) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  if (body.name !== undefined && String(body.name ?? '').trim() === '') {
    return error(c, 'Validation failed', 422, ["Name can't be blank"]);
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of TRIP_KEYS) {
    if (body[key] === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(key === 'total_budget'
      ? (body[key] == null || String(body[key]).trim() === '' ? null : Number(body[key]))
      : (body[key] == null ? null : String(body[key])));
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE trips SET ${sets.join(', ')} WHERE id = ?`).bind(...values, trip.id).run();
  }
  const fresh = await findTrip(c, trip.id);
  return success(c, tripJson(fresh!));
}

router.put('/:id', updateTrip);
router.patch('/:id', updateTrip);

router.delete('/:id', async (c) => {
  const trip = await findTrip(c, c.req.param('id'));
  if (!trip) return notFound(c);
  // Rails dependent: :destroy on all four associations.
  await c.env.DB.prepare('DELETE FROM trip_expenses WHERE trip_id = ?').bind(trip.id).run();
  await c.env.DB.prepare('DELETE FROM trip_settlements WHERE trip_id = ?').bind(trip.id).run();
  await c.env.DB.prepare('DELETE FROM trip_members WHERE trip_id = ?').bind(trip.id).run();
  await c.env.DB.prepare('DELETE FROM trip_categories WHERE trip_id = ?').bind(trip.id).run();
  await c.env.DB.prepare('DELETE FROM trips WHERE id = ?').bind(trip.id).run();
  return success(c, {});
});

// ---------------------------------------------------------------------------
// /trips/:tripId/trip_members
// ---------------------------------------------------------------------------

router.get('/:tripId/trip_members', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const rows = await c.env.DB.prepare('SELECT * FROM trip_members WHERE trip_id = ? ORDER BY name')
    .bind(trip.id).all<MemberRow>();
  return success(c, rows.results.map(memberJson));
});

router.post('/:tripId/trip_members', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  if (body.name == null || String(body.name).trim() === '') {
    return error(c, 'Validation failed', 422, ["Name can't be blank"]);
  }
  const name = String(body.name);
  const duplicate = await c.env.DB.prepare('SELECT id FROM trip_members WHERE trip_id = ? AND name = ?')
    .bind(trip.id, name).first<{ id: string }>();
  if (duplicate) return error(c, 'Validation failed', 422, ['Name already added to this trip']);
  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO trip_members (id, trip_id, name, email, added_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, trip.id, name, body.email == null ? null : String(body.email), now, now, now).run();
  const row = await c.env.DB.prepare('SELECT * FROM trip_members WHERE id = ?').bind(id).first<MemberRow>();
  return c.json(memberJson(row!), 201);
});

router.delete('/:tripId/trip_members/:id', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const member = await c.env.DB.prepare('SELECT id FROM trip_members WHERE id = ? AND trip_id = ?')
    .bind(c.req.param('id'), trip.id).first<{ id: string }>();
  if (!member) return notFound(c);
  // TripMember dependent: :destroy on paid expenses + settlements.
  await c.env.DB.prepare('DELETE FROM trip_expenses WHERE trip_member_id = ? AND trip_id = ?')
    .bind(member.id, trip.id).run();
  await c.env.DB.prepare(
    'DELETE FROM trip_settlements WHERE trip_id = ? AND (from_trip_member_id = ? OR to_trip_member_id = ?)',
  ).bind(trip.id, member.id, member.id).run();
  await c.env.DB.prepare('DELETE FROM trip_members WHERE id = ?').bind(member.id).run();
  return success(c, {});
});

// ---------------------------------------------------------------------------
// /trips/:tripId/trip_expenses
// ---------------------------------------------------------------------------

router.get('/:tripId/trip_expenses', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const rows = await c.env.DB.prepare('SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY expense_date DESC')
    .bind(trip.id).all<ExpenseRow>();
  const names = await memberNames(c, trip.id);
  return success(c, await Promise.all(rows.results.map((e) => expenseJson(c, e, names))));
});

router.post('/:tripId/trip_expenses', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return error(c, 'Validation failed', 422, ['Amount must be greater than 0']);
  if (body.description == null || String(body.description).trim() === '') {
    return error(c, 'Validation failed', 422, ["Description can't be blank"]);
  }
  const splitType = body.split_type == null ? 'equal' : String(body.split_type);
  if (!['equal', 'percentage', 'custom'].includes(splitType)) return error(c, 'Validation failed', 422, ['Split type is not included in the list']);
  const memberId = body.trip_member_id == null ? '' : String(body.trip_member_id);
  if (await c.env.DB.prepare('SELECT id FROM trip_members WHERE id = ? AND trip_id = ?').bind(memberId, trip.id).first<{ id: string }>() === null) {
    return error(c, 'Validation failed', 422, ['Trip member must exist']);
  }
  let categoryId: string | null = null;
  if (body.trip_category_id != null && String(body.trip_category_id) !== '') {
    categoryId = String(body.trip_category_id);
    if (await c.env.DB.prepare('SELECT id FROM trip_categories WHERE id = ? AND trip_id = ?').bind(categoryId, trip.id).first<{ id: string }>() === null) {
      return error(c, 'Validation failed', 422, ['Trip category must exist']);
    }
  }
  const splitDetails = body.split_details && typeof body.split_details === 'object'
    ? JSON.stringify(body.split_details) : null;
  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO trip_expenses (id, trip_id, trip_member_id, trip_category_id, amount, description,
                                expense_date, split_type, split_details, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, trip.id, memberId, categoryId, amount, String(body.description),
    body.expense_date == null ? null : String(body.expense_date), splitType, splitDetails, now, now,
  ).run();
  const row = await c.env.DB.prepare('SELECT * FROM trip_expenses WHERE id = ?').bind(id).first<ExpenseRow>();
  return c.json(await expenseJson(c, row!), 201);
});

router.delete('/:tripId/trip_expenses/:id', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const expense = await c.env.DB.prepare('SELECT id FROM trip_expenses WHERE id = ? AND trip_id = ?')
    .bind(c.req.param('id'), trip.id).first<{ id: string }>();
  if (!expense) return notFound(c);
  await c.env.DB.prepare('DELETE FROM trip_expenses WHERE id = ?').bind(expense.id).run();
  return success(c, {});
});

// ---------------------------------------------------------------------------
// /trips/:tripId/trip_settlements
// ---------------------------------------------------------------------------

router.get('/:tripId/trip_settlements', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const rows = await c.env.DB.prepare('SELECT * FROM trip_settlements WHERE trip_id = ? ORDER BY created_at DESC')
    .bind(trip.id).all<SettlementRow>();
  const names = await memberNames(c, trip.id);
  return success(c, await Promise.all(rows.results.map((s) => settlementJson(c, s, names))));
});

router.post('/:tripId/trip_settlements', async (c) => {
  const trip = await ownedTrip(c);
  if (!trip) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return error(c, 'Validation failed', 422, ['Amount must be greater than 0']);
  const fromId = body.from_trip_member_id == null ? '' : String(body.from_trip_member_id);
  const toId = body.to_trip_member_id == null ? '' : String(body.to_trip_member_id);
  const names = await memberNames(c, trip.id);
  if (!names.has(fromId) || !names.has(toId)) {
    return error(c, 'Validation failed', 422, ['Trip member must exist']);
  }
  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO trip_settlements (id, trip_id, from_trip_member_id, to_trip_member_id,
                                   amount, settled_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, trip.id, fromId, toId, amount, now, body.notes == null ? null : String(body.notes), now, now).run();
  const row = await c.env.DB.prepare('SELECT * FROM trip_settlements WHERE id = ?').bind(id).first<SettlementRow>();
  return c.json(await settlementJson(c, row!, names), 201);
});

export default router;
