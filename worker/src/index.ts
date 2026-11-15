import { Hono } from 'hono';
import { auth } from './auth';
import type { SafeUser } from './session';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  RP_ID: string;
  RP_NAME: string;
  ALLOWED_ORIGINS: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { user: SafeUser };
};

const app = new Hono<AppEnv>();

app.get('/up', (c) => {
  return c.json({ status: 'ok', service: 'sampada-api' });
});

app.route('/api/v1/auth', auth);

app.notFound(() => {
  return Response.json({ error: 'not found' }, { status: 404 });
});

export default app;
