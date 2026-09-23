-- ECD sponsors fields on ecd_partners (sponsors.html tiers + featured)
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "blurb" text;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "supported_asset" text;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "experience_url" text;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "featured" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "featured_sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ecd_partners" ADD COLUMN IF NOT EXISTS "show_on_home" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_partners_tier_idx" ON "ecd_partners" USING btree ("tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_partners_featured_idx" ON "ecd_partners" USING btree ("featured");
