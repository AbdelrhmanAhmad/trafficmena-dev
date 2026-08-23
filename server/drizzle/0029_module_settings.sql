ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "masterclasses_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "digital_products_enabled" boolean DEFAULT true NOT NULL;
