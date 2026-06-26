CREATE TABLE "payment_fulfillment_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"item_type" "payment_item_type" NOT NULL,
	"item_id" uuid,
	"ticket_type" "ticket_type",
	"invoice_id" integer,
	"amount_cents" integer NOT NULL,
	"confirmation_source" text NOT NULL,
	"error_code" text,
	"error_message" text NOT NULL,
	"failure_count" integer DEFAULT 1 NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_fulfillment_failures" ADD CONSTRAINT "payment_fulfillment_failures_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_fulfillment_failures" ADD CONSTRAINT "payment_fulfillment_failures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_fulfillment_failures" ADD CONSTRAINT "payment_fulfillment_failures_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_fulfillment_failures_payment_idx" ON "payment_fulfillment_failures" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_fulfillment_failures_unresolved_idx" ON "payment_fulfillment_failures" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "payment_fulfillment_failures_invoice_idx" ON "payment_fulfillment_failures" USING btree ("invoice_id");