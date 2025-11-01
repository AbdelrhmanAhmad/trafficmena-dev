-- Re-run profile name reset with case-insensitive comparison

WITH derived_names AS (
  SELECT p.id
  FROM "public"."profiles" p
  JOIN "public"."users" u ON u.id = p.id
  WHERE p.first_name IS NOT NULL
    AND regexp_replace(lower(p.first_name), '[^a-z0-9]', '', 'g') =
        regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9]', '', 'g')
)
UPDATE "public"."profiles" p
SET first_name = NULL,
    last_name = NULL,
    updated_at = now()
WHERE p.id IN (SELECT id FROM derived_names);
