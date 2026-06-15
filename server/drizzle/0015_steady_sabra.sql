DO $$
BEGIN
  CREATE TYPE "public"."track_booking_source" AS ENUM('paid', 'free', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "source_track_booking_id" uuid;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "booking_source" "track_booking_source";--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "manual_reference" text;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "granted_by" uuid;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "grant_reason" text;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "revoke_reason" text;--> statement-breakpoint
UPDATE "track_bookings" AS tb
SET "booking_source" = CASE
  WHEN p."amount_cents" > 0 THEN 'paid'::"track_booking_source"
  ELSE 'free'::"track_booking_source"
END
FROM "payments" AS p
WHERE tb."booking_source" IS NULL
  AND tb."payment_id" = p."id";--> statement-breakpoint
UPDATE "track_bookings"
SET "booking_source" = 'free'::"track_booking_source"
WHERE "booking_source" IS NULL;--> statement-breakpoint
UPDATE "event_attendees" AS ea
SET "source_track_booking_id" = tb."id"
FROM "track_bookings" AS tb
JOIN "track_events" AS te ON te."track_id" = tb."track_id"
WHERE ea."source_track_booking_id" IS NULL
  AND ea."event_id" = te."event_id"
  AND ea."user_id" = tb."user_id"
  AND tb."payment_id" IS NOT NULL
  AND ea."payment_id" = tb."payment_id";--> statement-breakpoint
UPDATE "event_attendees" AS ea
SET "source_track_booking_id" = tb."id"
FROM "track_bookings" AS tb
JOIN "track_events" AS te ON te."track_id" = tb."track_id"
WHERE ea."source_track_booking_id" IS NULL
  AND ea."event_id" = te."event_id"
  AND ea."user_id" = tb."user_id"
  AND tb."payment_id" IS NULL
  AND ea."payment_id" IS NULL
  AND tb."paid_at" IS NULL
  AND ea."paid_at" IS NULL
  AND COALESCE(tb."price_paid_cents", 0) = COALESCE(ea."price_paid_cents", 0)
  AND ea."registered_at" = tb."booked_at";--> statement-breakpoint
ALTER TABLE "track_bookings" ALTER COLUMN "booking_source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_source_track_booking_id_track_bookings_id_fk" FOREIGN KEY ("source_track_booking_id") REFERENCES "public"."track_bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD CONSTRAINT "track_bookings_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD CONSTRAINT "track_bookings_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_attendees_source_track_booking_idx" ON "event_attendees" USING btree ("source_track_booking_id");--> statement-breakpoint
CREATE INDEX "track_bookings_active_track_idx" ON "track_bookings" USING btree ("track_id","revoked_at");--> statement-breakpoint
CREATE INDEX "track_bookings_active_user_idx" ON "track_bookings" USING btree ("user_id","revoked_at");--> statement-breakpoint
