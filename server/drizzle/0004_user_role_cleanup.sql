-- RBAC cleanup: drop legacy 'member' label and standardise on 'user'

BEGIN;

-- Ensure new enum value exists before retyping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'user'
  ) THEN
    ALTER TYPE "public"."user_role" ADD VALUE 'user';
  END IF;
END $$;

ALTER TABLE "public"."profiles" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "public"."user_role_new" AS ENUM ('user', 'expert', 'manager', 'admin', 'owner');

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING (
    CASE lower("role"::text)
      WHEN 'member' THEN 'user'
      ELSE lower("role"::text)
    END
  )::"public"."user_role_new";

ALTER TABLE "public"."profiles" ALTER COLUMN "role" SET DEFAULT 'user';

DROP TYPE "public"."user_role";

ALTER TYPE "public"."user_role_new" RENAME TO "user_role";

COMMIT;
