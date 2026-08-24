import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  createLearningAssignment,
  transitionLearningAssignment,
} from "@cvg/domain";
import type {
  AdaptiveCurriculumAssignmentPort,
  MaterializeCurriculumAssignmentsInput,
  MaterializedCurriculumAssignments,
} from "@cvg/application";

import {
  activityAssignments,
  contentVersions,
  diagnosticResults,
  learningActivities,
  learningActivityItems,
  learningAssignments,
} from "./schema.js";
import type * as schema from "./schema.js";
import {
  learningAssignmentRowToState,
  learningAssignmentStateToRow,
  type LearningAssignmentRowShape,
} from "./learning-state-repository.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

export class AdaptiveAssignmentPersistenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AdaptiveAssignmentPersistenceError";
  }
}

export class AdaptiveAssignmentNotFoundError extends AdaptiveAssignmentPersistenceError {
  public constructor() {
    super("diagnostic result was not found in the requested scope");
    this.name = "AdaptiveAssignmentNotFoundError";
  }
}

export class AdaptiveAssignmentConflictError extends AdaptiveAssignmentPersistenceError {
  public constructor() {
    super("assignment changed while being attributed");
    this.name = "AdaptiveAssignmentConflictError";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new AdaptiveAssignmentPersistenceError(`${field} is required`);
  }
}

function assertModuleId(value: string): void {
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new AdaptiveAssignmentPersistenceError("moduleId is invalid");
  }
}

function normalizeModuleIds(moduleIds: readonly string[]): readonly string[] {
  const normalized = [...new Set(moduleIds.map((moduleId) => moduleId.trim()))];
  if (normalized.length === 0) {
    throw new AdaptiveAssignmentPersistenceError(
      "at least one module is required",
    );
  }
  normalized.forEach(assertModuleId);
  return Object.freeze(normalized);
}

function assignedState(
  input: Readonly<{
    readonly assignmentId: string;
    readonly participantId: string;
    readonly moduleId: string;
    readonly availableAt: string;
  }>,
): ReturnType<typeof transitionLearningAssignment> {
  return transitionLearningAssignment(createLearningAssignment(input), {
    type: "ATRIBUIR",
  });
}

function toRow(
  row: typeof learningAssignments.$inferSelect,
): LearningAssignmentRowShape {
  return {
    id: row.id,
    participantId: row.participantId,
    scopeId: row.scopeId,
    moduleId: row.moduleId,
    availableAt: row.availableAt,
    status: row.status,
    version: row.version,
    blockReason: row.blockReason,
    pausedFrom: row.pausedFrom,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertMaterializationContext(
  input: MaterializeCurriculumAssignmentsInput,
): void {
  assertNonEmpty(input.diagnosticResultId, "diagnosticResultId");
  assertNonEmpty(input.scopeId, "scopeId");
}

async function findAssignmentRows(
  executor: DatabaseExecutor | DatabaseTransaction,
  participantId: string,
  scopeId: string,
  moduleIds: readonly string[],
): Promise<readonly (typeof learningAssignments.$inferSelect)[]> {
  return executor
    .select()
    .from(learningAssignments)
    .where(
      and(
        eq(learningAssignments.participantId, participantId),
        eq(learningAssignments.scopeId, scopeId),
        inArray(learningAssignments.moduleId, moduleIds),
      ),
    )
    .orderBy(asc(learningAssignments.moduleId));
}

async function promoteUnassigned(
  executor: DatabaseExecutor | DatabaseTransaction,
  row: typeof learningAssignments.$inferSelect,
  sourceDiagnosticResultId: string,
): Promise<void> {
  if (row.status !== "NAO_ATRIBUIDO") return;
  const state = learningAssignmentRowToState(toRow(row)).state;
  const assigned = transitionLearningAssignment(state, { type: "ATRIBUIR" });
  const mapped = learningAssignmentStateToRow({
    scopeId: row.scopeId,
    state: assigned,
  });
  const updated = await executor
    .update(learningAssignments)
    .set({
      status: mapped.status,
      version: mapped.version,
      blockReason: mapped.blockReason,
      pausedFrom: mapped.pausedFrom,
      sourceDiagnosticResultId:
        row.sourceDiagnosticResultId ?? sourceDiagnosticResultId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(learningAssignments.id, row.id),
        eq(learningAssignments.participantId, row.participantId),
        eq(learningAssignments.scopeId, row.scopeId),
        eq(learningAssignments.version, row.version),
        eq(learningAssignments.status, "NAO_ATRIBUIDO"),
      ),
    )
    .returning({ id: learningAssignments.id });
  if (updated.length === 0) {
    throw new AdaptiveAssignmentConflictError();
  }
}

async function findMappedActivities(
  executor: DatabaseExecutor | DatabaseTransaction,
  scopeId: string,
  moduleIds: readonly string[],
): Promise<
  readonly Pick<typeof learningActivities.$inferSelect, "id" | "moduleId">[]
> {
  return executor
    .selectDistinct({
      id: learningActivities.id,
      moduleId: learningActivities.moduleId,
    })
    .from(learningActivities)
    .innerJoin(
      learningActivityItems,
      eq(learningActivityItems.activityId, learningActivities.id),
    )
    .innerJoin(
      contentVersions,
      and(
        eq(contentVersions.id, learningActivityItems.contentVersionId),
        eq(contentVersions.scopeId, scopeId),
        eq(contentVersions.status, "PUBLICADO"),
      ),
    )
    .where(
      and(
        eq(learningActivities.scopeId, scopeId),
        eq(learningActivities.status, "PUBLISHED"),
        inArray(learningActivities.moduleId, moduleIds),
      ),
    )
    .orderBy(asc(learningActivities.moduleId), asc(learningActivities.id));
}

async function materializeMappedActivities(
  executor: DatabaseExecutor | DatabaseTransaction,
  participantId: string,
  activityRows: readonly Pick<
    typeof learningActivities.$inferSelect,
    "id" | "moduleId"
  >[],
  assignmentRows: readonly (typeof learningAssignments.$inferSelect)[],
  now: Date,
): Promise<void> {
  const assignmentsByModule = new Map(
    assignmentRows.map((row) => [row.moduleId, row]),
  );
  for (const activity of activityRows) {
    if (activity.moduleId === null) continue;
    const assignment = assignmentsByModule.get(activity.moduleId);
    if (assignment === undefined) {
      throw new AdaptiveAssignmentPersistenceError(
        "mapped activity has no persisted curriculum assignment",
      );
    }
    await executor
      .insert(activityAssignments)
      .values({
        participantId,
        activityId: activity.id,
        learningAssignmentId: assignment.id,
        status: assignment.status,
        assignedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          activityAssignments.participantId,
          activityAssignments.activityId,
        ],
        set: { learningAssignmentId: assignment.id },
        where: isNull(activityAssignments.learningAssignmentId),
      });
  }
}

export function createAdaptiveAssignmentRepository(
  db: DatabaseExecutor,
  idFactory: () => string = randomUUID,
): AdaptiveCurriculumAssignmentPort {
  const repository: AdaptiveCurriculumAssignmentPort = {
    materializeCurriculumAssignments: async (
      input,
    ): Promise<MaterializedCurriculumAssignments> => {
      assertMaterializationContext(input);
      const moduleIds = normalizeModuleIds(input.moduleIds);

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: input.scopeId });
        const diagnosticRows = await executor
          .select()
          .from(diagnosticResults)
          .where(
            and(
              eq(diagnosticResults.id, input.diagnosticResultId),
              eq(diagnosticResults.scopeId, input.scopeId),
            ),
          )
          .limit(1);
        const diagnostic = diagnosticRows[0];
        if (diagnostic === undefined)
          throw new AdaptiveAssignmentNotFoundError();

        const participantId = diagnostic.participantId;
        const availableAt = diagnostic.completedAt;
        await setDatabaseSecurityContext(executor, {
          participantId,
          scopeId: input.scopeId,
        });

        const existingRows = await findAssignmentRows(
          executor,
          participantId,
          input.scopeId,
          moduleIds,
        );
        const existingByModule = new Map(
          existingRows.map((row) => [row.moduleId, row]),
        );
        const now = new Date();

        for (const moduleId of moduleIds) {
          const existing = existingByModule.get(moduleId);
          if (existing !== undefined) {
            await promoteUnassigned(
              executor,
              existing,
              input.diagnosticResultId,
            );
            continue;
          }
          const state = assignedState({
            assignmentId: idFactory(),
            participantId,
            moduleId,
            availableAt: availableAt.toISOString(),
          });
          const row = learningAssignmentStateToRow({
            scopeId: input.scopeId,
            state,
          });
          await executor
            .insert(learningAssignments)
            .values({
              ...row,
              sourceDiagnosticResultId: input.diagnosticResultId,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoNothing();
        }

        const rows = await findAssignmentRows(
          executor,
          participantId,
          input.scopeId,
          moduleIds,
        );
        if (rows.length !== moduleIds.length) {
          throw new AdaptiveAssignmentPersistenceError(
            "not all curriculum assignments were persisted",
          );
        }
        const activityRows = await findMappedActivities(
          executor,
          input.scopeId,
          moduleIds,
        );
        await materializeMappedActivities(
          executor,
          participantId,
          activityRows,
          rows,
          now,
        );
        return Object.freeze({
          diagnosticResultId: input.diagnosticResultId,
          participantId,
          scopeId: input.scopeId,
          assignments: Object.freeze(
            rows.map((row) => learningAssignmentRowToState(toRow(row))),
          ),
        });
      });
    },
  };
  return Object.freeze(repository);
}
