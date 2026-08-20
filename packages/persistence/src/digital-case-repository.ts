import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  DigitalCaseRuntimeRecord,
  DigitalCaseRuntimeRepositoryPort,
  DigitalCaseRuntimeWriteInput,
} from "@cvg/application";
import type { DigitalCaseRuntimeState } from "@cvg/curriculum";

import { digitalCaseRuntimeStates } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export class DigitalCaseRuntimeMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DigitalCaseRuntimeMappingError";
  }
}

export class DigitalCaseRuntimePersistenceConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DigitalCaseRuntimePersistenceConflictError";
  }
}

export type DigitalCaseRuntimeRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly caseId: string;
  readonly version: number;
  readonly state: DigitalCaseRuntimeState;
  readonly updatedAt: Date;
}>;

export type DigitalCaseRuntimeInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly caseId: string;
  readonly version: number;
  readonly state: DigitalCaseRuntimeState;
  readonly updatedAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DigitalCaseRuntimeMappingError(`${field} must not be empty`);
  }
}

function assertModuleId(value: string): void {
  assertNonEmpty(value, "moduleId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new DigitalCaseRuntimeMappingError("moduleId is invalid");
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new DigitalCaseRuntimeMappingError(
      "version must be a non-negative integer",
    );
  }
}

function assertTimestamp(value: Date): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DigitalCaseRuntimeMappingError(
      "updatedAt must be a valid timestamp",
    );
  }
}

function assertRuntimeState(state: DigitalCaseRuntimeState): void {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    throw new DigitalCaseRuntimeMappingError("case state must be an object");
  }
  assertNonEmpty(state.caseId, "caseId");
  assertVersion(state.version);
  if (
    state.currentStage !== "CONCLUIDO" &&
    state.currentStage !== 1 &&
    state.currentStage !== 2 &&
    state.currentStage !== 3
  ) {
    throw new DigitalCaseRuntimeMappingError("currentStage is invalid");
  }
  if (
    typeof state.state !== "object" ||
    state.state === null ||
    Array.isArray(state.state)
  ) {
    throw new DigitalCaseRuntimeMappingError("case state values are invalid");
  }
  for (const [key, value] of Object.entries(state.state)) {
    assertNonEmpty(key, "case state key");
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new DigitalCaseRuntimeMappingError("case state value is invalid");
    }
  }
  if (!Array.isArray(state.revealedExamSeriesIds)) {
    throw new DigitalCaseRuntimeMappingError(
      "revealed exam series are invalid",
    );
  }
  if (
    state.revealedExamSeriesIds.some(
      (examId) => typeof examId !== "string" || examId.trim().length === 0,
    )
  ) {
    throw new DigitalCaseRuntimeMappingError(
      "revealed exam series are invalid",
    );
  }
  if (!Array.isArray(state.consequences)) {
    throw new DigitalCaseRuntimeMappingError("case consequences are invalid");
  }
  for (const consequence of state.consequences) {
    if (
      consequence === null ||
      typeof consequence !== "object" ||
      Array.isArray(consequence)
    ) {
      throw new DigitalCaseRuntimeMappingError(
        "case consequence must be an object",
      );
    }
    assertNonEmpty(consequence.branchId, "consequence branchId");
    assertNonEmpty(consequence.consequence, "consequence");
    if (Number.isNaN(new Date(consequence.recordedAt).getTime())) {
      throw new DigitalCaseRuntimeMappingError(
        "consequence recordedAt must be valid",
      );
    }
  }
  if (Number.isNaN(new Date(state.updatedAt).getTime())) {
    throw new DigitalCaseRuntimeMappingError("case updatedAt must be valid");
  }
}

function freezeRuntimeState(
  state: DigitalCaseRuntimeState,
): DigitalCaseRuntimeState {
  assertRuntimeState(state);
  return Object.freeze({
    ...state,
    state: Object.freeze({ ...state.state }),
    revealedExamSeriesIds: Object.freeze([...state.revealedExamSeriesIds]),
    consequences: Object.freeze(
      state.consequences.map((consequence) =>
        Object.freeze({ ...consequence }),
      ),
    ),
  });
}

export function digitalCaseRuntimeStateToRow(
  record: DigitalCaseRuntimeRecord,
  id: string,
): DigitalCaseRuntimeInsertRow {
  assertNonEmpty(id, "id");
  assertNonEmpty(record.participantId, "participantId");
  assertNonEmpty(record.scopeId, "scopeId");
  assertModuleId(record.moduleId);
  assertRuntimeState(record.state);
  if (record.state.caseId !== `${record.moduleId}-DIGITAL-CASE-V1`) {
    throw new DigitalCaseRuntimeMappingError("case does not match module");
  }
  const updatedAt = new Date(record.state.updatedAt);
  assertTimestamp(updatedAt);
  return Object.freeze({
    id,
    participantId: record.participantId,
    scopeId: record.scopeId,
    moduleId: record.moduleId,
    caseId: record.state.caseId,
    version: record.state.version,
    state: freezeRuntimeState(record.state),
    updatedAt,
  });
}

export function digitalCaseRuntimeRowToState(
  row: DigitalCaseRuntimeRowShape,
): DigitalCaseRuntimeRecord {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertModuleId(row.moduleId);
  assertNonEmpty(row.caseId, "caseId");
  assertVersion(row.version);
  assertRuntimeState(row.state);
  if (row.caseId !== row.state.caseId) {
    throw new DigitalCaseRuntimeMappingError(
      "case identity does not match state",
    );
  }
  if (row.version !== row.state.version) {
    throw new DigitalCaseRuntimeMappingError("version does not match state");
  }
  assertTimestamp(row.updatedAt);
  return Object.freeze({
    participantId: row.participantId,
    scopeId: row.scopeId,
    moduleId: row.moduleId,
    state: freezeRuntimeState(row.state),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const DIGITAL_CASE_RUNTIME_RETURNING = {
  id: digitalCaseRuntimeStates.id,
  participantId: digitalCaseRuntimeStates.participantId,
  scopeId: digitalCaseRuntimeStates.scopeId,
  moduleId: digitalCaseRuntimeStates.moduleId,
  caseId: digitalCaseRuntimeStates.caseId,
  version: digitalCaseRuntimeStates.version,
  state: digitalCaseRuntimeStates.state,
  updatedAt: digitalCaseRuntimeStates.updatedAt,
};

function selectRow(
  db: DatabaseExecutor,
  participantId: string,
  scopeId: string,
  moduleId: string,
) {
  return db
    .select({
      id: digitalCaseRuntimeStates.id,
      participantId: digitalCaseRuntimeStates.participantId,
      scopeId: digitalCaseRuntimeStates.scopeId,
      moduleId: digitalCaseRuntimeStates.moduleId,
      caseId: digitalCaseRuntimeStates.caseId,
      version: digitalCaseRuntimeStates.version,
      state: digitalCaseRuntimeStates.state,
      updatedAt: digitalCaseRuntimeStates.updatedAt,
    })
    .from(digitalCaseRuntimeStates)
    .where(
      and(
        eq(digitalCaseRuntimeStates.participantId, participantId),
        eq(digitalCaseRuntimeStates.scopeId, scopeId),
        eq(digitalCaseRuntimeStates.moduleId, moduleId),
      ),
    )
    .limit(1);
}

async function findDigitalCaseRuntimeInTransaction(
  executor: DatabaseExecutor,
  participantId: string,
  scopeId: string,
  moduleId: string,
): Promise<DigitalCaseRuntimeRecord | null> {
  await setDatabaseSecurityContext(executor, { participantId, scopeId });
  const rows = await selectRow(executor, participantId, scopeId, moduleId);
  const row = rows[0];
  return row === undefined ? null : digitalCaseRuntimeRowToState(row);
}

async function updateDigitalCaseRuntime(
  executor: DatabaseExecutor,
  row: DigitalCaseRuntimeInsertRow,
  expectedVersion: number,
): Promise<DigitalCaseRuntimeRecord | null> {
  const updated = await executor
    .update(digitalCaseRuntimeStates)
    .set({
      caseId: row.caseId,
      version: row.version,
      state: row.state,
      updatedAt: row.updatedAt,
    })
    .where(
      and(
        eq(digitalCaseRuntimeStates.participantId, row.participantId),
        eq(digitalCaseRuntimeStates.scopeId, row.scopeId),
        eq(digitalCaseRuntimeStates.moduleId, row.moduleId),
        eq(digitalCaseRuntimeStates.version, expectedVersion),
      ),
    )
    .returning(DIGITAL_CASE_RUNTIME_RETURNING);
  const updatedRow = updated[0];
  return updatedRow === undefined
    ? null
    : digitalCaseRuntimeRowToState(updatedRow);
}

async function insertDigitalCaseRuntime(
  executor: DatabaseExecutor,
  row: DigitalCaseRuntimeInsertRow,
): Promise<DigitalCaseRuntimeRecord> {
  const inserted = await executor
    .insert(digitalCaseRuntimeStates)
    .values(row)
    .onConflictDoNothing({
      target: [
        digitalCaseRuntimeStates.participantId,
        digitalCaseRuntimeStates.scopeId,
        digitalCaseRuntimeStates.moduleId,
      ],
    })
    .returning(DIGITAL_CASE_RUNTIME_RETURNING);
  const insertedRow = inserted[0];
  if (insertedRow === undefined) {
    throw new DigitalCaseRuntimePersistenceConflictError(
      "digital case was created concurrently",
    );
  }
  return digitalCaseRuntimeRowToState(insertedRow);
}

async function saveDigitalCaseRuntimeInTransaction(
  executor: DatabaseExecutor,
  input: DigitalCaseRuntimeWriteInput,
  idFactory: () => string,
): Promise<DigitalCaseRuntimeRecord> {
  await setDatabaseSecurityContext(executor, {
    participantId: input.participantId,
    scopeId: input.scopeId,
  });
  const row = digitalCaseRuntimeStateToRow(input, idFactory());
  if (row.version !== input.expectedVersion + 1) {
    throw new DigitalCaseRuntimeMappingError(
      "next version must increment the expected version by one",
    );
  }
  const updated = await updateDigitalCaseRuntime(
    executor,
    row,
    input.expectedVersion,
  );
  if (updated !== null) return updated;
  if (input.expectedVersion !== 0) {
    throw new DigitalCaseRuntimePersistenceConflictError(
      "digital case version changed",
    );
  }
  return insertDigitalCaseRuntime(executor, row);
}

export function createDigitalCaseRuntimeRepository(
  db: DatabaseExecutor,
  idFactory: () => string = randomUUID,
): DigitalCaseRuntimeRepositoryPort {
  const repository: DigitalCaseRuntimeRepositoryPort = {
    findDigitalCaseRuntime: async (participantId, scopeId, moduleId) =>
      db.transaction((transaction) =>
        findDigitalCaseRuntimeInTransaction(
          transaction,
          participantId,
          scopeId,
          moduleId,
        ),
      ),
    saveDigitalCaseRuntime: async (input: DigitalCaseRuntimeWriteInput) =>
      db.transaction((transaction) =>
        saveDigitalCaseRuntimeInTransaction(transaction, input, idFactory),
      ),
  };
  return Object.freeze(repository);
}
