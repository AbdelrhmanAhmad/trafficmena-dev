/**
 * Apply 0028 ECD sponsor inquiries.
 *   cd server && node scripts/apply-ecd-sponsor-inquiries-migration.mjs
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

const client = new pg.Client({ connectionString });
await client.connect();

const sqlPath = path.join(serverRoot, 'drizzle', '0039_ecd_sponsor_inquiries.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const statements = sql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`applying ${statements.length} statements from 0028`);
for (const statement of statements) {
  console.log('running', statement.slice(0, 80).replace(/\s+/g, ' '), '...');
  await client.query(statement);
}

await client.end();
console.log('OK');
