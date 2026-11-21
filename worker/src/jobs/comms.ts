// Comms + lifecycle queue jobs: expense/EMI reminders, push delivery, DPDP
// deletion processing, statement-import finalization and AI replies. Ported
// from the matching Sidekiq/ActiveJob jobs; the cron/queue split matches the
// A3 design (crons arm work, D1 job_queue runs it).

import type { Bindings } from '../index';
import { sendEmail } from '../email';
import { sendWebPush } from '../push';
import { enqueue } from './queue';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---- date helpers (UTC; Rails treated dates as UTC too) ----

function isoOf(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Rails Date#next_month: Jan 31 + 1mo = Feb 28, not Mar 2. */
function addMonthsClamped(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return isoOf(ny, nm + 1, Math.min(d, lastDay));
}

/** RecurringExpense.next_due_after: daily/weekly/monthly/quarterly/yearly. */
export function advanceDueDate(iso: string, frequency: string): string {
  switch (frequency) {
    case 'daily': return addDays(iso, 1);
    case 'weekly': return addDays(iso, 7);
    case 'monthly': return addMonthsClamped(iso, 1);
    case 'quarterly': return addMonthsClamped(iso, 3);
    case 'yearly': return addMonthsClamped(iso, 12);
    default: return addMonthsClamped(iso, 1);
  }
}

/** Rails schedule_initial: beginning_of_day + 9.hours, UTC. */
export function dueMorning(dueISO: string): Date {
  return new Date(`${dueISO.slice(0, 10)}T09:00:00.000Z`);
}

// ---- notification primitives (NotificationService parity: mail + in-app + push) ----

async function userEmail(env: Bindings, userId: string): Promise<string> {
  const row = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  return row?.email ?? '';
}

async function createInApp(env: Bindings, userId: string, type: string, message: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO notifications (id, created_at, message, notification_type, read, updated_at, user_id) VALUES (?, ?, ?, ?, NULL, ?, ?)',
    )
      .bind(crypto.randomUUID(), now, message, type, now, userId)
      .run();
  } catch (error) {
    console.error(JSON.stringify({ notify: 'in-app failed', error: String(error) }));
  }
}

async function enqueuePush(env: Bindings, userId: string, title: string, body: string, url: string): Promise<void> {
  try {
    const subs = await env.DB.prepare('SELECT id FROM push_subscriptions WHERE user_id = ?')
      .bind(userId)
      .all<{ id: string }>();
    for (const sub of subs.results) {
      await enqueue(env, 'push_notification_delivery', {
        subscription_id: sub.id,
        payload: JSON.stringify({ title, body, url }),
      });
    }
  } catch (error) {
    console.error(JSON.stringify({ notify: 'push enqueue failed', error: String(error) }));
  }
}

/** NotificationService#notify_sip_reminder */
export async function notifySipReminder(env: Bindings, userId: string, email: string, name: string): Promise<void> {
  await Promise.all([
    email ? sendEmail(env, { to: email, subject: 'SIP Reminder', text: `SIP due: ${name}` }) : Promise.resolve(),
    createInApp(env, userId, 'sip_reminder', `SIP due: ${name}`),
    enqueuePush(env, userId, 'SIP Reminder', `${name} is due`, '/recurring'),
  ]);
}

/** NotificationService#notify_debt_milestone */
export async function notifyDebtMilestone(
  env: Bindings,
  userId: string,
  email: string,
  debtName: string,
  milestone: string,
): Promise<void> {
  const message = `${milestone} for ${debtName}`;
  await Promise.all([
    email ? sendEmail(env, { to: email, subject: milestone, text: message }) : Promise.resolve(),
    createInApp(env, userId, 'debt_milestone', message),
    enqueuePush(env, userId, milestone, debtName, '/debts'),
  ]);
}

// ---- cron: expense_reminder_check ----

/** ExpenseReminderCheckJob: active recurring expenses due within 3 days.
 *  Rails re-enqueued on every sweep and self-scheduled a month out (so
 *  notifications landed late and duplicated); here each due expense gets
 *  exactly one pending job, armed for its due morning — schedule_initial
 *  semantics — and re-enqueueing is suppressed while a job is pending. */
export async function expenseReminderCheck(env: Bindings, now: Date = new Date()): Promise<void> {
  const today = now.toISOString().slice(0, 10);
  const until = addDays(today, 3);
  const due = await env.DB.prepare(
    `SELECT id, next_due_date FROM recurring_expenses
     WHERE active = 1 AND next_due_date IS NOT NULL AND next_due_date BETWEEN ? AND ?`,
  )
    .bind(today, until)
    .all<{ id: string; next_due_date: string }>();

  for (const expense of due.results) {
    const pending = await env.DB.prepare(
      `SELECT id FROM job_queue WHERE type = 'expense_reminder'
       AND processed_at IS NULL AND payload LIKE ?`,
    )
      .bind(`%"expense_id":"${expense.id}"%`)
      .first();
    if (pending) continue;
    await enqueue(env, 'expense_reminder', { type: 'recurring_expense', expense_id: expense.id }, {
      runAt: dueMorning(expense.next_due_date),
    });
  }

  // Debts store a due_date string. Only ISO dates can be armed reliably;
  // legacy day-of-month values are deliberately skipped.
  const debts = await env.DB.prepare(
    `SELECT id, due_date FROM debts
     WHERE status = 'active' AND due_date IS NOT NULL AND due_date BETWEEN ? AND ?`,
  ).bind(today, until).all<{ id: string; due_date: string }>();
  for (const debt of debts.results) {
    const pending = await env.DB.prepare(
      `SELECT id FROM job_queue WHERE type = 'expense_reminder'
       AND processed_at IS NULL AND payload LIKE ?`,
    ).bind(`%"debt_id":"${debt.id}"%`).first();
    if (pending) continue;
    await enqueue(env, 'expense_reminder', { type: 'debt', debt_id: debt.id }, {
      runAt: dueMorning(debt.due_date),
    });
  }
}

// ---- queued: expense_reminder ----

/** ExpenseReminderJob ('recurring_expense' | 'debt'). On the due morning it
 *  notifies and — for auto-debit expenses — logs the transaction and advances
 *  next_due_date by the frequency map, then arms the next period. */
export async function expenseReminder(env: Bindings, payload: unknown): Promise<void> {
  const { type, expense_id: expenseId, debt_id: debtId } = (payload ?? {}) as {
    type?: string;
    expense_id?: string;
    debt_id?: string;
  };

  if (type === 'debt') {
    const id = debtId ?? expenseId;
    if (!id) return;
    const debt = await env.DB.prepare("SELECT user_id, name FROM debts WHERE id = ? AND status = 'active'")
      .bind(id)
      .first<{ user_id: string; name: string }>();
    if (!debt) return;
    await notifyDebtMilestone(env, debt.user_id, await userEmail(env, debt.user_id), debt.name, 'EMI Reminder');
    await enqueue(env, 'expense_reminder', { type: 'debt', debt_id: id }, {
      runAt: new Date(Date.now() + 30 * DAY_MS), // Rails set(wait: 1.month)
    });
    return;
  }

  if (!expenseId) return;
  const expense = await env.DB.prepare(
    `SELECT id, user_id, name, amount, currency_code, frequency, household_id,
            next_due_date, auto_debit
     FROM recurring_expenses WHERE id = ? AND active = 1`,
  )
    .bind(expenseId)
    .first<{
      id: string;
      user_id: string;
      name: string;
      amount: number;
      currency_code: string;
      frequency: string;
      household_id: string | null;
      next_due_date: string | null;
      auto_debit: number;
    }>();
  if (!expense) return;

  await notifySipReminder(env, expense.user_id, await userEmail(env, expense.user_id), expense.name);

  const due = expense.next_due_date?.slice(0, 10);
  if (!due) return;
  const today = new Date().toISOString().slice(0, 10);
  if (due > today) return; // early reminder — the due-morning run does the rest

  let nextDue = due;
  if (expense.auto_debit) {
    const logged = await insertDueTransaction(env, expense, due);
    if (logged) nextDue = advanceDueDate(due, expense.frequency);
    // duplicate insert (tx already logged for this date) → leave next_due_date
    // untouched, matching the Rails RecordNotUnique rollback
  } else {
    // Rails only advanced for auto-debit expenses, leaving non-auto-debit
    // reminders a period late forever; the worker advances so every period
    // is reminded on its own due date
    nextDue = advanceDueDate(due, expense.frequency);
  }

  if (nextDue !== due) {
    await env.DB.prepare('UPDATE recurring_expenses SET next_due_date = ?, updated_at = ? WHERE id = ?')
      .bind(nextDue, new Date().toISOString(), expense.id)
      .run();
    await enqueue(env, 'expense_reminder', { type: 'recurring_expense', expense_id: expense.id }, {
      runAt: dueMorning(nextDue),
    });
  }
}

/** RecurringExpense#log_due_transaction! — the (recurring_expense_id,
 *  transaction_date) unique index plays the RecordNotUnique rescue. */
async function insertDueTransaction(
  env: Bindings,
  expense: { id: string; user_id: string; name: string; amount: number; currency_code: string; frequency: string; household_id: string | null },
  due: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO transactions
         (id, amount, created_at, currency_code, description, household_id, recurring,
          recurring_frequency, recurring_expense_id, transaction_date, transaction_type, updated_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'expense', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        expense.amount,
        nowIso,
        expense.currency_code,
        expense.name,
        expense.household_id,
        expense.frequency,
        expense.id,
        due,
        nowIso,
        expense.user_id,
      )
      .run();
    return true;
  } catch {
    return false;
  }
}

// ---- queued: push_notification_delivery ----

/** PushNotificationDeliveryJob: deliver or destroy. Expired/unauthorized
 *  subscriptions are deleted like Rails did; other failures are logged and
 *  dropped (Rails never retried these either). */
export async function pushNotificationDelivery(env: Bindings, payload: unknown): Promise<void> {
  const { subscription_id: id, payload: payloadJson } = (payload ?? {}) as { subscription_id?: string; payload?: string };
  if (!id) return;
  const sub = await env.DB.prepare('SELECT endpoint, p256dh, auth, expires_at FROM push_subscriptions WHERE id = ?')
    .bind(id)
    .first<{ endpoint: string; p256dh: string; auth: string; expires_at: string | null }>();
  if (!sub) return;

  if (sub.expires_at && new Date(sub.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(id).run();
    return;
  }

  const result = await sendWebPush(env, sub, payloadJson ?? '{}');
  if (result === 'expired') {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(id).run();
  }
}

// ---- queued: process_deletion ----

/**
 * DPDP erasure (retention gap 1). Anonymizing the `users` row alone left every
 * financial record, passkey and session keyed to the stable users.id. This
 * plan hard-deletes those rows, then leaves an anonymized tombstone plus the
 * legal-hold tables that still reference it (wiki/ops/sampada-retention.md).
 *
 * `users`, `deletion_requests`, `consent_records` and `grievances` are kept on
 * purpose. `households` is shared between members, so it is not erased.
 * Child rows are deleted before their parents so D1's FK checks stay happy.
 */
export interface ErasureStep {
  sql: string;
  binds: Array<string | number | null>;
}

/** Child-table predicates: each ? is bound to the erasing user's id. */
const ERASURE_CHILD_STEPS: ReadonlyArray<readonly [string, string]> = [
  ['messages', 'conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)'],
  ['trip_expenses', 'trip_id IN (SELECT id FROM trips WHERE user_id = ?)'],
  // trip_settlements has no user_id column — reach it through the owned trips
  ['trip_settlements', 'trip_id IN (SELECT id FROM trips WHERE user_id = ?)'],
  ['trip_members', 'trip_id IN (SELECT id FROM trips WHERE user_id = ?)'],
  ['trip_categories', 'trip_id IN (SELECT id FROM trips WHERE user_id = ?)'],
  ['investments', 'portfolio_id IN (SELECT id FROM portfolios WHERE user_id = ?)'],
  ['dividend_sips', 'portfolio_id IN (SELECT id FROM portfolios WHERE user_id = ?)'],
  [
    'debt_payoff_debts',
    'debt_payoff_id IN (SELECT id FROM debt_payoffs WHERE user_id = ?) OR debt_id IN (SELECT id FROM debts WHERE user_id = ?)',
  ],
];

/** Every other table carrying a user_id FK, except the four kept above. */
const ERASURE_USER_TABLES: readonly string[] = [
  'api_credentials',
  'budget_categories',
  'budgets',
  'conversations',
  'debt_payoffs',
  'debts',
  'goals',
  'household_memberships',
  'insurance_policies',
  'journeys',
  'magic_links',
  'net_worth_snapshots',
  'notifications',
  'portfolios',
  'push_subscriptions',
  'recurring_detections',
  'sessions',
  'settings',
  'statement_imports',
  'tenants',
  // transactions FK-references recurring_expenses, so delete them first
  'transactions',
  'recurring_expenses',
  'trips',
  'webauthn_challenges',
  'webauthn_credentials',
];

/** Pure, testable shape of the erasure. Ids are always bound, never inlined. */
export function erasurePlan(userId: string, requestId: string, nowIso: string): ErasureStep[] {
  const steps: ErasureStep[] = [];
  for (const [table, predicate] of ERASURE_CHILD_STEPS) {
    const binds = Array.from({ length: (predicate.match(/\?/g) ?? []).length }, () => userId);
    steps.push({ sql: `DELETE FROM ${table} WHERE ${predicate}`, binds });
  }
  for (const table of ERASURE_USER_TABLES) {
    steps.push({ sql: `DELETE FROM ${table} WHERE user_id = ?`, binds: [userId] });
  }
  steps.push({
    sql: "UPDATE users SET email = 'deleted-' || id || '@sampada.app', first_name = 'Deleted', last_name = 'User', updated_at = ? WHERE id = ?",
    binds: [nowIso, userId],
  });
  steps.push({
    sql: "UPDATE deletion_requests SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?",
    binds: [nowIso, nowIso, requestId],
  });
  return steps;
}

/** ProcessDeletionJob: after the 48h cancel window, hard-delete the user's
 *  data in one D1 batch (all-or-nothing, so a failed sweep stays pending and
 *  retries). Idempotent — it acts only while the request is still pending. */
export async function processDeletion(env: Bindings, payload: unknown, now: Date = new Date()): Promise<void> {
  const { request_id: requestId } = (payload ?? {}) as { request_id?: string };
  if (!requestId) return;
  const request = await env.DB.prepare('SELECT id, user_id, status, scheduled_for FROM deletion_requests WHERE id = ?')
    .bind(requestId)
    .first<{ id: string; user_id: string; status: string; scheduled_for: string }>();
  if (!request || request.status !== 'pending') return;
  // checkDeletions enforces this when enqueueing; re-check so a direct/replayed
  // job can never erase a user still inside the cancel window.
  if (new Date(request.scheduled_for).getTime() > now.getTime()) return;

  const steps = erasurePlan(request.user_id, requestId, now.toISOString());
  await env.DB.batch(
    steps.map((step) => {
      const stmt = env.DB.prepare(step.sql);
      return step.binds.length ? stmt.bind(...step.binds) : stmt;
    }),
  );
  console.log(JSON.stringify({ deletion: 'erased', request_id: requestId, statements: steps.length }));
}

// ---- queued: import_statement ----

const DUPLICATE_LIMIT = 20_000;

function dupKey(date: unknown, amount: unknown, merchant: unknown): string {
  return `${String(date ?? '').slice(0, 10)}|${Number(amount)}|${merchant == null ? '' : String(merchant)}`;
}

async function failImport(env: Bindings, importId: string, code: string): Promise<void> {
  await env.DB.prepare("UPDATE statement_imports SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify({ error: code }), new Date().toISOString(), importId)
    .run();
}

/** ImportStatementJob, worker-shaped: rows are parsed client-side (the raw
 *  PDF never reaches the server), so the queue job only validates them and
 *  marks duplicates against the user's newest 20k transactions — the same set
 *  Rails fed the parser. Actual inserts happen on confirm. */
export async function importStatement(env: Bindings, payload: unknown): Promise<void> {
  const { import_id: importId } = (payload ?? {}) as { import_id?: string };
  if (!importId) return;
  const nowIso = new Date().toISOString();
  const imp = await env.DB.prepare('SELECT id, user_id, status, result FROM statement_imports WHERE id = ?')
    .bind(importId)
    .first<{ id: string; user_id: string; status: string; result: string | null }>();
  if (!imp || imp.status === 'done') return;

  const result = (imp.result ? JSON.parse(imp.result) : {}) as {
    transactions?: Array<Record<string, unknown>>;
    trust?: unknown;
  };
  const rows = result.transactions;
  if (!Array.isArray(rows) || rows.length === 0) {
    await failImport(env, importId, 'invalid_result');
    return;
  }

  for (const row of rows) {
    const date = row?.transaction_date;
    if (typeof date !== 'string' || !date || !Number.isFinite(Number(row?.amount))) {
      await failImport(env, importId, 'invalid_row');
      return;
    }
  }

  const existing = await env.DB.prepare(
    'SELECT transaction_date, amount, merchant FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT ?',
  )
    .bind(imp.user_id, DUPLICATE_LIMIT)
    .all<{ transaction_date: string; amount: number; merchant: string | null }>();
  const seen = new Set(existing.results.map((t) => dupKey(t.transaction_date, t.amount, t.merchant)));

  let duplicateCount = 0;
  const marked = rows.map((row) => {
    const duplicate = seen.has(dupKey(row.transaction_date, row.amount, row.merchant));
    if (duplicate) duplicateCount += 1;
    return { ...row, duplicate };
  });

  await env.DB.prepare("UPDATE statement_imports SET status = 'done', result = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify({ transactions: marked, trust: result.trust ?? null, duplicate_count: duplicateCount }), nowIso, importId)
    .run();
}

// ---- queued: ai_response ----

const AI_PRESETS: Record<string, { uri: string; model: string }> = {
  openai: { uri: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: { uri: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash' },
  grok: { uri: 'https://api.x.ai/v1', model: 'grok-beta' },
  openrouter: { uri: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
};

const SYSTEM_PROMPT =
  "You are Sampada's household-finance assistant. Answer briefly and practically about budgets, expenses, debts and investments.";

const AI_SETUP_MESSAGE =
  'AI is not set up yet. Add your AI settings (provider, API key, model) in Settings to enable the assistant.';

/** AiResponseJob: look up the user's BYO AI settings, call an OpenAI-compatible
 *  endpoint, store the reply (or the apology on failure). The Rails
 *  rule-engine fallback is not ported — TODO(A5) decides if the worker needs it. */
export async function aiResponse(env: Bindings, payload: unknown): Promise<void> {
  const { conversation_id: conversationId } = (payload ?? {}) as { conversation_id?: string };
  if (!conversationId) return;
  const nowIso = new Date().toISOString();
  const conversation = await env.DB.prepare('SELECT id, user_id FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<{ id: string; user_id: string }>();
  if (!conversation) return;

  const prompt = await env.DB.prepare(
    "SELECT content FROM messages WHERE conversation_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1",
  )
    .bind(conversationId)
    .first<{ content: string }>();

  const insertAssistant = async (content: string, metadata?: Record<string, unknown>): Promise<void> => {
    await env.DB.prepare(
      'INSERT INTO messages (id, content, conversation_id, created_at, metadata, role, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(crypto.randomUUID(), content, conversationId, nowIso, metadata ? JSON.stringify(metadata) : null, 'assistant', nowIso)
      .run();
  };

  const settings = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE user_id = ? AND key IN ('ai_provider','ai_api_key','ai_uri','ai_model')",
  )
    .bind(conversation.user_id)
    .all<{ key: string; value: string | null }>();
  const s: Record<string, string> = {};
  for (const { key, value } of settings.results) if (value) s[key] = value;

  if (!s.ai_provider || !s.ai_api_key || !prompt?.content) {
    await insertAssistant(AI_SETUP_MESSAGE);
    return;
  }

  try {
    const uri = (s.ai_uri || AI_PRESETS[s.ai_provider]?.uri || '').replace(/\/+$/, '');
    const model = s.ai_model || AI_PRESETS[s.ai_provider]?.model;
    if (!uri || !model) throw new Error('ai_uri/ai_model not configured');
    const res = await fetch(`${uri}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s.ai_api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt.content },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`ai api ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('empty ai response');
    await insertAssistant(text);
  } catch (error) {
    console.error(JSON.stringify({ ai: 'failed', conversation_id: conversationId, error: String(error) }));
    await insertAssistant("Sorry, I couldn't generate a response right now. Please try again.", { error: String(error) });
  }
}
