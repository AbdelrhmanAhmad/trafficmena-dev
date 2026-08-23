CREATE TYPE "masterclass_enrollment_source" AS ENUM ('paid', 'manual');
--> statement-breakpoint
CREATE TYPE "lesson_completion_method" AS ENUM ('manual', 'video');
--> statement-breakpoint
ALTER TYPE "payment_item_type" ADD VALUE IF NOT EXISTS 'masterclass';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclasses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "price_in_cents" integer,
  "is_published" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclasses_published_idx" ON "masterclasses" USING btree ("is_published");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "masterclass_id" uuid NOT NULL REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_modules_class_idx" ON "masterclass_modules" USING btree ("masterclass_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_lessons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module_id" uuid NOT NULL REFERENCES "masterclass_modules"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_lessons_module_idx" ON "masterclass_lessons" USING btree ("module_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_lesson_videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id" uuid NOT NULL REFERENCES "masterclass_lessons"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "video_asset_id" uuid REFERENCES "library_assets"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_lesson_videos_lesson_idx" ON "masterclass_lesson_videos" USING btree ("lesson_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_lesson_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id" uuid NOT NULL REFERENCES "masterclass_lessons"("id") ON DELETE CASCADE,
  "file_type" "digital_product_file_type" NOT NULL,
  "display_name" text NOT NULL,
  "file_url" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_lesson_files_lesson_idx" ON "masterclass_lesson_files" USING btree ("lesson_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "masterclass_id" uuid NOT NULL REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "source" "masterclass_enrollment_source" DEFAULT 'paid' NOT NULL,
  "payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
  "enrolled_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "enrollment_note" text,
  "enrolled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "masterclass_enrollments_user_class_unique" ON "masterclass_enrollments" USING btree ("user_id", "masterclass_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_enrollments_user_idx" ON "masterclass_enrollments" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_lesson_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "masterclass_lessons"("id") ON DELETE CASCADE,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completion_method" "lesson_completion_method" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "masterclass_lesson_progress_user_lesson_unique" ON "masterclass_lesson_progress" USING btree ("user_id", "lesson_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_lesson_progress_user_idx" ON "masterclass_lesson_progress" USING btree ("user_id");
