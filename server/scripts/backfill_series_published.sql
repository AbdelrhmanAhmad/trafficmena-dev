BEGIN;

UPDATE series
SET is_published = true,
    updated_at = NOW()
WHERE is_published = false
  AND track_id IS NOT NULL
  AND track_id IN (
    SELECT id
    FROM tracks
    WHERE is_published = true
  );

COMMIT;
