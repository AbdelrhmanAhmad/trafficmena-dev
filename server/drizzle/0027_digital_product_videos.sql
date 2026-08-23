CREATE TABLE IF NOT EXISTS "digital_product_videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "digital_products"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "video_url" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_product_videos_product_idx" ON "digital_product_videos" USING btree ("product_id");
--> statement-breakpoint
INSERT INTO "digital_product_videos" ("product_id", "title", "video_url", "sort_order")
SELECT
  dp.id,
  COALESCE(la.title, 'Tutorial video'),
  COALESCE(NULLIF(TRIM(la.video_url), ''), NULLIF(TRIM(la.embed_url), '')),
  0
FROM "digital_products" dp
INNER JOIN "library_assets" la ON la.id = dp.video_asset_id
WHERE dp.video_asset_id IS NOT NULL
  AND (
    (la.video_url IS NOT NULL AND TRIM(la.video_url) <> '')
    OR (la.embed_url IS NOT NULL AND TRIM(la.embed_url) <> '')
  );
--> statement-breakpoint
ALTER TABLE "digital_products" DROP COLUMN IF EXISTS "video_asset_id";
