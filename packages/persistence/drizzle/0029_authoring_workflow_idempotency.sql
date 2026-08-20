CREATE TABLE "authoring_workflow_idempotency" (
  "key" text PRIMARY KEY NOT NULL,
  "operation" text NOT NULL,
  "fingerprint" text NOT NULL,
  "content_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "authoring_workflow_idempotency_operation_check"
    CHECK ("authoring_workflow_idempotency"."operation" in ('clinical_review', 'publication')),
  CONSTRAINT "authoring_workflow_idempotency_version_check"
    CHECK ("authoring_workflow_idempotency"."version" >= 1)
);
--> statement-breakpoint
CREATE INDEX "authoring_workflow_idempotency_expires_at_idx"
  ON "authoring_workflow_idempotency" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "authoring_workflow_idempotency_content_idx"
  ON "authoring_workflow_idempotency" USING btree ("content_id", "version");
