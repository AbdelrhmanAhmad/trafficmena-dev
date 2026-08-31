ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "subscriptions_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "digital_products_launched" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "masterclasses_launched" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ALTER COLUMN "masterclasses_enabled" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "platform_settings" ALTER COLUMN "digital_products_enabled" SET DEFAULT false;
--> statement-breakpoint
UPDATE "platform_settings"
SET "digital_products_launched" = true
WHERE EXISTS (SELECT 1 FROM "digital_products" WHERE "is_published" = true);
--> statement-breakpoint
UPDATE "platform_settings"
SET "masterclasses_launched" = true
WHERE EXISTS (SELECT 1 FROM "masterclasses" WHERE "is_published" = true);
--> statement-breakpoint
UPDATE "platform_settings"
SET "digital_products_enabled" = true
WHERE "digital_products_launched" = true;
--> statement-breakpoint
UPDATE "platform_settings"
SET "masterclasses_enabled" = true
WHERE "masterclasses_launched" = true;
--> statement-breakpoint
UPDATE "platform_settings"
SET "digital_products_enabled" = false
WHERE "digital_products_launched" = false;
--> statement-breakpoint
UPDATE "platform_settings"
SET "masterclasses_enabled" = false
WHERE "masterclasses_launched" = false;
