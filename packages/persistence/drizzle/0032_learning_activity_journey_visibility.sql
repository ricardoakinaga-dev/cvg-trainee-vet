-- Keep journey metadata visible for every persisted assignment state while
-- limiting participant content reads to activities that can currently start.
-- The application still owns the state transition and content-start rules;
-- this split keeps the participant journey history compatible with its domain
-- contract without widening the content boundary.

CREATE OR REPLACE FUNCTION cvg_learning_activity_for_participant(
  p_activity_id uuid,
  p_participant_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_participant_id <> ''
    AND EXISTS (
      SELECT 1
      FROM activity_assignments AS assignment
      INNER JOIN learning_activities AS activity
        ON activity.id = assignment.activity_id
      INNER JOIN accounts AS participant
        ON participant.id = assignment.participant_id
      WHERE assignment.activity_id = p_activity_id
        AND assignment.participant_id::text = p_participant_id
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
        AND activity.status = 'PUBLISHED'
        AND participant.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM account_invitations AS membership
          WHERE membership.account_id = assignment.participant_id
            AND membership.roles @> '["PARTICIPANT"]'::jsonb
            AND membership.scopes @> jsonb_build_array(activity.scope_id::text)
            AND membership.accepted_at IS NOT NULL
        )
    );
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION cvg_learning_activity_content_for_participant(
  p_activity_id uuid,
  p_participant_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cvg_learning_activity_for_participant(
      p_activity_id,
      p_participant_id
    )
    AND EXISTS (
      SELECT 1
      FROM activity_assignments AS assignment
      WHERE assignment.activity_id = p_activity_id
        AND assignment.participant_id::text = p_participant_id
        AND assignment.status IN ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
    );
$$;--> statement-breakpoint

DROP POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    cvg_learning_activity_content_for_participant(
      "learning_activity_items"."activity_id",
      current_setting('cvg.participant_id', true)
    )
  );
