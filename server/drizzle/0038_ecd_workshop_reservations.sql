-- ECD workshop reservations + venue check-in
ALTER TABLE "ecd_bookings" ADD COLUMN IF NOT EXISTS "venue_checked_in_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecd_workshop_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL,
  "session_id" uuid NOT NULL,
  "time_label" text NOT NULL,
  "session_checked_in_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_workshop_res_booking_idx" ON "ecd_workshop_reservations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_workshop_res_session_idx" ON "ecd_workshop_reservations" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ecd_workshop_res_booking_session_uidx" ON "ecd_workshop_reservations" USING btree ("booking_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ecd_workshop_res_booking_time_uidx" ON "ecd_workshop_reservations" USING btree ("booking_id","time_label");
