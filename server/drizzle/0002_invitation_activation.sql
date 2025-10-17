ALTER TABLE "invitations"
  ADD COLUMN "accepted_user_id" uuid,
  ADD COLUMN "activated_at" timestamp with time zone;

ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_accepted_user_id_users_id_fk"
    FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "invitations_accepted_user_idx" ON "invitations" ("accepted_user_id");
CREATE INDEX IF NOT EXISTS "invitations_activated_at_idx" ON "invitations" ("activated_at");
