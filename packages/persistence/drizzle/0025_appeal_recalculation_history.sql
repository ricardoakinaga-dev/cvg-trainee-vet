-- Keep reviewer transitions and bounded recalculation history append-only.
-- Only the transaction-local reviewer scope can read or insert these records.

CREATE TABLE "appeal_review_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appeal_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "appeal_version" integer NOT NULL,
  "event_type" text NOT NULL,
  "from_status" text NOT NULL,
  "to_status" text NOT NULL,
  "reviewer_id" uuid,
  "decision" text,
  "decision_rationale" text,
  "decision_at" timestamp with time zone,
  "decision_correlation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "appeal_review_history_appeal_id_appeals_id_fk"
    FOREIGN KEY ("appeal_id") REFERENCES "public"."appeals"("id") ON DELETE restrict,
  CONSTRAINT "appeal_review_history_reviewer_id_accounts_id_fk"
    FOREIGN KEY ("reviewer_id") REFERENCES "public"."accounts"("id") ON DELETE restrict,
  CONSTRAINT "appeal_review_history_event_check"
    CHECK ("event_type" in ('ATRIBUIR_REVISOR', 'DECIDIR', 'SOLICITAR_RECALCULO', 'CONCLUIR_RECALCULO')),
  CONSTRAINT "appeal_review_history_status_check"
    CHECK ("from_status" in ('ABERTA', 'EM_REVISAO', 'DECIDIDA', 'RECALCULO_PENDENTE')
      and "to_status" in ('EM_REVISAO', 'DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA')),
  CONSTRAINT "appeal_review_history_version_check"
    CHECK ("appeal_version" >= 1)
);--> statement-breakpoint

CREATE UNIQUE INDEX "appeal_review_history_version_idx"
  ON "appeal_review_history" USING btree ("appeal_id", "appeal_version");--> statement-breakpoint
CREATE INDEX "appeal_review_history_scope_created_idx"
  ON "appeal_review_history" USING btree ("scope_id", "created_at", "id");--> statement-breakpoint

CREATE FUNCTION cvg_prevent_appeal_review_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'appeal_review_history is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER appeal_review_history_append_only
  BEFORE UPDATE OR DELETE ON "appeal_review_history"
  FOR EACH ROW EXECUTE FUNCTION cvg_prevent_appeal_review_history_mutation();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "appeal_review_history" FROM PUBLIC;--> statement-breakpoint

ALTER TABLE "appeal_review_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appeal_review_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "appeal_review_history_review_scope_select_policy"
  ON "appeal_review_history" FOR SELECT USING (
    current_setting('cvg.appeal_review_scope_id', true) = "scope_id"::text
  );--> statement-breakpoint
CREATE POLICY "appeal_review_history_review_scope_insert_policy"
  ON "appeal_review_history" FOR INSERT WITH CHECK (
    current_setting('cvg.appeal_review_scope_id', true) = "scope_id"::text
  );
