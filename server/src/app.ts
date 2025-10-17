import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { env } from './config/env.js';
import { registerApiRoutes } from './routes/api/index.js';
import { registerHealthRoutes } from './routes/health.js';

export function createApp() {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      exposeHeaders: ['X-Request-Id'],
      maxAge: 60,
    }),
  );

  app.use('*', logger());
  app.use('*', timing());

  app.onError((err, c) => {
    console.error('[hono] unhandled error', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong. Please try again later.',
        },
        data: null,
      },
      500,
    );
  });

  registerHealthRoutes(app);
  registerApiRoutes(app);

  return app;
}
