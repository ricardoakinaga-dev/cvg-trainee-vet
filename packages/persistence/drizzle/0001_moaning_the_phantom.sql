CREATE TABLE "activity_assignments" (
	"participant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"status" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_assignments_participant_id_activity_id_pk" PRIMARY KEY("participant_id","activity_id"),
	CONSTRAINT "activity_assignments_status_check" CHECK ("activity_assignments"."status" in ('ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'PAUSADO', 'BLOQUEADO'))
);
--> statement-breakpoint
CREATE TABLE "attempt_idempotency" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"fingerprint" text NOT NULL,
	"attempt_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_status_check" CHECK ("attempts"."status" in ('CRIADA', 'EM_ANDAMENTO', 'SALVA', 'SUBMETIDA', 'CORRIGIDA_AUTOMATICAMENTE', 'AGUARDA_CORRECAO_HUMANA', 'CORRIGIDA_HUMANAMENTE', 'ANULADA')),
	CONSTRAINT "attempts_version_check" CHECK ("attempts"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_activities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "learning_activities_status_check" CHECK ("learning_activities"."status" in ('PUBLISHED', 'WITHDRAWN', 'EXPIRED'))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"schema_version" integer NOT NULL,
	"correlation_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"last_error_code" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_status_check" CHECK ("outbox_events"."status" in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
	CONSTRAINT "outbox_events_attempts_check" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "activity_assignments" ADD CONSTRAINT "activity_assignments_activity_id_learning_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."learning_activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_idempotency" ADD CONSTRAINT "attempt_idempotency_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_activity_id_learning_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."learning_activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_assignments_participant_status_idx" ON "activity_assignments" USING btree ("participant_id","status");--> statement-breakpoint
CREATE INDEX "attempt_idempotency_expires_at_idx" ON "attempt_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "attempts_participant_status_idx" ON "attempts" USING btree ("participant_id","status");--> statement-breakpoint
CREATE INDEX "attempts_activity_status_idx" ON "attempts" USING btree ("activity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_open_participant_activity_idx" ON "attempts" USING btree ("participant_id","activity_id") WHERE "attempts"."status" in ('CRIADA', 'EM_ANDAMENTO', 'SALVA', 'SUBMETIDA', 'AGUARDA_CORRECAO_HUMANA');--> statement-breakpoint
CREATE INDEX "learning_activities_scope_status_idx" ON "learning_activities" USING btree ("scope_id","status");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("status","available_at","created_at");