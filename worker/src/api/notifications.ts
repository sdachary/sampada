// Api::NotificationsController — recent list, mark one read, mark all read.
// Notification.recent = created_at DESC LIMIT 50; metadata is a Rails JSON
// column stored as TEXT in D1.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import {
  boolFlag, notFound, nowIso, parseMetadata, success, type AppContext,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

const COLUMNS = 'id, notification_type, message, read, read_at, metadata, created_at';

type NotificationRow = {
  id: string; notification_type: string; message: string; read: number | null;
  read_at: string | null; metadata: string | null; created_at: string;
};

function notificationJson(n: NotificationRow) {
  return {
    id: n.id,
    notification_type: n.notification_type,
    message: n.message,
    read: boolFlag(n.read),
    read_at: n.read_at,
    metadata: parseMetadata(n.metadata),
    created_at: n.created_at,
  };
}

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
  ).bind(c.get('user').id).all<NotificationRow>();
  return success(c, rows.results.map(notificationJson));
});

async function markRead(c: AppContext) {
  const user = c.get('user');
  const n = await c.env.DB.prepare(`SELECT ${COLUMNS} FROM notifications WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id'), user.id).first<NotificationRow>();
  if (!n) return notFound(c);
  // Notification#mark_as_read!
  await c.env.DB.prepare('UPDATE notifications SET read = 1, read_at = ? WHERE id = ?')
    .bind(nowIso(), n.id).run();
  const fresh = await c.env.DB.prepare(`SELECT ${COLUMNS} FROM notifications WHERE id = ?`)
    .bind(n.id).first<NotificationRow>();
  return success(c, notificationJson(fresh!));
}

router.put('/:id', markRead);
router.patch('/:id', markRead);

router.post('/mark_all_read', async (c) => {
  // Notification.unread is `where(read: false)` — SQLite stores false as 0.
  await c.env.DB.prepare('UPDATE notifications SET read = 1, read_at = ? WHERE user_id = ? AND read = 0')
    .bind(nowIso(), c.get('user').id).run();
  return success(c, {}, 'All notifications marked as read');
});

export default router;
