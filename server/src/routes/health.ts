import { sql } from 'drizzle-orm';
import type { Hono } from 'hono';
import { db } from '../db/client.js';

export function registerHealthRoutes(app: Hono) {
  app.get('/', (c) => c.json({ ok: true }));

  app.get('/health', (c) => c.json({ ok: true }));
  app.get('/api/health', (c) => c.json({ ok: true }));

  app.get('/db/health', async (c) => {
    try {
      const result = await db.execute(sql`select 1 as ok`);
      const ok = Array.isArray(result.rows) ? result.rows[0]?.ok === 1 : false;
      return c.json({ ok });
    } catch (error) {
      console.error('[health] database check failed', error);
      return c.json(
        {
          ok: false,
          error: (error as Error).message,
        },
        500,
      );
    }
  });
}
