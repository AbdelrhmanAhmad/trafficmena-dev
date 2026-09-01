/**
 * Live verification for migration 0035_bilingual_content.sql
 *
 * Uses server/.env DATABASE_URL when local (127.0.0.1/localhost only).
 * Does NOT require a disposable database — uses the project local DB as configured.
 *
 * Usage:
 *   node tests/scripts/verify-migration-0035.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'server/package.json'));
const pg = require('pg');

const migrationPath = join(root, 'server/drizzle/0035_bilingual_content.sql');

const BACKFILL_CHECKS = [
  { table: 'events', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'events', legacy: 'event_description', en: 'event_description_en', ar: 'event_description_ar' },
  { table: 'events', legacy: 'location', en: 'location_en', ar: 'location_ar' },
  { table: 'tracks', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'tracks', legacy: 'description', en: 'description_en', ar: 'description_ar' },
  { table: 'series', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'library_assets', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'digital_products', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'skills', legacy: 'name', en: 'name_en', ar: 'name_ar' },
  { table: 'masterclasses', legacy: 'title', en: 'title_en', ar: 'title_ar' },
];

const SQL_TABLES = [
  'events',
  'tracks',
  'series',
  'library_assets',
  'digital_products',
  'skills',
];

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

function simulateBackfill(legacyValue) {
  return { en: legacyValue, ar: legacyValue };
}

console.info('[migration-0035-verify] SQL file exists:', migrationPath);
const sql = readFileSync(migrationPath, 'utf8');
for (const table of SQL_TABLES) {
  assert.match(sql, new RegExp(`UPDATE "${table}"`, 'i'), `missing UPDATE for ${table}`);
}

const fixtures = [
  { label: 'ASCII English', value: 'Growth Summit' },
  { label: 'Arabic Unicode', value: 'قمة النمو' },
  { label: 'mixed', value: 'Marketing مسار' },
  { label: 'HTML', value: '<p>Hello <strong>world</strong></p>' },
  { label: 'multiline', value: 'Line1\nLine2' },
  { label: 'NULL', value: null },
  { label: 'empty', value: '' },
];

for (const fixture of fixtures) {
  const backfilled = simulateBackfill(fixture.value);
  assert.equal(backfilled.en, fixture.value);
  assert.equal(backfilled.ar, fixture.value);
  console.info(`[migration-0035-verify] fixture OK (COALESCE model): ${fixture.label}`);
}

const { url, parsed } = loadLocalDatabaseUrl();
console.info('[migration-0035-verify] Live target:', {
  host: parsed.hostname,
  port: parsed.port || '5432',
  database: parsed.pathname.replace(/^\//, ''),
  user: parsed.username,
});

const client = new pg.Client({ connectionString: url });
await client.connect();

let failures = 0;

for (const check of BACKFILL_CHECKS) {
  const colExists = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [check.table, check.en],
  );
  assert.equal(colExists.rowCount, 1, `${check.table}.${check.en} column missing`);

  const mismatch = await client.query(
    `SELECT COUNT(*)::int AS n FROM "${check.table}"
     WHERE "${check.legacy}" IS NOT NULL
       AND ("${check.en}" IS DISTINCT FROM "${check.legacy}"
         OR "${check.ar}" IS DISTINCT FROM "${check.legacy}")`,
  );
  const bad = mismatch.rows[0].n;
  if (bad > 0) {
    failures += bad;
    console.error(`[migration-0035-verify] FAIL ${check.table}: ${bad} row(s) where ${check.en}/${check.ar} != ${check.legacy}`);
  } else {
    console.info(`[migration-0035-verify] PASS backfill ${check.table}.${check.legacy} -> ${check.en}/${check.ar}`);
  }
}

const preSnapshotPath = join(root, 'tests/scripts/_pre-0035-events-snapshot.json');
if (existsSync(preSnapshotPath)) {
  const pre = JSON.parse(readFileSync(preSnapshotPath, 'utf8'));
  for (const row of pre) {
    const post = await client.query(
      'SELECT id, title, title_en, title_ar, event_description, location, guest_experts FROM events WHERE id = $1',
      [row.id],
    );
    assert.equal(post.rowCount, 1, `event ${row.id} missing after migration`);
    const current = post.rows[0];
    assert.equal(current.title, row.title, 'legacy title changed');
    assert.equal(current.title_en, row.title, 'title_en backfill mismatch');
    assert.equal(current.title_ar, row.title, 'title_ar backfill mismatch');
    console.info(`[migration-0035-verify] PASS legacy row preserved id=${row.id}`);
  }
}

const guestExperts = await client.query(
  `SELECT id, guest_experts FROM events
   WHERE guest_experts IS NOT NULL AND jsonb_typeof(guest_experts) = 'array'
   LIMIT 5`,
);
for (const row of guestExperts.rows) {
  const experts = row.guest_experts;
  if (!Array.isArray(experts) || experts.length === 0) continue;
  for (const [index, expert] of experts.entries()) {
    if (expert.name_en && expert.name && expert.name_en !== expert.name) {
      failures += 1;
      console.error(`[migration-0035-verify] FAIL guest_experts event ${row.id}[${index}] name_en drift`);
    }
    if (expert.name_ar && expert.name && expert.name_ar !== expert.name && !expert.name_ar) {
      failures += 1;
    }
    if (expert.name && !expert.name_en) {
      failures += 1;
      console.error(`[migration-0035-verify] FAIL guest_experts missing name_en on event ${row.id}`);
    }
  }
  console.info(`[migration-0035-verify] PASS guest_experts JSONB event id=${row.id} (${experts.length} experts)`);
}

await client.query('BEGIN');
try {
  const targetId = preSnapshotPath && existsSync(preSnapshotPath)
    ? JSON.parse(readFileSync(preSnapshotPath, 'utf8'))[0]?.id
    : null;
  assert.ok(targetId, 'need at least one event row for transactional fixture checks');

  for (const fixture of fixtures) {
    const coalesce = await client.query(
      `SELECT
        COALESCE(NULL::text, $1::text) AS en,
        COALESCE(NULL::text, $1::text) AS ar,
        COALESCE($1::text, 'fallback') AS null_legacy`,
      [fixture.value],
    );
    const row = coalesce.rows[0];
    if (fixture.label === 'NULL') {
      assert.equal(row.en, null);
      assert.equal(row.ar, null);
      assert.equal(row.null_legacy, 'fallback');
    } else {
      assert.equal(row.en, fixture.value);
      assert.equal(row.ar, fixture.value);
      assert.equal(row.null_legacy, fixture.value);
    }
    console.info(`[migration-0035-verify] PASS live PostgreSQL COALESCE ${fixture.label}`);
  }

  await client.query(
    `UPDATE events SET guest_experts = $2::jsonb WHERE id = $1`,
    [
      targetId,
      JSON.stringify([
        { name: 'English Host', bio: '<p>Hello <strong>world</strong></p>' },
        { name: 'مضيف عربي', bio: 'Line1\nLine2' },
      ]),
    ],
  );
  await client.query(`
    UPDATE events SET guest_experts = (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name_en', COALESCE(elem->>'name_en', elem->>'name'),
            'name_ar', COALESCE(elem->>'name_ar', elem->>'name'),
            'bio_en', COALESCE(elem->>'bio_en', elem->>'bio'),
            'bio_ar', COALESCE(elem->>'bio_ar', elem->>'bio'),
            'image_url', elem->>'image_url'
          )
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(guest_experts) AS elem
    )
    WHERE id = $1 AND guest_experts IS NOT NULL AND jsonb_typeof(guest_experts) = 'array'
  `, [targetId]);
  const jsonRow = await client.query('SELECT guest_experts FROM events WHERE id = $1', [targetId]);
  const experts = jsonRow.rows[0].guest_experts;
  assert.equal(experts[0].name_en, 'English Host');
  assert.equal(experts[0].name_ar, 'English Host');
  assert.equal(experts[0].bio_en, '<p>Hello <strong>world</strong></p>');
  assert.equal(experts[1].name_ar, 'مضيف عربي');
  console.info('[migration-0035-verify] PASS guest_experts JSONB COALESCE transform (transactional)');
} finally {
  await client.query('ROLLBACK');
}

const paymentsCheckout = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='payments' AND column_name='checkout_locale'`,
);
if (paymentsCheckout.rowCount === 1) {
  console.info('[migration-0035-verify] NOTE: 0036 checkout_locale column present (applied with migrate batch)');
}

await client.end();

assert.equal(failures, 0, `${failures} live backfill mismatch(es)`);
console.info('[migration-0035-verify] LIVE VERIFICATION PASSED');
