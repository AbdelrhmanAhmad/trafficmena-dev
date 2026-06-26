CREATE TYPE "public"."event_format" AS ENUM('online', 'offline');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_format" "event_format" DEFAULT 'offline' NOT NULL;--> statement-breakpoint
-- Backfill by intent (mirrors server/src/utils/eventFormat.ts deriveLegacyEventFormat). The column
-- default already set every row to 'offline'; the statements below promote online sessions
-- and strip literal delivery-mode text from `location`, which reverts to address-only.
-- 1) A meeting link with no address is an online session.
UPDATE "events"
SET "event_format" = 'online'
WHERE "meeting_link" IS NOT NULL
  AND btrim("meeting_link") <> ''
  AND ("location" IS NULL OR btrim("location") = '');--> statement-breakpoint
-- 1b) No delivery-mode signal -> online by product decision; review these rows in the preflight
-- report before production migration.
UPDATE "events"
SET "event_format" = 'online'
WHERE ("meeting_link" IS NULL OR btrim("meeting_link") = '')
  AND ("location" IS NULL OR btrim("location") = '');--> statement-breakpoint
-- 2) Literal "online" text -> online; clear the text (it was never a real address).
UPDATE "events"
SET "event_format" = 'online', "location" = NULL
WHERE lower(btrim("location")) = 'online';--> statement-breakpoint
-- 3) Literal "offline" text -> offline (already the default); clear the text.
UPDATE "events"
SET "location" = NULL
WHERE lower(btrim("location")) = 'offline';
