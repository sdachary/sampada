// Api::AiSettingsController — show/update/destroy (resource: singular routes).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

const PRESETS: Record<string, { uri: string; model: string }> = {
  openai: { uri: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: { uri: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash' },
  grok: { uri: 'https://api.x.ai/v1', model: 'grok-beta' },
  openrouter: { uri: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
};

function presetList() {
  const out: Record<string, { uri: string; model: string }> = {};
  for (const [k, v] of Object.entries(PRESETS)) out[k] = { ...v };
  return out;
}

async function configuredFor(c: Ctx, userId: string) {
  const provider = await c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, 'ai_provider').first<{ value: string | null }>();
  const apiKey = await c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, 'ai_api_key').first<{ value: string | null }>();
  const aiUri = await c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, 'ai_uri').first<{ value: string | null }>();
  const aiModel = await c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, 'ai_model').first<{ value: string | null }>();
  const preset = PRESETS[(provider?.value ?? '').toLowerCase()] ?? PRESETS.openai;
  const uri = aiUri?.value || preset.uri;
  const model = aiModel?.value || preset.model;
  const configured = !!(provider?.value && apiKey?.value && uri && model);
  const keyPresent = !!(apiKey?.value);
  return { provider: provider?.value ?? null, configured, keyPresent, model, uri };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const state = await configuredFor(c, user.id);
  return success(c, {
    provider: state.provider,
    configured: state.configured,
    key_present: state.keyPresent,
    model: state.model,
    presets: presetList(),
  });
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const state = await configuredFor(c, user.id);
  return success(c, {
    provider: state.provider,
    configured: state.configured,
    key_present: state.keyPresent,
    model: state.model,
    presets: presetList(),
  });
});

router.put('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const provider = String(body.provider ?? '').toLowerCase();
  const preset = PRESETS[provider];
  if (!preset) {
    return error(c, `Unsupported provider — choose: ${Object.keys(PRESETS).join(', ')}`, 422);
  }

  const apiKey = body.api_key ? String(body.api_key) : null;
  const uri = body.uri ? String(body.uri) : preset.uri;
  const model = body.model ? String(body.model) : preset.model;

  const set = async (key: string, value: string) => {
    const now = new Date().toISOString();
    const existing = await c.env.DB.prepare('SELECT id FROM settings WHERE user_id = ? AND key = ?')
      .bind(user.id, key).first<{ id: string }>();
    if (existing) {
      await c.env.DB.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE id = ?')
        .bind(value, now, existing.id).run();
    } else {
      await c.env.DB.prepare('INSERT INTO settings (id, key, value, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), key, value, user.id, now, now).run();
    }
  };
  const del = async (key: string) => {
    await c.env.DB.prepare('DELETE FROM settings WHERE user_id = ? AND key = ?').bind(user.id, key).run();
  };

  await set('ai_provider', provider);
  if (apiKey) await set('ai_api_key', apiKey); else await del('ai_api_key');
  await set('ai_uri', uri);
  await set('ai_model', model);

  const state = await configuredFor(c, user.id);
  return success(c, { provider: state.provider, configured: state.configured, key_present: state.keyPresent });
});

router.delete('/', async (c) => {
  const user = c.get('user');
  for (const key of ['ai_provider', 'ai_api_key', 'ai_uri', 'ai_model']) {
    await c.env.DB.prepare('DELETE FROM settings WHERE user_id = ? AND key = ?').bind(user.id, key).run();
  }
  return success(c, { configured: false });
});

export default router;
