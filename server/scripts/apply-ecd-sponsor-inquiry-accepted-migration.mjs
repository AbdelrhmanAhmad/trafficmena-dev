/**
 * Apply 0040 — add accepted status to ecd_sponsor_inquiry_status.
 *   cd server && node scripts/apply-ecd-sponsor-inquiry-accepted-migration.mjs
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

const sqlPath = path.join(serverRoot, 'drizzle', '0040_ecd_sponsor_inquiry_accepted.sql');
const sql = fs.readFileSync(sqlPath, 'utf8').trim();
console.log('applying 0040 ecd_sponsor_inquiry_accepted');
await client.query(sql);
await client.end();
console.log('OK');
