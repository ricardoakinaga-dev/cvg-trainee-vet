import { ApplicationError } from "@cvg/application";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import {
  recordModuleCompletion,
  type ModuleCompletionCommand,
  type RecordedModuleCompletion,
} from "./module-obligation-completion.js";
import type {
  ApprovedSummativeGradeEvidence,
  SummativeGradePolicy,
} from "./module-obligation-grade-policy.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";
import { createFakeDatabase } from "./test-support/fake-database.js";
import { terminalModuleWitnesses } from "./test-support/module-obligation-terminal-fixture.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

const dialect = new PgDialect();
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const assignmentId = uuid(2);
const participantId = uuid(3);
const scopeId = uuid(1);

type Op = Readonly<{
  kind: "insert" | "update" | "execute";
  table?: string;
  values?: unknown;
  sql: string;
}>;

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: assignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    version: 3,
    status: "EM_ANDAMENTO",
    ...overrides,
  };
}

function bindingRow(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    manifestId: uuid(6),
    manifestVersion: 1,
    blueprintVersionId: uuid(5),
    blueprintVersion: 1,
    boundAt: new Date("2026-09-28T12:00:00.000Z"),
    assignmentVersion: 3,
    ...overrides,
  };
}

function manifestRow(obligations: unknown) {
  return {
    id: uuid(6),
    version: 1,
    scopeId,
    moduleId: "M02",
    blueprintVersionId: uuid(5),
    blueprintVersion: 1,
    approvedAt: new Date("2026-09-27T12:00:00.000Z"),
    obligations,
  };
}

function grade(capture: ApprovedModuleObligationCaptureInput) {
  const policy: SummativeGradePolicy = {
    decisionId: uuid(10),
    version: 1,
    scopeId,
    moduleId: "M02",
    blueprintVersionId: capture.blueprint.id,
    blueprintVersion: capture.blueprint.version,
    approvedBy: uuid(4),
    approvedAt: new Date("2026-09-27T12:00:00.000Z"),
    composition: [
      { kind: "CASO", weightPercent: 40 },
      { kind: "EXAME", weightPercent: 60 },
    ],
    minimumOverallPercent: 70,
    minimumCriticalPercent: 60,
  };
  const obligations = capture.manifest.obligations.map((obligation, index) => ({
    obligationId: obligation.id,
    activityId: obligation.activityId,
    assessmentResultId: uuid(950 + index),
    correctionOutcome: "APROVADO" as const,
  }));
  const evidence: ApprovedSummativeGradeEvidence = {
    expected: {
      assignmentId,
      participantId,
      scopeId,
      moduleId: "M02",
      blueprintVersionId: capture.blueprint.id,
      blueprintVersion: capture.blueprint.version,
    },
    now: capture.now,
    obligations,
    results: obligations.map((obligation, index) => ({
      obligationId: obligation.obligationId,
      assessmentResultId: obligation.assessmentResultId,
      modality: index === 0 ? "CASO" : "EXAME",
      overallPercent: 88,
      criticalPercent: 92,
      itemCount: 18,
      criticalItemCount: 4,
      recordedAt: new Date("2026-09-29T14:00:00.000Z"),
      correctionOutcome: "APROVADO",
    })),
  };
  return { policy, evidence };
}

function command(
  change?: (input: Mutable<ModuleCompletionCommand>) => void,
): ModuleCompletionCommand {
  const capture = approvedModuleFixture();
  const input = {
    actor: {
      actorId: uuid(4),
      requestId: uuid(600),
      correlationId: uuid(601),
    },
    expectedAssignmentVersion: 3,
    capture,
    witnesses: terminalModuleWitnesses(capture),
    grade: grade(capture),
  } as Mutable<ModuleCompletionCommand>;
  change?.(input);
  return input;
}

function rowsQueue(command: ModuleCompletionCommand): (readonly unknown[])[] {
  return [
    [],
    [assignmentRow()],
    [],
    [bindingRow()],
    [manifestRow(command.capture.manifest.obligations)],
    [],
    [],
    [assignmentRow({ status: "CONCLUIDO", version: 4 })],
    [],
    [],
    [],
  ];
}

function harness(rows: readonly (readonly unknown[])[] = []) {
  const pending: Op[] = [];
  const committed: Op[] = [];
  const configurations: string[] = [];
  const fake = createFakeDatabase({
    rows,
    onExecute: (query) => {
      const compiled = dialect.sqlToQuery(query as SQL);
      configurations.push(compiled.sql);
      pending.push({
        kind: "execute",
        sql: compiled.sql,
        values: compiled.params,
      });
    },
    onInsert: (table, values) => {
      pending.push({
        kind: "insert",
        table: getTableName(table as Parameters<typeof getTableName>[0]),
        values,
        sql: "",
      });
    },
    onUpdate: (table, values) => {
      pending.push({
        kind: "update",
        table: getTableName(table as Parameters<typeof getTableName>[0]),
        values,
        sql: "",
      });
    },
  });
  const db = {
    transaction: async (action: (tx: unknown) => Promise<unknown>) => {
      const mark = pending.length;
      try {
        const result = await action(fake);
        committed.push(...pending.splice(mark));
        return result;
      } catch (error) {
        pending.length = mark;
        throw error;
      }
    },
  };
  return {
    db: db as unknown as DatabaseExecutor,
    committed,
    pending,
    configurations,
    inserts: (table: string) =>
      committed.filter((op) => op.kind === "insert" && op.table === table),
    updates: (table: string) =>
      committed.filter((op) => op.kind === "update" && op.table === table),
  };
}

async function denied(action: () => Promise<unknown>): Promise<void> {
  const error = await action().then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApplicationError);
  expect(error).toMatchObject({
    code: "state_conflict",
    status: 409,
    details: [],
  });
}

describe("module completion receipt writer", () => {
  it("commits one receipt, one audit proof and a CONCLUIDO assignment in a single transaction", async () => {
    const input = command();
    const value = harness(rowsQueue(input));

    const receipt: RecordedModuleCompletion = await recordModuleCompletion(
      value.db,
      input,
    );

    expect(receipt).toEqual({
      assignmentId,
      participantId,
      scopeId,
      moduleId: "M02",
      status: "CONCLUIDO",
      completedAssignmentVersion: 4,
      completedAt: input.capture.now,
      manifestId: uuid(6),
      manifestVersion: 1,
      blueprintVersionId: uuid(5),
      blueprintVersion: 1,
      witnessCount: 2,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(value.pending).toEqual([]);
    expect(value.updates("learning_assignments")).toHaveLength(1);
    expect(value.updates("learning_assignments")[0]!.values).toMatchObject({
      status: "CONCLUIDO",
      version: 4,
    });
    expect(value.inserts("audit_entries")).toHaveLength(1);
    expect(value.inserts("audit_entries")[0]!.values).toMatchObject({
      principalId: input.actor.actorId,
      action: "MODULE_COMPLETION_RECORDED",
      resourceType: "curriculum_module_completion_receipt",
      resourceId: assignmentId,
      scopeId,
      outcome: "SUCCESS",
      reasonCode: "module_completion_recorded",
      requestId: input.actor.requestId,
      correlationId: input.actor.correlationId,
      occurredAt: input.capture.now,
    });
    const receiptRows = value.inserts("curriculum_module_completion_receipts");
    expect(receiptRows).toHaveLength(1);
    expect(receiptRows[0]!.values).toMatchObject({
      assignmentId,
      participantId,
      scopeId,
      moduleId: "M02",
      manifestId: uuid(6),
      manifestVersion: 1,
      blueprintVersionId: uuid(5),
      blueprintVersion: 1,
      completedAssignmentVersion: 4,
      completedAt: input.capture.now,
      actorId: input.actor.actorId,
      requestId: input.actor.requestId,
      correlationId: input.actor.correlationId,
    });
    expect(receiptRows[0]!.values).toMatchObject({
      auditEntryId: expect.any(String),
      witnesses: [
        {
          activityId: input.capture.captures[0]!.activityId,
          attemptId: uuid(900),
          attemptVersion: 5,
          formVersionId: input.capture.captures[0]!.capture.form.id,
          formVersion: 1,
          correctedAt: "2026-09-30T11:00:00.000Z",
          assessmentResultId: uuid(950),
        },
        {
          activityId: input.capture.captures[1]!.activityId,
          attemptId: uuid(901),
          attemptVersion: 5,
          formVersionId: input.capture.captures[1]!.capture.form.id,
          formVersion: 1,
          correctedAt: "2026-09-30T11:00:00.000Z",
          assessmentResultId: uuid(951),
        },
      ],
    });
    expect(value.updates("activity_assignments")).toHaveLength(1);
    expect(value.configurations[0]).toContain(
      "set_config('cvg.participant_id'",
    );
    expect(value.configurations[0]).toContain("set_config('cvg.scope_id'");
    expect(value.configurations[1]).toContain(
      "set_config('cvg.audit_write', 'on'",
    );
    expect(value.configurations[1]).toContain(
      "set_config('cvg.audit_read', 'on'",
    );
    expect(value.configurations[1]).toContain(
      "set_config('cvg.audit_scope_id'",
    );
  });

  it("rolls back every write when the assignment cannot be transitioned", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[7] = [];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
    expect(value.inserts("audit_entries")).toEqual([]);
    expect(value.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(value.updates("learning_assignments")).toEqual([]);
  });

  it("denies a stale assignment version before writing anything", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[1] = [assignmentRow({ version: 7 })];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies an assignment that does not exist for the participant scope module", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[1] = [];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies a completion that already carries a receipt", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[2] = [{ assignmentId, completedAt: input.capture.now }];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies a completion without the immutable obligation binding", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[3] = [];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies a binding for another manifest identity or a future bound binding", async () => {
    const foreign = command();
    const foreignRows = rowsQueue(foreign);
    foreignRows[3] = [bindingRow({ manifestId: uuid(61) })];
    const foreignValue = harness(foreignRows);
    await denied(() => recordModuleCompletion(foreignValue.db, foreign));
    expect(foreignValue.committed).toEqual([]);

    const late = command();
    const lateRows = rowsQueue(late);
    lateRows[3] = [
      bindingRow({ boundAt: new Date("2026-10-01T12:00:00.000Z") }),
    ];
    const lateValue = harness(lateRows);
    await denied(() => recordModuleCompletion(lateValue.db, late));
    expect(lateValue.committed).toEqual([]);
  });

  it("denies a stored inventory that differs from the validated capture", async () => {
    const input = command();
    const rows = rowsQueue(input);
    rows[4] = [manifestRow(input.capture.manifest.obligations.slice(0, 1))];
    const value = harness(rows);

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies completion without an approved summative decision", async () => {
    const input = command((draft) => {
      draft.grade.policy = null;
    });
    const value = harness(rowsQueue(input));

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
  });

  it("denies an empty or partial inventory before opening the transaction", async () => {
    const empty = command((draft) => {
      draft.capture.manifest.obligations.splice(0);
    });
    const emptyValue = harness(rowsQueue(empty));
    await denied(() => recordModuleCompletion(emptyValue.db, empty));
    expect(emptyValue.committed).toEqual([]);

    const partial = command((draft) => {
      draft.capture.manifest.obligations.splice(1);
      draft.witnesses = draft.witnesses.slice(0, 1);
    });
    const partialValue = harness(rowsQueue(partial));
    await denied(() => recordModuleCompletion(partialValue.db, partial));
    expect(partialValue.committed).toEqual([]);
    expect(partialValue.configurations).toEqual([]);
  });

  it("denies a witness set that does not finalize every required activity", async () => {
    const input = command((draft) => {
      draft.witnesses = draft.witnesses.slice(1);
    });
    const value = harness(rowsQueue(input));

    await denied(() => recordModuleCompletion(value.db, input));

    expect(value.committed).toEqual([]);
    expect(value.configurations).toEqual([]);
  });

  it("denies a foreign actor or malformed command before touching storage", async () => {
    const actor = command((draft) => {
      draft.actor.actorId = "";
    });
    const actorValue = harness(rowsQueue(actor));
    await denied(() => recordModuleCompletion(actorValue.db, actor));
    expect(actorValue.configurations).toEqual([]);

    const version = command((draft) => {
      draft.expectedAssignmentVersion = 1;
    });
    const versionValue = harness([
      [],
      [assignmentRow({ version: 3 })],
      [],
      [bindingRow({ assignmentVersion: 3 })],
      [manifestRow(version.capture.manifest.obligations)],
      [],
      [],
      [assignmentRow({ status: "CONCLUIDO", version: 2 })],
      [],
      [],
      [],
    ]);
    await denied(() => recordModuleCompletion(versionValue.db, version));
    expect(versionValue.committed).toEqual([]);
  });

  it("does not mutate the command proof while recording completion", async () => {
    const input = command();
    const before = structuredClone(input);
    const value = harness(rowsQueue(input));

    await recordModuleCompletion(value.db, input);

    expect(input).toEqual(before);
  });
});
