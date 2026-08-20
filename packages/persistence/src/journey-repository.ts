import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  deriveProgressNextAction,
  type ParticipantJourneyActivity,
  type ParticipantJourneyReadPort,
  type ParticipantLearningJourneyState,
} from "@cvg/application";
import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";

import {
  assessmentWorkflowRowToState,
  learningAssignmentRowToState,
} from "./learning-state-repository.js";
import {
  curriculumRuntimeRowToState,
  type CurriculumRuntimeRowShape,
} from "./curriculum-runtime-repository.js";
import { PersistenceMappingError } from "./attempt-repository.js";
import {
  activityAssignments,
  attempts,
  assessmentWorkflows,
  curriculumRuntimeStates,
  learningActivities,
  learningAssignments,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

type JourneyActivityRow = Readonly<{
  readonly activityId: string;
  readonly scopeId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly attemptId: string | null;
  readonly attemptStatus: string | null;
  readonly attemptVersion: number | null;
  readonly attemptUpdatedAt: Date | null;
}>;

const assignmentStatuses: readonly Exclude<
  LearningAssignmentStatus,
  "NAO_ATRIBUIDO"
>[] = [
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "PAUSADO",
  "BLOQUEADO",
];

const attemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function parseAssignmentStatus(
  value: string,
): Exclude<LearningAssignmentStatus, "NAO_ATRIBUIDO"> {
  if (
    !assignmentStatuses.includes(value as (typeof assignmentStatuses)[number])
  ) {
    throw new PersistenceMappingError("journey assignment status is invalid");
  }
  return value as Exclude<LearningAssignmentStatus, "NAO_ATRIBUIDO">;
}

function parseAttemptStatus(value: string | null): AttemptStatus | undefined {
  if (value === null) return undefined;
  if (!attemptStatuses.includes(value as AttemptStatus)) {
    throw new PersistenceMappingError("journey attempt status is invalid");
  }
  return value as AttemptStatus;
}

function isLaterAttempt(
  candidate: JourneyActivityRow,
  current: JourneyActivityRow,
): boolean {
  if (candidate.attemptId === null) return false;
  if (current.attemptId === null) return true;
  const candidateTime = candidate.attemptUpdatedAt?.getTime() ?? -Infinity;
  const currentTime = current.attemptUpdatedAt?.getTime() ?? -Infinity;
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return (candidate.attemptVersion ?? -1) > (current.attemptVersion ?? -1);
}

function activityRowsToJourney(
  rows: readonly JourneyActivityRow[],
): readonly ParticipantJourneyActivity[] {
  const latestByActivity = new Map<string, JourneyActivityRow>();
  for (const row of rows) {
    const current = latestByActivity.get(row.activityId);
    if (current === undefined || isLaterAttempt(row, current)) {
      latestByActivity.set(row.activityId, row);
    }
  }

  const activities = [...latestByActivity.values()].map((row) => {
    assertNonEmpty(row.activityId, "activityId");
    assertNonEmpty(row.scopeId, "scopeId");
    assertNonEmpty(row.slug, "slug");
    assertNonEmpty(row.title, "title");
    const status = parseAssignmentStatus(row.status);
    const attemptStatus = parseAttemptStatus(row.attemptStatus);
    if (row.attemptId === null && attemptStatus !== undefined) {
      throw new PersistenceMappingError(
        "journey attempt status cannot exist without an attempt",
      );
    }
    if (
      row.attemptVersion !== null &&
      (!Number.isInteger(row.attemptVersion) || row.attemptVersion < 0)
    ) {
      throw new PersistenceMappingError("journey attempt version is invalid");
    }
    return Object.freeze({
      scopeId: row.scopeId,
      activityId: row.activityId,
      slug: row.slug,
      title: row.title,
      status,
      ...(row.attemptId === null ? {} : { attemptId: row.attemptId }),
      ...(attemptStatus === undefined ? {} : { attemptStatus }),
      ...(row.attemptVersion === null
        ? {}
        : { attemptVersion: row.attemptVersion }),
      nextAction: deriveProgressNextAction(status, attemptStatus),
    });
  });

  return Object.freeze(
    activities.sort((left, right) => left.slug.localeCompare(right.slug)),
  );
}

function runtimeRowToState(
  row: typeof curriculumRuntimeStates.$inferSelect,
): ReturnType<typeof curriculumRuntimeRowToState> {
  return curriculumRuntimeRowToState(row as CurriculumRuntimeRowShape);
}

type JourneyTransactionExecutor = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];
type JourneyAssignment = ParticipantLearningJourneyState["assignments"][number];
type JourneyResult = ParticipantLearningJourneyState["results"][number];

function normalizeScopeIds(scopeIds: readonly string[]): readonly string[] {
  return Object.freeze([
    ...new Set(
      scopeIds
        .map((scopeId) => scopeId.trim())
        .filter((scopeId) => scopeId.length > 0),
    ),
  ]);
}

function emptyJourney(participantId: string): ParticipantLearningJourneyState {
  return Object.freeze({
    participantId,
    assignments: Object.freeze([]),
    activities: Object.freeze([]),
    results: Object.freeze([]),
    runtimes: Object.freeze([]),
  });
}

async function readJourneyActivityRows(
  executor: JourneyTransactionExecutor,
  participantId: string,
  scopeIds: readonly string[],
): Promise<readonly JourneyActivityRow[]> {
  return executor
    .select({
      activityId: activityAssignments.activityId,
      scopeId: learningActivities.scopeId,
      slug: learningActivities.slug,
      title: learningActivities.title,
      status: activityAssignments.status,
      attemptId: attempts.id,
      attemptStatus: attempts.status,
      attemptVersion: attempts.version,
      attemptUpdatedAt: attempts.updatedAt,
    })
    .from(activityAssignments)
    .innerJoin(
      learningActivities,
      eq(activityAssignments.activityId, learningActivities.id),
    )
    .leftJoin(
      attempts,
      and(
        eq(attempts.participantId, participantId),
        eq(attempts.activityId, activityAssignments.activityId),
      ),
    )
    .where(
      and(
        eq(activityAssignments.participantId, participantId),
        eq(learningActivities.status, "PUBLISHED"),
        inArray(learningActivities.scopeId, scopeIds),
        inArray(activityAssignments.status, assignmentStatuses),
      ),
    )
    .orderBy(asc(learningActivities.slug), desc(attempts.updatedAt));
}

async function readJourneyRuntimeStates(
  executor: JourneyTransactionExecutor,
  participantId: string,
  scopeIds: readonly string[],
): Promise<readonly ReturnType<typeof curriculumRuntimeRowToState>[]> {
  const rows = await executor
    .select()
    .from(curriculumRuntimeStates)
    .where(
      and(
        eq(curriculumRuntimeStates.participantId, participantId),
        inArray(curriculumRuntimeStates.scopeId, scopeIds),
      ),
    );
  return Object.freeze(rows.map(runtimeRowToState));
}

async function readScopedJourneyState(
  executor: JourneyTransactionExecutor,
  participantId: string,
  scopeIds: readonly string[],
): Promise<
  Readonly<{
    readonly assignments: readonly JourneyAssignment[];
    readonly results: readonly JourneyResult[];
  }>
> {
  const assignments: JourneyAssignment[] = [];
  const results: JourneyResult[] = [];

  for (const scopeId of scopeIds) {
    await setDatabaseSecurityContext(executor, {
      participantId,
      scopeId,
    });
    const assignmentRows = await executor
      .select()
      .from(learningAssignments)
      .where(
        and(
          eq(learningAssignments.participantId, participantId),
          eq(learningAssignments.scopeId, scopeId),
        ),
      )
      .orderBy(asc(learningAssignments.moduleId));
    assignments.push(...assignmentRows.map(learningAssignmentRowToState));

    const workflowRows = await executor
      .select()
      .from(assessmentWorkflows)
      .where(
        and(
          eq(assessmentWorkflows.participantId, participantId),
          eq(assessmentWorkflows.scopeId, scopeId),
        ),
      )
      .orderBy(asc(assessmentWorkflows.resultId));
    results.push(...workflowRows.map(assessmentWorkflowRowToState));
  }

  return Object.freeze({
    assignments: Object.freeze([...assignments]),
    results: Object.freeze([...results]),
  });
}

export function createParticipantJourneyRepository(
  db: DatabaseExecutor,
): ParticipantJourneyReadPort {
  const repository: ParticipantJourneyReadPort = {
    findParticipantLearningJourney: async (
      participantId: string,
      scopeIds: readonly string[],
    ): Promise<ParticipantLearningJourneyState> => {
      assertNonEmpty(participantId, "participantId");
      const normalizedScopeIds = normalizeScopeIds(scopeIds);

      return db.transaction(async (transaction) => {
        if (normalizedScopeIds.length === 0) {
          return emptyJourney(participantId);
        }

        await setDatabaseSecurityContext(transaction, { participantId });
        const activityRows = await readJourneyActivityRows(
          transaction,
          participantId,
          normalizedScopeIds,
        );
        const activities = activityRowsToJourney(activityRows);
        const runtimes = await readJourneyRuntimeStates(
          transaction,
          participantId,
          normalizedScopeIds,
        );
        const scopedState = await readScopedJourneyState(
          transaction,
          participantId,
          normalizedScopeIds,
        );

        await setDatabaseSecurityContext(transaction, { participantId });
        return Object.freeze({
          participantId,
          assignments: scopedState.assignments,
          activities,
          results: scopedState.results,
          runtimes,
        });
      });
    },
  };
  return Object.freeze(repository);
}
