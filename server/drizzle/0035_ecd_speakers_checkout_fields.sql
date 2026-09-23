-- ECD speakers CMS fields + checkout buyer extras
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "room_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "speaker_type" text;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "status_tag" text DEFAULT 'Confirmed';--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "expertise" jsonb;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "session_title" text;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "session_label" text;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "proof" text;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "featured" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_speakers" ADD COLUMN IF NOT EXISTS "featured_sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_speakers_featured_idx" ON "ecd_speakers" USING btree ("featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_speakers_room_idx" ON "ecd_speakers" USING btree ("room_index");--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD COLUMN IF NOT EXISTS "store" text;--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD COLUMN IF NOT EXISTS "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD COLUMN IF NOT EXISTS "facebook_url" text;--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD COLUMN IF NOT EXISTS "accessibility_needs" text;--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD COLUMN IF NOT EXISTS "news_opt_in" integer DEFAULT 0 NOT NULL;
