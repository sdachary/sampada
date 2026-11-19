// Api::InsurancePoliciesController — index/show/create/update/destroy.
// destroy answers via render_success({}, message:) → 200 {message}.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type PolicyRow = {
  id: string; policy_type: string | null; provider_name: string | null;
  premium_amount: number | null; premium_frequency: string | null;
  coverage_amount: number | null; renewal_date: string | null; notes: string | null;
  created_at: string;
};

function policyJson(p: PolicyRow) {
  return {
    id: p.id, policy_type: p.policy_type, provider_name: p.provider_name,
    premium_amount: p.premium_amount === null ? null : Number(p.premium_amount),
    premium_frequency: p.premium_frequency,
    coverage_amount: p.coverage_amount === null ? null : Number(p.coverage_amount),
    renewal_date: p.renewal_date, notes: p.notes, created_at: p.created_at,
  };
}

const POLICY_TYPES = ['health', 'term_life', 'vehicle', 'other'];
const PREMIUM_FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM insurance_policies WHERE user_id = ? AND (renewal_date IS NULL OR renewal_date >= ?) ORDER BY created_at DESC`,
  ).bind(user.id, new Date().toISOString().slice(0, 10)).all<PolicyRow>();
  return success(c, rows.results.map(policyJson));
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const p = await c.env.DB.prepare(
    'SELECT * FROM insurance_policies WHERE id = ? AND user_id = ?',
  ).bind(c.req.param('id'), user.id).first<PolicyRow>();
  if (!p) return notFound(c);
  return success(c, policyJson(p));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.insurance_policy as Record<string, unknown> | undefined) ?? body;

  const errs: string[] = [];
  const policyType = source.policy_type ? String(source.policy_type) : null;
  if (!policyType || !POLICY_TYPES.includes(policyType)) errs.push('Policy type is not included in the list');
  const providerName = source.provider_name ? String(source.provider_name) : null;
  if (!providerName || providerName.trim() === '') errs.push("Provider name can't be blank");
  const premium = source.premium_amount === null || source.premium_amount === undefined ? null : Number(source.premium_amount);
  if (premium !== null && premium < 0) errs.push('Premium amount must be greater than or equal to 0');
  const premiumFrequency = source.premium_frequency ? String(source.premium_frequency) : null;
  if (!premiumFrequency || !PREMIUM_FREQUENCIES.includes(premiumFrequency)) {
    errs.push('Premium frequency is not included in the list');
  }
  const coverage = source.coverage_amount === null || source.coverage_amount === undefined ? null : Number(source.coverage_amount);
  if (coverage !== null && coverage <= 0) errs.push('Coverage amount must be greater than 0');

  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO insurance_policies (id, user_id, policy_type, provider_name, premium_amount, premium_frequency, coverage_amount, renewal_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, user.id, policyType, providerName,
    premium, premiumFrequency, coverage,
    source.renewal_date ? String(source.renewal_date) : null,
    source.notes ? String(source.notes) : null,
    now, now,
  ).run();

  const p = await c.env.DB.prepare('SELECT * FROM insurance_policies WHERE id = ?').bind(id).first<PolicyRow>();
  return c.json(policyJson(p!), 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const p = await c.env.DB.prepare('SELECT * FROM insurance_policies WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<PolicyRow>();
  if (!p) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.insurance_policy as Record<string, unknown> | undefined) ?? body;
  const has = (k: string) => source[k] !== undefined;

  const candidate = {
    policy_type: has('policy_type') ? (source.policy_type ? String(source.policy_type) : null) : p.policy_type,
    provider_name: has('provider_name') ? (source.provider_name ? String(source.provider_name) : null) : p.provider_name,
    premium_amount: has('premium_amount') ? (source.premium_amount === null || source.premium_amount === undefined ? null : Number(source.premium_amount)) : p.premium_amount,
    premium_frequency: has('premium_frequency') ? (source.premium_frequency ? String(source.premium_frequency) : null) : p.premium_frequency,
    coverage_amount: has('coverage_amount') ? (source.coverage_amount === null || source.coverage_amount === undefined ? null : Number(source.coverage_amount)) : p.coverage_amount,
    renewal_date: has('renewal_date') ? (source.renewal_date ? String(source.renewal_date) : null) : p.renewal_date,
    notes: has('notes') ? (source.notes ? String(source.notes) : null) : p.notes,
  };

  const errs: string[] = [];
  const policyType = candidate.policy_type;
  if (!policyType || !POLICY_TYPES.includes(policyType)) errs.push('Policy type is not included in the list');
  const providerName = candidate.provider_name;
  if (!providerName || providerName.trim() === '') errs.push("Provider name can't be blank");
  const premium = candidate.premium_amount;
  if (premium !== null && premium < 0) errs.push('Premium amount must be greater than or equal to 0');
  const premiumFrequency = candidate.premium_frequency;
  if (!premiumFrequency || !PREMIUM_FREQUENCIES.includes(premiumFrequency)) {
    errs.push('Premium frequency is not included in the list');
  }
  const coverage = candidate.coverage_amount;
  if (coverage !== null && coverage <= 0) errs.push('Coverage amount must be greater than 0');
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (has('policy_type')) { sets.push('policy_type = ?'); values.push(candidate.policy_type); }
  if (has('provider_name')) { sets.push('provider_name = ?'); values.push(candidate.provider_name); }
  if (has('premium_amount')) { sets.push('premium_amount = ?'); values.push(candidate.premium_amount); }
  if (has('premium_frequency')) { sets.push('premium_frequency = ?'); values.push(candidate.premium_frequency); }
  if (has('coverage_amount')) { sets.push('coverage_amount = ?'); values.push(candidate.coverage_amount); }
  if (has('renewal_date')) { sets.push('renewal_date = ?'); values.push(candidate.renewal_date); }
  if (has('notes')) { sets.push('notes = ?'); values.push(candidate.notes); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE insurance_policies SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  const fresh = await c.env.DB.prepare('SELECT * FROM insurance_policies WHERE id = ?').bind(id).first<PolicyRow>();
  return success(c, policyJson(fresh!));
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM insurance_policies WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
