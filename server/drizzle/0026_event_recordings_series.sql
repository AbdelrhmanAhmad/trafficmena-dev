ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "series_event_id_unique" ON "series" ("event_id") WHERE "event_id" IS NOT NULL;

-- Backfill Series for standalone events (not in any track)
INSERT INTO "series" ("title", "description", "event_id", "is_published", "is_premium", "sales_enabled")
SELECT
  e.title || ' Recordings',
  'Recording from ' || e.title,
  e.id,
  false,
  false,
  false
FROM "events" e
WHERE NOT EXISTS (SELECT 1 FROM "track_events" te WHERE te.event_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM "series" s WHERE s.event_id = e.id);

-- Link existing event library assets to their event Series
INSERT INTO "series_assets" ("series_id", "asset_id", "sort_order")
SELECT s.id, la.id, 0
FROM "library_assets" la
INNER JOIN "series" s ON s.event_id = la.event_id
WHERE la.event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "series_assets" sa
    WHERE sa.series_id = s.id AND sa.asset_id = la.id
  );
