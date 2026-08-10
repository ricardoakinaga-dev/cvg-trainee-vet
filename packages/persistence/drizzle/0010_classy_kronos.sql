CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"justification" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"reviewer_id" uuid,
	"decision" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appeals_status_check" CHECK ("appeals"."status" in ('ABERTA', 'EM_REVISAO', 'DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA')),
	CONSTRAINT "appeals_decision_check" CHECK ((("appeals"."status" in ('DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA') and "appeals"."decision" in ('MANTER_RESULTADO', 'ANULAR_ITEM', 'ALTERAR_RESULTADO')) or ("appeals"."status" in ('ABERTA', 'EM_REVISAO') and "appeals"."decision" is null))),
	CONSTRAINT "appeals_reviewer_check" CHECK (("appeals"."reviewer_id" is null or "appeals"."reviewer_id" <> "appeals"."participant_id")),
	CONSTRAINT "appeals_justification_check" CHECK (length(trim("appeals"."justification")) between 1 and 10000 and "appeals"."justification" not like '%<%>'),
	CONSTRAINT "appeals_due_at_check" CHECK ("appeals"."due_at" >= "appeals"."created_at"),
	CONSTRAINT "appeals_version_check" CHECK ("appeals"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assessment_workflows" (
	"result_id" uuid PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"rule_version" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_workflows_status_check" CHECK ("assessment_workflows"."status" in ('RESULTADO_EM_PROCESSAMENTO', 'RESULTADO_DISPONIVEL', 'RESULTADO_EM_REVISAO', 'RESULTADO_CORRIGIDO', 'RESULTADO_ANULADO')),
	CONSTRAINT "assessment_workflows_rule_version_check" CHECK (length(trim("assessment_workflows"."rule_version")) between 1 and 128),
	CONSTRAINT "assessment_workflows_version_check" CHECK ("assessment_workflows"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "feedback_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_tickets_type_check" CHECK ("feedback_tickets"."type" in ('BUG_TECNICO', 'USABILIDADE', 'ERRO_CONTEUDO', 'MELHORIA', 'CONTESTACAO')),
	CONSTRAINT "feedback_tickets_status_check" CHECK ("feedback_tickets"."status" in ('NOVO', 'TRIADO', 'EM_TRATAMENTO', 'AGUARDA_USUARIO', 'RESOLVIDO', 'DUPLICADO', 'NAO_REPRODUZIDO', 'NAO_PLANEJADO')),
	CONSTRAINT "feedback_tickets_description_check" CHECK (length(trim("feedback_tickets"."description")) between 1 and 10000 and "feedback_tickets"."description" not like '%<%>'),
	CONSTRAINT "feedback_tickets_version_check" CHECK ("feedback_tickets"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"block_reason" text,
	"paused_from" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_assignments_module_id_check" CHECK ("learning_assignments"."module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
	CONSTRAINT "learning_assignments_status_check" CHECK ("learning_assignments"."status" in ('NAO_ATRIBUIDO', 'ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'PAUSADO', 'BLOQUEADO')),
	CONSTRAINT "learning_assignments_version_check" CHECK ("learning_assignments"."version" >= 0),
	CONSTRAINT "learning_assignments_block_reason_check" CHECK ((("learning_assignments"."status" = 'BLOQUEADO' and "learning_assignments"."block_reason" in ('PRE_REQUISITO', 'CONTEUDO_RETIRADO', 'OBJETIVO_EM_REMEDIACAO')) or ("learning_assignments"."status" <> 'BLOQUEADO' and "learning_assignments"."block_reason" is null))),
	CONSTRAINT "learning_assignments_paused_from_check" CHECK ((("learning_assignments"."status" = 'PAUSADO' and "learning_assignments"."paused_from" in ('NAO_ATRIBUIDO', 'ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'BLOQUEADO')) or ("learning_assignments"."status" <> 'PAUSADO' and "learning_assignments"."paused_from" is null)))
);
--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_workflows" ADD CONSTRAINT "assessment_workflows_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_workflows" ADD CONSTRAINT "assessment_workflows_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_tickets" ADD CONSTRAINT "feedback_tickets_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "learning_assignments_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appeals_open_attempt_item_idx" ON "appeals" USING btree ("participant_id","attempt_id","item_id") WHERE "appeals"."status" <> 'ENCERRADA';--> statement-breakpoint
CREATE INDEX "appeals_participant_scope_status_idx" ON "appeals" USING btree ("participant_id","scope_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_workflows_attempt_version_idx" ON "assessment_workflows" USING btree ("attempt_id","version");--> statement-breakpoint
CREATE INDEX "assessment_workflows_participant_scope_status_idx" ON "assessment_workflows" USING btree ("participant_id","scope_id","status");--> statement-breakpoint
CREATE INDEX "feedback_tickets_participant_scope_status_idx" ON "feedback_tickets" USING btree ("participant_id","scope_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_assignments_participant_scope_module_idx" ON "learning_assignments" USING btree ("participant_id","scope_id","module_id");--> statement-breakpoint
CREATE INDEX "learning_assignments_participant_scope_status_idx" ON "learning_assignments" USING btree ("participant_id","scope_id","status");--> statement-breakpoint
ALTER TABLE "learning_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "learning_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "learning_assignments_participant_scope_policy" ON "learning_assignments" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint
ALTER TABLE "assessment_workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_workflows" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "assessment_workflows_participant_scope_policy" ON "assessment_workflows" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint
ALTER TABLE "feedback_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback_tickets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "feedback_tickets_participant_scope_policy" ON "feedback_tickets" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint
ALTER TABLE "appeals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appeals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "appeals_participant_scope_policy" ON "appeals" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
