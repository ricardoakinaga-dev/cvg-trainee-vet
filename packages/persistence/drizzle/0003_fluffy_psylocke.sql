CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"participant_text" text NOT NULL,
	"response_mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_versions_status_check" CHECK ("content_versions"."status" in ('RASCUNHO', 'AUTOVERIFICADO', 'EM_REVISAO_CLINICA', 'AJUSTES_SOLICITADOS', 'APROVADO_CLINICAMENTE', 'PROJECAO_VERIFICADA', 'AUTORIZADO_PARA_PUBLICACAO', 'PUBLICADO', 'RETIRADO', 'VENCIDO')),
	CONSTRAINT "content_versions_kind_check" CHECK ("content_versions"."kind" in ('LEITURA', 'QUESTAO', 'CASO', 'REFLEXAO')),
	CONSTRAINT "content_versions_response_mode_check" CHECK ("content_versions"."response_mode" in ('TEXT', 'CHOICE', 'NONE')),
	CONSTRAINT "content_versions_version_check" CHECK ("content_versions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "learning_activity_items" (
	"activity_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	CONSTRAINT "learning_activity_items_activity_id_content_version_id_pk" PRIMARY KEY("activity_id","content_version_id"),
	CONSTRAINT "learning_activity_items_ordinal_check" CHECK ("learning_activity_items"."ordinal" >= 1 and "learning_activity_items"."ordinal" <= 100)
);
--> statement-breakpoint
ALTER TABLE "learning_activities" ADD COLUMN "title" text DEFAULT 'Atividade' NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_activity_items" ADD CONSTRAINT "learning_activity_items_activity_id_learning_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."learning_activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_activity_items" ADD CONSTRAINT "learning_activity_items_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_content_version_idx" ON "content_versions" USING btree ("content_id","version");--> statement-breakpoint
CREATE INDEX "content_versions_scope_status_idx" ON "content_versions" USING btree ("scope_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_activity_items_ordinal_idx" ON "learning_activity_items" USING btree ("activity_id","ordinal");--> statement-breakpoint
CREATE INDEX "learning_activity_items_content_idx" ON "learning_activity_items" USING btree ("content_version_id");