-- AAA-104: bind editorial and assistive content rows to the complete version
-- identity, then enforce the same scope boundary at the PostgreSQL RLS edge.

DO $aaa104_orphan_scan$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM content_editorial_records AS editorial
    LEFT JOIN content_versions AS version_record
      ON version_record.id = editorial.content_version_id
      AND version_record.content_id = editorial.content_id
      AND version_record.version = editorial.version
      AND version_record.scope_id = editorial.scope_id
    WHERE version_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'AAA-104 orphan content editorial record';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM content_review_decisions AS review
    LEFT JOIN content_editorial_records AS editorial
      ON editorial.id = review.content_editorial_record_id
      AND editorial.content_id = review.content_id
      AND editorial.version = review.version
      AND editorial.scope_id = review.scope_id
    LEFT JOIN content_versions AS version_record
      ON version_record.id = review.content_version_id
      AND version_record.content_id = review.content_id
      AND version_record.version = review.version
      AND version_record.scope_id = review.scope_id
    WHERE editorial.id IS NULL OR version_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'AAA-104 orphan content review decision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ai_suggestions AS suggestion
    LEFT JOIN content_versions AS version_record
      ON version_record.content_id = suggestion.content_id
      AND version_record.version = suggestion.version
    WHERE version_record.id IS NULL
  ) THEN
    RAISE EXCEPTION 'AAA-104 orphan AI suggestion';
  END IF;
END;
$aaa104_orphan_scan$;
--> statement-breakpoint

ALTER TABLE "content_editorial_records"
  ADD CONSTRAINT "content_editorial_records_version_identity_fk"
  FOREIGN KEY ("content_version_id", "content_id", "version", "scope_id")
  REFERENCES "public"."content_versions" ("id", "content_id", "version", "scope_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_review_decisions"
  ADD CONSTRAINT "content_review_decisions_version_identity_fk"
  FOREIGN KEY ("content_version_id", "content_id", "version", "scope_id")
  REFERENCES "public"."content_versions" ("id", "content_id", "version", "scope_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_review_decisions"
  ADD CONSTRAINT "content_review_decisions_editorial_identity_fk"
  FOREIGN KEY ("content_editorial_record_id", "content_id", "version", "scope_id")
  REFERENCES "public"."content_editorial_records" ("id", "content_id", "version", "scope_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_suggestions"
  ADD CONSTRAINT "ai_suggestions_content_version_fk"
  FOREIGN KEY ("content_id", "version")
  REFERENCES "public"."content_versions" ("content_id", "version")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "content_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "content_versions_scope_policy"
  ON "content_versions" FOR ALL
  USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );
--> statement-breakpoint
CREATE POLICY "content_versions_participant_select_policy"
  ON "content_versions" FOR SELECT
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND "status" = 'PUBLICADO'
    AND cvg_participant_in_scope(
      current_setting('cvg.participant_id', true)::uuid,
      "scope_id"
    )
    AND EXISTS (
      SELECT 1
      FROM "learning_activity_items" AS item
      INNER JOIN "learning_activities" AS activity
        ON activity.id = item.activity_id
      INNER JOIN "activity_assignments" AS assignment
        ON assignment.activity_id = activity.id
      WHERE item.content_version_id = "content_versions".id
        AND activity.scope_id = "content_versions".scope_id
        AND activity.status = 'PUBLISHED'
        AND assignment.participant_id::text = current_setting('cvg.participant_id', true)
        AND assignment.status IN (
          'ATRIBUIDO',
          'DISPONIVEL',
          'EM_ANDAMENTO',
          'CONCLUIDO',
          'EM_REFORCO',
          'CONCLUIDO_COM_RETENCAO_PENDENTE',
          'PAUSADO',
          'BLOQUEADO'
        )
    )
  );
--> statement-breakpoint

ALTER TABLE "ai_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_suggestions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ai_suggestions_scope_policy"
  ON "ai_suggestions" FOR ALL
  USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.scope_id::text = current_setting('cvg.scope_id', true)
    )
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.scope_id::text = current_setting('cvg.scope_id', true)
    )
  );
--> statement-breakpoint

REVOKE UPDATE, DELETE ON "ai_suggestions" FROM PUBLIC;
