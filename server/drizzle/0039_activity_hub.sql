-- W10: Activity Hub — channels, posts, announcements

CREATE TYPE "activity_channel_type" AS ENUM ('staff_post', 'entitlement_gated', 'open');
--> statement-breakpoint
CREATE TYPE "activity_post_status" AS ENUM ('draft', 'pending', 'published', 'rejected', 'archived');
--> statement-breakpoint
CREATE TYPE "activity_announcement_status" AS ENUM ('draft', 'scheduled', 'published', 'cancelled', 'archived');
--> statement-breakpoint
CREATE TABLE "activity_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name_en" text NOT NULL,
  "name_ar" text NOT NULL,
  "description_en" text,
  "description_ar" text,
  "channel_type" "activity_channel_type" NOT NULL,
  "cover_image_url" text NOT NULL,
  "requires_approval" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "activity_channels_slug_idx" ON "activity_channels" ("slug");
--> statement-breakpoint
CREATE INDEX "activity_channels_type_idx" ON "activity_channels" ("channel_type");
--> statement-breakpoint
CREATE INDEX "activity_channels_archived_idx" ON "activity_channels" ("archived_at");
--> statement-breakpoint
CREATE TABLE "activity_channel_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL REFERENCES "activity_channels"("id") ON DELETE CASCADE,
  "track_id" uuid REFERENCES "tracks"("id") ON DELETE CASCADE,
  "masterclass_id" uuid REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "activity_channel_entitlements_one_target" CHECK (
    (track_id IS NOT NULL AND masterclass_id IS NULL)
    OR (track_id IS NULL AND masterclass_id IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "activity_channel_entitlements_channel_track_idx" ON "activity_channel_entitlements" ("channel_id", "track_id") WHERE "track_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "activity_channel_entitlements_channel_masterclass_idx" ON "activity_channel_entitlements" ("channel_id", "masterclass_id") WHERE "masterclass_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "activity_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL REFERENCES "activity_channels"("id") ON DELETE CASCADE,
  "author_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "body_html" text NOT NULL DEFAULT '',
  "locale_hint" text,
  "link_url" text,
  "image_url" text,
  "status" "activity_post_status" DEFAULT 'draft' NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "published_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "moderated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "moderated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_posts_channel_idx" ON "activity_posts" ("channel_id");
--> statement-breakpoint
CREATE INDEX "activity_posts_author_idx" ON "activity_posts" ("author_user_id");
--> statement-breakpoint
CREATE INDEX "activity_posts_status_idx" ON "activity_posts" ("status");
--> statement-breakpoint
CREATE INDEX "activity_posts_published_at_idx" ON "activity_posts" ("published_at" DESC);
--> statement-breakpoint
CREATE TABLE "activity_announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid REFERENCES "activity_channels"("id") ON DELETE SET NULL,
  "title_en" text NOT NULL,
  "title_ar" text NOT NULL,
  "body_en" text NOT NULL DEFAULT '',
  "body_ar" text NOT NULL DEFAULT '',
  "status" "activity_announcement_status" DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp with time zone,
  "published_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_announcements_status_idx" ON "activity_announcements" ("status");
--> statement-breakpoint
CREATE INDEX "activity_announcements_scheduled_at_idx" ON "activity_announcements" ("scheduled_at");
