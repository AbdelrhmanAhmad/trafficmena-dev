-- W9: Backfill experts from legacy events.guest_experts JSONB arrays (reconcile phase)
-- Retains guest_experts column — no DROP. No user auto-assignment.

CREATE TABLE IF NOT EXISTS "_w9_migration_fingerprint" (
  "fingerprint" text PRIMARY KEY,
  "expert_id" uuid NOT NULL REFERENCES "experts"("id") ON DELETE CASCADE
);
--> statement-breakpoint
DO $$
DECLARE
  rec RECORD;
  elem jsonb;
  fp text;
  expert_uuid uuid;
  name_en text;
  name_ar text;
  bio_en text;
  bio_ar text;
  image_url text;
  base_slug text;
  final_slug text;
  slug_suffix int;
BEGIN
  FOR rec IN
    SELECT id, guest_experts FROM events
    WHERE guest_experts IS NOT NULL AND jsonb_typeof(guest_experts) = 'array'
  LOOP
    FOR elem IN SELECT value FROM jsonb_array_elements(rec.guest_experts) AS t(value)
    LOOP
      name_en := COALESCE(NULLIF(trim(elem->>'name_en'), ''), NULLIF(trim(elem->>'name'), ''), '');
      name_ar := COALESCE(NULLIF(trim(elem->>'name_ar'), ''), NULLIF(trim(elem->>'name'), ''), name_en);
      bio_en := COALESCE(elem->>'bio_en', elem->>'bio', '');
      bio_ar := COALESCE(elem->>'bio_ar', elem->>'bio', bio_en);
      image_url := NULLIF(trim(elem->>'image_url'), '');

      IF name_en = '' AND name_ar = '' THEN
        CONTINUE;
      END IF;

      fp := lower(name_en) || '|' || lower(name_ar) || '|' || bio_en || '|' || bio_ar || '|' || COALESCE(image_url, '');

      SELECT expert_id INTO expert_uuid FROM _w9_migration_fingerprint WHERE fingerprint = fp;

      IF expert_uuid IS NULL THEN
        base_slug := regexp_replace(lower(name_en), '[^a-z0-9]+', '-', 'g');
        base_slug := trim(both '-' from base_slug);
        IF base_slug = '' OR base_slug IS NULL THEN
          base_slug := 'expert';
        END IF;
        final_slug := base_slug;
        slug_suffix := 2;
        WHILE EXISTS (SELECT 1 FROM experts WHERE slug = final_slug) LOOP
          final_slug := base_slug || '-' || slug_suffix::text;
          slug_suffix := slug_suffix + 1;
        END LOOP;

        INSERT INTO experts (
          slug, display_name, display_name_en, display_name_ar,
          bio_en, bio_ar, avatar_url, is_published
        ) VALUES (
          final_slug,
          name_en,
          name_en,
          name_ar,
          NULLIF(bio_en, ''),
          NULLIF(bio_ar, ''),
          image_url,
          false
        ) RETURNING id INTO expert_uuid;

        INSERT INTO _w9_migration_fingerprint (fingerprint, expert_id) VALUES (fp, expert_uuid);
      END IF;

      INSERT INTO event_experts (event_id, expert_id, sort_order)
      VALUES (rec.id, expert_uuid, 0)
      ON CONFLICT (event_id, expert_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "_w9_migration_fingerprint";
