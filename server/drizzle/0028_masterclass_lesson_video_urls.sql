ALTER TABLE "masterclass_lesson_videos" ADD COLUMN IF NOT EXISTS "video_url" text;
--> statement-breakpoint
UPDATE "masterclass_lesson_videos" mlv
SET "video_url" = COALESCE(NULLIF(TRIM(la.video_url), ''), NULLIF(TRIM(la.embed_url), ''))
FROM "library_assets" la
WHERE la.id = mlv.video_asset_id;
--> statement-breakpoint
DELETE FROM "masterclass_lesson_videos"
WHERE "video_url" IS NULL OR TRIM("video_url") = '';
--> statement-breakpoint
ALTER TABLE "masterclass_lesson_videos" ALTER COLUMN "video_url" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "masterclass_lesson_videos" DROP COLUMN IF EXISTS "video_asset_id";
