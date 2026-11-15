import { Hono } from 'hono';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

type App = { Bindings: Bindings };

const app = new Hono<App>();

app.get('/up', (c) => {
  return c.json({ status: 'ok', service: 'sampada-api' });
});

app.notFound(() => {
  return Response.json({ error: 'not found' }, { status: 404 });
});

export default app;
