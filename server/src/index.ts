import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const port = env.PORT ?? 3001;
console.log(`[trafficmena] Hono API starting on :${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`[trafficmena] Server listening on http://localhost:${port}`);
