import { describe, expect, it, vi } from "vitest";

import {
  DigitalCaseRuntimePersistenceConflictError,
  DigitalCaseRuntimeMappingError,
  createDigitalCaseRuntimeRepository,
  digitalCaseRuntimeRowToState,
  digitalCaseRuntimeStateToRow,
} from "./digital-case-repository.js";

const state = {
  caseId: "M24-DIGITAL-CASE-V1",
  version: 1,
  currentStage: 2 as const,
  state: { path: "ESTABILIZACAO" as const },
  revealedExamSeriesIds: ["RADIOGRAFIA-SERIES"],
  consequences: [
    {
      branchId: "S1-A",
      consequence: "Ramo sintético liberado.",
      recordedAt: "2026-08-14T09:00:00.000Z",
    },
  ],
  updatedAt: "2026-08-14T09:00:00.000Z",
};

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

const row = {
  id: "33333333-3333-4333-8333-333333333333",
  participantId,
  scopeId,
  moduleId: "M24",
  caseId: state.caseId,
  version: state.version,
  state,
  updatedAt: new Date(state.updatedAt),
};

function fakeDatabase(input: {
  readonly selectResults?: readonly unknown[][];
  readonly updateResults?: readonly unknown[][];
  readonly insertResults?: readonly unknown[][];
}) {
  const selectResults = [...(input.selectResults ?? [])];
  const updateResults = [...(input.updateResults ?? [])];
  const insertResults = [...(input.insertResults ?? [])];
  const inserted: unknown[] = [];
  const createQuery = (result: readonly unknown[]) => {
    const query = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.limit.mockResolvedValue(result);
    return query;
  };
  const tx = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => createQuery(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResults.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(() => {
      const insertQuery = {
        values: vi.fn((value: unknown) => {
          inserted.push(value);
          return insertQuery;
        }),
        onConflictDoNothing: vi.fn(),
        returning: vi.fn(async () => insertResults.shift() ?? []),
      };
      insertQuery.onConflictDoNothing.mockReturnValue(insertQuery);
      return insertQuery;
    }),
  };
  const db = {
    transaction: vi.fn(async (work: (executor: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  return { db, tx, inserted };
}

describe("digital case persistence mapping", () => {
  it("maps a versioned case state to an internal row", () => {
    const row = digitalCaseRuntimeStateToRow(
      {
        participantId,
        scopeId,
        moduleId: "M24",
        state,
      },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(row).toMatchObject({
      participantId,
      scopeId,
      moduleId: "M24",
      caseId: state.caseId,
      version: 1,
    });
    expect(JSON.stringify(row)).not.toMatch(/source|pdf|photo/iu);
  });

  it("rejects a row whose duplicated version or case identity is inconsistent", () => {
    expect(() =>
      digitalCaseRuntimeRowToState({
        id: "33333333-3333-4333-8333-333333333333",
        participantId,
        scopeId,
        moduleId: "M24",
        caseId: state.caseId,
        version: 2,
        state,
        updatedAt: new Date(state.updatedAt),
      }),
    ).toThrow("version");

    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M03",
          state,
        },
        "33333333-3333-4333-8333-333333333333",
      ),
    ).toThrow("case");
  });

  it("rejects malformed case identity, stages, values and timestamps", () => {
    const id = row.id;
    expect(() =>
      digitalCaseRuntimeStateToRow(
        { participantId: " ", scopeId, moduleId: "M24", state },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        { participantId, scopeId: " ", moduleId: "M24", state },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        { participantId, scopeId, moduleId: "M25", state },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: { ...state, version: -1 } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: { ...state, currentStage: 4 } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: { ...state, state: { nested: null } } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: { ...state, revealedExamSeriesIds: [""] } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: {
            ...state,
            consequences: [
              { branchId: "", consequence: "x", recordedAt: state.updatedAt },
            ],
          } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: {
            ...state,
            consequences: [
              { branchId: "b", consequence: "x", recordedAt: "invalid" },
            ],
          } as never,
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: { ...state, updatedAt: "invalid" },
        },
        id,
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
    expect(() => digitalCaseRuntimeRowToState({ ...row, id: " " })).toThrow(
      DigitalCaseRuntimeMappingError,
    );
  });

  it("fails closed when persisted JSON is malformed instead of leaking a TypeError", () => {
    expect(() =>
      digitalCaseRuntimeRowToState({
        id: "33333333-3333-4333-8333-333333333333",
        participantId,
        scopeId,
        moduleId: "M24",
        caseId: state.caseId,
        version: 1,
        state: null as never,
        updatedAt: new Date(state.updatedAt),
      }),
    ).toThrow(DigitalCaseRuntimeMappingError);

    expect(() =>
      digitalCaseRuntimeStateToRow(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          state: {
            ...state,
            consequences: [null],
          } as never,
        },
        "33333333-3333-4333-8333-333333333333",
      ),
    ).toThrow(DigitalCaseRuntimeMappingError);
  });

  it("reads and updates digital case state with optimistic create and conflict paths", async () => {
    const readDatabase = fakeDatabase({ selectResults: [[row]] });
    const repository = createDigitalCaseRuntimeRepository(
      readDatabase.db as never,
      () => row.id,
    );
    await expect(
      repository.findDigitalCaseRuntime(participantId, scopeId, "M24"),
    ).resolves.toEqual({ participantId, scopeId, moduleId: "M24", state });
    expect(readDatabase.tx.execute).toHaveBeenCalledTimes(1);

    const missingDatabase = fakeDatabase({ selectResults: [[]] });
    const missingRepository = createDigitalCaseRuntimeRepository(
      missingDatabase.db as never,
      () => row.id,
    );
    await expect(
      missingRepository.findDigitalCaseRuntime(participantId, scopeId, "M24"),
    ).resolves.toBeNull();

    const input = {
      participantId,
      scopeId,
      moduleId: "M24" as const,
      state,
      expectedVersion: 0,
    };
    const updateDatabase = fakeDatabase({ updateResults: [[row]] });
    const updateRepository = createDigitalCaseRuntimeRepository(
      updateDatabase.db as never,
      () => row.id,
    );
    await expect(
      updateRepository.saveDigitalCaseRuntime(input),
    ).resolves.toEqual({
      participantId,
      scopeId,
      moduleId: "M24",
      state,
    });

    const createDatabase = fakeDatabase({
      updateResults: [[]],
      insertResults: [[row]],
    });
    const createRepository = createDigitalCaseRuntimeRepository(
      createDatabase.db as never,
      () => row.id,
    );
    await expect(
      createRepository.saveDigitalCaseRuntime(input),
    ).resolves.toMatchObject({
      participantId,
      moduleId: "M24",
    });
    expect(createDatabase.inserted).toHaveLength(1);

    const conflictDatabase = fakeDatabase({ updateResults: [[]] });
    const conflictRepository = createDigitalCaseRuntimeRepository(
      conflictDatabase.db as never,
      () => row.id,
    );
    await expect(
      conflictRepository.saveDigitalCaseRuntime({
        ...input,
        expectedVersion: 1,
        state: { ...state, version: 2 },
      }),
    ).rejects.toBeInstanceOf(DigitalCaseRuntimePersistenceConflictError);

    const concurrentDatabase = fakeDatabase({
      updateResults: [[]],
      insertResults: [[]],
    });
    const concurrentRepository = createDigitalCaseRuntimeRepository(
      concurrentDatabase.db as never,
      () => row.id,
    );
    await expect(
      concurrentRepository.saveDigitalCaseRuntime(input),
    ).rejects.toBeInstanceOf(DigitalCaseRuntimePersistenceConflictError);
    await expect(
      concurrentRepository.saveDigitalCaseRuntime({
        ...input,
        state: { ...state, version: 2 },
      }),
    ).rejects.toThrow(DigitalCaseRuntimeMappingError);
  });
});
