-- Make negative HTTP events auditable without fabricating a principal or
-- storing a credential/path value as a UUID resource identifier.

ALTER TABLE "audit_entries"
  ADD COLUMN "actor_kind" text NOT NULL DEFAULT 'AUTHENTICATED';--> statement-breakpoint
ALTER TABLE "audit_entries"
  ALTER COLUMN "principal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_entries"
  ALTER COLUMN "resource_id" TYPE text USING "resource_id"::text;--> statement-breakpoint
ALTER TABLE "audit_entries"
  ALTER COLUMN "resource_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_entries"
  ADD CONSTRAINT "audit_entries_actor_check" CHECK (
    ("actor_kind" = 'AUTHENTICATED' AND "principal_id" IS NOT NULL)
    OR ("actor_kind" = 'ANONYMOUS' AND "principal_id" IS NULL)
  );
