-- A participant may create a ticket and its version-zero history row, but may
-- not update the ticket. FOR UPDATE therefore makes the history trigger see
-- no parent under participant RLS. Keep the lock for staff transitions and
-- use the participant SELECT policy for the creation path.
CREATE OR REPLACE FUNCTION cvg_validate_feedback_ticket_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  parent_version integer;
  parent_status text;
  parent_priority text;
  parent_assignee_id uuid;
  previous_status text;
  previous_priority text;
  previous_assignee_id uuid;
BEGIN
  IF coalesce(current_setting('cvg.participant_id', true), '') = '' THEN
    SELECT ticket.version, ticket.status, ticket.priority, ticket.assignee_id
      INTO parent_version, parent_status, parent_priority, parent_assignee_id
      FROM feedback_tickets AS ticket
     WHERE ticket.id = NEW.ticket_id
       AND ticket.scope_id = NEW.scope_id
     FOR UPDATE;
  ELSE
    SELECT ticket.version, ticket.status, ticket.priority, ticket.assignee_id
      INTO parent_version, parent_status, parent_priority, parent_assignee_id
      FROM feedback_tickets AS ticket
     WHERE ticket.id = NEW.ticket_id
       AND ticket.scope_id = NEW.scope_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback history parent ticket scope does not match';
  END IF;
  IF NEW.ticket_version IS DISTINCT FROM parent_version
    OR NEW.to_status IS DISTINCT FROM parent_status THEN
    RAISE EXCEPTION 'feedback history parent state does not match';
  END IF;

  SELECT history.to_status, history.to_priority, history.to_assignee_id
    INTO previous_status, previous_priority, previous_assignee_id
    FROM feedback_ticket_history AS history
   WHERE history.ticket_id = NEW.ticket_id
     AND history.scope_id = NEW.scope_id
     AND history.ticket_version = NEW.ticket_version - 1
   LIMIT 1;

  IF NEW.event_type = 'CRIADO' THEN
    IF NEW.ticket_version <> 0
      OR NEW.from_status IS NOT NULL
      OR NEW.to_status <> 'NOVO'
      OR (NEW.to_priority IS NOT NULL AND NEW.to_priority IS DISTINCT FROM parent_priority)
      OR (NEW.to_assignee_id IS NOT NULL AND NEW.to_assignee_id IS DISTINCT FROM parent_assignee_id) THEN
      RAISE EXCEPTION 'feedback history creation shape is invalid';
    END IF;
  ELSIF NEW.event_type = 'STATUS_ALTERADO' THEN
    IF NEW.ticket_version < 1 OR NEW.from_status IS NULL THEN
      RAISE EXCEPTION 'feedback history status shape is invalid';
    END IF;
    IF FOUND AND NEW.from_status IS DISTINCT FROM previous_status THEN
      RAISE EXCEPTION 'feedback history previous status does not match';
    END IF;
    IF NEW.to_priority IS NOT NULL
      AND NEW.to_priority IS DISTINCT FROM parent_priority THEN
      RAISE EXCEPTION 'feedback history status priority does not match';
    END IF;
    IF FOUND AND NEW.from_priority IS NOT NULL AND previous_priority IS NOT NULL
      AND NEW.from_priority IS DISTINCT FROM previous_priority THEN
      RAISE EXCEPTION 'feedback history previous priority does not match';
    END IF;
    IF FOUND AND NEW.from_assignee_id IS NOT NULL
      AND previous_assignee_id IS NOT NULL
      AND NEW.from_assignee_id IS DISTINCT FROM previous_assignee_id THEN
      RAISE EXCEPTION 'feedback history previous assignee does not match';
    END IF;
  ELSIF NEW.event_type = 'METADATA_ALTERADO' THEN
    IF NEW.ticket_version < 1
      OR NEW.from_status IS NULL
      OR NEW.from_status IS DISTINCT FROM NEW.to_status
      OR NEW.from_priority IS NULL
      OR NEW.to_priority IS NULL
      OR NEW.to_priority IS DISTINCT FROM parent_priority
      OR NEW.to_assignee_id IS DISTINCT FROM parent_assignee_id THEN
      RAISE EXCEPTION 'feedback history metadata shape is invalid';
    END IF;
    IF FOUND AND NEW.from_status IS DISTINCT FROM previous_status THEN
      RAISE EXCEPTION 'feedback history metadata previous status does not match';
    END IF;
    IF FOUND AND previous_priority IS NOT NULL
      AND NEW.from_priority IS DISTINCT FROM previous_priority THEN
      RAISE EXCEPTION 'feedback history metadata previous priority does not match';
    END IF;
    IF FOUND AND NEW.from_assignee_id IS DISTINCT FROM previous_assignee_id THEN
      RAISE EXCEPTION 'feedback history metadata previous assignee does not match';
    END IF;
  ELSE
    RAISE EXCEPTION 'feedback history event type is invalid';
  END IF;

  RETURN NEW;
END;
$$;
