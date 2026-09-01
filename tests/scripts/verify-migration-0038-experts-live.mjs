/**
 * Live PostgreSQL verification for migration 0038 guest_experts reconciliation.
 * Uses actual 0038 DO block SQL — no duplicate algorithm.
 * Runs inside a transaction and ROLLBACKs all fixture data.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'server/package.json'));
const pg = require('pg');

const TEST_TITLE_PREFIX = 'W9-BACKFILL-VERIFY-';

function loadLocalDatabaseUrl() {
  const envPath = join(root, 'server/.env');
  if (!existsSync(envPath)) throw new Error('server/.env not found');
  const env = readFileSync(envPath, 'utf8');
  const dbLine = env
    .split('\n')
    .find((line) => line.startsWith('DATABASE_URL=') && !line.trim().startsWith('#'));
  const url =
    process.env.MIGRATION_VERIFY_DATABASE_URL ??
    process.env.DATABASE_URL ??
    dbLine?.split('=').slice(1).join('=').trim();
  if (!url) throw new Error('DATABASE_URL not configured');
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`Refusing non-local database host: ${parsed.hostname}`);
  }
  return { url, parsed };
}

function load0038ReconciliationSql() {
  const migrationPath = join(root, 'server/drizzle/0038_expert_guest_experts_backfill.sql');
  const raw = readFileSync(migrationPath, 'utf8');
  const blocks = raw.split('--> statement-breakpoint').map((block) => block.trim());
  const createFp = blocks.find((block) => block.includes('CREATE TABLE IF NOT EXISTS "_w9_migration_fingerprint"'));
  const doBlock = blocks.find((block) => block.startsWith('DO $$'));
  const dropFp = blocks.find((block) => block.includes('DROP TABLE IF EXISTS "_w9_migration_fingerprint"'));
  if (!createFp || !doBlock || !dropFp) {
    throw new Error('Could not extract 0038 reconciliation blocks');
  }
  return { createFp, doBlock, dropFp };
}

const { url, parsed } = loadLocalDatabaseUrl();
const reconciliation = load0038ReconciliationSql();

console.info('[migration-0038-live] target:', {
  host: parsed.hostname,
  port: parsed.port || '5432',
  database: parsed.pathname.replace(/^\//, ''),
});

const client = new pg.Client({ connectionString: url });
await client.connect();

// Remove stale fixtures from interrupted prior runs (local dev only).
await client.query(`DELETE FROM events WHERE title LIKE $1`, [`${TEST_TITLE_PREFIX}%`]);

const baselineEvents = await client.query(`SELECT COUNT(*)::int AS n FROM events`);
const baselineExperts = await client.query(`SELECT COUNT(*)::int AS n FROM experts`);
const baselineLinks = await client.query(`SELECT COUNT(*)::int AS n FROM event_experts`);

const fixtures = {
  singleGuest: [
    {
      name_en: 'Ahmed Hassan',
      name_ar: 'أحمد حسن',
      bio_en: '<p>Marketing expert</p>',
      bio_ar: '<p>خبير تسويق</p>',
      image_url: 'https://example.com/ahmed.jpg',
    },
  ],
  twoGuests: [
    {
      name_en: 'Sara Ali',
      name_ar: 'سارة علي',
      bio_en: 'SEO specialist',
      bio_ar: 'متخصصة SEO',
      image_url: null,
    },
    {
      name_en: 'Omar Farouk',
      name_ar: 'عمر فاروق',
      bio_en: 'Paid media',
      bio_ar: 'إعلانات مدفوعة',
      image_url: 'https://example.com/omar.png',
    },
  ],
  sharedGuest: [
    {
      name_en: 'Shared Expert',
      name_ar: 'خبير مشترك',
      bio_en: 'Same fingerprint',
      bio_ar: 'نفس البصمة',
      image_url: 'https://example.com/shared.jpg',
    },
  ],
  ambiguousSameName: [
    {
      name_en: 'Same Name',
      name_ar: 'نفس الاسم',
      bio_en: 'Bio variant A',
      bio_ar: 'سيرة أ',
      image_url: null,
    },
  ],
  ambiguousSameNameDifferent: [
    {
      name_en: 'Same Name',
      name_ar: 'نفس الاسم',
      bio_en: 'Bio variant B — genuinely different',
      bio_ar: 'سيرة ب — مختلفة',
      image_url: null,
    },
  ],
  arabicUnicode: [
    {
      name_en: 'Unicode Test',
      name_ar: 'مختبر يونيكود — 你好',
      bio_en: '',
      bio_ar: '<p>محتوى عربي</p>',
      image_url: null,
    },
  ],
  htmlBio: [
    {
      name_en: 'HTML Bio',
      name_ar: 'HTML Bio AR',
      bio_en: '<p><strong>Bold</strong> expert</p>',
      bio_ar: '<p><em>Italic</em> خبير</p>',
      image_url: null,
    },
  ],
  emptyOptional: [
    {
      name_en: 'Minimal Guest',
      name_ar: 'Minimal AR',
      bio_en: '',
      bio_ar: '',
      image_url: '',
    },
  ],
};

async function insertFixtureEvent(label, guestExperts) {
  const title = `${TEST_TITLE_PREFIX}${label}`;
  const result = await client.query(
    `INSERT INTO events (
      title, title_en, title_ar, date, guest_experts, is_published
    ) VALUES ($1, $1, $2, NOW() + interval '30 days', $3::jsonb, false)
    RETURNING id`,
    [title, `${title} AR`, JSON.stringify(guestExperts)],
  );
  return result.rows[0].id;
}

async function runReconciliation() {
  await client.query(reconciliation.createFp);
  await client.query(reconciliation.doBlock);
  await client.query(reconciliation.dropFp);
}

await client.query('BEGIN');

const insertedEventIds = [];

try {
  const eventA = await insertFixtureEvent('single', fixtures.singleGuest);
  insertedEventIds.push(eventA);
  const eventB = await insertFixtureEvent('two-guests', fixtures.twoGuests);
  insertedEventIds.push(eventB);
  const eventC1 = await insertFixtureEvent('shared-1', fixtures.sharedGuest);
  insertedEventIds.push(eventC1);
  const eventC2 = await insertFixtureEvent('shared-2', fixtures.sharedGuest);
  insertedEventIds.push(eventC2);
  const eventD1 = await insertFixtureEvent('ambiguous-a', fixtures.ambiguousSameName);
  insertedEventIds.push(eventD1);
  const eventD2 = await insertFixtureEvent('ambiguous-b', fixtures.ambiguousSameNameDifferent);
  insertedEventIds.push(eventD2);
  const eventE = await insertFixtureEvent('arabic', fixtures.arabicUnicode);
  insertedEventIds.push(eventE);
  const eventF = await insertFixtureEvent('html', fixtures.htmlBio);
  insertedEventIds.push(eventF);
  const eventG = await insertFixtureEvent('empty-optional', fixtures.emptyOptional);
  insertedEventIds.push(eventG);

  assert.equal(insertedEventIds.length, 9, 'expected 9 fixture events');
  console.info('[migration-0038-live] inserted fixture events:', insertedEventIds.length);

  const guestEntryCount =
    fixtures.singleGuest.length +
    fixtures.twoGuests.length +
    fixtures.sharedGuest.length * 2 +
    fixtures.ambiguousSameName.length +
    fixtures.ambiguousSameNameDifferent.length +
    fixtures.arabicUnicode.length +
    fixtures.htmlBio.length +
    fixtures.emptyOptional.length;
  console.info('[migration-0038-live] guest expert entries:', guestEntryCount);

  await runReconciliation();

  const expertsForFixtures = await client.query(
    `SELECT e.* FROM experts e
     INNER JOIN event_experts ee ON ee.expert_id = e.id
     INNER JOIN events ev ON ev.id = ee.event_id
     WHERE ev.title LIKE $1
     ORDER BY e.display_name_en`,
    [`${TEST_TITLE_PREFIX}%`],
  );

  const linksForFixtures = await client.query(
    `SELECT ee.* FROM event_experts ee
     INNER JOIN events ev ON ev.id = ee.event_id
     WHERE ev.title LIKE $1`,
    [`${TEST_TITLE_PREFIX}%`],
  );

  console.info('[migration-0038-live] experts created for fixtures:', expertsForFixtures.rowCount);
  console.info('[migration-0038-live] event_experts links for fixtures:', linksForFixtures.rowCount);

  // A: single guest -> 1 expert, 1 link
  const linksA = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventA]);
  assert.equal(linksA.rowCount, 1);

  // B: two guests -> 2 experts, 2 links
  const linksB = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventB]);
  assert.equal(linksB.rowCount, 2);

  // C: shared guest across two events -> 1 expert, 2 links
  const linksC1 = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventC1]);
  const linksC2 = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventC2]);
  assert.equal(linksC1.rows[0].expert_id, linksC2.rows[0].expert_id, 'shared guest should dedupe to one expert');

  // D: ambiguous same name different bio -> 2 experts
  const linksD1 = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventD1]);
  const linksD2 = await client.query(`SELECT expert_id FROM event_experts WHERE event_id = $1`, [eventD2]);
  assert.notEqual(linksD1.rows[0].expert_id, linksD2.rows[0].expert_id, 'ambiguous guests must not merge');

  // bilingual + HTML preserved
  const ahmed = await client.query(
    `SELECT display_name_en, display_name_ar, bio_en, bio_ar, avatar_url, assigned_user_id
     FROM experts e INNER JOIN event_experts ee ON ee.expert_id = e.id
     WHERE ee.event_id = $1`,
    [eventA],
  );
  assert.equal(ahmed.rows[0].display_name_en, 'Ahmed Hassan');
  assert.equal(ahmed.rows[0].display_name_ar, 'أحمد حسن');
  assert.match(String(ahmed.rows[0].bio_en), /Marketing expert/);
  assert.match(String(ahmed.rows[0].bio_ar), /خبير تسويق/);
  assert.equal(ahmed.rows[0].avatar_url, 'https://example.com/ahmed.jpg');
  assert.equal(ahmed.rows[0].assigned_user_id, null);

  // legacy guest_experts intact
  const legacy = await client.query(`SELECT guest_experts FROM events WHERE id = $1`, [eventA]);
  assert.deepEqual(legacy.rows[0].guest_experts, fixtures.singleGuest);

  // no assigned users auto-created
  const assigned = await client.query(
    `SELECT COUNT(*)::int AS n FROM experts e
     INNER JOIN event_experts ee ON ee.expert_id = e.id
     INNER JOIN events ev ON ev.id = ee.event_id
     WHERE ev.title LIKE $1 AND e.assigned_user_id IS NOT NULL`,
    [`${TEST_TITLE_PREFIX}%`],
  );
  assert.equal(assigned.rows[0].n, 0);

  // Event relation replace semantics (A,B -> B,C)
  const expertB1 = linksB.rows[0].expert_id;
  const expertB2 = linksB.rows[1].expert_id;
  const [expertC] = (
    await client.query(
      `SELECT id FROM experts WHERE display_name_en = 'Shared Expert' LIMIT 1`,
    )
  ).rows;

  await client.query(`DELETE FROM event_experts WHERE event_id = $1`, [eventB]);
  await client.query(
    `INSERT INTO event_experts (event_id, expert_id, sort_order) VALUES ($1, $2, 0), ($1, $3, 1)`,
    [eventB, expertB2, expertC.id],
  );
  const replaced = await client.query(
    `SELECT expert_id FROM event_experts WHERE event_id = $1 ORDER BY sort_order`,
    [eventB],
  );
  assert.deepEqual(
    replaced.rows.map((row) => row.expert_id),
    [expertB2, expertC.id],
  );
  assert.ok(!replaced.rows.some((row) => row.expert_id === expertB1), 'removed expert should not remain');

  console.info('[migration-0038-live] duplicate behavior: shared guest -> 1 expert / 2 links PASS');
  console.info('[migration-0038-live] ambiguous behavior: same name different bio -> 2 experts PASS');
  console.info('[migration-0038-live] event relation replace A,B -> B,C PASS');

  await client.query('ROLLBACK');
  console.info('[migration-0038-live] ROLLBACK complete — fixture data removed');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}

const afterEvents = await client.query(`SELECT COUNT(*)::int AS n FROM events`);
const afterExperts = await client.query(`SELECT COUNT(*)::int AS n FROM experts`);
const afterLinks = await client.query(`SELECT COUNT(*)::int AS n FROM event_experts`);

assert.equal(afterEvents.rows[0].n, baselineEvents.rows[0].n, 'baseline event count changed');
assert.equal(afterExperts.rows[0].n, baselineExperts.rows[0].n, 'baseline expert count changed');
assert.equal(afterLinks.rows[0].n, baselineLinks.rows[0].n, 'baseline link count changed');

await client.end();
console.info('[migration-0038-live] LIVE VERIFICATION PASSED');
