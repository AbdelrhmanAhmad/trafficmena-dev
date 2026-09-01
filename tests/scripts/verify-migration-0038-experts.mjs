/**
 * Live verification for migrations 0037/0038 expert profiles.
 * Local PostgreSQL only (127.0.0.1/localhost).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'server/package.json'));
const pg = require('pg');

function loadLocalDatabaseUrl() {
  const envPath = join(root, 'server/.env');
  if (!existsSync(envPath)) throw new Error('server/.env not found');
  const env = readFileSync(envPath, 'utf8');
  const dbLine = env.split('\n').find((line) => line.startsWith('DATABASE_URL=') && !line.trim().startsWith('#'));
  const url = process.env.MIGRATION_VERIFY_DATABASE_URL ?? process.env.DATABASE_URL ?? dbLine?.split('=').slice(1).join('=').trim();
  if (!url) throw new Error('DATABASE_URL not configured');
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local database host: ${parsed.hostname}`);
  }
  return { url, parsed };
}

const { url, parsed } = loadLocalDatabaseUrl();
console.info('[migration-0038-verify] Live target:', {
  host: parsed.hostname,
  port: parsed.port || '5432',
  database: parsed.pathname.replace(/^\//, ''),
  user: parsed.username,
});

const client = new pg.Client({ connectionString: url });
await client.connect();

for (const table of ['experts', 'expert_skills', 'event_experts']) {
  const exists = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  assert.equal(exists.rowCount, 1, `${table} missing`);
  console.info(`[migration-0038-verify] PASS table ${table}`);
}

const legacyCol = await client.query(
  `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='guest_experts'`,
);
assert.equal(legacyCol.rowCount, 1, 'legacy guest_experts column removed unexpectedly');
console.info('[migration-0038-verify] PASS legacy guest_experts retained');

const eventCountBefore = await client.query(`SELECT COUNT(*)::int AS n FROM events`);
const eventsBefore = eventCountBefore.rows[0].n;

const backfill = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM experts) AS experts,
    (SELECT COUNT(*)::int FROM event_experts) AS links,
    (SELECT COUNT(*)::int FROM events WHERE guest_experts IS NOT NULL AND jsonb_typeof(guest_experts)='array') AS array_events
`);
console.info('[migration-0038-verify] counts:', backfill.rows[0]);

const bilingual = await client.query(`
  SELECT COUNT(*)::int AS bad FROM experts
  WHERE display_name_en IS NULL OR display_name_ar IS NULL
     OR display_name_en = '' OR display_name_ar = ''
`);
assert.equal(bilingual.rows[0].bad, 0, 'experts missing bilingual display names');
console.info('[migration-0038-verify] PASS bilingual display names');

const assignedUnique = await client.query(`
  SELECT assigned_user_id, COUNT(*)::int AS n FROM experts
  WHERE assigned_user_id IS NOT NULL
  GROUP BY assigned_user_id HAVING COUNT(*) > 1
`);
assert.equal(assignedUnique.rowCount, 0, 'duplicate user assignments');
console.info('[migration-0038-verify] PASS assigned user uniqueness');

const eventCountAfter = await client.query(`SELECT COUNT(*)::int AS n FROM events`);
assert.equal(eventCountAfter.rows[0].n, eventsBefore, 'events rows lost');
console.info('[migration-0038-verify] PASS no event row loss');

await client.end();
console.info('[migration-0038-verify] LIVE VERIFICATION PASSED');
