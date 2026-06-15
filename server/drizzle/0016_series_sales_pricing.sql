ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "price_in_cents" integer;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "sales_enabled" boolean DEFAULT false NOT NULL;
