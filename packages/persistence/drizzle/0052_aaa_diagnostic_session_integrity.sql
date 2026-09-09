-- AAA-101 / AAA-102: finalized diagnostic answers remain immutable while the
-- finalization response uses the answers authorized before the status change.

DROP POLICY "diagnostic_session_answers_participant_select_policy"
  ON "diagnostic_session_answers";
--> statement-breakpoint
CREATE POLICY "diagnostic_session_answers_participant_select_policy"
  ON "diagnostic_session_answers" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "diagnostic_sessions" AS session_record
      WHERE session_record.id = "diagnostic_session_answers".session_id
        AND session_record.participant_id::text = current_setting('cvg.participant_id', true)
        AND session_record.scope_id::text = current_setting('cvg.scope_id', true)
        AND session_record.status IN ('EM_ANDAMENTO', 'FINALIZADA')
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
--> statement-breakpoint
DROP POLICY "diagnostic_session_answers_participant_delete_policy"
  ON "diagnostic_session_answers";
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
        AND session_record.status = 'EM_ANDAMENTO'
        AND cvg_participant_in_scope(session_record.participant_id, session_record.scope_id)
    )
  );
