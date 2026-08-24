-- Close the remaining lineage gaps for newly inserted feedback history rows.
-- Legacy rows remain untouched; rows inserted after 0038 must agree with the
-- immediately preceding event whenever that event exists.

CREATE OR REPLACE FUNCTION cvg_validate_feedback_ticket_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  parent_version integer;
  parent_status text;
  previous_status text;
BEGIN
  SELECT ticket.version, ticket.status
    INTO parent_version, parent_status
   FROM feedback_tickets AS ticket
   WHERE ticket.id = NEW.ticket_id
     AND ticket.scope_id = NEW.scope_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback history parent ticket scope does not match';
  END IF;

  IF NEW.ticket_version IS DISTINCT FROM parent_version THEN
    RAISE EXCEPTION 'feedback history version does not match parent ticket';
  END IF;

  IF NEW.to_status IS DISTINCT FROM parent_status THEN
    RAISE EXCEPTION 'feedback history status does not match parent ticket';
  END IF;

  IF NEW.event_type = 'CRIADO' THEN
    IF NEW.ticket_version <> 0
      OR NEW.from_status IS NOT NULL
      OR NEW.to_status <> 'NOVO' THEN
      RAISE EXCEPTION 'feedback history creation shape is invalid';
    END IF;
  ELSIF NEW.event_type = 'STATUS_ALTERADO' THEN
    IF NEW.ticket_version < 1 OR NEW.from_status IS NULL THEN
      RAISE EXCEPTION 'feedback history status shape is invalid';
    END IF;

    SELECT history.to_status
      INTO previous_status
      FROM feedback_ticket_history AS history
     WHERE history.ticket_id = NEW.ticket_id
       AND history.scope_id = NEW.scope_id
       AND history.ticket_version = NEW.ticket_version - 1
     LIMIT 1;

    IF FOUND AND NEW.from_status IS DISTINCT FROM previous_status THEN
      RAISE EXCEPTION 'feedback history previous status does not match';
    END IF;
  ELSE
    RAISE EXCEPTION 'feedback history event type is invalid';
  END IF;

  RETURN NEW;
END;
$$;
