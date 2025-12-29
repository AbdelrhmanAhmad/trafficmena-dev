-- Separate Event Tracks from Content Series
-- Drop track_assets table (was conflating booking tracks with content organization)
DROP TABLE IF EXISTS "track_assets";

-- Create series table for content organization
CREATE TABLE IF NOT EXISTS "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create series_assets junction table
CREATE TABLE IF NOT EXISTS "series_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "series_assets" ADD CONSTRAINT "series_assets_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "series_assets" ADD CONSTRAINT "series_assets_asset_id_library_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."library_assets"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX IF NOT EXISTS "series_sort_order_idx" ON "series" USING btree ("sort_order");
CREATE INDEX IF NOT EXISTS "series_is_published_idx" ON "series" USING btree ("is_published");
CREATE INDEX IF NOT EXISTS "series_assets_series_idx" ON "series_assets" USING btree ("series_id");
CREATE INDEX IF NOT EXISTS "series_assets_asset_idx" ON "series_assets" USING btree ("asset_id");
CREATE UNIQUE INDEX IF NOT EXISTS "series_assets_unique" ON "series_assets" USING btree ("series_id","asset_id");
