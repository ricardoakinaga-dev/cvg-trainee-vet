-- D98-M01/M02: make the replay cache bounded, integrity-checkable and
-- inaccessible without the authoring transaction security context.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD COLUMN "response_hash" text;
--> statement-breakpoint
UPDATE "authoring_workflow_idempotency"
SET "fingerprint" = 'sha256:' || encode(digest("fingerprint", 'sha256'), 'hex')
WHERE "fingerprint" !~ '^sha256:[0-9a-f]{64}$';
--> statement-breakpoint
UPDATE "authoring_workflow_idempotency"
SET "response" = jsonb_strip_nulls(jsonb_build_object(
  'schemaVersion', 1,
  'contentId', "content_id"::text,
  'version', "version",
  'contentStatus', "response"->'record'->'contentStatus',
  'preflight', "response"->'record'->'preflight',
  'recordHash', 'legacy:' || md5(("response"->'record')::text),
  'review', "response"->'review'
))
WHERE "response" ? 'record';
--> statement-breakpoint
UPDATE "authoring_workflow_idempotency"
SET "response_hash" = 'legacy:' || md5("response"::text);
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_response_hash_check"
  CHECK ("response_hash" IS NULL OR "response_hash" <> '');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_key_check"
  CHECK ("key" ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,127}$');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_fingerprint_check"
  CHECK ("fingerprint" ~ '^sha256:[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_response_schema_check"
  CHECK (("response"->>'schemaVersion') = '1');
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_expiry_check"
  CHECK ("expires_at" > "created_at");
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency"
  ADD CONSTRAINT "authoring_workflow_idempotency_content_version_fk"
  FOREIGN KEY ("content_id", "version")
  REFERENCES "content_editorial_records" ("content_id", "version")
  ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "authoring_workflow_idempotency" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "authoring_workflow_idempotency_transaction_policy"
  ON "authoring_workflow_idempotency"
  FOR ALL
  USING (current_setting('cvg.authoring_workflow', true) = 'true')
  WITH CHECK (current_setting('cvg.authoring_workflow', true) = 'true');
--> statement-breakpoint
REVOKE ALL ON TABLE "authoring_workflow_idempotency" FROM PUBLIC;
