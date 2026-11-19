// Api::DpdpController — consent, erasure, cancellation, full export, grievances.
// Rails parity: consent is append-only (a withdrawal closes the open grants then
// writes a revocation row), status comes from the `active` scope, the 48h cancel
// window is scheduled_for (the existing CheckDeletions/process_deletion jobs do
// the anonymization after it), and full_export keeps the hand-built hash shape.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { sha256Hex } from '../session';
import { boolFlag, error, jsonBody, nowIso } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

const FEATURES = ['financial_tracking', 'trip_data', 'email_updates', 'marketing'];
const GRIEVANCE_TYPES = ['access', 'correction', 'erasure', 'consent', 'breach', 'marketing', 'other'];
const CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

type Row = Record<string, unknown>;
type IdRow = { id: string } & Row;

const present = (v: unknown): string | null =>
  v == null || String(v).trim() === '' ? null : String(v);

// ---- consent ---------------------------------------------------------------

router.get('/consent', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT feature FROM consent_records WHERE user_id = ? AND granted = 1 AND revoked_at IS NULL',
  ).bind(c.get('user').id).all<{ feature: string }>();
  const granted = new Set(rows.results.map((r) => r.feature));
  const status: Record<string, boolean> = {};
  for (const feature of FEATURES) status[feature] = granted.has(feature);
  return c.json({ consent: status });
});

router.post('/consent', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const feature = body.feature == null ? null : String(body.feature);
  const raw = body.granted;
  const errs: string[] = [];
  if (feature === null || !FEATURES.includes(feature)) errs.push('Feature is not included in the list');
  if (raw !== true && raw !== false && raw !== 1 && raw !== 0) errs.push('Granted is not included in the list');
  if (errs.length) return error(c, 'Validation failed', 422, errs);
  const granted = raw === true || raw === 1;

  const now = nowIso();
  // Withdrawal has to actually take effect: close open grants so the `active`
  // scope stops reporting the feature, while keeping the audit history.
  if (!granted) {
    await c.env.DB.prepare(
      'UPDATE consent_records SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND feature = ? AND granted = 1 AND revoked_at IS NULL',
    ).bind(now, now, user.id, feature).run();
  }
  const ipAddress = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = c.req.header('User-Agent') ?? null;
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO consent_records (id, user_id, feature, granted, granted_at, ip_address, user_agent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, user.id, feature, granted ? 1 : 0, now, ipAddress, userAgent, now, now).run();
  return c.json({
    success: true,
    consent: {
      id, created_at: now, feature, granted, granted_at: now,
      ip_address: ipAddress, revoked_at: null, updated_at: now,
      user_agent: userAgent, user_id: user.id,
    },
  });
});

// ---- erasure / cancellation ------------------------------------------------

router.post('/erasure', async (c) => {
  const userId = c.get('user').id;
  const pending = await c.env.DB.prepare("SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending'")
    .bind(userId).first<{ id: string }>();
  if (pending) return c.json({ error: 'A deletion request is already pending' }, 409);

  const body = await jsonBody<Record<string, unknown>>(c);
  // params.fetch(:export_data, true): a present nil stays nil, a missing key defaults true.
  const exportData = body.export_data === undefined ? 1 : (body.export_data === null ? null : (boolFlag(body.export_data) ? 1 : 0));
  const notes = body.notes == null ? null : String(body.notes);
  const token = crypto.randomUUID();
  const now = nowIso();
  const scheduledFor = new Date(Date.now() + CANCEL_WINDOW_MS).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO deletion_requests (id, user_id, cancel_token, export_data, notes, scheduled_for, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(crypto.randomUUID(), userId, await sha256Hex(token), exportData, notes, scheduledFor, now, now).run();
  return c.json({
    success: true,
    message: 'Deletion request submitted. You have 48 hours to cancel.',
    cancel_token: token,
    scheduled_for: scheduledFor,
  });
});

router.get('/deletion-requests', async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, status, cancel_token, scheduled_for, created_at FROM deletion_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC",
  ).bind(c.get('user').id).all<{
    id: string; status: string; cancel_token: string; scheduled_for: string; created_at: string;
  }>();
  return c.json({ deletion_requests: rows.results });
});

router.post('/cancel-deletion', async (c) => {
  const body = await jsonBody<Record<string, unknown>>(c);
  const token = present(body.cancel_token) ?? '';
  // Only the hash is stored; the listing returns that hash so a reload can
  // still cancel, so accept both the raw token and the stored hash here.
  const hash = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    "SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending' AND (cancel_token = ? OR cancel_token = ?)",
  ).bind(c.get('user').id, hash, token).first<{ id: string }>();
  // Single-use: status is flipped, so a second attempt no longer matches.
  if (!row) return error(c, 'Record not found', 404);
  await c.env.DB.prepare("UPDATE deletion_requests SET status = 'cancelled', updated_at = ? WHERE id = ?")
    .bind(nowIso(), row.id).run();
  return c.json({ success: true, message: 'Deletion request cancelled.' });
});

// ---- full export -----------------------------------------------------------

router.post('/full-export', async (c) => {
  const db = c.env.DB;
  const userId = c.get('user').id;
  const all = (sql: string) => db.prepare(sql).bind(userId).all<Row>().then((r) => r.results);

  const user = await db.prepare(
    'SELECT id, email, first_name, last_name, currency, locale, timezone, onboarded, created_at, updated_at FROM users WHERE id = ?',
  ).bind(userId).first<Row>();
  const consentRows = await all('SELECT feature, granted, granted_at, revoked_at FROM consent_records WHERE user_id = ? ORDER BY created_at DESC');
  const deletionRows = await all('SELECT status, scheduled_for, created_at FROM deletion_requests WHERE user_id = ? ORDER BY created_at DESC');
  const debtRows = await all('SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC');
  const portfolioRows = await all('SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC');
  for (const p of portfolioRows) {
    const invs = await db.prepare('SELECT * FROM investments WHERE portfolio_id = ? ORDER BY rowid')
      .bind(p.id).all<Row>();
    p.investments = invs.results;
  }
  const journeyRows = await all('SELECT * FROM journeys WHERE user_id = ? ORDER BY created_at DESC');
  const snapshotRows = await all('SELECT * FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC');
  const recurringRows = await all('SELECT * FROM recurring_expenses WHERE user_id = ? ORDER BY created_at DESC');
  const transactionRows = await all('SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC');
  const budgetRows = await all('SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC');
  const tripRows = await all('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC');
  const convRows = await all('SELECT id, title FROM conversations WHERE user_id = ? ORDER BY created_at DESC');
  const conversations: Row[] = [];
  for (const conv of convRows) {
    const msgs = await db.prepare(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    ).bind(conv.id).all<Row>();
    conversations.push({ id: conv.id, title: conv.title, messages: msgs.results });
  }
  const grievanceRows = await all('SELECT * FROM grievances WHERE user_id = ? ORDER BY created_at DESC');

  // Rails serializes booleans as true/false; D1 keeps them as 0/1 integers.
  const bool = (v: unknown) => v === null || v === undefined ? null : v === 1;
  for (const row of recurringRows) {
    if ('active' in row) row.active = bool(row.active);
    if ('auto_debit' in row) row.auto_debit = bool(row.auto_debit);
  }
  for (const row of transactionRows) {
    if ('recurring' in row) row.recurring = bool(row.recurring);
  }

  return c.json({
    exported_at: nowIso(),
    user: {
      id: user?.id ?? userId,
      email: user?.email ?? null,
      first_name: user?.first_name ?? null,
      last_name: user?.last_name ?? null,
      currency: user?.currency ?? null,
      locale: user?.locale ?? null,
      timezone: user?.timezone ?? null,
      onboarded: bool(user?.onboarded),
      created_at: user?.created_at ?? null,
      updated_at: user?.updated_at ?? null,
    },
    consent_records: consentRows.map((r) => ({
      feature: r.feature, granted: bool(r.granted), granted_at: r.granted_at, revoked_at: r.revoked_at,
    })),
    deletion_requests: deletionRows,
    debts: debtRows,
    portfolios: portfolioRows,
    journeys: journeyRows,
    net_worth_snapshots: snapshotRows,
    recurring_expenses: recurringRows,
    transactions: transactionRows,
    budgets: budgetRows,
    trips: tripRows,
    conversations,
    grievances: grievanceRows,
  });
});

// ---- grievance -------------------------------------------------------------

router.post('/grievance', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const grievanceType = present(body.grievance_type) ?? '';
  const description = present(body.description) ?? '';
  const errs: string[] = [];
  if (!grievanceType) errs.push("Grievance type can't be blank");
  else if (!GRIEVANCE_TYPES.includes(grievanceType)) errs.push('Grievance type is not included in the list');
  if (!description) errs.push("Description can't be blank");
  if (errs.length) return c.json({ error: `Validation failed: ${errs.join(', ')}` }, 422);

  const accountName = [user.firstName, user.lastName].filter((s) => !!s && s.trim() !== '').join(' ').trim();
  const name = present(body.name) ?? accountName ?? user.email;
  const email = present(body.email) ?? user.email;
  const phone = present(body.phone);
  const now = nowIso();
  // GRF-<YYYYMM>-<8 uppercase hex> (SecureRandom.hex(4).upcase in Rails).
  const referenceNumber = `GRF-${now.slice(0, 7).replace('-', '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  await c.env.DB.prepare(
    `INSERT INTO grievances (id, user_id, name, email, phone, grievance_type, description,
       acknowledged_at, reference_number, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`,
  ).bind(
    crypto.randomUUID(), user.id, name, email, phone, grievanceType, description,
    now, referenceNumber, now, now,
  ).run();
  return c.json({
    success: true,
    reference_number: referenceNumber,
    status: 'received',
    expected_response: '72 hours',
    expected_resolution: '90 days',
    message: 'Grievance received. We will respond within 72 hours.',
  });
});

export default router;
