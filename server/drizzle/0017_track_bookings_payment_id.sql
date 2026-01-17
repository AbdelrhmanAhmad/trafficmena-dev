-- Add payment_id column to track_bookings for audit trail
ALTER TABLE "track_bookings"
ADD COLUMN "payment_id" uuid REFERENCES payments(id) ON DELETE SET NULL;

-- Add index for efficient lookup by payment
CREATE INDEX IF NOT EXISTS "track_bookings_payment_id_idx"
ON "track_bookings" USING btree ("payment_id");
