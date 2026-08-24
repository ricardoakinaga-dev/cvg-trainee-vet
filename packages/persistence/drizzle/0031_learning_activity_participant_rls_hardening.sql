-- Keep participant reads bounded to an active, published assignment in a
-- scope where the participant has an explicit participant membership.
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
        AND assignment.status IN ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
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

-- A session is meaningful only when its module identity is present. Legacy
-- module-only activities remain valid and are intentionally outside authoring
-- session grouping.
ALTER TABLE "learning_activities"
  DROP CONSTRAINT "learning_activities_session_module_check";--> statement-breakpoint
ALTER TABLE "learning_activities"
  ADD CONSTRAINT "learning_activities_session_module_check"
  CHECK (
    "session_id" is null
    or (
      "module_id" is not null
      and "session_id" ~ ('^' || "module_id" || '-S[1-4]$')
    )
  );
