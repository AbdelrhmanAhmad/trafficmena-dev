CREATE TYPE "public"."payment_item_type" AS ENUM('event', 'track', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"item_type" "payment_item_type" NOT NULL,
	"item_id" uuid,
	"fawaterk_invoice_id" integer,
	"fawaterk_invoice_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"price_paid_cents" integer NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "annual_subscription_price_cents" integer;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "subscriber_discount_percent" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "price_paid_cents" integer;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price_in_cents" integer;--> statement-breakpoint
ALTER TABLE "track_events" ADD COLUMN "single_price_in_cents" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_fawaterk_invoice_idx" ON "payments" USING btree ("fawaterk_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_unique_pending" ON "payments" USING btree ("user_id","item_type","item_id") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "payments_unique_pending_subscription" ON "payments" USING btree ("user_id") WHERE status = 'pending' AND item_type = 'subscription';--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("subscription_status");--> statement-breakpoint
CREATE INDEX "subscriptions_ends_at_idx" ON "subscriptions" USING btree ("ends_at");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_ends_after_starts" CHECK (ends_at > starts_at);
