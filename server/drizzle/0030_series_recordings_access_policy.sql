ALTER TABLE "series"
  ADD COLUMN IF NOT EXISTS "recordings_access_policy" text
  DEFAULT 'free_for_prior_buyers' NOT NULL;

ALTER TABLE "series"
  DROP CONSTRAINT IF EXISTS "series_recordings_access_policy_check";

ALTER TABLE "series"
  ADD CONSTRAINT "series_recordings_access_policy_check"
  CHECK ("recordings_access_policy" IN ('free_for_prior_buyers', 'everyone_pays'));
