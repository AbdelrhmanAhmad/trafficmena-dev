import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const envPath = resolve(currentDir, '.env');

// Diagnostic logging
if (fs.existsSync(envPath)) {
  console.log(`[drizzle.config] Loading .env from: ${envPath}`);
  const result = config({ path: envPath, override: true });
  if (result.parsed) {
    console.log(`[drizzle.config] Loaded ${Object.keys(result.parsed).length} vars from .env`);
  }
} else {
  console.warn(`[drizzle.config] No .env file found at: ${envPath}`);
  // Try fallback to parent directory
  const parentEnvPath = resolve(currentDir, '../.env');
  if (fs.existsSync(parentEnvPath)) {
    console.log(`[drizzle.config] Trying fallback .env at: ${parentEnvPath}`);
    config({ path: parentEnvPath, override: true });
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL;
  }
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgres://${encodeURIComponent(PGUSER)}:${encodeURIComponent(
      PGPASSWORD,
    )}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
  return undefined;
}

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = resolveDatabaseUrl();

if (!adminUrl && !appUrl) {
  console.error('[drizzle.config] ❌ CRITICAL: No database connection URL found.');
  console.error('Checked: DATABASE_URL, DATABASE_ADMIN_URL, and PG* variables.');
  console.error(
    'Current Environment Keys:',
    Object.keys(process.env).filter(
      (k) => k.startsWith('PG') || k.startsWith('DB') || k.startsWith('DATA'),
    ),
  );
} else if (!adminUrl) {
  console.warn(
    '[drizzle.config] DATABASE_ADMIN_URL is not set. Falling back to DATABASE_URL – migrations may fail if this user lacks schema permissions.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  // drizzle-kit expects `out` to be a relative path (it prefixes with `./` internally)
  out: 'drizzle',
  // schema: resolve(currentDir, 'src/db/schema'), 
   schema: './src/db/schema/index.ts',
  dbCredentials: {
    url: adminUrl ?? appUrl ?? '',
  },
  verbose: true,
  strict: true,
});
