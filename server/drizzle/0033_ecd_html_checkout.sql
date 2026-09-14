-- Removable ECD (ECommerce Day 2026) HTML checkout module
CREATE TYPE "public"."ecd_ticket_type" AS ENUM('ct', 'fj');--> statement-breakpoint
CREATE TYPE "public"."ecd_payment_status" AS ENUM('draft', 'pending', 'paid', 'failed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ecd_ticket_status" AS ENUM('held', 'active', 'cancelled');--> statement-breakpoint
CREATE TABLE "ecd_html_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text,
	"job_title" text,
	"country" text,
	"need_invoice" integer DEFAULT 0 NOT NULL,
	"invoice_company" text,
	"tax_id" text,
	"billing_address" text,
	"buyer_mobile" text,
	"buyer_country_code" text,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"html_form_id" uuid,
	"order_code" text NOT NULL,
	"public_token_hash" text NOT NULL,
	"ticket_type" "ecd_ticket_type" NOT NULL,
	"qty" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"promo_code" text,
	"payment_status" "ecd_payment_status" DEFAULT 'draft' NOT NULL,
	"payment_method_id" integer,
	"payment_method_name" text,
	"fawaterk_intent_key" text,
	"fawaterk_transaction_id" integer,
	"fawry_code" text,
	"aman_code" text,
	"masary_code" text,
	"meeza_reference" text,
	"meeza_qr_code" text,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_mobile" text,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_checkout_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"serial" text NOT NULL,
	"status" "ecd_ticket_status" DEFAULT 'held' NOT NULL,
	"attendee_name" text NOT NULL,
	"attendee_email" text NOT NULL,
	"attendee_mobile" text,
	"attendee_company" text,
	"attendee_title" text,
	"interests" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ecd_html_forms" ADD CONSTRAINT "ecd_html_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_bookings" ADD CONSTRAINT "ecd_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_bookings" ADD CONSTRAINT "ecd_bookings_html_form_id_ecd_html_forms_id_fk" FOREIGN KEY ("html_form_id") REFERENCES "public"."ecd_html_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_checkout_tokens" ADD CONSTRAINT "ecd_checkout_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_checkout_tokens" ADD CONSTRAINT "ecd_checkout_tokens_booking_id_ecd_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."ecd_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_tickets" ADD CONSTRAINT "ecd_tickets_booking_id_ecd_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."ecd_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecd_tickets" ADD CONSTRAINT "ecd_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ecd_html_forms_user_idx" ON "ecd_html_forms" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ecd_bookings_order_code_idx" ON "ecd_bookings" USING btree ("order_code");--> statement-breakpoint
CREATE INDEX "ecd_bookings_user_idx" ON "ecd_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ecd_bookings_status_idx" ON "ecd_bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "ecd_bookings_intent_key_idx" ON "ecd_bookings" USING btree ("fawaterk_intent_key") WHERE fawaterk_intent_key is not null;--> statement-breakpoint
CREATE INDEX "ecd_bookings_public_token_idx" ON "ecd_bookings" USING btree ("public_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ecd_checkout_tokens_hash_idx" ON "ecd_checkout_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ecd_checkout_tokens_booking_idx" ON "ecd_checkout_tokens" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ecd_checkout_tokens_user_idx" ON "ecd_checkout_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ecd_tickets_serial_idx" ON "ecd_tickets" USING btree ("serial");--> statement-breakpoint
CREATE INDEX "ecd_tickets_booking_idx" ON "ecd_tickets" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ecd_tickets_user_idx" ON "ecd_tickets" USING btree ("user_id");
