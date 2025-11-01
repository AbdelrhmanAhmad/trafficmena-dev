-- Populate profile names for existing records lacking values

WITH name_source AS (
  SELECT
    u.id,
    regexp_replace(COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)), '[._-]+', ' ', 'g') AS raw_name,
    split_part(u.email, '@', 1) AS email_prefix
  FROM "public"."users" u
  JOIN "public"."profiles" p ON p.id = u.id
  WHERE p.first_name IS NULL OR p.first_name = ''
)
UPDATE "public"."profiles" p
SET
  first_name = initcap(split_part(ns.raw_name, ' ', 1)),
  last_name = NULLIF(initcap(substring(ns.raw_name from position(' ' in ns.raw_name) + 1)), ''),
  updated_at = now()
FROM name_source ns
WHERE p.id = ns.id;

-- Fallback to email prefix when raw name is empty after cleanup
UPDATE "public"."profiles" p
SET
  first_name = initcap(ns.email_prefix),
  last_name = NULL,
  updated_at = now()
FROM (
  SELECT u.id, split_part(u.email, '@', 1) AS email_prefix
  FROM "public"."users" u
  JOIN "public"."profiles" p ON p.id = u.id
  WHERE (p.first_name IS NULL OR p.first_name = '')
) ns
WHERE p.id = ns.id;
