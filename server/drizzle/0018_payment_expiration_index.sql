-- Add partial index for payment expiration job
-- Optimizes: WHERE status = 'pending' AND created_at <= threshold
CREATE INDEX IF NOT EXISTS "payments_pending_created_at_idx"
ON "payments" ("created_at")
WHERE status = 'pending';
