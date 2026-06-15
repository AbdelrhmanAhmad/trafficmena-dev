DO $$
BEGIN
	CREATE TYPE "public"."subscription_source" AS ENUM('paid', 'legacy', 'gift');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"granted_by" uuid,
	"grant_reason" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoke_reason" text
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "source" "subscription_source" DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "granted_by" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "grant_reason" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "revoke_reason" text;--> statement-breakpoint
UPDATE "subscriptions"
SET "source" = 'legacy'::"subscription_source"
WHERE payment_id IS NULL
	AND COALESCE(price_paid_cents, 0) <= 0
	AND "source" = 'paid'::"subscription_source";--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "series_access_grants" ADD CONSTRAINT "series_access_grants_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "series_access_grants" ADD CONSTRAINT "series_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "series_access_grants" ADD CONSTRAINT "series_access_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "series_access_grants" ADD CONSTRAINT "series_access_grants_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_access_grants_active_by_series_idx" ON "series_access_grants" USING btree ("series_id","revoked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_access_grants_active_by_user_idx" ON "series_access_grants" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "series_access_grants_active_unique" ON "series_access_grants" USING btree ("series_id","user_id") WHERE revoked_at is null;--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions_0013_backup" (LIKE "subscriptions" INCLUDING ALL);--> statement-breakpoint
-- Drop inherited FK constraints from backup table to prevent CASCADE deletes
-- from destroying rollback data if a user is deleted before rollback.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'subscriptions_0013_backup'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE "subscriptions_0013_backup" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "subscriptions_0013_backup" ADD COLUMN IF NOT EXISTS "backup_reason" text;--> statement-breakpoint
ALTER TABLE "subscriptions_0013_backup" ADD COLUMN IF NOT EXISTS "backed_up_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_0013_backup_id_unique" ON "subscriptions_0013_backup" USING btree ("id");--> statement-breakpoint
WITH ranked_active_subscriptions AS (
	SELECT
		user_id,
		id,
		ends_at,
		row_number() OVER (
			PARTITION BY user_id
			ORDER BY ends_at DESC, created_at DESC, id DESC
		) AS rn
	FROM "subscriptions"
	WHERE subscription_status = 'active'
		AND revoked_at IS NULL
)
INSERT INTO "subscriptions_0013_backup"
SELECT
	s.*,
	CASE
		WHEN ranked.rn > 1 THEN 'duplicate_active_subscription'
		ELSE 'expired_active_subscription'
	END AS backup_reason,
	now() AS backed_up_at
FROM "subscriptions" AS s
INNER JOIN ranked_active_subscriptions AS ranked ON ranked.id = s.id
WHERE ranked.rn > 1 OR ranked.ends_at < now()
ON CONFLICT ("id") DO UPDATE
SET
	"user_id" = EXCLUDED."user_id",
	"subscription_status" = EXCLUDED."subscription_status",
	"starts_at" = EXCLUDED."starts_at",
	"ends_at" = EXCLUDED."ends_at",
	"source" = EXCLUDED."source",
	"price_paid_cents" = EXCLUDED."price_paid_cents",
	"payment_id" = EXCLUDED."payment_id",
	"granted_by" = EXCLUDED."granted_by",
	"grant_reason" = EXCLUDED."grant_reason",
	"revoked_at" = EXCLUDED."revoked_at",
	"revoked_by" = EXCLUDED."revoked_by",
	"revoke_reason" = EXCLUDED."revoke_reason",
	"created_at" = EXCLUDED."created_at",
	"backup_reason" = EXCLUDED."backup_reason",
	"backed_up_at" = EXCLUDED."backed_up_at";--> statement-breakpoint
UPDATE "subscriptions" AS s
SET
	subscription_status = 'expired',
	revoked_at = COALESCE(s.revoked_at, now()),
	revoke_reason = COALESCE(
		s.revoke_reason,
		'Auto-expired to enforce one active subscription per user.'
	)
FROM "subscriptions_0013_backup" AS backup
WHERE s.id = backup.id
	AND s.subscription_status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_one_active_per_user" ON "subscriptions" USING btree ("user_id") WHERE subscription_status = 'active' AND revoked_at IS NULL;
