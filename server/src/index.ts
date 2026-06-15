import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectionPool } from './db/client.js';
import { startPaymentExpirationJob } from './jobs/paymentExpiration.js';
import { startPaymentReconciliationJob } from './jobs/paymentReconciliation.js';

// Log environment configuration at startup
console.log('[trafficmena] Environment Configuration:');
console.log({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: env.PORT ?? 3001,
  CORS_ORIGIN: env.CORS_ORIGIN,
  DB_SSL: env.DB_SSL,
});

// Test database connection before starting server
console.log('[trafficmena] Testing database connection...');
try {
  const client = await connectionPool.connect();
  const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
  client.release();
  console.log('[trafficmena] ✅ Database connection successful:', {
    database: result.rows[0].db_name,
    timestamp: result.rows[0].current_time,
  });
} catch (error) {
  console.error('[trafficmena] ❌ Database connection failed:', error);
  console.error('[trafficmena] Server cannot start without database access. Please check:');
  console.error('  1. DATABASE_URL or PG* environment variables are set correctly');
  console.error('  2. PostgreSQL server is running and accessible');
  console.error('  3. Database user has proper permissions');
  console.error('  4. Network/firewall allows connection to database port');
  process.exit(1);
}

const app = createApp();

const port = env.PORT ?? 3001;
console.log(`[trafficmena] Hono API starting on :${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`[trafficmena] ✅ Server listening on http://localhost:${port}`);

// Start background jobs
startPaymentExpirationJob();
startPaymentReconciliationJob();
