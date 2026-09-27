ALTER TABLE "ecd_bookings" ADD COLUMN "registration_source" text DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_bookings" ADD COLUMN "grant_reason" text;--> statement-breakpoint
ALTER TABLE "ecd_bookings" ADD COLUMN "is_complimentary" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_bookings" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
CREATE INDEX "ecd_bookings_registration_source_idx" ON "ecd_bookings" USING btree ("registration_source");
