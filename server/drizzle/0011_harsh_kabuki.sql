CREATE TABLE "track_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"price_paid_cents" integer
);
--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "track_booking_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "track_booking_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "single_booking_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "single_booking_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "max_track_bookings" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "price_in_cents" integer;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD CONSTRAINT "track_bookings_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_bookings" ADD CONSTRAINT "track_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "track_bookings_track_idx" ON "track_bookings" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_bookings_user_idx" ON "track_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "track_bookings_track_user_unique" ON "track_bookings" USING btree ("track_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "track_events_event_unique" ON "track_events" USING btree ("event_id");