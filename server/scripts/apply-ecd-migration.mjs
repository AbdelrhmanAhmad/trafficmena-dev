/**
 * Apply 0022 ECD tables when drizzle-kit migrate skips/records without creating them.
 *
 * On the server:
 *   cd /var/www/trafficmena-dev/server
 *   node scripts/apply-ecd-migration.mjs
 *
 * Uses DATABASE_ADMIN_URL when set (needed to CREATE TYPE/TABLE), else DATABASE_URL.
 */
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

config({ path: path.join(serverRoot, '.env') });

const connectionString = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL (or DATABASE_ADMIN_URL) is missing');
  process.exit(1);
}

const usingAdmin = Boolean(process.env.DATABASE_ADMIN_URL);
console.log(
  'connecting via',
  usingAdmin ? 'DATABASE_ADMIN_URL' : 'DATABASE_URL',
  '→',
  connectionString.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@'),
);

const client = new pg.Client({ connectionString });
await client.connect();

const dbInfo = await client.query('SELECT current_database() AS db, current_user AS role');
console.log('connected', dbInfo.rows[0]);

const tables = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ecd_%' ORDER BY 1`,
);
console.log(
  'before',
  tables.rows.map((r) => r.tablename),
);

const sqlPath = path.join(serverRoot, 'drizzle', '0022_ecd_html_checkout.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Missing migration file:', sqlPath);
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, 'utf8');

if (tables.rows.length === 0) {
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`applying ${statements.length} statements from 0022_ecd_html_checkout.sql`);
  for (const statement of statements) {
    console.log('running', statement.slice(0, 72).replace(/\s+/g, ' '), '...');
    await client.query(statement);
  }
  console.log('applied 0022_ecd_html_checkout.sql');
} else {
  console.log('ECD tables already present — skipped create');
}

const after = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ecd_%' ORDER BY 1`,
);
console.log(
  'after',
  after.rows.map((r) => r.tablename),
);

try {
  const mig = await client.query(
    `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 8`,
  );
  console.log(
    'recent drizzle migrations',
    mig.rows.map((r) => ({ id: r.id, hash: String(r.hash).slice(0, 12), at: r.created_at })),
  );
} catch (e) {
  console.warn('could not read drizzle.__drizzle_migrations (non-fatal):', e.message);
}

await client.end();

if (after.rows.length < 4) {
  console.error('EXPECTED 4 ecd_* tables — migration incomplete');
  process.exit(1);
}
console.log('OK');
