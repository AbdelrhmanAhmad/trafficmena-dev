-- Normalize invalid historical rows before enforcing strict constraints.
UPDATE "subscriptions"
SET
  "subscription_status" = 'expired',
  "revoked_at" = COALESCE("revoked_at", now()),
  "revoke_reason" = COALESCE(
    "revoke_reason",
    'Auto-corrected by migration 0014: active subscriptions cannot be revoked.'
  )
WHERE "subscription_status" = 'active'
  AND "revoked_at" IS NOT NULL;
--> statement-breakpoint
UPDATE "series_access_grants"
SET
  "revoked_by" = NULL,
  "revoke_reason" = NULL
WHERE "revoked_at" IS NULL
  AND ("revoked_by" IS NOT NULL OR "revoke_reason" IS NOT NULL);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_no_active_revoked'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_no_active_revoked"
      CHECK (NOT ("subscription_status" = 'active' AND "revoked_at" IS NOT NULL))
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  VALIDATE CONSTRAINT "subscriptions_no_active_revoked";
--> statement-breakpoint
-- Permissive by design: revoked_at can be NOT NULL with revoked_by/revoke_reason NULL
-- for system-initiated revocations (auto-expiry, migration cleanup).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'series_access_grants_revoke_consistency'
  ) THEN
    ALTER TABLE "series_access_grants"
      ADD CONSTRAINT "series_access_grants_revoke_consistency"
      CHECK (
        ("revoked_at" IS NULL AND "revoked_by" IS NULL AND "revoke_reason" IS NULL)
        OR ("revoked_at" IS NOT NULL)
      )
      NOT VALID;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "series_access_grants"
  VALIDATE CONSTRAINT "series_access_grants_revoke_consistency";
