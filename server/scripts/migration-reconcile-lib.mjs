import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from '../node_modules/drizzle-orm/migrator.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(scriptDir, '..');
export const migrationsFolder = path.join(serverRoot, 'drizzle');

export const UPSTREAM_TAGS = [
  '0016_tidy_nova',
  '0017_amazing_galactus',
  '0018_fast_sleepwalker',
  '0019_misty_wallow',
  '0020_complete_sandman',
  '0021_brief_ezekiel_stane',
];

export const COMMERCE_RENUMBERED_TAGS = [
  '0022_series_sales_pricing',
  '0023_series_orders',
  '0024_digital_products',
  '0025_masterclasses',
  '0026_certificates',
];

export function loadMigrationCatalog() {
  const journalPath = path.join(migrationsFolder, 'meta/_journal.json');
  const journalRaw = fs.readFileSync(journalPath);
  if (journalRaw[0] === 0xef && journalRaw[1] === 0xbb && journalRaw[2] === 0xbf) {
    throw new Error(
      'server/drizzle/meta/_journal.json contains a UTF-8 BOM. Remove it before migrating.',
    );
  }
  const journal = JSON.parse(journalRaw.toString('utf8'));
  const files = readMigrationFiles({ migrationsFolder });
  const entries = journal.entries.map((entry, index) => ({
    idx: entry.idx,
    tag: entry.tag,
    when: entry.when,
    hash: files[index].hash,
    sqlPath: path.join(migrationsFolder, `${entry.tag}.sql`),
  }));
  return { journal, entries };
}

export async function queryScalar(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? null;
}

export async function tableExists(client, tableName) {
  const row = await queryScalar(
    client,
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [tableName],
  );
  return Boolean(row?.ok);
}

export async function columnExists(client, tableName, columnName) {
  const row = await queryScalar(
    client,
    `SELECT 1 AS ok
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );
  return Boolean(row?.ok);
}

export async function enumExists(client, enumName) {
  const row = await queryScalar(
    client,
    `SELECT 1 AS ok FROM pg_type WHERE typname = $1 LIMIT 1`,
    [enumName],
  );
  return Boolean(row?.ok);
}

export async function columnDataType(client, tableName, columnName) {
  const row = await queryScalar(
    client,
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );
  if (!row) return null;
  return row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type;
}

export async function loadAppliedHashes(client) {
  const result = await client.query('SELECT hash FROM drizzle.__drizzle_migrations');
  return new Set(result.rows.map((row) => row.hash));
}

export async function stampMigration(client, entry) {
  await client.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
     SELECT $1, $2
     WHERE NOT EXISTS (
       SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1
     )`,
    [entry.hash, entry.when],
  );
}

export async function fingerprintForTag(client, tag) {
  switch (tag) {
    case '0016_tidy_nova':
      return tableExists(client, 'email_change_requests');
    case '0017_amazing_galactus':
      return columnExists(client, 'events', 'is_published');
    case '0018_fast_sleepwalker':
      return columnExists(client, 'events', 'event_format');
    case '0019_misty_wallow':
      return (
        columnExists(client, 'track_bookings', 'ticket_type') &&
        columnExists(client, 'tracks', 'online_only_price_cents')
      );
    case '0020_complete_sandman':
      return tableExists(client, 'payment_fulfillment_failures');
    case '0021_brief_ezekiel_stane':
      return columnExists(client, 'payments', 'fawaterk_intent_key');
    case '0022_series_sales_pricing':
      return (
        columnExists(client, 'series', 'sales_enabled') &&
        (await columnDataType(client, 'payments', 'fawaterk_invoice_id')) === 'text'
      );
    case '0023_series_orders':
      return tableExists(client, 'orders') && enumExists(client, 'order_status');
    case '0024_digital_products':
      return tableExists(client, 'digital_products');
    case '0025_masterclasses':
      return tableExists(client, 'masterclasses');
    case '0026_certificates':
      return tableExists(client, 'certificates') && enumExists(client, 'certificate_status');
    default:
      return null;
  }
}

const IDEMPOTENT_SQL = {
  '0016_tidy_nova': `
CREATE TABLE IF NOT EXISTS "email_change_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "new_email" text NOT NULL,
  "otp_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "email_change_requests"
    ADD CONSTRAINT "email_change_requests_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "email_change_requests_user_created_at_idx"
  ON "email_change_requests" USING btree ("user_id", "created_at");
`,
  '0017_amazing_galactus': `
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT true NOT NULL;
CREATE INDEX IF NOT EXISTS "events_is_published_idx" ON "events" USING btree ("is_published");
`,
  '0018_fast_sleepwalker': `
DO $$ BEGIN
  CREATE TYPE "public"."event_format" AS ENUM('online', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "event_format" "event_format" DEFAULT 'offline' NOT NULL;
UPDATE "events"
SET "event_format" = 'online'
WHERE "event_format" = 'offline'
  AND "meeting_link" IS NOT NULL
  AND btrim("meeting_link") <> ''
  AND ("location" IS NULL OR btrim("location") = '');
UPDATE "events"
SET "event_format" = 'online'
WHERE "event_format" = 'offline'
  AND ("meeting_link" IS NULL OR btrim("meeting_link") = '')
  AND ("location" IS NULL OR btrim("location") = '');
UPDATE "events"
SET "event_format" = 'online', "location" = NULL
WHERE lower(btrim("location")) = 'online';
UPDATE "events"
SET "location" = NULL
WHERE lower(btrim("location")) = 'offline';
`,
  '0019_misty_wallow': `
DO $$ BEGIN
  CREATE TYPE "public"."ticket_type" AS ENUM('online_only', 'online_offline', 'offline_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "ticket_type" "ticket_type";
ALTER TABLE "track_bookings" ADD COLUMN IF NOT EXISTS "ticket_type" "ticket_type";
UPDATE "track_bookings" SET "ticket_type" = 'online_offline' WHERE "ticket_type" IS NULL;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "online_only_price_cents" integer;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "online_offline_price_cents" integer;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "offline_only_price_cents" integer;
`,
  '0020_complete_sandman': `
CREATE TABLE IF NOT EXISTS "payment_fulfillment_failures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "payment_status" "payment_status" NOT NULL,
  "item_type" "payment_item_type" NOT NULL,
  "item_id" uuid,
  "ticket_type" "ticket_type",
  "invoice_id" integer,
  "amount_cents" integer NOT NULL,
  "confirmation_source" text NOT NULL,
  "error_code" text,
  "error_message" text NOT NULL,
  "failure_count" integer DEFAULT 1 NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid,
  "resolution_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "payment_fulfillment_failures"
    ADD CONSTRAINT "payment_fulfillment_failures_payment_id_payments_id_fk"
    FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_fulfillment_failures"
    ADD CONSTRAINT "payment_fulfillment_failures_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_fulfillment_failures"
    ADD CONSTRAINT "payment_fulfillment_failures_resolved_by_users_id_fk"
    FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payment_fulfillment_failures_payment_idx"
  ON "payment_fulfillment_failures" USING btree ("payment_id");
CREATE INDEX IF NOT EXISTS "payment_fulfillment_failures_unresolved_idx"
  ON "payment_fulfillment_failures" USING btree ("resolved_at");
CREATE INDEX IF NOT EXISTS "payment_fulfillment_failures_invoice_idx"
  ON "payment_fulfillment_failures" USING btree ("invoice_id");
`,
  '0021_brief_ezekiel_stane': `
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fawaterk_intent_key" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fawaterk_transaction_id" bigint;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_fawaterk_intent_key_idx"
  ON "payments" USING btree ("fawaterk_intent_key");
CREATE INDEX IF NOT EXISTS "payments_fawaterk_transaction_id_idx"
  ON "payments" USING btree ("fawaterk_transaction_id");
`,
  '0022_series_sales_pricing': `
ALTER TABLE "payments"
  ALTER COLUMN "fawaterk_invoice_id" TYPE text
  USING "fawaterk_invoice_id"::text;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "price_in_cents" integer;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "sales_enabled" boolean DEFAULT false NOT NULL;
`,
};

export function getIdempotentSql(tag) {
  return IDEMPOTENT_SQL[tag] ?? null;
}

export function isProductionLikeDatabase(databaseUrl) {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.DB_SSL === 'true') return true;
  if (!databaseUrl) return false;
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname.toLowerCase();
    const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      databaseName.endsWith('_dev') ||
      databaseName.endsWith('_test');
    return !isLocal;
  } catch {
    return true;
  }
}
