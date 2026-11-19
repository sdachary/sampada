// Api::RecurringDetectionController — index, detect, update_suggestion.
// Flag gate via FeatureFlags (default on); detect is synchronous (SyncLimitError
// → 422); pending suggestions block detect with 409 carrying an errors object.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, featureFlagEnabled, jsonBody, notFound, nowIso, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type DetectionRow = {
  id: string; user_id: string; suggestions: string | null; result_version: string;
  created_at: string; updated_at: string;
};

type DetTx = {
  id: string; merchant: string | null; description: string | null; amount: number | null;
  transaction_date: string; recurring_expense_id: string | null;
};

type Suggestion = Record<string, unknown>;

const RESULT_VERSION = 'v1';
const MIN_OCCURRENCES = 3;
const MAX_TRANSACTIONS = 50_000;
const LOOKBACK_MONTHS = 12;
const MIN_CONFIDENCE = 0.6;
const MAX_CV = 0.2;
const OUTLIER_TOLERANCE = 0.25;

const FREQUENCY_BANDS: Record<string, { min: number; max: number; nominal: number }> = {
  daily: { min: 0, max: 2, nominal: 1 },
  weekly: { min: 5, max: 9, nominal: 7 },
  monthly: { min: 28, max: 32, nominal: 30 },
  quarterly: { min: 88, max: 95, nominal: 91 },
  yearly: { min: 355, max: 375, nominal: 365 },
};

function parseSuggestions(raw: string | null): Suggestion[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as Suggestion[]) : [];
  } catch {
    return [];
  }
}

function normalizeMerchant(raw: string | null): string {
  let text = (raw ?? '').toLowerCase().trim();
  if (text.startsWith('upi/')) {
    const parts = text.split('/');
    if (parts.length >= 3) text = parts[2];
  }
  text = text.replace(/x{2,}\d+/g, 'x');
  text = text.replace(/\d+/g, ' ');
  text = text.replace(/[^a-z\s]/g, ' ');
  return text.split(/\s+/).filter(Boolean).join(' ');
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function frequencyFit(gap: number, band: { min: number; max: number; nominal: number }): number {
  const half = Math.max(band.nominal - band.min, band.max - band.nominal);
  if (half === 0) return 1;
  return Math.min(1, Math.max(0.5, 1 - (Math.abs(gap - band.nominal) / half) * 0.5));
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

async function computeSuggestions(c: Ctx, userId: string): Promise<Suggestion[]> {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - (LOOKBACK_MONTHS - 1), 1);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const rows = await c.env.DB.prepare(
    `SELECT id, merchant, description, amount, transaction_date, recurring_expense_id
     FROM transactions WHERE user_id = ? AND transaction_type = 'expense' AND transaction_date >= ?`,
  ).bind(userId, cutoffIso).all<DetTx>();

  if (rows.results.length > MAX_TRANSACTIONS) throw new Error('sync_limit');

  const groups = new Map<string, DetTx[]>();
  for (const t of rows.results) {
    const key = normalizeMerchant(t.merchant || t.description);
    if (!key) continue;
    const g = groups.get(key) ?? [];
    g.push(t);
    groups.set(key, g);
  }

  const suggestions: Suggestion[] = [];
  for (const [merchantNorm, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;
    if (group.some((t) => t.recurring_expense_id)) continue;

    const gaps: number[] = [];
    for (let i = 1; i < group.length; i++) gaps.push(daysBetween(group[i - 1].transaction_date, group[i].transaction_date));
    const medianGap = median(gaps);
    const band = Object.values(FREQUENCY_BANDS).find((b) => medianGap >= b.min && medianGap <= b.max);
    if (!band) continue;
    const frequency = Object.keys(FREQUENCY_BANDS).find((k) => FREQUENCY_BANDS[k] === band)!;

    const amounts = group.map((t) => Number(t.amount ?? 0));
    const medianAmount = median(amounts);
    const kept = amounts.filter((a) => Math.abs(a - medianAmount) <= OUTLIER_TOLERANCE * medianAmount);
    if (kept.length < MIN_OCCURRENCES) continue;
    const mean = kept.reduce((s, a) => s + a, 0) / kept.length;
    const sd = stdDev(kept);
    const cv = mean === 0 ? 1 : sd / mean;
    if (cv > MAX_CV) continue;

    const fit = frequencyFit(medianGap, band);
    const amountScore = Math.max(0, 1 - cv);
    const regularity = Math.max(0, medianGap === 0 ? 0 : 1 - stdDev(gaps) / medianGap);
    const confidence = Math.round((0.4 * fit + 0.3 * amountScore + 0.3 * regularity) * 1000) / 1000;
    if (confidence < MIN_CONFIDENCE) continue;

    const last = group[group.length - 1];
    const nextDueDate = addDays(last.transaction_date, Math.round(medianGap));

    const counts = new Map<string, number>();
    for (const t of group) {
      const m = (t.merchant ?? '').trim();
      if (!m) continue;
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    const rawName = counts.size > 0
      ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : merchantNorm;
    const name = rawName.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    suggestions.push({
      merchant_norm: merchantNorm,
      name,
      amount_avg: Math.round(mean * 100) / 100,
      amount_sd: Math.round(sd * 100) / 100,
      frequency,
      next_due_date: nextDueDate,
      example_tx_ids: group.map((t) => t.id),
      confidence,
      status: 'pending',
    });
  }

  return suggestions.sort((a, b) => Number(b.confidence) - Number(a.confidence));
}

router.get('/', async (c) => {
  const user = c.get('user');
  const detection = await c.env.DB.prepare(
    'SELECT * FROM recurring_detections WHERE user_id = ? AND result_version = ? LIMIT 1',
  ).bind(user.id, RESULT_VERSION).first<DetectionRow>();

  if (!detection) {
    return success(c, { suggestions: [], detection: null });
  }
  const suggestions = parseSuggestions(detection.suggestions);
  return success(c, {
    suggestions,
    detection: { id: detection.id, result_version: detection.result_version, updated_at: detection.updated_at },
  });
});

router.post('/', async (c) => {
  const user = c.get('user');
  if (!(await featureFlagEnabled(c, 'recurring_detection', user.id))) {
    return error(c, 'Recurring detection is not enabled', 501);
  }

  const body = await jsonBody<Record<string, unknown>>(c);
  const force = String(body?.force ?? 'false') === 'true';

  const detection = await c.env.DB.prepare(
    'SELECT * FROM recurring_detections WHERE user_id = ? AND result_version = ? LIMIT 1',
  ).bind(user.id, RESULT_VERSION).first<DetectionRow>();

  const existing = detection ? parseSuggestions(detection.suggestions) : [];
  const pending = existing.some((s) => String(s.status) === 'pending');
  if (detection && pending && !force) {
    return error(c, 'Suggestions are still pending review', 409, { suggestions: existing });
  }

  let suggestions: Suggestion[];
  try {
    suggestions = await computeSuggestions(c, user.id);
  } catch (e) {
    if ((e as Error).message === 'sync_limit') {
      return error(c, 'Too many transactions to scan synchronously', 422);
    }
    throw e;
  }

  const now = nowIso();
  if (detection) {
    await c.env.DB.prepare(
      'UPDATE recurring_detections SET suggestions = ?, updated_at = ? WHERE id = ?',
    ).bind(JSON.stringify(suggestions), now, detection.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO recurring_detections (id, user_id, suggestions, result_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), user.id, JSON.stringify(suggestions), RESULT_VERSION, now, now).run();
  }

  return success(c, { suggestions });
});

router.put('/:idx', async (c) => {
  const user = c.get('user');
  const detection = await c.env.DB.prepare(
    'SELECT * FROM recurring_detections WHERE user_id = ? AND result_version = ? LIMIT 1',
  ).bind(user.id, RESULT_VERSION).first<DetectionRow>();
  if (!detection) return error(c, 'No detection found', 404);

  const suggestions = parseSuggestions(detection.suggestions);
  const idx = Number(c.req.param('idx'));
  const suggestion = suggestions[idx];
  if (!suggestion) return error(c, 'Suggestion not found', 404);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.recurring_detection as Record<string, unknown> | undefined) ?? body;
  const requested = String(source?.status ?? '');
  if (!['accepted', 'rejected', 'edited'].includes(requested)) {
    return error(c, 'Unsupported status', 422);
  }
  if (String(suggestion.status) !== 'pending') {
    return error(c, 'Suggestion already reviewed', 409);
  }

  const updated: Record<string, unknown> = { ...suggestion };
  if (requested === 'edited') {
    if (source.name !== undefined) updated.name = String(source.name);
    if (source.amount !== undefined) updated.amount_avg = Number(source.amount);
    if (source.frequency !== undefined) updated.frequency = String(source.frequency);
    if (source.next_due_date !== undefined) updated.next_due_date = String(source.next_due_date);
    if (source.category !== undefined) updated.category = String(source.category);
  }
  updated.status = requested === 'rejected' ? 'rejected' : 'accepted';

  let recurringExpense: Record<string, unknown> | null = null;
  if (updated.status === 'accepted') {
    try {
      const expenseId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO recurring_expenses (id, user_id, name, amount, frequency, next_due_date, category, auto_debit, active, currency_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        expenseId, user.id,
        String(updated.name ?? ''), Number(updated.amount_avg ?? 0), String(updated.frequency ?? 'monthly'),
        String(updated.next_due_date ?? ''), updated.category ? String(updated.category) : null,
        0, 1, 'INR', nowIso(), nowIso(),
      ).run();
      const ids = (updated.example_tx_ids as string[] | undefined) ?? [];
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await c.env.DB.prepare(
          `UPDATE transactions SET recurring_expense_id = ?, recurring = 1, recurring_frequency = ?, updated_at = ?
           WHERE id IN (${placeholders})`,
        ).bind(expenseId, String(updated.frequency ?? 'monthly'), nowIso(), ...ids).run();
      }
      recurringExpense = {
        id: expenseId, name: String(updated.name ?? ''), amount: Number(updated.amount_avg ?? 0),
        frequency: String(updated.frequency ?? 'monthly'), next_due_date: String(updated.next_due_date ?? ''),
      };
    } catch {
      return error(c, 'Could not create the recurring expense from this suggestion', 422);
    }
  }

  suggestions[idx] = updated;
  await c.env.DB.prepare('UPDATE recurring_detections SET suggestions = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(suggestions), nowIso(), detection.id).run();

  return success(c, { suggestion: updated, recurring_expense: recurringExpense });
});

export default router;
