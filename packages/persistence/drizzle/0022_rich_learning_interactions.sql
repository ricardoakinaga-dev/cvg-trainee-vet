ALTER TABLE "content_versions"
ADD COLUMN "participant_interaction" jsonb;
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD COLUMN "digital_case_stage" jsonb;
--> statement-breakpoint
ALTER TABLE "content_versions"
DROP CONSTRAINT IF EXISTS "content_versions_response_mode_check";
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD CONSTRAINT "content_versions_response_mode_check" CHECK (
  "content_versions"."response_mode" in ('TEXT', 'CHOICE', 'STRUCTURED_FIELDS', 'DOSE_INFUSION', 'NONE')
);
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD CONSTRAINT "content_versions_participant_interaction_object_check" CHECK (
  "content_versions"."participant_interaction" is null
  or jsonb_typeof("content_versions"."participant_interaction") = 'object'
);
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD CONSTRAINT "content_versions_digital_case_stage_object_check" CHECK (
  "content_versions"."digital_case_stage" is null
  or jsonb_typeof("content_versions"."digital_case_stage") = 'object'
);
