CREATE TYPE "public"."registration_status" AS ENUM('active', 'cancelled', 'refund_requested');--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "status" "registration_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "refund_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "admin_note" text;--> statement-breakpoint
CREATE INDEX "event_attendees_status_idx" ON "event_attendees" USING btree ("status");