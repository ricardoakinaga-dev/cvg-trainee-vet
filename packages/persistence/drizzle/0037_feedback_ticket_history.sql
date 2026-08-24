-- Append-only, scoped metadata for reconstructing internal feedback triage.
-- Ticket descriptions, responses and bibliographic/clinical content remain out
-- of this timeline projection.

CREATE TABLE "feedback_ticket_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "ticket_version" integer NOT NULL,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feedback_ticket_history_ticket_id_feedback_tickets_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."feedback_tickets"("id") ON DELETE restrict,
  CONSTRAINT "feedback_ticket_history_event_check"
    CHECK ("event_type" in ('CRIADO', 'STATUS_ALTERADO')),
  CONSTRAINT "feedback_ticket_history_from_status_check"
    CHECK ("from_status" is null or "from_status" in ('NOVO', 'TRIADO', 'EM_TRATAMENTO', 'AGUARDA_USUARIO', 'RESOLVIDO', 'DUPLICADO', 'NAO_REPRODUZIDO', 'NAO_PLANEJADO')),
  CONSTRAINT "feedback_ticket_history_to_status_check"
    CHECK ("to_status" in ('NOVO', 'TRIADO', 'EM_TRATAMENTO', 'AGUARDA_USUARIO', 'RESOLVIDO', 'DUPLICADO', 'NAO_REPRODUZIDO', 'NAO_PLANEJADO')),
  CONSTRAINT "feedback_ticket_history_version_check"
    CHECK ("ticket_version" >= 0),
  CONSTRAINT "feedback_ticket_history_creation_shape_check"
    CHECK (("event_type" = 'CRIADO' and "ticket_version" = 0 and "from_status" is null)
      or ("event_type" = 'STATUS_ALTERADO' and "ticket_version" >= 1 and "from_status" is not null))
);--> statement-breakpoint

CREATE UNIQUE INDEX "feedback_ticket_history_version_idx"
  ON "feedback_ticket_history" USING btree ("ticket_id", "ticket_version");--> statement-breakpoint
CREATE INDEX "feedback_ticket_history_scope_created_idx"
  ON "feedback_ticket_history" USING btree ("scope_id", "created_at", "id");--> statement-breakpoint

CREATE FUNCTION cvg_prevent_feedback_ticket_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'feedback_ticket_history is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER feedback_ticket_history_append_only
  BEFORE UPDATE OR DELETE ON "feedback_ticket_history"
  FOR EACH ROW EXECUTE FUNCTION cvg_prevent_feedback_ticket_history_mutation();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "feedback_ticket_history" FROM PUBLIC;--> statement-breakpoint

ALTER TABLE "feedback_ticket_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback_ticket_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_scope_select_policy"
  ON "feedback_ticket_history" FOR SELECT USING (
    current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint
CREATE POLICY "feedback_ticket_history_scope_insert_policy"
  ON "feedback_ticket_history" FOR INSERT WITH CHECK (
    current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );
