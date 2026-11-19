// A8 — synthetic authenticated D1 probe for Gatus. Uses a dedicated bearer
// token (no user account, no write queries) and runs the same read shape as the
// dashboard so regressed D1 latency shows up on a schedule, not by one-off curl.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { sha256Hex } from '../session';

export const probe = new Hono<AppEnv>();

probe.get('/d1', async (c) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const secret = c.env?.D1_PROBE_TOKEN;
  if (!secret || !token) return c.json({ error: 'unauthorized' }, 401);
  if ((await sha256Hex(token)) !== (await sha256Hex(secret))) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const start = Date.now();
  // Same seven dashboard aggregations + snapshot read, against an id that has
  // no rows. Read-only by construction; this is not a real user account.
  const userId = '00000000-0000-0000-0000-000000000000';
  await Promise.all([
    c.env.DB.prepare("SELECT COALESCE(SUM(amount - paid_amount), 0) AS total FROM debts WHERE user_id = ? AND status = 'active'").bind(userId).first(),
    c.env.DB.prepare('SELECT COALESCE(SUM(COALESCE(i.shares, 0) * COALESCE(i.current_price, 0)), 0) AS total FROM investments i JOIN portfolios p ON p.id = i.portfolio_id WHERE p.user_id = ?').bind(userId).first(),
    c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM recurring_expenses WHERE user_id = ? AND active = 1').bind(userId).first(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM portfolios WHERE user_id = ?').bind(userId).first(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').bind(userId).first(),
    c.env.DB.prepare('SELECT zero_day_target FROM journeys WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').bind(userId).first(),
    c.env.DB.prepare('SELECT snapshot_date, net_worth FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT 12').bind(userId).all(),
  ]);
  return c.json({ ok: true, query_ms: Date.now() - start });
});
