-- Backfill profile rows for OTP signups and ensure timestamps default

WITH missing AS (
  SELECT u."id",
    NULLIF(split_part(u."name", ' ', 1), '') AS first_name_guess,
    NULLIF(NULLIF(substring(u."name" from position(' ' in u."name") + 1), ''), '') AS last_name_guess,
    split_part(u."email", '@', 1) AS email_prefix
  FROM "public"."users" u
  LEFT JOIN "public"."profiles" p ON p."id" = u."id"
  WHERE p."id" IS NULL
)
INSERT INTO "public"."profiles" ("id", "first_name", "last_name", "created_at", "updated_at")
SELECT
  m."id",
  COALESCE(m.first_name_guess, NULLIF(initcap(m.email_prefix), '')),
  CASE
    WHEN m.last_name_guess IS NOT NULL THEN initcap(m.last_name_guess)
    ELSE NULL
  END,
  now(),
  now()
FROM missing m;

UPDATE "public"."profiles" p
SET
  first_name = COALESCE(NULLIF(p.first_name, ''), initcap(split_part(u."email", '@', 1))),
  last_name = COALESCE(NULLIF(p.last_name, ''), NULLIF(initcap(substring(u."name" from position(' ' in u."name") + 1)), '')),
  updated_at = now()
FROM "public"."users" u
WHERE p."id" = u."id"
  AND (p.first_name IS NULL OR p.first_name = '');
