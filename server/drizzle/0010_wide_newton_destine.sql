CREATE TABLE "track_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "track_assets" ADD CONSTRAINT "track_assets_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_assets" ADD CONSTRAINT "track_assets_asset_id_library_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."library_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "track_assets_track_idx" ON "track_assets" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_assets_asset_idx" ON "track_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "track_assets_unique" ON "track_assets" USING btree ("track_id","asset_id");