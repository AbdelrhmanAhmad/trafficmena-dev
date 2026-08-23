ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "library_store_enabled" boolean DEFAULT false NOT NULL;
