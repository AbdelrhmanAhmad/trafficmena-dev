CREATE TYPE "digital_product_file_type" AS ENUM ('excel', 'markdown', 'html', 'text', 'powerpoint');
--> statement-breakpoint
CREATE TYPE "order_item_type" AS ENUM ('series', 'digital_product');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "price_in_cents" integer,
  "sales_enabled" boolean DEFAULT false NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "video_asset_id" uuid REFERENCES "library_assets"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_products_published_idx" ON "digital_products" USING btree ("is_published");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_products_sales_idx" ON "digital_products" USING btree ("sales_enabled");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_product_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "digital_products"("id") ON DELETE CASCADE,
  "file_type" "digital_product_file_type" NOT NULL,
  "display_name" text NOT NULL,
  "file_url" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_product_files_product_idx" ON "digital_product_files" USING btree ("product_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digital_product_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "digital_products"("id") ON DELETE CASCADE,
  "payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
  "purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "digital_product_purchases_user_product_unique" ON "digital_product_purchases" USING btree ("user_id", "product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "digital_product_purchases_user_idx" ON "digital_product_purchases" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "item_type" "order_item_type" DEFAULT 'series' NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "series_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "digital_product_id" uuid REFERENCES "digital_products"("id") ON DELETE RESTRICT;
--> statement-breakpoint
DROP INDEX IF EXISTS "order_items_order_series_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_series_unique" ON "order_items" USING btree ("order_id", "series_id") WHERE "series_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_digital_product_unique" ON "order_items" USING btree ("order_id", "digital_product_id") WHERE "digital_product_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_digital_product_idx" ON "order_items" USING btree ("digital_product_id");
