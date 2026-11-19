import { Hono } from 'hono';
import { auth } from './auth';
import type { SafeUser } from './session';
import { HALF_HOUR_CRON, DAILY_CRON, handleScheduled } from './jobs/dispatch';
import { drainDue } from './jobs/queue';
import privacyHtml from './legal/privacy.html';
import termsHtml from './legal/terms.html';
import { idempotencyReplay } from './api/idempotency';
import onboarding from './api/onboarding';
import journey from './api/journey';
import push from './api/push';
import featureFlags from './api/featureFlags';
import sectors from './api/sectors';
import reports from './api/reports';
import transactions from './api/transactions';
import debts from './api/debts';
import payoffPlans from './api/payoff_plans';
import insurancePolicies from './api/insurance_policies';
import portfolios from './api/portfolios';
import investments from './api/investments';
import dividendSips from './api/dividend_sips';
import recurringExpenses from './api/recurring_expenses';
import recurringDetection from './api/recurring_detection';
import apiCredentials from './api/api_credentials';
import aiSettings from './api/ai_settings';
import budgetCategories from './api/budget_categories';

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
// Idempotency-Key replay — only POST /api/v1/* routes. The method check inside
// the middleware keeps the auth router's unauthenticated begin/finish (and
// every GET) out of the conflict path.
app.use('/api/v1/*', idempotencyReplay);
// Data routers — requireAuth + originGuard live inside each router (a global
// /api/v1/* gate would also cover auth's unauthenticated begin/finish).
app.route('/api/v1/onboarding', onboarding);
app.route('/api/v1/journey', journey);
app.route('/api/v1/push_subscriptions', push);
app.route('/api/v1/feature_flags', featureFlags);
app.route('/api/v1/sectors', sectors);
app.route('/api/v1/reports', reports);
app.route('/api/v1/transactions', transactions);
app.route('/api/v1/debts', debts);
app.route('/api/v1/payoff_plans', payoffPlans);
app.route('/api/v1/insurance_policies', insurancePolicies);
app.route('/api/v1/portfolios', portfolios);
app.route('/api/v1/investments', investments);
app.route('/api/v1/dividend_sips', dividendSips);
app.route('/api/v1/recurring_expenses', recurringExpenses);
app.route('/api/v1/recurring_detection', recurringDetection);
app.route('/api/v1/api_credentials', apiCredentials);
app.route('/api/v1/ai_settings', aiSettings);
app.route('/api/v1/budget_categories', budgetCategories);

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
