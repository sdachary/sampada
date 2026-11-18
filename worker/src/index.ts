import { Hono } from 'hono';
import { auth } from './auth';
import type { SafeUser } from './session';
import { HALF_HOUR_CRON, DAILY_CRON, handleScheduled } from './jobs/dispatch';
import { drainDue } from './jobs/queue';
import privacyHtml from './legal/privacy.html';
import termsHtml from './legal/terms.html';
import onboarding from './api/onboarding';
import journey from './api/journey';
import push from './api/push';
import featureFlags from './api/featureFlags';
import sectors from './api/sectors';
import reports from './api/reports';

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
// Data routers — requireAuth + originGuard live inside each router (a global
// /api/v1/* gate would also cover auth's unauthenticated begin/finish).
app.route('/api/v1/onboarding', onboarding);
app.route('/api/v1/journey', journey);
app.route('/api/v1/push_subscriptions', push);
app.route('/api/v1/feature_flags', featureFlags);
app.route('/api/v1/sectors', sectors);
app.route('/api/v1/reports', reports);

// DPDP legal pages: self-rendering, CONFIG-driven HTML imported as text modules.
app.get('/privacy', (c) => c.html(privacyHtml));
app.get('/terms', (c) => c.html(termsHtml));

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
