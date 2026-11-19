// A7.2 — Idempotency-Key replay middleware, ported from
// app/middleware/idempotency_key_replay.rb. The SPA offline queue
// (frontend/src/lib/offlineQueue.js) replays queued mutations with an
// Idempotency-Key header; a repeated POST path+key within 24h replays the
// stored 2xx response, and a concurrent same-key request gets 409.

import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';
import { sha256Hex } from '../session';

const KEY_TTL_MS = 24 * 60 * 60 * 1000;

type StoredResponse = { status: number; content_type: string; body: string };

type Row = { key_hash: string; status: string; response_json: string; created_at: string; expires_at: string };

async function lookup(env: AppEnv['Bindings'], hash: string): Promise<Row | null> {
  return env.DB.prepare('SELECT * FROM idempotency_keys WHERE key_hash = ?').bind(hash).first<Row>();
}

export async function idempotencyReplay(c: Context<AppEnv>, next: Next): Promise<Response> {
  // No Idempotency-Key header or non-POST → pass through untouched (Rails
  // guards on both before touching the cache).
  const key = c.req.header('Idempotency-Key');
  if (!key || c.req.method !== 'POST') { await next(); return c.res; }

  const keyHash = await sha256Hex(`${c.req.path}:${key}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + KEY_TTL_MS).toISOString();

  // Lookup + lazy expire share Rails' single fail-open begin/rescue: any cache
  // error before the app runs means run the request untouched.
  let row: Row | null = null;
  try {
    row = await lookup(c.env, keyHash);
    if (row && new Date(row.expires_at).getTime() <= now.getTime()) {
      await c.env.DB.prepare('DELETE FROM idempotency_keys WHERE key_hash = ?').bind(keyHash).run();
      row = null;
    }
  } catch (e) {
    console.error('idempotency replay failed, passing through', e);
    await next();
    return c.res;
  }

  if (row?.status === 'done') {
    try {
      // Replay the stored response verbatim (Rails sends only Content-Type).
      const stored = JSON.parse(row.response_json) as StoredResponse;
      return new Response(stored.body, {
        status: stored.status,
        headers: { 'Content-Type': stored.content_type || 'application/json' },
      });
    } catch {
      // Corrupt payload → treat as absent and re-run (Rails would 500).
    }
  } else if (row?.status === 'pending') {
    // In-flight same-key request. Rails would 500 replaying the literal
    // 'pending' reserve marker; 409 is the designed back-off for the queue.
    return c.json({ success: false, message: 'Request already in progress' }, 409);
  }

  // Reserve the key. A concurrent same-key INSERT violates the PK → 409,
  // matching Rails' SET NX failure path.
  try {
    await c.env.DB.prepare(
      'INSERT INTO idempotency_keys (key_hash, status, response_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(keyHash, 'pending', '', now.toISOString(), expiresAt)
      .run();
  } catch {
    return c.json({ success: false, message: 'Request already in progress' }, 409);
  }

  // Outside any try: an app exception must propagate, and the pending key
  // SURVIVES it (24h TTL) — Rails has no ensure around @app.call either.
  await next();

  // Post-response bookkeeping is best-effort; the response returns regardless.
  const res = c.res;
  try {
    if (res.status >= 200 && res.status < 300) {
      // Store the payload so a replay can rebuild the exact response.
      const payload: StoredResponse = {
        status: res.status,
        content_type: res.headers.get('Content-Type') || 'application/json',
        body: await res.clone().text(),
      };
      await c.env.DB.prepare(
        'UPDATE idempotency_keys SET status = ?, response_json = ?, expires_at = ? WHERE key_hash = ?',
      )
        .bind('done', JSON.stringify(payload), expiresAt, keyHash)
        .run();
    } else {
      // Failed requests may be retried (Rails DEL on non-2xx).
      await c.env.DB.prepare('DELETE FROM idempotency_keys WHERE key_hash = ?').bind(keyHash).run();
    }
  } catch (e) {
    console.error('idempotency store/expire failed', e);
  }
  return res;
}
