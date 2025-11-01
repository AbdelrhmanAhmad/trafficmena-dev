-- Reset derived profile names that were populated from email prefixes

WITH derived_names AS (
  SELECT p.id
  FROM "public"."profiles" p
  JOIN "public"."users" u ON u.id = p.id
  WHERE p.first_name IS NOT NULL
    AND lower(regexp_replace(p.first_name, '[^a-z0-9]', '', 'g')) =
        lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '', 'g'))
)
UPDATE "public"."profiles" p
SET first_name = NULL,
    last_name = NULL,
    updated_at = now()
WHERE p.id IN (SELECT id FROM derived_names);
