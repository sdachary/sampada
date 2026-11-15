import { Hono } from 'hono';
import { auth } from './auth';
import type { SafeUser } from './session';
import { HALF_HOUR_CRON, DAILY_CRON, handleScheduled } from './jobs/dispatch';
import { drainDue } from './jobs/queue';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  RP_ID: string;
  RP_NAME: string;
  ALLOWED_ORIGINS: string;
  FILES?: R2Bucket;
  RESEND_API_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  DATABASE_BACKUP_ENABLED?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { user: SafeUser };
};

export const app = new Hono<AppEnv>();

app.get('/up', (c) => {
  return c.json({ status: 'ok', service: 'sampada-api' });
});

app.route('/api/v1/auth', auth);

app.notFound(() => {
  return Response.json({ error: 'not found' }, { status: 404 });
});

const worker = {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> => {
    ctx.waitUntil(
      (async () => {
        await handleScheduled(event.cron, env);
        await drainDue(env);
      })(),
    );
  },
};

export default worker;
