BEGIN;

UPDATE series
SET is_premium = true,
    updated_at = NOW()
WHERE is_premium = false
  AND track_id IS NOT NULL
  AND track_id IN (
    SELECT id
    FROM tracks
    WHERE is_published = true
      AND price_in_cents IS NOT NULL
      AND price_in_cents > 0
  );

UPDATE library_assets
SET is_premium = true,
    updated_at = NOW()
WHERE is_premium = false
  AND id IN (
    SELECT sa.asset_id
    FROM series_assets sa
    JOIN series s ON s.id = sa.series_id
    JOIN tracks t ON t.id = s.track_id
    WHERE t.is_published = true
      AND t.price_in_cents IS NOT NULL
      AND t.price_in_cents > 0
  );

COMMIT;
