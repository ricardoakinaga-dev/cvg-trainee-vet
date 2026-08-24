-- Strengthen feedback history writes without rewriting the append-only rows
-- created by 0037. Legacy feedback tickets may still have no history.

CREATE UNIQUE INDEX "feedback_tickets_id_scope_idx"
  ON "feedback_tickets" USING btree ("id", "scope_id");--> statement-breakpoint

ALTER TABLE "feedback_ticket_history"
  ADD CONSTRAINT "feedback_ticket_history_ticket_scope_fk"
  FOREIGN KEY ("ticket_id", "scope_id") REFERENCES "public"."feedback_tickets"("id", "scope_id")
  ON DELETE restrict ON UPDATE no action
  NOT VALID;--> statement-breakpoint

ALTER TABLE "feedback_ticket_history"
  DROP CONSTRAINT "feedback_ticket_history_ticket_id_feedback_tickets_id_fk";--> statement-breakpoint

-- Validate only new history rows. The trigger runs with the caller's RLS
-- context, so this check does not weaken the existing row-level security.
CREATE FUNCTION cvg_validate_feedback_ticket_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  parent_version integer;
  parent_status text;
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

  IF NEW.event_type = 'CRIADO' AND NEW.ticket_version <> 0 THEN
    RAISE EXCEPTION 'feedback history creation shape is invalid';
  END IF;
  IF NEW.event_type = 'CRIADO' AND NEW.from_status IS NOT NULL THEN
    RAISE EXCEPTION 'feedback history creation shape is invalid';
  END IF;
  IF NEW.event_type = 'STATUS_ALTERADO' AND NEW.ticket_version < 1 THEN
    RAISE EXCEPTION 'feedback history status shape is invalid';
  END IF;
  IF NEW.event_type = 'STATUS_ALTERADO' AND NEW.from_status IS NULL THEN
    RAISE EXCEPTION 'feedback history status shape is invalid';
  END IF;
  IF NEW.event_type NOT IN ('CRIADO', 'STATUS_ALTERADO') THEN
    RAISE EXCEPTION 'feedback history event type is invalid';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER feedback_ticket_history_parent_integrity
  BEFORE INSERT ON "feedback_ticket_history"
  FOR EACH ROW EXECUTE FUNCTION cvg_validate_feedback_ticket_history_insert();
