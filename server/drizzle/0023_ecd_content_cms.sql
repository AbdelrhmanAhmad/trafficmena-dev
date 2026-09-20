-- ECD content CMS: partners, speakers, fixed ticket packages + features
CREATE TYPE "public"."ecd_feature_kind" AS ENUM('included', 'excluded');--> statement-breakpoint
CREATE TABLE "ecd_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"company" text,
	"photo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_ticket_packages" (
	"ticket_type" "ecd_ticket_type" PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"eyebrow" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"badge" text,
	"cta_label" text NOT NULL,
	"price_cents" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ecd_ticket_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_type" "ecd_ticket_type" NOT NULL,
	"kind" "ecd_feature_kind" NOT NULL,
	"label" text NOT NULL,
	"emphasis" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
ALTER TABLE "ecd_ticket_features" ADD CONSTRAINT "ecd_ticket_features_ticket_type_ecd_ticket_packages_ticket_type_fk" FOREIGN KEY ("ticket_type") REFERENCES "public"."ecd_ticket_packages"("ticket_type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ecd_partners_sort_idx" ON "ecd_partners" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "ecd_partners_published_idx" ON "ecd_partners" USING btree ("published");--> statement-breakpoint
CREATE INDEX "ecd_speakers_sort_idx" ON "ecd_speakers" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "ecd_speakers_published_idx" ON "ecd_speakers" USING btree ("published");--> statement-breakpoint
CREATE INDEX "ecd_ticket_features_ticket_idx" ON "ecd_ticket_features" USING btree ("ticket_type");--> statement-breakpoint
CREATE INDEX "ecd_ticket_features_sort_idx" ON "ecd_ticket_features" USING btree ("ticket_type","sort_order");
