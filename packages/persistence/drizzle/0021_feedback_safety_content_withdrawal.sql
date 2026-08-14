ALTER TABLE "feedback_tickets"
ADD COLUMN "alerted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
DROP CONSTRAINT IF EXISTS "feedback_tickets_description_check";
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
DROP CONSTRAINT IF EXISTS "feedback_tickets_response_text_check";
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_description_check" CHECK (
  length(trim("feedback_tickets"."description")) between 1 and 2000
  and "feedback_tickets"."description" not like '%<%>'
);
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_response_text_check" CHECK (
  "feedback_tickets"."response" is null
  or (
    length(trim("feedback_tickets"."response")) between 1 and 2000
    and "feedback_tickets"."response" not like '%<%>'
  )
);
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD COLUMN "withdrawal_reason_code" text;
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD COLUMN "withdrawn_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD CONSTRAINT "content_versions_withdrawal_reason_check" CHECK (
  "content_versions"."withdrawal_reason_code" is null
  or "content_versions"."withdrawal_reason_code" in ('ERRO_CLINICO', 'ERRO_CONTEUDO', 'RISCO_SEGURANCA')
);
--> statement-breakpoint
CREATE TABLE "content_withdrawal_affected" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_version_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "scope_id" uuid NOT NULL,
  "participant_id" uuid NOT NULL,
  "withdrawn_at" timestamp with time zone NOT NULL,
  "correlation_id" text NOT NULL,
  CONSTRAINT "content_withdrawal_affected_version_check" CHECK ("content_withdrawal_affected"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "content_withdrawal_affected"
ADD CONSTRAINT "content_withdrawal_affected_content_version_id_content_versions_id_fk"
FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_withdrawal_affected"
ADD CONSTRAINT "content_withdrawal_affected_participant_id_accounts_id_fk"
FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "content_withdrawal_affected_version_participant_idx"
ON "content_withdrawal_affected" USING btree ("content_version_id", "participant_id");
--> statement-breakpoint
CREATE INDEX "content_withdrawal_affected_scope_idx"
ON "content_withdrawal_affected" USING btree ("scope_id", "withdrawn_at");
