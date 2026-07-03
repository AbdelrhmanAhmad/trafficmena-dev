ALTER TABLE "payments" ADD COLUMN "fawaterk_intent_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fawaterk_transaction_id" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_fawaterk_intent_key_idx" ON "payments" USING btree ("fawaterk_intent_key");--> statement-breakpoint
CREATE INDEX "payments_fawaterk_transaction_id_idx" ON "payments" USING btree ("fawaterk_transaction_id");