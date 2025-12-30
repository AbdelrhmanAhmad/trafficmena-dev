-- Content Permission System Migration
-- Add isPublic to library_assets for manager override of access control
-- Add trackId FK to series for auto-created recording collections

-- Add isPublic column to library_assets (defaults to false for existing assets)
ALTER TABLE "library_assets" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;

-- Add index for isPublic filtering
CREATE INDEX IF NOT EXISTS "library_assets_is_public_idx" ON "library_assets" USING btree ("is_public");

-- Add trackId column to series (nullable, links auto-created series to tracks)
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "track_id" uuid;

-- Add foreign key constraint for trackId -> tracks
ALTER TABLE "series" ADD CONSTRAINT "series_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;

-- Add index for trackId lookup
CREATE INDEX IF NOT EXISTS "series_track_id_idx" ON "series" USING btree ("track_id");
