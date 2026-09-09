import {
  assignedModuleIdsForDiagnosticResult,
  createB07DiagnosticSessionCatalog,
  saveDiagnosticSessionAnswer,
  startDiagnosticSession,
  type DiagnosticSessionCatalogSnapshot,
} from "@cvg/application";
import { describe, expect, it } from "vitest";

import { evaluateDiagnosticAttempt } from "@cvg/curriculum";

import {
  createDiagnosticSessionRepository,
  diagnosticSessionCatalogFromSnapshot,
  DiagnosticSessionIdempotencyConflictError,
} from "./diagnostic-session-repository.js";
import {
  accounts,
  activityAssignments,
  auditEntries,
  diagnosticResults,
  diagnosticSessionAnswers,
  diagnosticSessionIdempotency,
  diagnosticSessions,
  learningActivities,
  learningAssignments,
  outboxEvents,
} from "./schema.js";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";

type Row = Record<string, unknown>;
type SqlLike = Readonly<{ readonly queryChunks: readonly unknown[] }>;
type ColumnLike = Readonly<{ readonly name: string }>;

const participantId = "11111111-1111-4111-8111-111111111111";
const otherParticipantId = "99999999-9999-4999-8999-999999999999";
const scopeId = "22222222-2222-4222-8222-222222222222";

function isSqlLike(value: unknown): value is SqlLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "queryChunks" in value &&
    Array.isArray(value.queryChunks)
  );
}

function isColumnLike(value: unknown): value is ColumnLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    !("queryChunks" in value)
  );
}

function chunkText(value: unknown): string | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("value" in value) ||
    !Array.isArray(value.value)
  ) {
    return undefined;
  }
  return value.value
    .filter((part): part is string => typeof part === "string")
    .join("");
}

function queryValue(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "encoder" in value
  ) {
    return value.value;
  }
  return value;
}

function flattenSql(value: unknown): readonly unknown[] {
  if (!isSqlLike(value)) return [value];
  return value.queryChunks.flatMap((chunk) => flattenSql(chunk));
}

function camelCase(column: string): string {
  return column.replace(/_([a-z])/gu, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

type Comparison = Readonly<{
  readonly column: string;
  readonly operator: "=" | ">" | "<=";
  readonly value: unknown;
}>;

function comparisons(condition: unknown): readonly Comparison[] {
  const chunks = flattenSql(condition);
  const result: Comparison[] = [];
  for (let index = 0; index + 2 < chunks.length; index += 1) {
    const column = chunks[index];
    const operator = chunkText(chunks[index + 1]);
    if (!isColumnLike(column) || operator === undefined) continue;
    const value = queryValue(chunks[index + 2]);
    if (operator.includes(" <= ")) {
      result.push({ column: column.name, operator: "<=", value });
    } else if (operator.includes(" > ")) {
      result.push({ column: column.name, operator: ">", value });
    } else if (operator.includes(" = ")) {
      result.push({ column: column.name, operator: "=", value });
    }
  }
  return result;
}

function nullColumns(condition: unknown): readonly string[] {
  const chunks = flattenSql(condition);
  const result: string[] = [];
  for (let index = 0; index + 1 < chunks.length; index += 1) {
    const column = chunks[index];
    const operator = chunkText(chunks[index + 1]);
    if (isColumnLike(column) && operator?.includes("is null") === true) {
      result.push(column.name);
    }
  }
  return result;
}

function equalValues(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

function matches(row: Row, condition: unknown): boolean {
  return (
    comparisons(condition).every(({ column, operator, value }) => {
      const current = row[camelCase(column)];
      if (operator === "=") return equalValues(current, value);
      if (!(current instanceof Date) || !(value instanceof Date)) return false;
      return operator === ">"
        ? current.getTime() > value.getTime()
        : current.getTime() <= value.getTime();
    }) &&
    nullColumns(condition).every((column) => row[camelCase(column)] === null)
  );
}

function rowCopy(value: Record<string, unknown>): Row {
  return { ...value };
}

type FakeBuilder = {
  readonly from: (source: object) => FakeBuilder;
  readonly innerJoin: (...tables: readonly unknown[]) => FakeBuilder;
  where: (condition: unknown) => FakeBuilder;
  readonly orderBy: (...columns: readonly unknown[]) => FakeBuilder;
  readonly limit: (...values: readonly unknown[]) => FakeBuilder;
  values: (row: Record<string, unknown>) => FakeBuilder;
  onConflictDoNothing: () => FakeBuilder;
  onConflictDoUpdate: (config: unknown) => FakeBuilder;
  readonly set: (values: Record<string, unknown>) => FakeBuilder;
  readonly returning: (
    ...columns: readonly unknown[]
  ) => Promise<readonly Row[]>;
  then: (
    resolve: (value: readonly Row[]) => unknown,
    reject?: (error: unknown) => unknown,
  ) => Promise<unknown>;
};

function createFakeDatabase(
  options: {
    readonly afterSelect?: (source: object) => void;
    readonly beforeAdvisoryLock?: () => void;
    readonly hideFinalizedAnswers?: boolean;
  } = {},
): {
  readonly db: DatabaseExecutor;
  readonly sessions: () => readonly Row[];
  readonly answers: () => readonly Row[];
  readonly results: () => readonly Row[];
  readonly assignments: () => readonly Row[];
  readonly idempotency: () => readonly Row[];
  readonly audit: () => readonly Row[];
  readonly outbox: () => readonly Row[];
} {
  const sessionRows: Row[] = [];
  const answerRows: Row[] = [];
  const resultRows: Row[] = [];
  const assignmentRows: Row[] = [];
  const activityAssignmentRows: Row[] = [];
  const idempotencyRows: Row[] = [];
  const auditRows: Row[] = [];
  const outboxRows: Row[] = [];

  function rowsFor(source: object): Row[] {
    if (source === diagnosticSessions) return sessionRows;
    if (source === diagnosticSessionAnswers) return answerRows;
    if (source === diagnosticResults) return resultRows;
    if (source === diagnosticSessionIdempotency) return idempotencyRows;
    if (source === learningAssignments) return assignmentRows;
    if (source === activityAssignments) return activityAssignmentRows;
    if (source === accounts) {
      return [
        { accountId: participantId, id: participantId, status: "ACTIVE" },
      ];
    }
    if (source === learningActivities) return [];
    return [];
  }

  function persistInsert(
    source: object,
    value: Row,
    conflictConfig?: unknown,
  ): void {
    if (source === diagnosticSessions) {
      sessionRows.push(rowCopy(value));
      return;
    }
    if (source === diagnosticResults) {
      resultRows.push(rowCopy(value));
      return;
    }
    if (source === auditEntries) {
      auditRows.push(rowCopy(value));
      return;
    }
    if (source === outboxEvents) {
      outboxRows.push(rowCopy(value));
      return;
    }
    if (source === diagnosticSessionIdempotency) {
      const duplicate = idempotencyRows.some(
        (row) =>
          row.participantId === value.participantId &&
          row.scopeId === value.scopeId &&
          row.operation === value.operation &&
          row.idempotencyKey === value.idempotencyKey,
      );
      if (!duplicate) idempotencyRows.push(rowCopy(value));
      return;
    }
    if (source === diagnosticSessionAnswers) {
      const index = answerRows.findIndex(
        (row) =>
          row.sessionId === value.sessionId &&
          row.canonicalItemId === value.canonicalItemId,
      );
      if (index < 0) {
        answerRows.push(rowCopy(value));
        return;
      }
      const config =
        typeof conflictConfig === "object" && conflictConfig !== null
          ? conflictConfig
          : undefined;
      const update =
        config !== undefined &&
        "set" in config &&
        typeof config.set === "object"
          ? config.set
          : undefined;
      if (update !== undefined && update !== null) {
        answerRows[index] = {
          ...answerRows[index],
          ...(update as Record<string, unknown>),
        };
      }
      return;
    }
    if (source === learningAssignments) {
      const duplicate = assignmentRows.some(
        (row) =>
          row.participantId === value.participantId &&
          row.scopeId === value.scopeId &&
          row.moduleId === value.moduleId,
      );
      if (!duplicate) assignmentRows.push(rowCopy(value));
      return;
    }
    if (source === activityAssignments) {
      const duplicate = activityAssignmentRows.some(
        (row) =>
          row.participantId === value.participantId &&
          row.activityId === value.activityId,
      );
      if (!duplicate) activityAssignmentRows.push(rowCopy(value));
    }
  }

  function selectBuilder(
    initialSource?: object,
    initialOperation: "select" | "update" = "select",
  ): FakeBuilder {
    let source = initialSource;
    let condition: unknown;
    let updateValues: Record<string, unknown> | undefined;

    const executeSelect = (): readonly Row[] => {
      const rows = source === undefined ? [] : rowsFor(source);
      const visibleRows =
        source === diagnosticSessionAnswers && options.hideFinalizedAnswers
          ? rows.filter(
              (row) =>
                !sessionRows.some(
                  (session) =>
                    session.id === row.sessionId &&
                    session.status === "FINALIZADA",
                ),
            )
          : rows;
      const selected = visibleRows.filter((row) => matches(row, condition));
      if (source !== undefined) options.afterSelect?.(source);
      return selected.map(rowCopy);
    };

    const executeUpdate = (): readonly Row[] => {
      if (source === undefined || updateValues === undefined) return [];
      const rows = rowsFor(source);
      const updated: Row[] = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (row === undefined || !matches(row, condition)) continue;
        rows[index] = { ...row, ...updateValues };
        updated.push({ id: rows[index]?.id });
      }
      return updated;
    };

    let executedUpdate = false;
    const builder: FakeBuilder = {
      from(currentSource) {
        source = currentSource;
        return builder;
      },
      innerJoin() {
        return builder;
      },
      where(currentCondition) {
        condition = currentCondition;
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit() {
        return builder;
      },
      values() {
        return builder;
      },
      onConflictDoNothing() {
        return builder;
      },
      onConflictDoUpdate() {
        return builder;
      },
      set(values) {
        updateValues = values;
        return builder;
      },
      returning: async () => executeUpdate(),
      then(resolve, reject) {
        try {
          const result =
            initialOperation === "update" && !executedUpdate
              ? executeUpdate()
              : executeSelect();
          executedUpdate = true;
          return Promise.resolve(resolve(result));
        } catch (error) {
          if (reject === undefined) return Promise.reject(error);
          return Promise.resolve(reject(error));
        }
      },
    };
    return builder;
  }

  function insertBuilder(source: object): FakeBuilder {
    let pending: Row | undefined;
    let conflictConfig: unknown;
    let committed = false;
    const commit = (): void => {
      if (committed || pending === undefined) return;
      committed = true;
      persistInsert(source, pending, conflictConfig);
      pending = undefined;
    };
    const builder = selectBuilder();
    builder.values = (row) => {
      pending = rowCopy(row);
      return builder;
    };
    builder.onConflictDoNothing = () => {
      commit();
      return builder;
    };
    builder.onConflictDoUpdate = (config) => {
      conflictConfig = config;
      commit();
      return builder;
    };
    builder.then = (resolve, reject) => {
      try {
        commit();
        return Promise.resolve(resolve([]));
      } catch (error) {
        if (reject === undefined) return Promise.reject(error);
        return Promise.resolve(reject(error));
      }
    };
    return builder;
  }

  function deleteBuilder(source: object): FakeBuilder {
    let condition: unknown;
    let committed = false;
    const builder = selectBuilder();
    builder.where = (value) => {
      condition = value;
      return builder;
    };
    builder.then = (resolve, reject) => {
      try {
        if (!committed) {
          const rows = rowsFor(source);
          const kept = rows.filter((row) => !matches(row, condition));
          rows.splice(0, rows.length, ...kept);
          committed = true;
        }
        return Promise.resolve(resolve([]));
      } catch (error) {
        if (reject === undefined) return Promise.reject(error);
        return Promise.resolve(reject(error));
      }
    };
    return builder;
  }

  const executor = {
    execute: async (query: unknown) => {
      if (
        flattenSql(query).some(
          (chunk) =>
            chunkText(chunk)?.includes("pg_advisory_xact_lock") === true,
        )
      ) {
        options.beforeAdvisoryLock?.();
      }
      return [];
    },
    select: (source?: object) => selectBuilder(source),
    selectDistinct: () => selectBuilder(),
    insert: (source: object) => insertBuilder(source),
    update: (source: object) => selectBuilder(source, "update"),
    delete: (source: object) => deleteBuilder(source),
    transaction: async (work: (transaction: unknown) => Promise<unknown>) =>
      work(executor),
  };

  return {
    db: executor as unknown as DatabaseExecutor,
    sessions: () => sessionRows,
    answers: () => answerRows,
    results: () => resultRows,
    assignments: () => assignmentRows,
    idempotency: () => idempotencyRows,
    audit: () => auditRows,
    outbox: () => outboxRows,
  };
}

describe("diagnostic session persistence", () => {
  it("refreshes the start response after a concurrent checkpoint", async () => {
    let advisoryLockCount = 0;
    const fake = createFakeDatabase({
      beforeAdvisoryLock: () => {
        advisoryLockCount += 1;
        if (advisoryLockCount !== 3) return;
        const session = fake.sessions()[0];
        if (session === undefined)
          throw new Error("session fixture is missing");
        session.version = 1;
        const checkpointAt = new Date();
        session.lastCheckpointAt = checkpointAt;
        session.updatedAt = checkpointAt;
      },
    });
    const catalog = createB07DiagnosticSessionCatalog();
    const repository = createDiagnosticSessionRepository(fake.db);
    const startedAt = new Date().toISOString();

    await startDiagnosticSession(
      {
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-race-0001",
        correlationId: "correlation-start-race-0001",
      },
      repository,
      catalog,
    );
    const refreshed = await startDiagnosticSession(
      {
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-race-0002",
        correlationId: "correlation-start-race-0002",
      },
      repository,
      catalog,
    );
    const replayed = await startDiagnosticSession(
      {
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-race-0002",
        correlationId: "correlation-start-race-0002",
      },
      repository,
      catalog,
    );

    expect(refreshed.session.version).toBe(1);
    expect(replayed.session.version).toBe(1);
  });

  it("replays, checkpoints, clears, finalizes and materializes in one flow", async () => {
    const fake = createFakeDatabase();
    const catalog = createB07DiagnosticSessionCatalog();
    const repository = createDiagnosticSessionRepository(fake.db);
    const startedAt = new Date().toISOString();
    const started = await startDiagnosticSession(
      {
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-0001",
        correlationId: "correlation-start-0001",
      },
      repository,
      catalog,
    );
    const replayedStart = await startDiagnosticSession(
      {
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-0001",
        correlationId: "correlation-start-0001",
      },
      repository,
      catalog,
    );
    expect(replayedStart.session.sessionId).toBe(started.session.sessionId);
    expect(fake.sessions()).toHaveLength(1);

    const item = catalog.items[0];
    const choice = item?.choices[0];
    if (item === undefined || choice === undefined) {
      throw new Error("B07 fixture is incomplete");
    }
    const savedAt = new Date(Date.now() + 1_000).toISOString();
    const saved = await saveDiagnosticSessionAnswer(
      {
        participantId,
        scopeId,
        sessionId: started.session.sessionId,
        version: started.session.version,
        itemId: item.publicItemId,
        selectedChoiceIds: [choice.id],
        idempotencyKey: "save-b07-answer-0001",
        correlationId: "correlation-answer-0001",
        occurredAt: savedAt,
      },
      repository,
    );
    const replayedSave = await saveDiagnosticSessionAnswer(
      {
        participantId,
        scopeId,
        sessionId: started.session.sessionId,
        version: started.session.version,
        itemId: item.publicItemId,
        selectedChoiceIds: [choice.id],
        idempotencyKey: "save-b07-answer-0001",
        correlationId: "correlation-answer-0001",
        occurredAt: savedAt,
      },
      repository,
    );
    expect(replayedSave.session.version).toBe(saved.session.version);
    expect(replayedSave.answers).toHaveLength(1);

    const cleared = await saveDiagnosticSessionAnswer(
      {
        participantId,
        scopeId,
        sessionId: started.session.sessionId,
        version: saved.session.version,
        itemId: item.publicItemId,
        selectedChoiceIds: [],
        idempotencyKey: "clear-b07-answer-0001",
        correlationId: "correlation-answer-0002",
        occurredAt: new Date(Date.now() + 2_000).toISOString(),
      },
      repository,
    );
    expect(cleared.answers).toHaveLength(0);
    expect(fake.answers()).toHaveLength(0);

    const savedAfterClear = await saveDiagnosticSessionAnswer(
      {
        participantId,
        scopeId,
        sessionId: started.session.sessionId,
        version: cleared.session.version,
        itemId: item.publicItemId,
        selectedChoiceIds: [choice.id],
        idempotencyKey: "save-b07-answer-0002",
        correlationId: "correlation-answer-0003",
        occurredAt: new Date(Date.now() + 2_500).toISOString(),
      },
      repository,
    );
    expect(savedAfterClear.answers).toHaveLength(1);

    const completedAt = new Date(Date.now() + 3_000).toISOString();
    const finalized = await repository.finalize({
      participantId,
      scopeId,
      sessionId: started.session.sessionId,
      expectedVersion: savedAfterClear.session.version,
      idempotencyKey: "finalize-b07-session-001",
      correlationId: "correlation-finalize-0001",
      completedAt,
      fingerprint: "finalize-fingerprint-0001",
      evaluate: (answers, snapshot) => {
        const result = evaluateDiagnosticAttempt({
          answers,
          catalog: {
            items: snapshot.items.map((snapshotItem) => ({
              id: snapshotItem.canonicalItemId,
              diagnosticSessionId: snapshotItem.diagnosticSessionId,
              objectiveId: snapshotItem.objectiveId,
              choices: snapshotItem.choices,
              correctChoiceIds: snapshotItem.correctChoiceIds,
            })),
          },
        });
        return {
          result,
          moduleIds: assignedModuleIdsForDiagnosticResult(result),
        };
      },
    });
    const replayedFinalization = await repository.finalize({
      participantId,
      scopeId,
      sessionId: started.session.sessionId,
      expectedVersion: savedAfterClear.session.version,
      idempotencyKey: "finalize-b07-session-001",
      correlationId: "correlation-finalize-0001",
      completedAt,
      fingerprint: "finalize-fingerprint-0001",
      evaluate: (answers, snapshot) => {
        const result = evaluateDiagnosticAttempt({
          answers,
          catalog: {
            items: snapshot.items.map((snapshotItem) => ({
              id: snapshotItem.canonicalItemId,
              diagnosticSessionId: snapshotItem.diagnosticSessionId,
              objectiveId: snapshotItem.objectiveId,
              choices: snapshotItem.choices,
              correctChoiceIds: snapshotItem.correctChoiceIds,
            })),
          },
        });
        return {
          result,
          moduleIds: assignedModuleIdsForDiagnosticResult(result),
        };
      },
    });

    expect(finalized.aggregate.session.status).toBe("FINALIZADA");
    expect(finalized.aggregate.answers).toHaveLength(1);
    expect(finalized.aggregate.answers[0]?.canonicalItemId).toBe(
      catalog.snapshot.items[0]?.canonicalItemId,
    );
    expect(finalized.aggregate.result?.resultId).toBe(
      finalized.assignments.diagnosticResultId,
    );
    const assignedModuleIds = finalized.assignments.assignments.map(
      ({ state }) => state.moduleId,
    );
    expect(assignedModuleIds).toEqual(
      expect.arrayContaining(["M01", "M02", "M11"]),
    );
    expect(assignedModuleIds).toHaveLength(
      finalized.assignments.assignments.length,
    );
    expect(replayedFinalization.aggregate.session.sessionId).toBe(
      finalized.aggregate.session.sessionId,
    );
    expect(replayedFinalization.aggregate.answers).toHaveLength(1);
    expect(replayedFinalization.assignments.assignments).toHaveLength(
      finalized.assignments.assignments.length,
    );
    expect(fake.results()).toHaveLength(1);
    expect(fake.assignments()).toHaveLength(
      finalized.assignments.assignments.length,
    );
    expect(fake.idempotency()).toHaveLength(5);
    expect(fake.audit()).toHaveLength(5);
    expect(fake.outbox()).toHaveLength(5);
    expect(fake.outbox().map((row) => row.eventType)).toEqual([
      "DIAGNOSTIC_SESSION_STARTED",
      "DIAGNOSTIC_SESSION_CHECKPOINTED",
      "DIAGNOSTIC_SESSION_CHECKPOINTED",
      "DIAGNOSTIC_SESSION_CHECKPOINTED",
      "DIAGNOSTIC_SESSION_FINALIZED",
    ]);
    expect(fake.outbox().at(-1)?.payload).toMatchObject({
      answeredItemCount: 1,
    });

    const current = await repository.findCurrent(participantId, scopeId);
    const isolated = await repository.findById(
      started.session.sessionId,
      otherParticipantId,
      scopeId,
    );
    expect(current?.session.status).toBe("FINALIZADA");
    expect(current?.answers).toHaveLength(1);
    expect(current?.answers[0]?.canonicalItemId).toBe(
      catalog.snapshot.items[0]?.canonicalItemId,
    );
    expect(isolated).toBeNull();
  });

  it("rejects malformed snapshots and idempotency reuse with a different fingerprint", async () => {
    const catalog = createB07DiagnosticSessionCatalog();
    const malformed: DiagnosticSessionCatalogSnapshot = {
      ...catalog.snapshot,
      items: catalog.snapshot.items.slice(0, 119),
    };
    expect(() => diagnosticSessionCatalogFromSnapshot(malformed)).toThrow(
      "120 items",
    );

    const fake = createFakeDatabase();
    const repository = createDiagnosticSessionRepository(fake.db);
    const startedAt = new Date().toISOString();
    await repository.start({
      participantId,
      scopeId,
      startedAt,
      idempotencyKey: "start-b07-session-0002",
      correlationId: "correlation-start-0002",
      catalog: catalog.snapshot,
      fingerprint: "fingerprint-a",
    });
    await expect(
      repository.start({
        participantId,
        scopeId,
        startedAt,
        idempotencyKey: "start-b07-session-0002",
        correlationId: "correlation-start-0002",
        catalog: catalog.snapshot,
        fingerprint: "fingerprint-b",
      }),
    ).rejects.toBeInstanceOf(DiagnosticSessionIdempotencyConflictError);
  });
});
