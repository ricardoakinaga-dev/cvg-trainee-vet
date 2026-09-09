-- AAA-104 follow-up: named service identity for the internal content indexer.
--
-- The worker-side reader of published content and writer of internal AI
-- drafts runs without participant or staff scope, so the scope policies from
-- 0053 deny it under FORCE RLS. This migration adds a narrow service policy
-- pair keyed on the transaction-local cvg.service_role setting, recognized
-- only for the exact value 'content-indexer' (see setDatabaseServiceContext).
-- The identity exposes at most published content and its internal drafts;
-- RLS stays enforced, nothing is disabled, and this migration grants no
-- additional database-level privileges to any role.

CREATE POLICY "content_versions_indexer_select_policy"
  ON "content_versions" FOR SELECT
  USING (
    current_setting('cvg.service_role', true) = 'content-indexer'
    AND "status" = 'PUBLICADO'
  );
--> statement-breakpoint
CREATE POLICY "ai_suggestions_indexer_select_policy"
  ON "ai_suggestions" FOR SELECT
  USING (
    current_setting('cvg.service_role', true) = 'content-indexer'
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.status = 'PUBLICADO'
    )
  );
--> statement-breakpoint
CREATE POLICY "ai_suggestions_indexer_insert_policy"
  ON "ai_suggestions" FOR INSERT
  WITH CHECK (
    current_setting('cvg.service_role', true) = 'content-indexer'
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.status = 'PUBLICADO'
    )
  );
--> statement-breakpoint
CREATE POLICY "ai_suggestions_indexer_update_policy"
  ON "ai_suggestions" FOR UPDATE
  USING (
    current_setting('cvg.service_role', true) = 'content-indexer'
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.status = 'PUBLICADO'
    )
  )
  WITH CHECK (
    current_setting('cvg.service_role', true) = 'content-indexer'
    AND EXISTS (
      SELECT 1
      FROM "content_versions" AS version_record
      WHERE version_record.content_id = "ai_suggestions".content_id
        AND version_record.version = "ai_suggestions".version
        AND version_record.status = 'PUBLICADO'
    )
  );
