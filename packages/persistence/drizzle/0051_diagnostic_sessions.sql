-- JOURNEY-056 / Decision A
-- A participant diagnostic is a resumable, server-owned session. The
-- snapshot is immutable; answers, result, assignment attribution and the
-- metadata-only event trail are committed by one application transaction.

ALTER TABLE "diagnostic_results"
  ADD COLUMN "session_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_results_identity_idx"
  ON "diagnostic_results" ("id", "participant_id", "scope_id");
--> statement-breakpoint

CREATE TABLE "diagnostic_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "diagnostic_id" text NOT NULL,
  "diagnostic_version" text NOT NULL,
  "status" text NOT NULL DEFAULT 'EM_ANDAMENTO',
  "version" integer NOT NULL DEFAULT 0,
  "catalog_snapshot" jsonb NOT NULL,
  "diagnostic_result_id" uuid,
  "started_at" timestamp with time zone NOT NULL,
  "last_checkpoint_at" timestamp with time zone,
  "finalized_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "diagnostic_sessions_diagnostic_id_check"
    CHECK ("diagnostic_id" = 'B07-DIAGNOSTIC-V1'),
  CONSTRAINT "diagnostic_sessions_diagnostic_version_check"
    CHECK ("diagnostic_version" = '0.1.0'),
  CONSTRAINT "diagnostic_sessions_status_check"
    CHECK ("status" IN ('EM_ANDAMENTO', 'FINALIZADA')),
  CONSTRAINT "diagnostic_sessions_version_check"
    CHECK ("version" >= 0),
  CONSTRAINT "diagnostic_sessions_catalog_snapshot_check"
    CHECK (
      jsonb_typeof("catalog_snapshot") = 'object'
      AND "catalog_snapshot"->>'diagnosticId' = 'B07-DIAGNOSTIC-V1'
      AND "catalog_snapshot"->>'diagnosticVersion' = '0.1.0'
      AND "catalog_snapshot"->>'status' = 'RASCUNHO'
      AND "catalog_snapshot"->>'publicationAuthorized' = 'false'
      AND "catalog_snapshot"->>'clinicalReview' = 'PENDENTE'
      AND jsonb_typeof("catalog_snapshot"->'items') = 'array'
      AND jsonb_array_length("catalog_snapshot"->'items') = 120
    ),
  CONSTRAINT "diagnostic_sessions_finalization_check"
    CHECK (
      ("status" = 'EM_ANDAMENTO'
        AND "finalized_at" IS NULL
        AND "diagnostic_result_id" IS NULL)
      OR
      ("status" = 'FINALIZADA'
        AND "finalized_at" IS NOT NULL
        AND "diagnostic_result_id" IS NOT NULL)
    )
);
--> statement-breakpoint

ALTER TABLE "diagnostic_sessions"
  ADD CONSTRAINT "diagnostic_sessions_participant_id_accounts_id_fk"
  FOREIGN KEY ("participant_id") REFERENCES "accounts"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "diagnostic_sessions"
  ADD CONSTRAINT "diagnostic_sessions_diagnostic_result_id_fk"
  FOREIGN KEY ("diagnostic_result_id") REFERENCES "diagnostic_results"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "diagnostic_sessions"
  ADD CONSTRAINT "diagnostic_sessions_result_identity_fk"
  FOREIGN KEY ("diagnostic_result_id", "participant_id", "scope_id")
  REFERENCES "diagnostic_results"("id", "participant_id", "scope_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "diagnostic_session_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "canonical_item_id" text NOT NULL,
  "selected_choice_ids" jsonb NOT NULL,
  "saved_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "diagnostic_session_answers_session_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "diagnostic_sessions"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "diagnostic_session_answers_item_check"
    CHECK (length(trim("canonical_item_id")) > 0),
  CONSTRAINT "diagnostic_session_answers_selection_check"
    CHECK (
      jsonb_typeof("selected_choice_ids") = 'array'
      AND jsonb_array_length("selected_choice_ids") BETWEEN 1 AND 8
    )
);
--> statement-breakpoint

CREATE TABLE "diagnostic_session_idempotency" (
  "participant_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "operation" text NOT NULL,
  "fingerprint" text NOT NULL,
  "session_id" uuid NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "diagnostic_session_idempotency_pk"
    PRIMARY KEY ("participant_id", "scope_id", "operation", "idempotency_key"),
  CONSTRAINT "diagnostic_session_idempotency_participant_id_fk"
    FOREIGN KEY ("participant_id") REFERENCES "accounts"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "diagnostic_session_idempotency_session_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "diagnostic_sessions"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "diagnostic_session_idempotency_key_check"
    CHECK (
      length(trim("idempotency_key")) BETWEEN 16 AND 128
      AND "idempotency_key" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    ),
  CONSTRAINT "diagnostic_session_idempotency_operation_check"
    CHECK ("operation" IN ('START', 'SAVE_ANSWER', 'FINALIZE')),
  CONSTRAINT "diagnostic_session_idempotency_fingerprint_check"
    CHECK (length(trim("fingerprint")) > 0),
  CONSTRAINT "diagnostic_session_idempotency_expiry_check"
    CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint

ALTER TABLE "diagnostic_results"
  ADD CONSTRAINT "diagnostic_results_session_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "diagnostic_sessions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "diagnostic_results_session_idx"
  ON "diagnostic_results" ("session_id")
  WHERE "session_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "diagnostic_sessions_participant_scope_idx"
  ON "diagnostic_sessions" ("participant_id", "scope_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "diagnostic_sessions_scope_status_idx"
  ON "diagnostic_sessions" ("scope_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_sessions_open_participant_scope_idx"
  ON "diagnostic_sessions"
    ("participant_id", "scope_id", "diagnostic_id", "diagnostic_version")
  WHERE "status" = 'EM_ANDAMENTO';
--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_sessions_result_idx"
  ON "diagnostic_sessions" ("diagnostic_result_id")
  WHERE "diagnostic_result_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_session_answers_session_item_idx"
  ON "diagnostic_session_answers" ("session_id", "canonical_item_id");
--> statement-breakpoint
CREATE INDEX "diagnostic_session_answers_session_idx"
  ON "diagnostic_session_answers" ("session_id");
--> statement-breakpoint
CREATE INDEX "diagnostic_session_idempotency_expiry_idx"
  ON "diagnostic_session_idempotency" ("expires_at");
--> statement-breakpoint
CREATE INDEX "diagnostic_session_idempotency_session_idx"
  ON "diagnostic_session_idempotency" ("session_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION cvg_diagnostic_session_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.participant_id IS DISTINCT FROM OLD.participant_id
    OR NEW.scope_id IS DISTINCT FROM OLD.scope_id
    OR NEW.diagnostic_id IS DISTINCT FROM OLD.diagnostic_id
    OR NEW.diagnostic_version IS DISTINCT FROM OLD.diagnostic_version
    OR NEW.catalog_snapshot IS DISTINCT FROM OLD.catalog_snapshot
  THEN
    RAISE EXCEPTION 'diagnostic session identity and snapshot are immutable';
  END IF;

  IF NEW.diagnostic_result_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "diagnostic_results" AS result_record
      WHERE result_record.id = NEW.diagnostic_result_id
        AND result_record.session_id = NEW.id
        AND result_record.participant_id = NEW.participant_id
        AND result_record.scope_id = NEW.scope_id
    )
  THEN
    RAISE EXCEPTION 'diagnostic result identity does not match session';
  END IF;

  IF OLD.status = 'FINALIZADA' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.version IS DISTINCT FROM OLD.version
      OR NEW.diagnostic_result_id IS DISTINCT FROM OLD.diagnostic_result_id
      OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
    THEN
      RAISE EXCEPTION 'finalized diagnostic session is immutable';
    END IF;
  ELSIF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'diagnostic session version must advance by one';
  ELSIF NEW.status = 'EM_ANDAMENTO' THEN
    IF NEW.finalized_at IS NOT NULL OR NEW.diagnostic_result_id IS NOT NULL THEN
      RAISE EXCEPTION 'in-progress diagnostic session cannot contain finalization';
    END IF;
  ELSIF NEW.status <> 'FINALIZADA'
    OR NEW.finalized_at IS NULL
    OR NEW.diagnostic_result_id IS NULL
  THEN
    RAISE EXCEPTION 'diagnostic session finalization is incomplete';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER diagnostic_session_update_guard
  BEFORE UPDATE ON "diagnostic_sessions"
  FOR EACH ROW EXECUTE FUNCTION cvg_diagnostic_session_update_guard();
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_diagnostic_session_update_guard() FROM PUBLIC;
--> statement-breakpoint

ALTER TABLE "diagnostic_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diagnostic_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "diagnostic_sessions_participant_select_policy"
  ON "diagnostic_sessions" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_sessions_participant_insert_policy"
  ON "diagnostic_sessions" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_sessions_participant_update_policy"
  ON "diagnostic_sessions" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  ) WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
REVOKE DELETE ON "diagnostic_sessions" FROM PUBLIC;
--> statement-breakpoint

ALTER TABLE "diagnostic_session_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diagnostic_session_answers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "diagnostic_session_answers_participant_select_policy"
  ON "diagnostic_session_answers" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND session_record.status = 'EM_ANDAMENTO'
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_session_answers_participant_insert_policy"
  ON "diagnostic_session_answers" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND session_record.status = 'EM_ANDAMENTO'
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_session_answers_participant_update_policy"
  ON "diagnostic_session_answers" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND session_record.status = 'EM_ANDAMENTO'
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  ) WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND session_record.status = 'EM_ANDAMENTO'
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_session_answers_participant_delete_policy"
  ON "diagnostic_session_answers" FOR DELETE USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
--> statement-breakpoint

ALTER TABLE "diagnostic_session_idempotency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diagnostic_session_idempotency" FORCE ROW LEVEL SECURITY;
CREATE POLICY "diagnostic_session_idempotency_participant_select_policy"
  ON "diagnostic_session_idempotency" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_session_idempotency_participant_insert_policy"
  ON "diagnostic_session_idempotency" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
CREATE POLICY "diagnostic_session_idempotency_participant_expired_delete_policy"
  ON "diagnostic_session_idempotency" FOR DELETE USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND "expires_at" <= now()
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "diagnostic_session_idempotency" FROM PUBLIC;
--> statement-breakpoint

-- No participant-facing policy is added to the session result foreign key;
-- diagnostic_results retains its existing participant RLS and is reached only
-- after the session CAS has been won.
