import { describe, expect, it } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { ApplicationError } from "@cvg/application";
import {
  bindModuleObligation,
  type BoundModuleObligation,
  type ModuleObligationBindingCommand,
} from "./module-obligation-binding.js";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import { createFakeDatabase } from "./test-support/fake-database.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

const dialect = new PgDialect();
const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const manifestId = "33333333-3333-4333-8333-333333333334";
const blueprintVersionId = "33333333-3333-4333-8333-333333333335";
const now = new Date("2026-09-28T12:00:00.000Z");

type Insert = Readonly<{ table: string; values: Record<string, unknown> }>;

function assignmentRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
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

function manifestRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: manifestId,
    version: 2,
    scopeId,
    moduleId: "M02",
    blueprintVersionId,
    blueprintVersion: 1,
    approvedAt: new Date("2026-09-27T12:00:00.000Z"),
    ...overrides,
  };
}

function command(
  change?: (input: Mutable<ModuleObligationBindingCommand>) => void,
): ModuleObligationBindingCommand {
  const input: Mutable<ModuleObligationBindingCommand> = {
    now,
    expectedAssignmentVersion: 3,
    assignment: { assignmentId, participantId, scopeId, moduleId: "M02" },
    manifest: {
      id: manifestId,
      version: 2,
      blueprintVersionId,
      blueprintVersion: 1,
    },
  };
  change?.(input);
  return input;
}

function harness(rows: readonly (readonly unknown[])[] = []) {
  const inserts: Insert[] = [];
  const updates: string[] = [];
  const configurations: string[] = [];
  const db = createFakeDatabase({
    rows,
    onInsert: (table, values) => {
      inserts.push({
        table: getTableName(table as Parameters<typeof getTableName>[0]),
        values: values as Record<string, unknown>,
      });
    },
    onUpdate: (table) => {
      updates.push(getTableName(table as Parameters<typeof getTableName>[0]));
    },
    onExecute: (query) => {
      configurations.push(dialect.sqlToQuery(query as SQL).sql);
    },
  });
  return {
    db: db as unknown as DatabaseExecutor,
    inserts,
    updates,
    configurations,
  };
}

function happyRows(
  assignment: Record<string, unknown>,
  manifest: Record<string, unknown>,
) {
  return [[], [assignment], [], [manifest], []];
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

describe("module obligation assignment binding", () => {
  it("binds the captured manifest at the observed assignment version", async () => {
    const { db, inserts, updates, configurations } = harness(
      happyRows(assignmentRow(), manifestRow()),
    );

    const bound: BoundModuleObligation = await bindModuleObligation(
      db,
      command(),
    );

    expect(bound).toEqual({
      assignmentId,
      participantId,
      scopeId,
      moduleId: "M02",
      manifestId,
      manifestVersion: 2,
      blueprintVersionId,
      blueprintVersion: 1,
      boundAt: now,
      assignmentVersion: 3,
    });
    expect(Object.isFrozen(bound)).toBe(true);
    expect(updates).toEqual([]);
    expect(configurations[0]).toContain("set_config('cvg.participant_id'");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.table).toBe("curriculum_assignment_obligations");
    expect(inserts[0]!.values).toMatchObject({
      assignmentId,
      participantId,
      scopeId,
      moduleId: "M02",
      manifestId,
      manifestVersion: 2,
      blueprintVersionId,
      blueprintVersion: 1,
      boundAt: now,
      assignmentVersion: 3,
    });
  });

  it("denies an assignment that does not exist for the participant scope module", async () => {
    const { db, inserts } = harness([[], [], [], [], []]);

    await denied(() => bindModuleObligation(db, command()));

    expect(inserts).toEqual([]);
  });

  it("denies a stale assignment version instead of rebinding silently", async () => {
    const { db, inserts } = harness(
      happyRows(assignmentRow({ version: 7 }), manifestRow()),
    );

    await denied(() =>
      bindModuleObligation(
        db,
        command((input) => {
          input.expectedAssignmentVersion = 3;
        }),
      ),
    );

    expect(inserts).toEqual([]);
  });

  it("denies rebinding an assignment that already carries a binding", async () => {
    const { db, inserts } = harness([
      [],
      [assignmentRow()],
      [{ assignmentId }],
      [manifestRow()],
      [],
    ]);

    await denied(() => bindModuleObligation(db, command()));

    expect(inserts).toEqual([]);
  });

  it("denies a manifest that is not the captured immutable identity", async () => {
    const { db, inserts } = harness(
      happyRows(
        assignmentRow(),
        manifestRow({
          id: "33333333-3333-4333-8333-333333333336",
          version: 9,
        }),
      ),
    );

    await denied(() => bindModuleObligation(db, command()));

    expect(inserts).toEqual([]);
  });

  it("denies a manifest approved after the binding time or a future binding", async () => {
    const late = harness(
      happyRows(
        assignmentRow(),
        manifestRow({ approvedAt: new Date("2026-09-29T12:00:00.000Z") }),
      ),
    );
    await denied(() => bindModuleObligation(late.db, command()));
    expect(late.inserts).toEqual([]);

    const future = harness(happyRows(assignmentRow(), manifestRow()));
    await denied(() =>
      bindModuleObligation(
        future.db,
        command((input) => {
          input.now = new Date("2099-01-01T00:00:00.000Z");
          input.expectedAssignmentVersion = 3;
        }),
      ),
    );
    expect(future.inserts).toEqual([]);
  });

  it("denies a malformed binding command before touching storage", async () => {
    const module = harness(happyRows(assignmentRow(), manifestRow()));
    await denied(() =>
      bindModuleObligation(
        module.db,
        command((input) => {
          input.assignment.moduleId = "M99";
        }),
      ),
    );
    expect(module.configurations).toEqual([]);
    expect(module.inserts).toEqual([]);

    const participant = harness(happyRows(assignmentRow(), manifestRow()));
    await denied(() =>
      bindModuleObligation(
        participant.db,
        command((input) => {
          input.assignment.participantId = "not-a-participant";
        }),
      ),
    );
    expect(participant.configurations).toEqual([]);
    expect(participant.inserts).toEqual([]);

    const version = harness(happyRows(assignmentRow(), manifestRow()));
    await denied(() =>
      bindModuleObligation(
        version.db,
        command((input) => {
          input.manifest.version = 0;
        }),
      ),
    );
    expect(version.configurations).toEqual([]);
    expect(version.inserts).toEqual([]);
  });
});
