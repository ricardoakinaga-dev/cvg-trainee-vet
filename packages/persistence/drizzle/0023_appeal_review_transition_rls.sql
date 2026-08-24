-- Permit only the dedicated transaction-local reviewer scope context to
-- mutate the allowlisted appeal transition performed by the application port.
-- The repository updates status/version/reviewer/decision/updated_at only; it
-- never uses this policy to authorize attempt, item, participant, or content
-- changes. Recalculation and closure remain separate workflows.

DROP POLICY "appeals_participant_scope_policy" ON "appeals";--> statement-breakpoint

CREATE POLICY "appeals_participant_scope_select_policy" ON "appeals"
  FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

CREATE POLICY "appeals_participant_scope_insert_policy" ON "appeals"
  FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

CREATE POLICY "appeals_review_scope_update_policy" ON "appeals"
  FOR UPDATE
  USING (
    current_setting('cvg.appeal_review_scope_id', true) = "scope_id"::text
  )
  WITH CHECK (
    current_setting('cvg.appeal_review_scope_id', true) = "scope_id"::text
  );
