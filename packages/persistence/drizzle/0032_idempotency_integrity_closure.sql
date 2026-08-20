-- B99-105: close idempotency integrity after the authoring hardening in 0030.
-- Legacy or invalid rows fail the migration explicitly; they are never silently
-- treated as safe replay state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "authoring_workflow_idempotency"
    WHERE "response_hash" IS NULL
      OR "response_hash" !~ '^sha256:[0-9a-f]{64}$'
      OR "key" !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$'
      OR "fingerprint" !~ '^sha256:[0-9a-f]{64}$'
      OR "expires_at" <= "created_at"
  ) THEN
    RAISE EXCEPTION 'legacy or invalid authoring idempotency rows require explicit migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "attempt_idempotency"
    WHERE "key" !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$'
      OR "operation" <> 'attempt'
      OR "fingerprint" = ''
      OR "expires_at" <= "created_at"
  ) THEN
    RAISE EXCEPTION 'legacy or invalid attempt idempotency rows require explicit migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "answer_idempotency"
    WHERE "key" !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$'
      OR "operation" <> 'answer'
      OR "fingerprint" = ''
      OR "expires_at" <= "created_at"
  ) THEN
    RAISE EXCEPTION 'legacy or invalid answer idempotency rows require explicit migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "assessment_idempotency"
    WHERE "key" !~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$'
      OR "operation" <> 'correction'
      OR "fingerprint" = ''
      OR "expires_at" <= "created_at"
  ) THEN
    RAISE EXCEPTION 'legacy or invalid assessment idempotency rows require explicit migration';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ALTER COLUMN "expires_at"
  SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours');
--> statement-breakpoint
ALTER TABLE "attempt_idempotency"
  ALTER COLUMN "expires_at"
  SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours');
--> statement-breakpoint
ALTER TABLE "answer_idempotency"
  ALTER COLUMN "expires_at"
  SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours');
--> statement-breakpoint
ALTER TABLE "assessment_idempotency"
  ALTER COLUMN "expires_at"
  SET DEFAULT (CURRENT_TIMESTAMP + interval '24 hours');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ALTER COLUMN "response_hash" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_key_entropy_check"
  CHECK ("key" ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_response_hash_sha256_check"
  CHECK ("response_hash" ~ '^sha256:[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE "attempt_idempotency"
  ADD CONSTRAINT "attempt_idempotency_operation_check"
  CHECK ("operation" = 'attempt');
--> statement-breakpoint
ALTER TABLE "attempt_idempotency"
  ADD CONSTRAINT "attempt_idempotency_key_entropy_check"
  CHECK ("key" ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$');
--> statement-breakpoint
ALTER TABLE "attempt_idempotency"
  ADD CONSTRAINT "attempt_idempotency_fingerprint_check"
  CHECK ("fingerprint" <> '');
--> statement-breakpoint
ALTER TABLE "attempt_idempotency"
  ADD CONSTRAINT "attempt_idempotency_expiry_check"
  CHECK ("expires_at" > "created_at");
--> statement-breakpoint
ALTER TABLE "answer_idempotency"
  ADD CONSTRAINT "answer_idempotency_operation_check"
  CHECK ("operation" = 'answer');
--> statement-breakpoint
ALTER TABLE "answer_idempotency"
  ADD CONSTRAINT "answer_idempotency_key_entropy_check"
  CHECK ("key" ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$');
--> statement-breakpoint
ALTER TABLE "answer_idempotency"
  ADD CONSTRAINT "answer_idempotency_fingerprint_check"
  CHECK ("fingerprint" <> '');
--> statement-breakpoint
ALTER TABLE "answer_idempotency"
  ADD CONSTRAINT "answer_idempotency_expiry_check"
  CHECK ("expires_at" > "created_at");
--> statement-breakpoint
ALTER TABLE "assessment_idempotency"
  ADD CONSTRAINT "assessment_idempotency_operation_check"
  CHECK ("operation" = 'correction');
--> statement-breakpoint
ALTER TABLE "assessment_idempotency"
  ADD CONSTRAINT "assessment_idempotency_key_entropy_check"
  CHECK ("key" ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$');
--> statement-breakpoint
ALTER TABLE "assessment_idempotency"
  ADD CONSTRAINT "assessment_idempotency_fingerprint_check"
  CHECK ("fingerprint" <> '');
--> statement-breakpoint
ALTER TABLE "assessment_idempotency"
  ADD CONSTRAINT "assessment_idempotency_expiry_check"
  CHECK ("expires_at" > "created_at");
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authoring_workflow_idempotency" FORCE ROW LEVEL SECURITY;
ALTER TABLE "attempt_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_idempotency" FORCE ROW LEVEL SECURITY;
ALTER TABLE "answer_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answer_idempotency" FORCE ROW LEVEL SECURITY;
ALTER TABLE "assessment_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_idempotency" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "attempt_idempotency_participant_delete_policy"
  ON "attempt_idempotency"
  FOR DELETE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "attempts" AS attempt
      WHERE attempt."id" = "attempt_idempotency"."attempt_id"
        AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
    )
  );
--> statement-breakpoint
CREATE POLICY "answer_idempotency_participant_delete_policy"
  ON "answer_idempotency"
  FOR DELETE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "attempts" AS attempt
      WHERE attempt."id" = "answer_idempotency"."attempt_id"
        AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
    )
  );
--> statement-breakpoint
CREATE POLICY "assessment_idempotency_scope_delete_policy"
  ON "assessment_idempotency"
  FOR DELETE
  USING (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "attempts" AS attempt
      INNER JOIN "learning_activities" AS activity
        ON activity."id" = attempt."activity_id"
      WHERE attempt."id" = "assessment_idempotency"."attempt_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  );
--> statement-breakpoint
REVOKE ALL ON TABLE "authoring_workflow_idempotency" FROM PUBLIC;
REVOKE ALL ON TABLE "attempt_idempotency" FROM PUBLIC;
REVOKE ALL ON TABLE "answer_idempotency" FROM PUBLIC;
REVOKE ALL ON TABLE "assessment_idempotency" FROM PUBLIC;
