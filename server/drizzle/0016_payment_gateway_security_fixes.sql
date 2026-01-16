-- Payment Gateway Security Fixes Migration
-- Adds missing FK constraint and CHECK constraints for data integrity

-- P1-7: Add FK constraint on event_attendees.payment_id
-- Ensures payment references are valid and orphaned references are cleaned up
ALTER TABLE "event_attendees"
ADD CONSTRAINT "event_attendees_payment_id_fk"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL;

-- P1-8: Add CHECK constraint for positive amounts on payments
-- Prevents negative payment amounts which could corrupt financial data
ALTER TABLE "payments"
ADD CONSTRAINT "payments_amount_positive" CHECK (amount_cents >= 0);

-- Add CHECK constraint for positive amounts on subscriptions
ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_price_positive" CHECK (price_paid_cents >= 0);

-- Add CHECK constraint for valid discount percentage on platform_settings
ALTER TABLE "platform_settings"
ADD CONSTRAINT "platform_settings_discount_valid"
CHECK (subscriber_discount_percent IS NULL OR (subscriber_discount_percent >= 1 AND subscriber_discount_percent <= 99));

-- Add index on payments.created_at for efficient payment history queries
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments" USING btree ("created_at");

-- Add composite index for efficient active subscription lookup (if not exists)
CREATE INDEX IF NOT EXISTS "subscriptions_active_lookup_idx"
ON "subscriptions" USING btree ("user_id", "subscription_status", "ends_at");
