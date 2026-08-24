-- Keep curriculum runtime writes and participant reads bound to an active
-- participant membership in the row scope. The API performs the same check;
-- this policy is the database defense for internal callers and leaked IDs.

CREATE OR REPLACE FUNCTION cvg_participant_in_scope(
  p_participant_id uuid,
  p_scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM accounts AS participant
    INNER JOIN account_invitations AS membership
      ON membership.account_id = participant.id
    WHERE participant.id = p_participant_id
      AND participant.status = 'ACTIVE'
      AND membership.accepted_at IS NOT NULL
      AND membership.roles @> '["PARTICIPANT"]'::jsonb
      AND membership.scopes @> jsonb_build_array(p_scope_id::text)
  );
$$;--> statement-breakpoint

DROP POLICY "curriculum_runtime_participant_select_policy"
  ON "curriculum_runtime_states";--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_select_policy"
  ON "curriculum_runtime_states"
  FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );--> statement-breakpoint

DROP POLICY "curriculum_runtime_participant_insert_policy"
  ON "curriculum_runtime_states";--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_insert_policy"
  ON "curriculum_runtime_states"
  FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND (
      current_setting('cvg.scope_id', true) = ''
      OR current_setting('cvg.scope_id', true) = "scope_id"::text
    )
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );--> statement-breakpoint

DROP POLICY "curriculum_runtime_participant_update_policy"
  ON "curriculum_runtime_states";--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_update_policy"
  ON "curriculum_runtime_states"
  FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND (
      current_setting('cvg.scope_id', true) = ''
      OR current_setting('cvg.scope_id', true) = "scope_id"::text
    )
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );--> statement-breakpoint

DROP POLICY "curriculum_runtime_staff_scope_select_policy"
  ON "curriculum_runtime_states";--> statement-breakpoint
CREATE POLICY "curriculum_runtime_staff_scope_select_policy"
  ON "curriculum_runtime_states"
  FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );
