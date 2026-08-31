ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "current_email_verified_at" timestamp with time zone;
