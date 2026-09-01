-- W9: Expert profiles entity + relations (expand phase)

CREATE TABLE IF NOT EXISTS "experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "display_name" text NOT NULL,
  "display_name_en" text NOT NULL,
  "display_name_ar" text NOT NULL,
  "headline_en" text,
  "headline_ar" text,
  "bio_en" text,
  "bio_ar" text,
  "avatar_url" text,
  "website_url" text,
  "linkedin_url" text,
  "twitter_url" text,
  "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "published_at" timestamptz,
  "archived_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "experts_slug_unique" ON "experts" ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "experts_assigned_user_unique" ON "experts" ("assigned_user_id") WHERE "assigned_user_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experts_is_published_idx" ON "experts" ("is_published");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experts_archived_at_idx" ON "experts" ("archived_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_skills" (
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE CASCADE,
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expert_skills_expert_skill_pk" ON "expert_skills" ("expert_id", "skill_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_experts_event_expert_unique" ON "event_experts" ("event_id", "expert_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_experts_event_idx" ON "event_experts" ("event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_experts_expert_idx" ON "event_experts" ("expert_id");
