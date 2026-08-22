-- U98-106/B99-205: reserve AI suggestion effects by immutable outbox event id.
-- Failed work releases its claim, while a completed tombstone survives outbox
-- retention so the same immutable event id can never invoke AI twice later.
ALTER TABLE "ai_suggestions"
  ADD COLUMN "source_event_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_suggestions_source_event_id_idx"
  ON "ai_suggestions" USING btree ("source_event_id");
--> statement-breakpoint
CREATE TABLE "ai_suggestion_events" (
  "event_id" uuid PRIMARY KEY NOT NULL,
  "content_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "status" text DEFAULT 'PROCESSING' NOT NULL,
  "attempts" integer DEFAULT 1 NOT NULL,
  "lease_token" uuid NOT NULL,
  "locked_until" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_suggestion_events_status_check"
    CHECK ("status" in ('PROCESSING', 'COMPLETED')),
  CONSTRAINT "ai_suggestion_events_attempts_check"
    CHECK ("attempts" >= 1),
  CONSTRAINT "ai_suggestion_events_version_check"
    CHECK ("version" >= 1),
  CONSTRAINT "ai_suggestion_events_completed_at_check"
    CHECK (("status" = 'COMPLETED') = ("completed_at" is not null))
);
--> statement-breakpoint
CREATE INDEX "ai_suggestion_events_status_lock_idx"
  ON "ai_suggestion_events" USING btree ("status", "locked_until");
--> statement-breakpoint
ALTER TABLE "ai_suggestion_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_suggestion_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "ai_suggestion_events_worker_policy"
  ON "ai_suggestion_events"
  FOR ALL
  USING (current_setting('cvg.ai_suggestion_worker', true) = 'true')
  WITH CHECK (current_setting('cvg.ai_suggestion_worker', true) = 'true');
--> statement-breakpoint
REVOKE ALL ON TABLE "ai_suggestions", "ai_suggestion_events" FROM PUBLIC;
