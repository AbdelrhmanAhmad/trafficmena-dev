CREATE TABLE IF NOT EXISTS "track_experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "track_id" uuid NOT NULL REFERENCES "tracks"("id") ON DELETE CASCADE,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "track_experts_track_expert_unique" ON "track_experts" ("track_id", "expert_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "track_experts_track_idx" ON "track_experts" ("track_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "track_experts_expert_idx" ON "track_experts" ("expert_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series_experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "series_id" uuid NOT NULL REFERENCES "series"("id") ON DELETE CASCADE,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "series_experts_series_expert_unique" ON "series_experts" ("series_id", "expert_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_experts_series_idx" ON "series_experts" ("series_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_experts_expert_idx" ON "series_experts" ("expert_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "masterclass_experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "masterclass_id" uuid NOT NULL REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "masterclass_experts_masterclass_expert_unique" ON "masterclass_experts" ("masterclass_id", "expert_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_experts_masterclass_idx" ON "masterclass_experts" ("masterclass_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "masterclass_experts_expert_idx" ON "masterclass_experts" ("expert_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_asset_experts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "library_asset_id" uuid NOT NULL REFERENCES "library_assets"("id") ON DELETE CASCADE,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "library_asset_experts_asset_expert_unique" ON "library_asset_experts" ("library_asset_id", "expert_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_asset_experts_asset_idx" ON "library_asset_experts" ("library_asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_asset_experts_expert_idx" ON "library_asset_experts" ("expert_id");
