-- W8: Add bilingual content columns (expand + backfill). Legacy columns retained (deprecated).

-- events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "event_description_en" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "event_description_ar" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location_en" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location_ar" text;
--> statement-breakpoint
UPDATE "events" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "event_description_en" = COALESCE("event_description_en", "event_description"),
  "event_description_ar" = COALESCE("event_description_ar", "event_description"),
  "location_en" = COALESCE("location_en", "location"),
  "location_ar" = COALESCE("location_ar", "location");
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "title_ar" SET NOT NULL;

-- tracks
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "description_ar" text;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "location_en" text;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "location_ar" text;
--> statement-breakpoint
UPDATE "tracks" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description"),
  "location_en" = COALESCE("location_en", "location"),
  "location_ar" = COALESCE("location_ar", "location");
--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "tracks" ALTER COLUMN "title_ar" SET NOT NULL;

-- series
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "series" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "series" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "series" ALTER COLUMN "title_ar" SET NOT NULL;

-- library_assets
ALTER TABLE "library_assets" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "library_assets" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "library_assets" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "library_assets" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "library_assets" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "library_assets" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "library_assets" ALTER COLUMN "title_ar" SET NOT NULL;

-- digital_products
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "digital_products" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "digital_products" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "digital_products" ALTER COLUMN "title_ar" SET NOT NULL;

-- digital_product_files
ALTER TABLE "digital_product_files" ADD COLUMN IF NOT EXISTS "display_name_en" text;
ALTER TABLE "digital_product_files" ADD COLUMN IF NOT EXISTS "display_name_ar" text;
--> statement-breakpoint
UPDATE "digital_product_files" SET
  "display_name_en" = COALESCE("display_name_en", "display_name"),
  "display_name_ar" = COALESCE("display_name_ar", "display_name");
--> statement-breakpoint
ALTER TABLE "digital_product_files" ALTER COLUMN "display_name_en" SET NOT NULL;
ALTER TABLE "digital_product_files" ALTER COLUMN "display_name_ar" SET NOT NULL;

-- digital_product_videos
ALTER TABLE "digital_product_videos" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "digital_product_videos" ADD COLUMN IF NOT EXISTS "title_ar" text;
--> statement-breakpoint
UPDATE "digital_product_videos" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title");
--> statement-breakpoint
ALTER TABLE "digital_product_videos" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "digital_product_videos" ALTER COLUMN "title_ar" SET NOT NULL;

-- masterclasses
ALTER TABLE "masterclasses" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "masterclasses" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "masterclasses" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "masterclasses" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "masterclasses" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "masterclasses" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "masterclasses" ALTER COLUMN "title_ar" SET NOT NULL;

-- masterclass_modules
ALTER TABLE "masterclass_modules" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "masterclass_modules" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "masterclass_modules" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "masterclass_modules" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "masterclass_modules" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "masterclass_modules" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "masterclass_modules" ALTER COLUMN "title_ar" SET NOT NULL;

-- masterclass_lessons
ALTER TABLE "masterclass_lessons" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "masterclass_lessons" ADD COLUMN IF NOT EXISTS "title_ar" text;
ALTER TABLE "masterclass_lessons" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "masterclass_lessons" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "masterclass_lessons" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "masterclass_lessons" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "masterclass_lessons" ALTER COLUMN "title_ar" SET NOT NULL;

-- masterclass_lesson_videos
ALTER TABLE "masterclass_lesson_videos" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "masterclass_lesson_videos" ADD COLUMN IF NOT EXISTS "title_ar" text;
--> statement-breakpoint
UPDATE "masterclass_lesson_videos" SET
  "title_en" = COALESCE("title_en", "title"),
  "title_ar" = COALESCE("title_ar", "title");
--> statement-breakpoint
ALTER TABLE "masterclass_lesson_videos" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "masterclass_lesson_videos" ALTER COLUMN "title_ar" SET NOT NULL;

-- masterclass_lesson_files
ALTER TABLE "masterclass_lesson_files" ADD COLUMN IF NOT EXISTS "display_name_en" text;
ALTER TABLE "masterclass_lesson_files" ADD COLUMN IF NOT EXISTS "display_name_ar" text;
--> statement-breakpoint
UPDATE "masterclass_lesson_files" SET
  "display_name_en" = COALESCE("display_name_en", "display_name"),
  "display_name_ar" = COALESCE("display_name_ar", "display_name");
--> statement-breakpoint
ALTER TABLE "masterclass_lesson_files" ALTER COLUMN "display_name_en" SET NOT NULL;
ALTER TABLE "masterclass_lesson_files" ALTER COLUMN "display_name_ar" SET NOT NULL;

-- masterclass_certificate_settings
ALTER TABLE "masterclass_certificate_settings" ADD COLUMN IF NOT EXISTS "certificate_title_en" text;
ALTER TABLE "masterclass_certificate_settings" ADD COLUMN IF NOT EXISTS "certificate_title_ar" text;
ALTER TABLE "masterclass_certificate_settings" ADD COLUMN IF NOT EXISTS "certificate_description_en" text;
ALTER TABLE "masterclass_certificate_settings" ADD COLUMN IF NOT EXISTS "certificate_description_ar" text;
--> statement-breakpoint
UPDATE "masterclass_certificate_settings" SET
  "certificate_title_en" = COALESCE("certificate_title_en", "certificate_title"),
  "certificate_title_ar" = COALESCE("certificate_title_ar", "certificate_title"),
  "certificate_description_en" = COALESCE("certificate_description_en", "certificate_description"),
  "certificate_description_ar" = COALESCE("certificate_description_ar", "certificate_description");

-- skills
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "name_en" text;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "name_ar" text;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "description_ar" text;
--> statement-breakpoint
UPDATE "skills" SET
  "name_en" = COALESCE("name_en", "name"),
  "name_ar" = COALESCE("name_ar", "name"),
  "description_en" = COALESCE("description_en", "description"),
  "description_ar" = COALESCE("description_ar", "description");
--> statement-breakpoint
ALTER TABLE "skills" ALTER COLUMN "name_en" SET NOT NULL;
ALTER TABLE "skills" ALTER COLUMN "name_ar" SET NOT NULL;

-- invitations (user-facing custom message)
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "custom_message_en" text;
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "custom_message_ar" text;
--> statement-breakpoint
UPDATE "invitations" SET
  "custom_message_en" = COALESCE("custom_message_en", "custom_message"),
  "custom_message_ar" = COALESCE("custom_message_ar", "custom_message");

-- guest_experts JSONB: expand legacy {name,bio,image_url} to bilingual keys in-place
UPDATE "events"
SET "guest_experts" = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name_en', COALESCE(elem->>'name_en', elem->>'name'),
        'name_ar', COALESCE(elem->>'name_ar', elem->>'name'),
        'bio_en', COALESCE(elem->>'bio_en', elem->>'bio'),
        'bio_ar', COALESCE(elem->>'bio_ar', elem->>'bio'),
        'image_url', elem->>'image_url'
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements("guest_experts") AS elem
)
WHERE "guest_experts" IS NOT NULL AND jsonb_typeof("guest_experts") = 'array';
