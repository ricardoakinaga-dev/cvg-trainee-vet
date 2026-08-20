-- D98-RH02: make password, entitlement and explicit session revocation
-- invalidate sessions even when authentication and revocation race.
ALTER TABLE "accounts"
  ADD COLUMN "session_generation" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions"
  ADD COLUMN "session_generation" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_session_generation_check"
  CHECK ("session_generation" >= 0);
--> statement-breakpoint
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_session_generation_check"
  CHECK ("session_generation" >= 0);
--> statement-breakpoint
CREATE INDEX "sessions_account_generation_idx"
  ON "sessions" USING btree ("account_id", "session_generation");
