CREATE TYPE "public"."ecd_promo_applies_to" AS ENUM('all', 'ct', 'fj');--> statement-breakpoint
CREATE TABLE "ecd_promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_percent" integer NOT NULL,
	"applies_to" "ecd_promo_applies_to" DEFAULT 'all' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_redemptions" integer,
	"is_deleted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "ecd_promo_codes_code_uidx" ON "ecd_promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ecd_promo_codes_active_idx" ON "ecd_promo_codes" USING btree ("is_deleted");
