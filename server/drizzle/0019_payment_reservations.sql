-- Payment Reservations for Capacity Holds
-- Adds event_reservations and track_reservations tables for pre-payment capacity checks

CREATE TABLE "event_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "reserved_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL
);

CREATE UNIQUE INDEX "event_reservations_event_user_unique" ON "event_reservations" ("event_id", "user_id");
CREATE INDEX "event_reservations_payment_idx" ON "event_reservations" ("payment_id");
CREATE INDEX "event_reservations_event_idx" ON "event_reservations" ("event_id");
CREATE INDEX "event_reservations_expires_idx" ON "event_reservations" ("expires_at");

CREATE TABLE "track_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "track_id" uuid NOT NULL REFERENCES "tracks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "reserved_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL
);

CREATE UNIQUE INDEX "track_reservations_track_user_unique" ON "track_reservations" ("track_id", "user_id");
CREATE UNIQUE INDEX "track_reservations_payment_unique" ON "track_reservations" ("payment_id");
CREATE INDEX "track_reservations_track_idx" ON "track_reservations" ("track_id");
CREATE INDEX "track_reservations_expires_idx" ON "track_reservations" ("expires_at");
