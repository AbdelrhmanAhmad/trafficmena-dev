CREATE TYPE "certificate_status" AS ENUM ('issued', 'revoked');

CREATE TABLE IF NOT EXISTS "certificate_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "background_image_url" text,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "masterclass_certificate_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "masterclass_id" uuid NOT NULL REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "certificate_enabled" boolean DEFAULT false NOT NULL,
  "certificate_title" text,
  "certificate_description" text,
  "certificate_template_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "masterclass_certificate_settings_class_unique"
  ON "masterclass_certificate_settings" ("masterclass_id");

CREATE TABLE IF NOT EXISTS "certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "masterclass_id" uuid NOT NULL REFERENCES "masterclasses"("id") ON DELETE CASCADE,
  "certificate_code" text NOT NULL,
  "issue_date" timestamp with time zone DEFAULT now() NOT NULL,
  "status" "certificate_status" DEFAULT 'issued' NOT NULL,
  "generated_certificate_url" text,
  "external_certificate_url" text,
  "certificate_template_url" text,
  "issued_by_admin_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "issued_manually" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "certificates_user_masterclass_unique"
  ON "certificates" ("user_id", "masterclass_id");

CREATE UNIQUE INDEX IF NOT EXISTS "certificates_code_unique"
  ON "certificates" ("certificate_code");

CREATE INDEX IF NOT EXISTS "certificates_user_idx" ON "certificates" ("user_id");
CREATE INDEX IF NOT EXISTS "certificates_masterclass_idx" ON "certificates" ("masterclass_id");
