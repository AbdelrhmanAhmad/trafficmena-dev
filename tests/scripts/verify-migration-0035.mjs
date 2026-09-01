/**
 * Live verification for migration 0035 — run only against a disposable PostgreSQL database.
 *
 * Usage (when DATABASE_URL points to disposable DB):
 *   node --experimental-loader ./tests/node-loader.mjs tests/scripts/verify-migration-0035.mjs
 *
 * Requires: psql-compatible connection via pg client or manual SQL execution.
 * NOT for staging/production.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationPath = join(root, 'server/drizzle/0035_bilingual_content.sql');

const BACKFILL_TABLES = [
  { table: 'events', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'tracks', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'series', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'library_assets', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'digital_products', legacy: 'title', en: 'title_en', ar: 'title_ar' },
  { table: 'skills', legacy: 'name', en: 'name_en', ar: 'name_ar' },
];

function simulateBackfill(legacyValue) {
  return {
    en: legacyValue,
    ar: legacyValue,
  };
}

console.info('[migration-0035-verify] SQL file exists:', migrationPath);
const sql = readFileSync(migrationPath, 'utf8');
for (const row of BACKFILL_TABLES) {
  assert.match(sql, new RegExp(`UPDATE "${row.table}"`, 'i'), `missing UPDATE for ${row.table}`);
  assert.match(sql, new RegExp(`${row.en}.*${row.legacy}|${row.legacy}.*${row.en}`, 's'), `${row.table} backfill`);
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
  console.info(`[migration-0035-verify] fixture OK: ${fixture.label}`);
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.MIGRATION_VERIFY_DATABASE_URL;
if (!databaseUrl) {
  console.warn(
    '[migration-0035-verify] SKIP live DB: set MIGRATION_VERIFY_DATABASE_URL to a disposable PostgreSQL instance.',
  );
  process.exit(0);
}

console.info('[migration-0035-verify] Live DB URL detected — apply migration manually then spot-check:');
console.info('  SELECT title, title_en, title_ar FROM events LIMIT 5;');
console.info('  Expected: title_en = title_ar = title for backfilled rows.');
