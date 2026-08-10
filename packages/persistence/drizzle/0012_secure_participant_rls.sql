-- Defense-in-depth for participant-scoped legacy learning data.
-- The application must set these transaction-local settings through
-- setDatabaseSecurityContext before touching the protected tables.

ALTER TABLE "activity_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "activity_assignments_participant_select_policy" ON "activity_assignments" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
);--> statement-breakpoint

ALTER TABLE "curriculum_runtime_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "curriculum_runtime_states" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_select_policy" ON "curriculum_runtime_states" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
);--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_insert_policy" ON "curriculum_runtime_states" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
  AND (
    current_setting('cvg.scope_id', true) = ''
    OR current_setting('cvg.scope_id', true) = "scope_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "curriculum_runtime_participant_update_policy" ON "curriculum_runtime_states" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND (
      current_setting('cvg.scope_id', true) = ''
      OR current_setting('cvg.scope_id', true) = "scope_id"::text
    )
  );--> statement-breakpoint

ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "attempts_participant_select_policy" ON "attempts" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
);--> statement-breakpoint
CREATE POLICY "attempts_participant_insert_policy" ON "attempts" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
);--> statement-breakpoint
CREATE POLICY "attempts_participant_update_policy" ON "attempts" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
  );--> statement-breakpoint
CREATE POLICY "attempts_scope_staff_select_policy" ON "attempts" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "learning_activities" AS activity
    WHERE activity."id" = "attempts"."activity_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint
CREATE POLICY "attempts_scope_staff_update_policy" ON "attempts" FOR UPDATE
  USING (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      WHERE activity."id" = "attempts"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  )
  WITH CHECK (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      WHERE activity."id" = "attempts"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  );--> statement-breakpoint

ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "answers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "answers_participant_select_policy" ON "answers" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "answers"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "answers_participant_insert_policy" ON "answers" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "answers"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "answers_participant_update_policy" ON "answers" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "attempts" AS attempt
      WHERE attempt."id" = "answers"."attempt_id"
        AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
    )
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1 FROM "attempts" AS attempt
      WHERE attempt."id" = "answers"."attempt_id"
        AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
    )
  );--> statement-breakpoint

ALTER TABLE "attempt_idempotency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_idempotency" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "attempt_idempotency_participant_select_policy" ON "attempt_idempotency" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "attempt_idempotency"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "attempt_idempotency_participant_insert_policy" ON "attempt_idempotency" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "attempt_idempotency"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint

ALTER TABLE "answer_idempotency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "answer_idempotency" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "answer_idempotency_participant_select_policy" ON "answer_idempotency" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "answer_idempotency"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "answer_idempotency_participant_insert_policy" ON "answer_idempotency" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "answer_idempotency"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint

ALTER TABLE "assessment_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_results" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "assessment_results_participant_select_policy" ON "assessment_results" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND EXISTS (
    SELECT 1 FROM "attempts" AS attempt
    WHERE attempt."id" = "assessment_results"."attempt_id"
      AND current_setting('cvg.participant_id', true) = attempt."participant_id"::text
  )
);--> statement-breakpoint
CREATE POLICY "assessment_results_scope_staff_select_policy" ON "assessment_results" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "attempts" AS attempt
    INNER JOIN "learning_activities" AS activity ON activity."id" = attempt."activity_id"
    WHERE attempt."id" = "assessment_results"."attempt_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint
CREATE POLICY "assessment_results_scope_staff_insert_policy" ON "assessment_results" FOR INSERT WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "attempts" AS attempt
    INNER JOIN "learning_activities" AS activity ON activity."id" = attempt."activity_id"
    WHERE attempt."id" = "assessment_results"."attempt_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint

ALTER TABLE "assessment_idempotency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_idempotency" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "assessment_idempotency_scope_staff_select_policy" ON "assessment_idempotency" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "attempts" AS attempt
    INNER JOIN "learning_activities" AS activity ON activity."id" = attempt."activity_id"
    WHERE attempt."id" = "assessment_idempotency"."attempt_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint
CREATE POLICY "assessment_idempotency_scope_staff_insert_policy" ON "assessment_idempotency" FOR INSERT WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "attempts" AS attempt
    INNER JOIN "learning_activities" AS activity ON activity."id" = attempt."activity_id"
    WHERE attempt."id" = "assessment_idempotency"."attempt_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint
