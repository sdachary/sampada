// Api::ConversationsController + Api::MessagesController — conversation CRUD
// and nested messages. Rails parity: conversation_json / message_json field
// sets, the pending assistant placeholder on messages#index, and the AI reply
// enqueued only for user messages (the worker's ai_response queue job replaces
// Sidekiq's AiResponseJob).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { enqueue } from '../jobs/queue';
import { error, jsonBody, notFound, nowIso, parseMetadata, success, type AppContext } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type ConversationRow = {
  id: string; title: string | null; summary: string | null; created_at: string;
};

type MessageRow = {
  id: string; role: string; content: string; metadata: string | null; created_at: string;
};

type MessageJson = {
  id: string; role: string; content: string;
  metadata: Record<string, unknown> | null; created_at: string | null;
};

const MESSAGE_ROLES = ['user', 'assistant', 'system'];

function conversationJson(c: ConversationRow) {
  return { id: c.id, title: c.title, summary: c.summary, created_at: c.created_at };
}

function messageJson(m: MessageRow): MessageJson {
  return {
    id: m.id, role: m.role, content: m.content,
    metadata: parseMetadata(m.metadata), created_at: m.created_at,
  };
}

async function scopedConversation(c: AppContext): Promise<ConversationRow | null> {
  return c.env.DB.prepare(
    'SELECT id, title, summary, created_at FROM conversations WHERE id = ? AND user_id = ?',
  ).bind(c.req.param('id'), c.get('user').id).first<ConversationRow>();
}

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, title, summary, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(c.get('user').id).all<ConversationRow>();
  return success(c, rows.results.map(conversationJson));
});

router.get('/:id', async (c) => {
  const conv = await scopedConversation(c);
  if (!conv) return notFound(c);
  const messages = await c.env.DB.prepare(
    'SELECT id, role, content, metadata, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
  ).bind(conv.id).all<MessageRow>();
  return success(c, { ...conversationJson(conv), messages: messages.results.map(messageJson) });
});

router.post('/', async (c) => {
  const body = await jsonBody<Record<string, unknown>>(c);
  const title = body.title == null || String(body.title).trim() === '' ? null : String(body.title);
  if (title === null) return error(c, 'Validation failed', 422, ["Title can't be blank"]);
  const summary = body.summary == null ? null : String(body.summary);
  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO conversations (id, title, summary, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, title, summary, now, now, c.get('user').id).run();
  return c.json(conversationJson({ id, title, summary, created_at: now }), 201);
});

router.delete('/:id', async (c) => {
  const conv = await scopedConversation(c);
  if (!conv) return notFound(c);
  // D1 has no ON DELETE CASCADE here — mirror has_many :messages, dependent: :destroy.
  await c.env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conv.id).run();
  await c.env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(conv.id).run();
  return c.body(null, 204);
});

// ---- nested messages -------------------------------------------------------

router.get('/:id/messages', async (c) => {
  const conv = await scopedConversation(c);
  if (!conv) return notFound(c);
  const rows = await c.env.DB.prepare(
    'SELECT id, role, content, metadata, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
  ).bind(conv.id).all<MessageRow>();
  const json = rows.results.map(messageJson);
  // MessagesController#index: an unanswered user prompt gets a transient
  // placeholder so the SPA keeps polling until the assistant reply lands.
  if (rows.results[rows.results.length - 1]?.role === 'user') {
    json.push({ id: 'pending', role: 'assistant', content: '…', metadata: { pending: true }, created_at: null });
  }
  return success(c, json);
});

router.post('/:id/messages', async (c) => {
  const conv = await scopedConversation(c);
  if (!conv) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  const role = body.role == null || body.role === '' ? 'user' : String(body.role);
  if (!MESSAGE_ROLES.includes(role)) return error(c, 'Invalid role', 422);
  const content = body.content == null ? '' : String(body.content);
  if (content.trim() === '') return error(c, 'Validation failed', 422, ["Content can't be blank"]);
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : {};
  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, conv.id, role, content, JSON.stringify(metadata), now, now).run();
  if (role === 'user') await enqueue(c.env, 'ai_response', { conversation_id: conv.id });
  return c.json({ id, role, content, metadata, created_at: now }, 201);
});

export default router;
