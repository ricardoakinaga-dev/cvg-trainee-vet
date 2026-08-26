-- Keep direct application-role activity bindings aligned with the persisted
-- curriculum assignment and the published activity projection. The adaptive
-- repository already applies these invariants; this helper makes the RLS
-- boundary enforce them as well.
CREATE OR REPLACE FUNCTION cvg_learning_activity_assignment_write_allowed(
  p_activity_id uuid,
  p_learning_assignment_id uuid,
  p_participant_id uuid,
  p_scope_id text,
  p_activity_assignment_status text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_scope_id <> ''
    AND EXISTS (
      SELECT 1
      FROM learning_activities AS activity
      INNER JOIN learning_assignments AS assignment
        ON assignment.id = p_learning_assignment_id
      INNER JOIN accounts AS participant
        ON participant.id = assignment.participant_id
      WHERE activity.id = p_activity_id
        AND activity.status = 'PUBLISHED'
        AND activity.scope_id::text = p_scope_id
        AND assignment.participant_id = p_participant_id
        AND assignment.scope_id = activity.scope_id
        AND assignment.module_id = activity.module_id
        AND p_activity_assignment_status IN (
          'ATRIBUIDO',
          'DISPONIVEL',
          'EM_ANDAMENTO',
          'CONCLUIDO',
          'EM_REFORCO',
          'CONCLUIDO_COM_RETENCAO_PENDENTE',
          'PAUSADO',
          'BLOQUEADO'
        )
        AND participant.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM account_invitations AS membership
          WHERE membership.account_id = assignment.participant_id
            AND membership.roles @> '["PARTICIPANT"]'::jsonb
            AND membership.scopes @> jsonb_build_array(activity.scope_id::text)
            AND membership.accepted_at IS NOT NULL
        )
        AND EXISTS (
          SELECT 1
          FROM learning_activity_items AS item
          INNER JOIN content_versions AS version
            ON version.id = item.content_version_id
          WHERE item.activity_id = activity.id
            AND version.scope_id = activity.scope_id
            AND version.status = 'PUBLICADO'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM learning_activity_items AS item
          INNER JOIN content_versions AS version
            ON version.id = item.content_version_id
          WHERE item.activity_id = activity.id
            AND (
              version.scope_id IS DISTINCT FROM activity.scope_id
              OR version.status IS DISTINCT FROM 'PUBLICADO'
            )
        )
    );
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_assignment_write_allowed(uuid, uuid, uuid, text, text) FROM PUBLIC;--> statement-breakpoint

DROP POLICY "activity_assignments_adaptive_insert_policy"
  ON "activity_assignments";--> statement-breakpoint
CREATE POLICY "activity_assignments_adaptive_insert_policy"
  ON "activity_assignments" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND "learning_assignment_id" IS NOT NULL
    AND cvg_learning_activity_assignment_write_allowed(
      "activity_assignments"."activity_id",
      "activity_assignments"."learning_assignment_id",
      "activity_assignments"."participant_id",
      current_setting('cvg.scope_id', true),
      "activity_assignments"."status"
    )
  );--> statement-breakpoint

DROP POLICY "activity_assignments_adaptive_update_policy"
  ON "activity_assignments";--> statement-breakpoint
CREATE POLICY "activity_assignments_adaptive_update_policy"
  ON "activity_assignments" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND cvg_learning_activity_in_scope(
      "activity_assignments"."activity_id",
      current_setting('cvg.scope_id', true)
    )
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND "learning_assignment_id" IS NOT NULL
    AND cvg_learning_activity_assignment_write_allowed(
      "activity_assignments"."activity_id",
      "activity_assignments"."learning_assignment_id",
      "activity_assignments"."participant_id",
      current_setting('cvg.scope_id', true),
      "activity_assignments"."status"
    )
  );
