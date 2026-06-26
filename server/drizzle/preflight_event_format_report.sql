-- Event format migration preflight report for 0018_fast_sleepwalker.sql.
--
-- Run this against staging/production before applying the migration. Every row returned is a row
-- whose explicit event_format backfill differs from the old runtime inference
-- (meeting_link present and location empty). Review and sign off before go-live.

WITH legacy_event_format AS (
  SELECT
    id,
    title,
    meeting_link,
    location,
    CASE
      WHEN lower(btrim(COALESCE(location, ''))) = 'online' THEN 'online'
      WHEN lower(btrim(COALESCE(location, ''))) = 'offline' THEN 'offline'
      WHEN btrim(COALESCE(meeting_link, '')) <> ''
        AND btrim(COALESCE(location, '')) = '' THEN 'online'
      WHEN btrim(COALESCE(meeting_link, '')) = ''
        AND btrim(COALESCE(location, '')) = '' THEN 'online'
      ELSE 'offline'
    END AS proposed_event_format,
    CASE
      WHEN btrim(COALESCE(meeting_link, '')) <> ''
        AND btrim(COALESCE(location, '')) = '' THEN 'online'
      ELSE 'offline'
    END AS old_inferred_event_format,
    CASE
      WHEN lower(btrim(COALESCE(location, ''))) IN ('online', 'offline') THEN true
      ELSE false
    END AS will_clear_location
  FROM events
)
SELECT
  id,
  title,
  meeting_link,
  location,
  old_inferred_event_format,
  proposed_event_format,
  will_clear_location
FROM legacy_event_format
WHERE proposed_event_format <> old_inferred_event_format
   OR will_clear_location = true
ORDER BY title, id;
