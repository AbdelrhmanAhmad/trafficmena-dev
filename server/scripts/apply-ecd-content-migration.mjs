/**
 * Apply 0034 ECD content CMS tables + seed packages.
 *
 *   cd server && node scripts/apply-ecd-content-migration.mjs
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
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

const client = new pg.Client({ connectionString });
await client.connect();

const needed = [
  'ecd_partners',
  'ecd_speakers',
  'ecd_ticket_packages',
  'ecd_ticket_features',
];
const existing = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
  [needed],
);
const have = new Set(existing.rows.map((r) => r.tablename));
const missing = needed.filter((t) => !have.has(t));

if (missing.length > 0) {
  const sqlPath = path.join(serverRoot, 'drizzle', '0034_ecd_content_cms.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Missing migration file:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`applying ${statements.length} statements from 0034_ecd_content_cms.sql`);
  for (const statement of statements) {
    console.log('running', statement.slice(0, 72).replace(/\s+/g, ' '), '...');
    await client.query(statement);
  }
} else {
  console.log('ECD content tables already present — skipped create');
}

await client.end();

const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed-ecd-content.mjs')], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
});
if (seed.status !== 0) {
  process.exit(seed.status || 1);
}
console.log('OK');

