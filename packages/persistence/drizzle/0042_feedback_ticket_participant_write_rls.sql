-- Participant feedback tickets are readable and creatable in their own scope.
-- Status and triage mutations require the staff scope-only repository context;
-- there is intentionally no participant UPDATE or DELETE policy.
DROP POLICY "feedback_tickets_participant_scope_policy" ON "feedback_tickets";--> statement-breakpoint
DROP POLICY "feedback_tickets_staff_scope_select_policy" ON "feedback_tickets";--> statement-breakpoint

CREATE POLICY "feedback_tickets_staff_scope_select_policy"
  ON "feedback_tickets" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

CREATE POLICY "feedback_tickets_participant_scope_select_policy"
  ON "feedback_tickets" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

CREATE POLICY "feedback_tickets_participant_scope_insert_policy"
  ON "feedback_tickets" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );
--> statement-breakpoint

-- The same scope-only staff context serves the existing status transition and
-- the FEEDBACK-054 triage metadata path. A staff update must change exactly
-- one of those dimensions; identity, participant text, version and timestamp
-- remain guarded at the database boundary.
CREATE OR REPLACE FUNCTION cvg_guard_feedback_ticket_staff_metadata_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('cvg.participant_id', true), '') = '' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.participant_id IS DISTINCT FROM OLD.participant_id
      OR NEW.scope_id IS DISTINCT FROM OLD.scope_id
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.version IS DISTINCT FROM OLD.version + 1
      OR NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at
      OR (
        NEW.status IS DISTINCT FROM OLD.status
        AND (
          NEW.priority IS DISTINCT FROM OLD.priority
          OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
        )
      )
      OR (
        NEW.status IS NOT DISTINCT FROM OLD.status
        AND NEW.priority IS NOT DISTINCT FROM OLD.priority
        AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id
      ) THEN
      RAISE EXCEPTION
        'staff feedback updates are limited to triage metadata or a status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
