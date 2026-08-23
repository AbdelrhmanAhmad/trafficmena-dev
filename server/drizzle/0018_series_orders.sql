DO $$ BEGIN
  ALTER TYPE "payment_item_type" ADD VALUE IF NOT EXISTS 'order';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "order_status" AS ENUM ('pending', 'paid', 'failed', 'expired');
--> statement-breakpoint
CREATE TYPE "order_item_fulfillment_status" AS ENUM ('pending', 'fulfilled');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "order_status" DEFAULT 'pending' NOT NULL,
  "total_cents" integer NOT NULL,
  "currency" text DEFAULT 'EGP' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_user_idx" ON "orders" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "series_id" uuid NOT NULL REFERENCES "series"("id") ON DELETE RESTRICT,
  "unit_price_cents" integer NOT NULL,
  "line_total_cents" integer NOT NULL,
  "fulfillment_status" "order_item_fulfillment_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_series_idx" ON "order_items" USING btree ("series_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_series_unique" ON "order_items" USING btree ("order_id", "series_id");
--> statement-breakpoint
ALTER TABLE "series_access_grants" ADD COLUMN IF NOT EXISTS "payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_access_grants_payment_idx" ON "series_access_grants" USING btree ("payment_id");
