CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"discount_percent" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_discount_percent_check" CHECK ("discount_percent" BETWEEN 1 AND 99);
--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_target_type_check" CHECK ("target_type" IN ('track', 'event'));
--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_date_range_check" CHECK ("starts_at" < "ends_at");
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "promo_code_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_applied_cents" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "original_amount_cents" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_code_unique" ON "promo_codes" USING btree ("code") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "promo_codes_target_idx" ON "promo_codes" USING btree ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_promo_code_idx" ON "payments" USING btree ("promo_code_id");
