CREATE TYPE "public"."ticket_type" AS ENUM('online_only', 'online_offline', 'offline_only');--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "ticket_type" "ticket_type";--> statement-breakpoint
ALTER TABLE "track_bookings" ADD COLUMN "ticket_type" "ticket_type";--> statement-breakpoint
-- Existing bookings granted access to every session in the track, which equals the online_offline
-- variant. Backfill so access checks read a concrete type for legacy rows.
UPDATE "track_bookings" SET "ticket_type" = 'online_offline' WHERE "ticket_type" IS NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "online_only_price_cents" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "online_offline_price_cents" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "offline_only_price_cents" integer;