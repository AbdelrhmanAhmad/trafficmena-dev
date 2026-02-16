-- Prevent subscriptions from being active and revoked at the same time
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_no_active_revoked"
  CHECK (NOT (subscription_status = 'active' AND revoked_at IS NOT NULL));
--> statement-breakpoint
-- Prevent series_access_grants from having revoked_by without revoked_at
ALTER TABLE "series_access_grants"
  ADD CONSTRAINT "series_access_grants_revoke_consistency"
  CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL)
    OR (revoked_at IS NOT NULL)
  );
