-- The participant journey needs assignment metadata before an activity is
-- startable, while activity-item RLS must continue to hide content in the
-- ATRIBUIDO state. Return only a boolean projection for that metadata path.
CREATE OR REPLACE FUNCTION cvg_learning_activity_journey_visible(
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
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_journey_visible(uuid, text) FROM PUBLIC;
