import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CurriculumRuntimeReadPort,
  CurriculumRuntimeState,
  CurriculumRuntimeWriteInput,
  CurriculumRuntimeWritePort,
} from "@cvg/application";
import type { ModuleEvaluationResult } from "@cvg/curriculum";

import { curriculumRuntimeStates } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export class CurriculumRuntimeMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CurriculumRuntimeMappingError";
  }
}

export type CurriculumRuntimeRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly version: number;
  readonly state: ModuleEvaluationResult;
  readonly updatedAt: Date;
}>;

export type CurriculumRuntimeInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly version: number;
  readonly state: ModuleEvaluationResult;
  readonly updatedAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new CurriculumRuntimeMappingError(`${field} must not be empty`);
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new CurriculumRuntimeMappingError(
      "version must be a positive integer",
    );
  }
}

function assertModuleId(value: string): void {
  assertNonEmpty(value, "moduleId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new CurriculumRuntimeMappingError("moduleId is invalid");
  }
}

function freezeEvaluation(
  evaluation: ModuleEvaluationResult,
): ModuleEvaluationResult {
  return Object.freeze({
    ...evaluation,
    objectiveResults: Object.freeze(
      evaluation.objectiveResults.map((item) => Object.freeze({ ...item })),
    ),
    remediationObjectiveIds: Object.freeze([
      ...evaluation.remediationObjectiveIds,
    ]),
    criticalErrorItemIds: Object.freeze([...evaluation.criticalErrorItemIds]),
    invalidAnswerItemIds: Object.freeze([...evaluation.invalidAnswerItemIds]),
    unansweredChoiceItemIds: Object.freeze([
      ...evaluation.unansweredChoiceItemIds,
    ]),
    openResponseItemIds: Object.freeze([...evaluation.openResponseItemIds]),
    retentionReviews: Object.freeze(
      evaluation.retentionReviews.map((item) => Object.freeze({ ...item })),
    ),
  });
}

export function curriculumRuntimeStateToRow(
  state: CurriculumRuntimeState,
  id: string,
): CurriculumRuntimeInsertRow {
  assertNonEmpty(id, "id");
  assertNonEmpty(state.participantId, "participantId");
  assertNonEmpty(state.scopeId, "scopeId");
  assertModuleId(state.evaluation.moduleId);
  assertVersion(state.version);
  const updatedAt = new Date(state.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new CurriculumRuntimeMappingError(
      "updatedAt must be a valid timestamp",
    );
  }
  return Object.freeze({
    id,
    participantId: state.participantId,
    scopeId: state.scopeId,
    moduleId: state.evaluation.moduleId,
    version: state.version,
    state: freezeEvaluation(state.evaluation),
    updatedAt,
  });
}

export function curriculumRuntimeRowToState(
  row: CurriculumRuntimeRowShape,
): CurriculumRuntimeState {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertModuleId(row.moduleId);
  assertVersion(row.version);
  if (row.state.moduleId !== row.moduleId) {
    throw new CurriculumRuntimeMappingError(
      "runtime state module does not match its row",
    );
  }
  if (Number.isNaN(row.updatedAt.getTime())) {
    throw new CurriculumRuntimeMappingError(
      "updatedAt must be a valid timestamp",
    );
  }
  return Object.freeze({
    participantId: row.participantId,
    scopeId: row.scopeId,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    evaluation: freezeEvaluation(row.state),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function selectRuntimeRow(
  db: DatabaseExecutor,
  participantId: string,
  scopeId: string | undefined,
  moduleId: string,
) {
  return db
    .select({
      id: curriculumRuntimeStates.id,
      participantId: curriculumRuntimeStates.participantId,
      scopeId: curriculumRuntimeStates.scopeId,
      moduleId: curriculumRuntimeStates.moduleId,
      version: curriculumRuntimeStates.version,
      state: curriculumRuntimeStates.state,
      updatedAt: curriculumRuntimeStates.updatedAt,
    })
    .from(curriculumRuntimeStates)
    .where(
      scopeId === undefined
        ? and(
            eq(curriculumRuntimeStates.participantId, participantId),
            eq(curriculumRuntimeStates.moduleId, moduleId),
          )
        : and(
            eq(curriculumRuntimeStates.participantId, participantId),
            eq(curriculumRuntimeStates.scopeId, scopeId),
            eq(curriculumRuntimeStates.moduleId, moduleId),
          ),
    )
    .limit(1);
}

export function createCurriculumRuntimeRepository(
  db: DatabaseExecutor,
  idFactory: () => string = randomUUID,
): CurriculumRuntimeReadPort & CurriculumRuntimeWritePort {
  const repository = {
    findCurriculumRuntime: async (
      participantId: string,
      moduleId: string,
    ): Promise<CurriculumRuntimeState | null> => {
      return db.transaction(async (transaction) => {
        const executor = transaction;
        await setDatabaseSecurityContext(executor, { participantId });
        const rows = await selectRuntimeRow(
          executor,
          participantId,
          undefined,
          moduleId,
        );
        const row = rows[0];
        return row === undefined ? null : curriculumRuntimeRowToState(row);
      });
    },
    saveCurriculumRuntime: async (
      input: CurriculumRuntimeWriteInput,
    ): Promise<CurriculumRuntimeState> => {
      return db.transaction(async (transaction) => {
        const executor = transaction;
        await setDatabaseSecurityContext(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
        });
        const now = new Date();
        const id = idFactory();
        await executor
          .insert(curriculumRuntimeStates)
          .values({
            id,
            participantId: input.participantId,
            scopeId: input.scopeId,
            moduleId: input.evaluation.moduleId,
            version: 1,
            state: input.evaluation,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              curriculumRuntimeStates.participantId,
              curriculumRuntimeStates.scopeId,
              curriculumRuntimeStates.moduleId,
            ],
            set: {
              state: input.evaluation,
              updatedAt: now,
              version: sql`${curriculumRuntimeStates.version} + 1`,
            },
          });
        const rows = await selectRuntimeRow(
          executor,
          input.participantId,
          input.scopeId,
          input.evaluation.moduleId,
        );
        const row = rows[0];
        if (row === undefined) {
          throw new CurriculumRuntimeMappingError(
            "saved curriculum runtime state was not found",
          );
        }
        return curriculumRuntimeRowToState(row);
      });
    },
  } satisfies CurriculumRuntimeReadPort & CurriculumRuntimeWritePort;
  return Object.freeze(repository);
}
