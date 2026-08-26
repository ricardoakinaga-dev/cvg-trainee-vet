-- Bind participant activity reads to the transaction scope and keep feedback
-- history participant-owned at the RLS boundary. The application resolves an
-- activity scope through the private oracle before reading the projection.

CREATE OR REPLACE FUNCTION cvg_learning_activity_scope_for_participant(
  p_activity_id uuid,
  p_participant_id text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT activity.scope_id::text
  FROM activity_assignments AS assignment
  INNER JOIN learning_activities AS activity
    ON activity.id = assignment.activity_id
  INNER JOIN accounts AS participant
    ON participant.id = assignment.participant_id
  WHERE coalesce(current_setting('cvg.participant_id', true), '') = p_participant_id
    AND coalesce(current_setting('cvg.scope_id', true), '') = ''
    AND assignment.activity_id = p_activity_id
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
  LIMIT 1;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_scope_for_participant(uuid, text) FROM PUBLIC;--> statement-breakpoint

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
    AND coalesce(current_setting('cvg.participant_id', true), '') = p_participant_id
    AND coalesce(current_setting('cvg.scope_id', true), '') <> ''
    AND EXISTS (
      SELECT 1
      FROM activity_assignments AS assignment
      INNER JOIN learning_activities AS activity
        ON activity.id = assignment.activity_id
      INNER JOIN accounts AS participant
        ON participant.id = assignment.participant_id
      WHERE assignment.activity_id = p_activity_id
        AND assignment.participant_id::text = p_participant_id
        AND activity.scope_id::text = current_setting('cvg.scope_id', true)
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
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_journey_visible(uuid, text) FROM PUBLIC;--> statement-breakpoint

DROP POLICY "learning_activities_participant_select_policy"
  ON "learning_activities";--> statement-breakpoint
CREATE POLICY "learning_activities_participant_select_policy"
  ON "learning_activities" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND cvg_learning_activity_in_scope(
      "learning_activities"."id",
      current_setting('cvg.scope_id', true)
    )
    AND cvg_learning_activity_for_participant(
      "learning_activities"."id",
      current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND cvg_learning_activity_in_scope(
      "learning_activity_items"."activity_id",
      current_setting('cvg.scope_id', true)
    )
    AND cvg_learning_activity_content_for_participant(
      "learning_activity_items"."activity_id",
      current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "activity_assignments_participant_select_policy"
  ON "activity_assignments";--> statement-breakpoint
CREATE POLICY "activity_assignments_participant_select_policy"
  ON "activity_assignments" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND cvg_learning_activity_in_scope(
      "activity_assignments"."activity_id",
      current_setting('cvg.scope_id', true)
    )
    AND cvg_learning_activity_for_participant(
      "activity_assignments"."activity_id",
      current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "feedback_ticket_history_scope_select_policy"
  ON "feedback_ticket_history";--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_scope_select_policy"
  ON "feedback_ticket_history" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_participant_select_policy"
  ON "feedback_ticket_history" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND EXISTS (
      SELECT 1
      FROM feedback_tickets AS ticket
      WHERE ticket.id = "feedback_ticket_history"."ticket_id"
        AND ticket.scope_id = "feedback_ticket_history"."scope_id"
        AND ticket.participant_id::text = current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "feedback_ticket_history_scope_insert_policy"
  ON "feedback_ticket_history";--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_scope_insert_policy"
  ON "feedback_ticket_history" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_participant_insert_policy"
  ON "feedback_ticket_history" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND EXISTS (
      SELECT 1
      FROM feedback_tickets AS ticket
      WHERE ticket.id = "feedback_ticket_history"."ticket_id"
        AND ticket.scope_id = "feedback_ticket_history"."scope_id"
        AND ticket.participant_id::text = current_setting('cvg.participant_id', true)
    )
  );
