-- ECD agenda sessions (Main / Second stage + FJ workshop tracks)
CREATE TABLE IF NOT EXISTS "ecd_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "track_index" integer NOT NULL,
  "time_label" text NOT NULL,
  "format" text,
  "category" text,
  "title" text NOT NULL,
  "speaker_label" text DEFAULT 'Speaker will be announced',
  "topics" jsonb,
  "description" text,
  "learn" jsonb,
  "output" text,
  "tools" text,
  "level" text,
  "full_journey_only" integer DEFAULT 0 NOT NULL,
  "capacity" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "published" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ecd_sessions_slug_idx" ON "ecd_sessions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sessions_track_idx" ON "ecd_sessions" USING btree ("track_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sessions_published_idx" ON "ecd_sessions" USING btree ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sessions_sort_idx" ON "ecd_sessions" USING btree ("track_index","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sessions_fj_idx" ON "ecd_sessions" USING btree ("full_journey_only");
