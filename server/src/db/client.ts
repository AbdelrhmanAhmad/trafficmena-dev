import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';

// Resolve the database connection string with fallbacks to individual PG* vars in production
function resolveDatabaseUrl(): string {
  if (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) {
    return env.DATABASE_URL.trim();
  }
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgres://${encodeURIComponent(PGUSER)}:${encodeURIComponent(
      PGPASSWORD,
    )}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
  throw new Error(
    '[db] DATABASE_URL is not set and PG* environment variables are incomplete. Provide DATABASE_URL or all of PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.',
  );
}

const resolvedDatabaseUrl = resolveDatabaseUrl();

// Mask password when logging
try {
  const url = new URL(resolvedDatabaseUrl);
  const masked = `${url.protocol}//${url.username ? '***' : ''}${url.username ? ':' : ''}${
    url.password ? '***@' : ''
  }${url.host}${url.pathname}`;
  // eslint-disable-next-line no-console
  console.log('[db] Using database connection:', masked);
} catch {
  // eslint-disable-next-line no-console
  console.log('[db] Using database connection (unparsed):', '***');
}

const { Pool } = pg;

const pool = new Pool({
  connectionString: resolvedDatabaseUrl,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
  application_name: 'trafficmena-hub',
});

// Prevent unhandled idle-client errors (e.g. during a Postgres restart) from crashing the process.
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] idle client error:', err);
});

export const db = drizzle(pool);
export const connectionPool = pool;

export async function closeDb() {
  await pool.end();
}
