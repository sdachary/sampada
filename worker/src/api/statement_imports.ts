// Bank statement import: client parses the PDF, Worker validates, dedupes,
// queues review, then inserts only the rows the user confirms.
import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { enqueue } from '../jobs/queue';
import { error, jsonBody, nowIso, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type ParsedRow = {
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type?: string;
  category?: string;
  confidence?: number;
  merchant?: string | null;
};

const valid = (row: ParsedRow): boolean =>
  typeof row?.transaction_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date)
  && Number.isFinite(Number(row?.amount)) && Number(row.amount) !== 0
  && typeof row?.description === 'string' && row.description.trim().length > 0;

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<{
    bank?: string; file_digest?: string; file_size?: number;
    transactions?: ParsedRow[]; trust?: unknown;
  }>(c);
  if (!/^[a-f0-9]{64}$/i.test(body.file_digest || '')) return error(c, 'invalid file digest', 400);
  if (!Number.isFinite(Number(body.file_size)) || Number(body.file_size) <= 0 || Number(body.file_size) > 10 * 1024 * 1024) {
    return error(c, 'file must be under 10 MB', 400);
  }
  const rows = Array.isArray(body.transactions) ? body.transactions : [];
  if (rows.length === 0 || rows.length > 2000 || !rows.every(valid)) {
    return error(c, 'no valid transactions found in statement', 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id, status, result, error FROM statement_imports WHERE user_id = ? AND file_digest = ?',
  ).bind(user.id, body.file_digest).first<{ id: string; status: string; result: string | null; error: string | null }>();
  if (existing) return success(c, { id: existing.id, status: existing.status, result: existing.result ? JSON.parse(existing.result) : null, error: existing.error });

  const id = crypto.randomUUID();
  const now = nowIso();
  const result = JSON.stringify({ transactions: rows, trust: body.trust ?? null });
  await c.env.DB.prepare(
    `INSERT INTO statement_imports (id, user_id, status, bank, file_digest, file_size, result, created_at, updated_at)
     VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?)`,
  ).bind(id, user.id, (body.bank || 'unknown').slice(0, 80), body.file_digest, Number(body.file_size), result, now, now).run();
  await enqueue(c.env, 'import_statement', { import_id: id });
  return success(c, { id, status: 'queued' });
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(
    'SELECT id, status, result, error, confirmed_count FROM statement_imports WHERE id = ? AND user_id = ?',
  ).bind(c.req.param('id'), user.id).first<{ id: string; status: string; result: string | null; error: string | null; confirmed_count: number | null }>();
  if (!row) return error(c, 'Import not found', 404);
  return success(c, {
    id: row.id, status: row.status, confirmed_count: row.confirmed_count || 0,
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error ? JSON.parse(row.error) : null,
  });
});

router.post('/:id/confirm', async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare('SELECT id, status, result FROM statement_imports WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<{ id: string; status: string; result: string | null }>();
  if (!row) return error(c, 'Import not found', 404);
  if (row.status !== 'done') return error(c, 'Import is not ready', 409);
  const body = await jsonBody<{ selected?: number[] }>(c);
  const indices = Array.isArray(body.selected) ? body.selected : [];
  const result = row.result ? JSON.parse(row.result) as { transactions: ParsedRow[] } : { transactions: [] };
  let imported = 0;
  const now = nowIso();
  for (const i of indices) {
    const r = result.transactions[i];
    if (!r || !valid(r)) continue;
    const type = r.transaction_type === 'income' ? 'income' : 'expense';
    await c.env.DB.prepare(
      `INSERT INTO transactions (id, description, amount, transaction_type, transaction_date, currency_code, merchant, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), r.description.trim(), Number(r.amount), type, r.transaction_date, r.merchant || null, r.category || null, now, now).run();
    imported++;
  }
  await c.env.DB.prepare('UPDATE statement_imports SET confirmed_at = ?, confirmed_count = ?, updated_at = ? WHERE id = ?')
    .bind(now, imported, now, row.id).run();
  return success(c, { imported });
});

export default router;
