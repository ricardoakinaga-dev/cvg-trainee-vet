import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  ApplicationError,
  evaluateAndPersistCurriculumModule,
  type CurriculumEvaluationAttempt,
  type EvaluateCurriculumModuleCommand,
} from "@cvg/application";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import { setCurriculumAttemptContext } from "./curriculum-attempt-context.js";
import { mapCapturedCurriculumEvaluation } from "./curriculum-evaluation-mapping.js";
import { createCurriculumRuntimeRepository } from "./curriculum-runtime-repository.js";
import { assertStoredCurriculumPublicationProvenance } from "./curriculum-publication-provenance.js";

type Database = PostgresJsDatabase<typeof schema>;
const submittedStatuses = [
  "SUBMETIDA",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "CORRIGIDA_HUMANAMENTE",
];
function assertEvaluationIdentity(
  command: EvaluateCurriculumModuleCommand,
): void {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  if (
    ["participantId", "scopeId", "attemptId"].some((field) => {
      const value = command[field as "participantId" | "scopeId" | "attemptId"];
      return typeof value !== "string" || !uuid.test(value);
    })
  )
    throw new ApplicationError(
      "validation_error",
      "Evaluation identity must use UUIDs",
    );
}

/** The outer transaction holds native authorization and publication locks through runtime save. */
export function createCurriculumModuleEvaluationUseCase(
  db: Database,
  idFactory: () => string = randomUUID,
) {
  return async (command: EvaluateCurriculumModuleCommand) => {
    assertEvaluationIdentity(command);
    return db.transaction(async (transaction) => {
      const executor = transaction as unknown as Database;
      await setDatabaseSecurityContext(executor, command);
      const repository = createCurriculumRuntimeRepository(executor, idFactory);
      return evaluateAndPersistCurriculumModule(command, repository, {
        findEvaluationAttempt: (input) =>
          readEvaluationAttempt(executor, input),
      });
    });
  };
}

async function readEvaluationAttempt(
  db: Database,
  command: EvaluateCurriculumModuleCommand,
): Promise<CurriculumEvaluationAttempt | null> {
  // The owned parent row serializes evaluation with answer writes and submission.
  const [attempt] = await db
    .select()
    .from(schema.attempts)
    .where(
      and(
        eq(schema.attempts.id, command.attemptId),
        eq(schema.attempts.participantId, command.participantId),
      ),
    )
    .for("update");
  if (
    !attempt ||
    attempt.version !== command.attemptVersion ||
    !submittedStatuses.includes(attempt.status) ||
    !attempt.submittedAt
  )
    return null;
  const [activity] = await db
    .select()
    .from(schema.learningActivities)
    .where(
      and(
        eq(schema.learningActivities.id, attempt.activityId),
        eq(schema.learningActivities.scopeId, command.scopeId),
        eq(schema.learningActivities.moduleId, command.moduleId),
      ),
    );
  if (!activity || activity.status !== "PUBLISHED") return null;
  try {
    await setCurriculumAttemptContext(db, {
      ...command,
      activityId: activity.id,
    });
    const [binding] = await db
      .select()
      .from(schema.curriculumAttemptForms)
      .where(
        and(
          eq(schema.curriculumAttemptForms.attemptId, attempt.id),
          eq(
            schema.curriculumAttemptForms.participantId,
            command.participantId,
          ),
          eq(schema.curriculumAttemptForms.scopeId, command.scopeId),
          eq(schema.curriculumAttemptForms.moduleId, command.moduleId),
        ),
      );
    // Unbound legacy attempts never acquire a current-draft evaluation fallback.
    if (!binding) return null;
    await db.execute(sql`select pg_advisory_xact_lock_shared(
      hashtextextended(${`curriculum-form:${binding.formVersionId}`}, 0))`);
    const [form] = await db
      .select()
      .from(schema.curriculumFormVersions)
      .where(eq(schema.curriculumFormVersions.id, binding.formVersionId));
    if (
      !form ||
      form.status !== "PUBLICADO" ||
      form.version !== command.formVersion
    )
      return null;
    const [blueprint] = await db
      .select()
      .from(schema.curriculumBlueprintVersions)
      .where(
        eq(schema.curriculumBlueprintVersions.id, form.blueprintVersionId),
      );
    if (
      !blueprint ||
      !(await lockEvaluationAuthority(db, command, activity.id))
    )
      return null;
    await assertStoredCurriculumPublicationProvenance(db, {
      form,
      blueprint,
      expectedScopeId: command.scopeId,
      now: new Date(),
    });
    const formItems = await db
      .select()
      .from(schema.curriculumFormItems)
      .where(eq(schema.curriculumFormItems.formVersionId, form.id))
      .orderBy(schema.curriculumFormItems.ordinal);
    if (!formItems.length || formItems.length > 100) return null;
    const items = await db
      .select()
      .from(schema.curriculumAttemptItems)
      .where(eq(schema.curriculumAttemptItems.attemptId, attempt.id))
      .orderBy(schema.curriculumAttemptItems.ordinal);
    const contentVersions = await db
      .select()
      .from(schema.contentVersions)
      .where(
        inArray(
          schema.contentVersions.id,
          formItems.map((item) => item.contentVersionId),
        ),
      )
      .orderBy(schema.contentVersions.id)
      .for("share");
    const answers = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.attemptId, attempt.id))
      .orderBy(schema.answers.itemId);
    return mapCapturedCurriculumEvaluation(
      {
        attempt,
        activity,
        binding,
        form,
        blueprint,
        formItems,
        items,
        contentVersions,
        answers,
        now: new Date(),
      },
      command,
    );
  } finally {
    // Native key-reader identity cannot escape into ordinary runtime projections.
    await setDatabaseSecurityContext(db, command);
  }
}

async function lockEvaluationAuthority(
  db: Database,
  command: EvaluateCurriculumModuleCommand,
  activityId: string,
): Promise<boolean> {
  const rows = await db.execute(sql`
    select true as authorized from activity_assignments assignment
    join learning_activities activity on activity.id = assignment.activity_id
    join learning_assignments learning on learning.id = assignment.learning_assignment_id
      and learning.participant_id = assignment.participant_id
      and learning.scope_id = activity.scope_id and learning.module_id = activity.module_id
    where activity.id = ${activityId} and activity.scope_id = ${command.scopeId}
      and activity.module_id = ${command.moduleId} and activity.status = 'PUBLISHED'
      and assignment.participant_id = ${command.participantId}
      and assignment.status in ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO',
        'CONCLUIDO', 'CONCLUIDO_COM_RETENCAO_PENDENTE')
      and learning.status in ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO',
        'CONCLUIDO', 'CONCLUIDO_COM_RETENCAO_PENDENTE')
    FOR SHARE OF assignment, activity, learning
  `);
  return Array.isArray(rows) && rows.length === 1;
}
