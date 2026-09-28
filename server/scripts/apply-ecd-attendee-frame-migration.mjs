/**
 * Apply 0043 ECD attendee social frame URL column (idempotent).
 *   cd server && node scripts/apply-ecd-attendee-frame-migration.mjs
 */
import { config } from 'dotenv';
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
await client.query(`
  ALTER TABLE "ecd_bookings" ADD COLUMN IF NOT EXISTS "attendee_frame_url" text;
`);
const check = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'ecd_bookings' AND column_name = 'attendee_frame_url'
`);
console.log('attendee_frame_url present:', check.rows.length > 0);
await client.end();
console.log('OK');
