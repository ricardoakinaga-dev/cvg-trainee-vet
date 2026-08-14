ALTER TABLE "accounts" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_version_check" CHECK ("accounts"."version" >= 0);
