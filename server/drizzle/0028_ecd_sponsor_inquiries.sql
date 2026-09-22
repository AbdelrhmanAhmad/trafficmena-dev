-- ECD partnership inquiries (become-a-sponsor.html)
DO $$ BEGIN
  CREATE TYPE "ecd_sponsor_inquiry_status" AS ENUM ('new', 'reviewed', 'in_progress', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ecd_sponsor_inquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_code" text NOT NULL,
  "status" "ecd_sponsor_inquiry_status" DEFAULT 'new' NOT NULL,
  "company" text NOT NULL,
  "website" text,
  "sector" text NOT NULL,
  "country" text NOT NULL,
  "company_size" text NOT NULL,
  "contact_name" text NOT NULL,
  "contact_title" text NOT NULL,
  "contact_email" text NOT NULL,
  "contact_phone" text,
  "preferred_contact" text DEFAULT 'Email' NOT NULL,
  "objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "interested_level" text NOT NULL,
  "interested_properties" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "target_audience" text,
  "timing" text,
  "notes" text,
  "budget_band" text,
  "consent" integer DEFAULT 1 NOT NULL,
  "admin_notes" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ecd_sponsor_inq_request_code_idx" ON "ecd_sponsor_inquiries" USING btree ("request_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sponsor_inq_email_idx" ON "ecd_sponsor_inquiries" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sponsor_inq_status_idx" ON "ecd_sponsor_inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ecd_sponsor_inq_created_idx" ON "ecd_sponsor_inquiries" USING btree ("created_at");
