import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'server/package.json'));
const pg = require('pg');

const envPath = join(root, 'server/.env');
const env = readFileSync(envPath, 'utf8');
const dbLine = env.split('\n').find((line) => line.startsWith('DATABASE_URL=') && !line.trim().startsWith('#'));
if (!dbLine) throw new Error('DATABASE_URL not found in server/.env');
const url = dbLine.split('=').slice(1).join('=').trim();
const parsed = new URL(url);

console.log('Connection target (safe):');
console.log('  host:', parsed.hostname);
console.log('  port:', parsed.port || '5432');
console.log('  database:', parsed.pathname.replace(/^\//, ''));
console.log('  user:', parsed.username);
console.log('  local only:', ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname));

if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
  throw new Error('Refusing non-local host');
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const mig = await client.query(
  'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
);
console.log('Applied migrations count:', mig.rowCount);
console.log('Latest 10 migration hashes:');
for (const row of mig.rows.slice(-10)) {
  console.log(' ', row.id, String(row.hash).slice(0, 16) + '…', row.created_at);
}

const cols = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'events'
     AND column_name IN ('title', 'title_en', 'title_ar', 'guest_experts')
   ORDER BY 1`,
);
console.log('events columns:', cols.rows.map((r) => r.column_name).join(', '));

const counts = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM events) AS events,
    (SELECT COUNT(*)::int FROM tracks) AS tracks,
    (SELECT COUNT(*)::int FROM series) AS series,
    (SELECT COUNT(*)::int FROM library_assets) AS library_assets
`);
console.log('Row counts:', counts.rows[0]);

await client.end();
