ALTER TABLE "events" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "events_is_published_idx" ON "events" USING btree ("is_published");