-- Bounded internal feedback triage metadata. Legacy tickets receive NORMAL
-- through the database default; no participant-facing projection is changed.
ALTER TABLE "feedback_tickets"
  ADD COLUMN "priority" text DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_tickets"
  ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "feedback_tickets"
  ADD CONSTRAINT "feedback_tickets_assignee_id_accounts_id_fk"
  FOREIGN KEY ("assignee_id") REFERENCES "public"."accounts"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_tickets"
  ADD CONSTRAINT "feedback_tickets_priority_check"
  CHECK ("priority" in ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'));--> statement-breakpoint

ALTER TABLE "feedback_ticket_history"
  ADD COLUMN "from_priority" text;--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD COLUMN "to_priority" text;--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD COLUMN "from_assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD COLUMN "to_assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  DROP CONSTRAINT "feedback_ticket_history_event_check";--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  DROP CONSTRAINT "feedback_ticket_history_creation_shape_check";--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD CONSTRAINT "feedback_ticket_history_event_check"
  CHECK ("event_type" in ('CRIADO', 'STATUS_ALTERADO', 'METADATA_ALTERADO'));--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD CONSTRAINT "feedback_ticket_history_from_priority_check"
  CHECK ("from_priority" is null or "from_priority" in ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'));--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD CONSTRAINT "feedback_ticket_history_to_priority_check"
  CHECK ("to_priority" is null or "to_priority" in ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'));--> statement-breakpoint
ALTER TABLE "feedback_ticket_history"
  ADD CONSTRAINT "feedback_ticket_history_creation_shape_check"
  CHECK (("event_type" = 'CRIADO' and "ticket_version" = 0 and "from_status" is null)
    or ("event_type" = 'STATUS_ALTERADO' and "ticket_version" >= 1 and "from_status" is not null)
    or ("event_type" = 'METADATA_ALTERADO' and "ticket_version" >= 1 and "from_status" is not null
      and "from_status" = "to_status" and "from_priority" is not null and "to_priority" is not null));--> statement-breakpoint

CREATE POLICY "feedback_tickets_staff_scope_update_policy"
  ON "feedback_tickets" FOR UPDATE USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  ) WITH CHECK (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

CREATE FUNCTION cvg_guard_feedback_ticket_staff_metadata_update()
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
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.version IS DISTINCT FROM OLD.version + 1
      OR NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
      RAISE EXCEPTION 'staff feedback updates are limited to triage metadata';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER feedback_ticket_staff_metadata_update_guard
  BEFORE UPDATE ON "feedback_tickets"
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_feedback_ticket_staff_metadata_update();--> statement-breakpoint

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
  SELECT ticket.version, ticket.status, ticket.priority, ticket.assignee_id
    INTO parent_version, parent_status, parent_priority, parent_assignee_id
    FROM feedback_tickets AS ticket
   WHERE ticket.id = NEW.ticket_id
     AND ticket.scope_id = NEW.scope_id
   FOR UPDATE;

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
