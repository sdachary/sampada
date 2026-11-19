// Api::TransactionsController — index, show, create, update, destroy,
// bulk_create, monthly_totals. Rails parity: order (transaction_date DESC,
// created_at DESC), param-permitted writes (absent keys never reach the
// model), ActiveRecord full_messages in model definition order, and CSV
// import error strings mirroring Kernel#BigDecimal / Date.parse failures.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { CURRENCY_CODES, castDecimal, error, jsonBody, num, nowIso, parseCsvLine, round2, success, symbolFor } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type TxnRow = {
  id: string; description: string; amount: number | null; transaction_type: string | null;
  transaction_date: string; currency_code: string | null; budget_category_id: string | null;
  merchant: string | null; notes: string | null; recurring: number | null; created_at: string;
};

// Rails `transaction_json` shape.
function transactionJson(t: TxnRow) {
  const cc = t.currency_code || 'INR';
  return {
    id: t.id,
    description: t.description,
    amount: num(t.amount),
    transaction_type: t.transaction_type,
    transaction_date: t.transaction_date,
    currency_code: cc,
    currency_symbol: symbolFor(cc),
    budget_category_id: t.budget_category_id,
    category_name: null,
    merchant: t.merchant,
    notes: t.notes,
    recurring: Boolean(t.recurring),
    created_at: t.created_at,
  };
}

// ActiveRecord date cast: unparseable strings cast to nil → presence error.
function castDate(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.trim() === '' || Number.isNaN(Date.parse(s)) ? null : s;
}

/** Transaction model validations, in definition order:
 *  presence(description, amount, transaction_date) → numericality(amount
 *  other_than 0) → inclusion(transaction_type) → inclusion(currency_code,
 *  allow_nil). Returns full_messages. */
function validateTxn(v: {
  description: string | null; amount: number | null; transaction_date: string | null;
  transaction_type: string | null; currency_code: string | null;
}): string[] {
  const errs: string[] = [];
  if (v.description === null || v.description.trim() === '') errs.push("Description can't be blank");
  if (v.amount === null) errs.push("Amount can't be blank");
  if (v.transaction_date === null || v.transaction_date.trim() === '') errs.push("Transaction date can't be blank");
  if (v.amount !== null && v.amount === 0) errs.push('Amount must be other than 0');
  if (v.transaction_type === null || !['expense', 'income', 'transfer'].includes(v.transaction_type)) {
    errs.push('Transaction type is not included in the list');
  }
  if (v.currency_code !== null && !CURRENCY_CODES.includes(v.currency_code)) {
    errs.push('Currency code is not included in the list');
  }
  return errs;
}

router.get('/', async (c) => {
  const user = c.get('user');
  const page = Math.max(1, Number.parseInt(c.req.query('page') || '1', 10) || 1);
  const per = Math.max(1, Number.parseInt(c.req.query('per') || '50', 10) || 50);

  const filters: string[] = ['user_id = ?'];
  const params: unknown[] = [user.id];

  // Rails: params[:budget_category_id], [:transaction_type] only when present.
  const budgetCategoryId = c.req.query('budget_category_id');
  if (budgetCategoryId) { filters.push('budget_category_id = ?'); params.push(budgetCategoryId); }
  const transactionType = c.req.query('transaction_type');
  if (transactionType) { filters.push('transaction_type = ?'); params.push(transactionType); }
  const startDate = c.req.query('start_date');
  if (startDate) { filters.push('transaction_date >= ?'); params.push(startDate); }
  const endDate = c.req.query('end_date');
  if (endDate) { filters.push('transaction_date <= ?'); params.push(endDate); }
  if (c.req.query('uncategorized')) { filters.push('budget_category_id IS NULL'); }

  const where = `WHERE ${filters.join(' AND ')}`;
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM transactions ${where}`)
    .bind(...params).first<{ n: number | null }>();

  const offset = (page - 1) * per;
  // Rails: order(transaction_date: :desc) with NO tiebreak (no default_scope)
  // — ties come back in arbitrary PG order. created_at DESC is the
  // deterministic stand-in for the same set of rows.
  const rows = await c.env.DB.prepare(
    `SELECT * FROM transactions ${where}
     ORDER BY transaction_date IS NULL DESC, transaction_date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(...params, per, offset).all<TxnRow>();

  return success(c, {
    transactions: rows.results.map(transactionJson),
    pagination: { total: num(total?.n), page, per },
  });
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const t = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<TxnRow>();
  if (!t) return error(c, 'Record not found', 404);
  return success(c, transactionJson(t));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  // Rails: params[:transaction].presence || params — permit applies to either.
  const source = (body.transaction as Record<string, unknown> | undefined) ?? body;
  // Attribute defaults (PG schema): currency_code 'INR', transaction_type
  // 'expense'. Explicit null overrides the default and fails validation.
  const candidate = {
    description: source.description != null ? String(source.description) : null,
    amount: castDecimal(source.amount),
    transaction_date: castDate(source.transaction_date),
    transaction_type: source.transaction_type !== undefined
      ? (source.transaction_type == null ? null : String(source.transaction_type)) : 'expense',
    currency_code: source.currency_code !== undefined
      ? (source.currency_code == null ? null : String(source.currency_code)) : 'INR',
  };
  const errs = validateTxn(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  const recurring = source.recurring !== undefined
    ? (source.recurring === true || source.recurring === 'true' || source.recurring === 1) : false;
  try {
    await c.env.DB.prepare(
      `INSERT INTO transactions (id, description, amount, transaction_type, transaction_date,
        currency_code, budget_category_id, merchant, notes, recurring, recurring_frequency,
        household_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, candidate.description!, candidate.amount!, candidate.transaction_type!,
      candidate.transaction_date!, candidate.currency_code!,
      source.budget_category_id ? String(source.budget_category_id) : null,
      source.merchant ? String(source.merchant) : null,
      source.notes ? String(source.notes) : null,
      recurring ? 1 : 0,
      source.recurring_frequency ? String(source.recurring_frequency) : null,
      source.household_id ? String(source.household_id) : null,
      now, now,
    ).run();
  } catch (e) {
    // NOT NULL / FK violations only — shape validations ran above.
    return error(c, 'Validation failed', 422, [(e as Error).message]);
  }

  const t = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id)
    .first<TxnRow>();
  return c.json(transactionJson(t!), 201);
});

// PUT/PATCH → update. Rails: permitted keys overwrite, absent keys keep the
// stored values; validations run on the MERGED record before saving.
async function updateTransaction(c: Ctx) {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<TxnRow>();
  if (!existing) return error(c, 'Record not found', 404);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.transaction as Record<string, unknown> | undefined) ?? body;

  const has = (k: string) => source[k] !== undefined;
  const candidate = {
    description: has('description')
      ? (source.description == null ? null : String(source.description)) : existing.description,
    amount: has('amount') ? castDecimal(source.amount) : (existing.amount === null ? null : Number(existing.amount)),
    transaction_date: has('transaction_date')
      ? castDate(source.transaction_date) : existing.transaction_date,
    transaction_type: has('transaction_type')
      ? (source.transaction_type == null ? null : String(source.transaction_type)) : existing.transaction_type,
    currency_code: has('currency_code')
      ? (source.currency_code == null ? null : String(source.currency_code)) : existing.currency_code,
  };
  const errs = validateTxn(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (has('description')) { sets.push('description = ?'); values.push(candidate.description!); }
  if (has('amount')) { sets.push('amount = ?'); values.push(candidate.amount!); }
  if (has('transaction_date')) { sets.push('transaction_date = ?'); values.push(candidate.transaction_date!); }
  if (has('transaction_type')) { sets.push('transaction_type = ?'); values.push(candidate.transaction_type!); }
  if (has('currency_code')) { sets.push('currency_code = ?'); values.push(candidate.currency_code!); }
  if (has('budget_category_id')) {
    sets.push('budget_category_id = ?');
    values.push(source.budget_category_id ? String(source.budget_category_id) : null);
  }
  if (has('merchant')) { sets.push('merchant = ?'); values.push(source.merchant ? String(source.merchant) : null); }
  if (has('notes')) { sets.push('notes = ?'); values.push(source.notes ? String(source.notes) : null); }
  if (has('recurring')) { sets.push('recurring = ?'); values.push(castBooleanLike(source.recurring) ? 1 : 0); }
  if (has('recurring_frequency')) {
    sets.push('recurring_frequency = ?');
    values.push(source.recurring_frequency ? String(source.recurring_frequency) : null);
  }
  if (has('household_id')) {
    sets.push('household_id = ?');
    values.push(source.household_id ? String(source.household_id) : null);
  }
  // No permitted keys → Rails update! issues no UPDATE (updated_at untouched).
  if (sets.length === 0) return success(c, transactionJson(existing));

  sets.push('updated_at = ?');
  values.push(nowIso());
  await c.env.DB.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();

  const t = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id)
    .first<TxnRow>();
  return success(c, transactionJson(t!));
}

function castBooleanLike(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

// PATCH and PUT both map to update in Rails.
router.put('/:id', updateTransaction);
router.patch('/:id', updateTransaction);

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return error(c, 'Record not found', 404);
  return c.body(null, 204);
});

// ---- bulk_create (CSV import) ----

// POST /transactions/bulk_create — CSV import. Rails accepts
// params[:transactions_csv] || params[:csv] (JSON, not multipart); the SPA
// reads the file client-side and posts { transactions_csv: text }.
router.post('/bulk_create', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const csvText = body.transactions_csv ?? body.csv;
  // ParameterMissing → 400; Rails renders its default error page, so the SPA
  // falls back to statusText either way.
  if (csvText === undefined || csvText === null || csvText === '') {
    return error(c, 'csv required', 400);
  }

  const cats = await c.env.DB.prepare('SELECT id, name FROM budget_categories WHERE user_id = ?')
    .bind(user.id).all<{ id: string; name: string }>();
  // index_by { |c| c.name.downcase } — name collisions: Rails keeps the LAST.
  const catMap = new Map(cats.results.map((r) => [r.name.toLowerCase(), r.id]));

  const lines = String(csvText).split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? '');
  const col = (name: string) => headers.indexOf(name);
  const cell = (cells: string[], name: string): string | null =>
    col(name) === -1 ? null : cells[col(name)] ?? null;

  let imported = 0;
  const errors: Array<{ row: number; error: string }> = [];
  let dataIdx = 0; // CSV.parse(headers: true) numbers DATA rows from 0; empty lines are skipped.

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') continue;
    const row = dataIdx;
    dataIdx++;
    const cells = parseCsvLine(lines[i]);
    try {
      // Keyword args evaluate in order: date first, then description, amount.
      const dateCell = cell(cells, 'date');
      if (dateCell === null) throw new Error('no date information');
      const ts = Date.parse(dateCell);
      if (Number.isNaN(ts)) throw new Error('invalid date');
      const date = new Date(ts).toISOString().slice(0, 10);

      const descCell = cell(cells, 'description');
      const desc = descCell && descCell.trim() !== '' ? descCell : `Imported ${row + 1}`;

      const amtCell = cell(cells, 'amount');
      if (amtCell === null) throw new Error("can't convert nil into BigDecimal");
      const amount = Number(amtCell);
      if (amtCell.trim() === '' || !Number.isFinite(amount)) {
        throw new Error(`invalid value for BigDecimal(): "${amtCell}"`);
      }

      // (row['type'] || 'expense').downcase — Ruby ||: nil falls back, '' does
      // not (then the inclusion rescue maps any other value to 'income').
      const typeCell = cell(cells, 'type');
      const t0 = typeCell === null ? 'expense' : typeCell.toLowerCase();
      const type = t0 === 'income' || t0 === 'expense' ? t0 : 'income';

      const catCell = cell(cells, 'category');
      const catId = catMap.get((catCell ?? '').toLowerCase()) ?? null;

      const curCell = cell(cells, 'currency');
      const cc = curCell && curCell.trim() !== '' ? curCell : 'INR';
      // Model validation on the imported currency — RecordInvalid message form.
      if (!CURRENCY_CODES.includes(cc)) {
        throw new Error('Currency code is not included in the list');
      }
      if (amount === 0) {
        throw new Error('Amount must be other than 0');
      }

      const merchantCell = cell(cells, 'merchant');
      const notesCell = cell(cells, 'notes');
      const recCell = cell(cells, 'recurring');
      const recurring = ['true', 'yes', '1'].includes((recCell ?? '').toLowerCase());

      const now = nowIso();
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO transactions (id, description, amount, transaction_type, transaction_date,
          currency_code, budget_category_id, merchant, notes, recurring, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, desc, amount, type, date, cc, catId,
        merchantCell && merchantCell.trim() !== '' ? merchantCell : null,
        notesCell && notesCell.trim() !== '' ? notesCell : null,
        recurring ? 1 : 0, now, now,
      ).run();
      imported++;
    } catch (e) {
      errors.push({ row: row + 2, error: (e as Error).message });
    }
  }

  return success(c, { imported, errors });
});

// GET /transactions/monthly_totals — last N months, NEWEST first (Rails builds
// (0...months).map over today - i.months). Ruby to_i: absent/'6'→6, garbage,
// 0 and negatives yield an empty array. render_success of an ARRAY → raw body.
router.get('/monthly_totals', async (c) => {
  const user = c.get('user');
  const monthsRaw = c.req.query('months');
  // (params[:months] || 6).to_i — only a truly absent param falls back to 6.
  const months = monthsRaw === undefined || monthsRaw === null ? 6 : rubyToI(monthsRaw);
  const result: Array<{ month: string; label: string; expenses: number; income: number; net: number }> = [];
  if (months > 0) {
    const today = new Date();
    // (months - 1).months.ago.beginning_of_month — the window's first day.
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1));
    const startIso = start.toISOString().slice(0, 10);
    const grouped = new Map<string, { expenses: number; income: number }>();
    const rows = await c.env.DB.prepare(
      `SELECT substr(transaction_date, 1, 7) AS m,
              SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS expenses,
              SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) AS income
       FROM transactions WHERE user_id = ? AND transaction_date >= ?
       GROUP BY substr(transaction_date, 1, 7)`,
    ).bind(user.id, startIso).all<{ m: string; expenses: number | null; income: number | null }>();
    for (const r of rows.results) {
      grouped.set(r.m, { expenses: num(r.expenses), income: num(r.income) });
    }
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      const g = grouped.get(key);
      const expenses = g?.expenses ?? 0;
      const income = g?.income ?? 0;
      result.push({ month: key, label, expenses, income, net: round2(income - expenses) });
    }
  }
  return c.json(result);
});

// Ruby String#to_i: leading integer prefix, everything else → 0.
function rubyToI(s: string): number {
  const m = /^\s*[-+]?\d+/.exec(s);
  return m ? parseInt(m[0], 10) : 0;
}

export default router;
