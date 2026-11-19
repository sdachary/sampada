// Api::ExportsController + ExportService parity. GET / lists the available
// formats/types; GET /:type streams a CSV or JSON download scoped to the
// session user. CSV mirrors Ruby CSV.generate (header row from the first
// record, quote on comma/quote/newline, doubled quotes, trailing newline);
// JSON mirrors JSON.pretty_generate (2-space indent).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { boolFlag, notFound, num, success, todayIso, type AppContext } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

const FORMATS = ['csv', 'json'];
const EXPORT_TYPES = ['debts', 'portfolios', 'transactions', 'net_worth'];

type Row = Record<string, unknown>;

type DebtRow = {
  name: string; category: string | null; amount: number; currency_code: string;
  interest_rate: number | null; emi_amount: number | null; status: string | null;
  paid_amount: number | null; started_at: string | null; due_date: string | null;
};
type PortfolioRow = { id: string; name: string; goal: string | null; currency_code: string };
type InvestmentRow = { symbol: string | null; shares: number | null; current_price: number | null };
type TransactionRow = {
  transaction_date: string; description: string; amount: number; currency_code: string;
  transaction_type: string | null; category: string | null; merchant: string | null;
  notes: string | null; recurring: number | null;
};
type SnapshotRow = {
  snapshot_date: string; total_assets: number | null; total_liabilities: number | null;
  net_worth: number | null; currency_code: string;
};

/** Ruby BigDecimal#to_s keeps ".0" on whole numbers (used in the investments
 *  summary string inside the portfolio export). */
function decimalStr(v: number): string {
  return Number.isInteger(v) ? `${v}.0` : String(v);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function generateCsv(rows: Row[]): string {
  if (rows.length === 0) return 'No data'; // ExportService#generate_csv
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(','));
  return `${lines.join('\n')}\n`;
}

function generateJson(rows: Row[]): string {
  return JSON.stringify(rows, null, 2);
}

async function debtsRows(c: AppContext, userId: string): Promise<Row[]> {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(userId).all<DebtRow>();
  return rows.results.map((d) => ({
    name: d.name,
    category: d.category,
    amount: num(d.amount),
    currency: d.currency_code,
    interest_rate: d.interest_rate === null ? null : Number(d.interest_rate),
    emi_amount: num(d.emi_amount),
    status: d.status,
    paid_amount: num(d.paid_amount),
    // Debt#remaining_amount is NOT clamped (unlike the debts API projection).
    remaining: num(d.amount) - num(d.paid_amount),
    started_at: d.started_at,
    due_date: d.due_date,
  }));
}

async function portfoliosRows(c: AppContext, userId: string): Promise<Row[]> {
  const portfolios = await c.env.DB.prepare(
    'SELECT id, name, goal, currency_code FROM portfolios WHERE user_id = ? ORDER BY rowid',
  ).bind(userId).all<PortfolioRow>();
  const out: Row[] = [];
  for (const p of portfolios.results) {
    const invs = await c.env.DB.prepare(
      'SELECT symbol, shares, current_price FROM investments WHERE portfolio_id = ? ORDER BY rowid',
    ).bind(p.id).all<InvestmentRow>();
    // Portfolio#total_value is computed from holdings, not the stored column.
    const totalValue = invs.results.reduce(
      (sum, i) => sum + num(i.shares) * num(i.current_price), 0,
    );
    out.push({
      portfolio: p.name,
      goal: p.goal,
      total_value: totalValue,
      currency: p.currency_code,
      investments: invs.results.map((i) =>
        `${i.symbol ?? ''} (${i.shares === null ? '' : decimalStr(num(i.shares))} shares @ ${i.current_price === null ? '' : decimalStr(num(i.current_price))})`,
      ).join('; '),
    });
  }
  return out;
}

async function transactionsRows(
  c: AppContext, userId: string, start_date: string | null, end_date: string | null,
): Promise<Row[]> {
  const clauses = ['t.user_id = ?'];
  const params: unknown[] = [userId];
  if (start_date) { clauses.push('t.transaction_date >= ?'); params.push(start_date); }
  if (end_date) { clauses.push('t.transaction_date <= ?'); params.push(end_date); }
  const rows = await c.env.DB.prepare(
    `SELECT t.transaction_date, t.description, t.amount, t.currency_code, t.transaction_type,
            bc.name AS category, t.merchant, t.notes, t.recurring
     FROM transactions t
     LEFT JOIN budget_categories bc ON bc.id = t.budget_category_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY t.transaction_date DESC`,
  ).bind(...params).all<TransactionRow>();
  return rows.results.map((t) => ({
    date: t.transaction_date,
    description: t.description,
    amount: num(t.amount),
    currency: t.currency_code,
    type: t.transaction_type,
    category: t.category, // BudgetCategory#name via the belongs_to association
    merchant: t.merchant,
    notes: t.notes,
    recurring: t.recurring === null ? null : boolFlag(t.recurring),
  }));
}

async function netWorthRows(c: AppContext, userId: string): Promise<Row[]> {
  // NetWorthSnapshot.ordered = snapshot_date ASC.
  const rows = await c.env.DB.prepare(
    'SELECT * FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date ASC',
  ).bind(userId).all<SnapshotRow>();
  return rows.results.map((s) => ({
    date: s.snapshot_date,
    total_assets: num(s.total_assets),
    total_liabilities: num(s.total_liabilities),
    net_worth: num(s.net_worth),
    currency: s.currency_code,
  }));
}

router.get('/', (c) => success(c, { formats: FORMATS, types: EXPORT_TYPES }));

router.get('/:type', async (c) => {
  const type = c.req.param('type');
  if (!(EXPORT_TYPES as readonly string[]).includes(type)) return notFound(c);
  // Rails: params[:format] || 'csv', with unknown values falling back to csv.
  const requested = c.req.query('format') ?? 'csv';
  const format = requested === 'json' ? 'json' : 'csv';
  const userId = c.get('user').id;

  let rows: Row[];
  switch (type) {
    case 'debts': rows = await debtsRows(c, userId); break;
    case 'portfolios': rows = await portfoliosRows(c, userId); break;
    case 'transactions':
      rows = await transactionsRows(c, userId, c.req.query('start_date') ?? null, c.req.query('end_date') ?? null);
      break;
    default: rows = await netWorthRows(c, userId);
  }

  const body = format === 'csv' ? generateCsv(rows) : generateJson(rows);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}_${todayIso()}.${format}"`,
    },
  });
});

export default router;
