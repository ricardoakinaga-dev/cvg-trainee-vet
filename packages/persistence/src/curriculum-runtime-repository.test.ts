import { describe, expect, it, vi } from "vitest";

import type { CurriculumRuntimeState } from "@cvg/application";

import {
  CurriculumRuntimeMappingError,
  createCurriculumRuntimeRepository,
  curriculumRuntimeRowToState,
  curriculumRuntimeStateToRow,
} from "./curriculum-runtime-repository.js";

const state = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  version: 2,
  updatedAt: "2026-08-10T01:00:00.000Z",
  evaluation: {
    moduleId: "M03" as const,
    status: "DOMINIO_DIGITAL" as const,
    nextAction: "REVISAR_RETENCAO" as const,
    objectiveResults: [],
    remediationObjectiveIds: [],
    criticalErrorItemIds: [],
    invalidAnswerItemIds: [],
    unansweredChoiceItemIds: [],
    openResponseItemIds: [],
    retentionReviews: [
      {
        day: 30 as const,
        dueAt: "2026-09-09T01:00:00.000Z",
        status: "PENDENTE" as const,
      },
    ],
    practicalCompetenceClaim: "PROIBIDO_MVP" as const,
    scorePercent: 100,
  },
};

const runtimeState: CurriculumRuntimeState = state;

function fakeDatabase(selectResults: readonly unknown[][]) {
  const results = [...selectResults];
  const inserted: unknown[] = [];
  const createQuery = (result: readonly unknown[]) => {
    const query = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.limit.mockResolvedValue(result);
    return query;
  };
  const tx = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => createQuery(results.shift() ?? [])),
    insert: vi.fn(() => {
      const insertQuery = {
        values: vi.fn((value: unknown) => {
          inserted.push(value);
          return insertQuery;
        }),
        onConflictDoUpdate: vi.fn(),
      };
      insertQuery.onConflictDoUpdate.mockReturnValue(insertQuery);
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

describe("curriculum runtime persistence mapping", () => {
  it("maps the internal state to a row without public projection fields", () => {
    const row = curriculumRuntimeStateToRow(
      state,
      "33333333-3333-4333-8333-333333333333",
    );

    expect(row).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333",
      participantId: state.participantId,
      scopeId: state.scopeId,
      moduleId: "M03",
      version: 2,
    });
    expect(JSON.stringify(row)).not.toMatch(/source|gabarito|answer_key|pdf/iu);
  });

  it("maps a stored row back to an immutable application state", () => {
    const result = curriculumRuntimeRowToState({
      id: "33333333-3333-4333-8333-333333333333",
      participantId: state.participantId,
      scopeId: state.scopeId,
      moduleId: "M03",
      version: 2,
      state: state.evaluation,
      updatedAt: new Date(state.updatedAt),
    });

    expect(result).toEqual(state);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evaluation)).toBe(true);
  });

  it("rejects invalid runtime identity, module, version and timestamps", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    expect(() =>
      curriculumRuntimeStateToRow({ ...runtimeState, participantId: " " }, id),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow({ ...runtimeState, scopeId: " " }, id),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow({ ...runtimeState, version: 0 }, id),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow(
        { ...runtimeState, updatedAt: "invalid" },
        id,
      ),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow(
        {
          ...runtimeState,
          evaluation: { ...runtimeState.evaluation, moduleId: "M25" },
        },
        id,
      ),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeRowToState({
        id,
        participantId: state.participantId,
        scopeId: state.scopeId,
        moduleId: "M03",
        version: state.version,
        state: { ...state.evaluation, moduleId: "M04" },
        updatedAt: new Date(state.updatedAt),
      }),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeRowToState({
        id,
        participantId: state.participantId,
        scopeId: state.scopeId,
        moduleId: "M03",
        version: state.version,
        state: state.evaluation,
        updatedAt: new Date("invalid"),
      }),
    ).toThrow(CurriculumRuntimeMappingError);
  });

  it("reads and persists curriculum runtime inside participant and scope transactions", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const row = {
      id,
      participantId: state.participantId,
      scopeId: state.scopeId,
      moduleId: state.evaluation.moduleId,
      version: state.version,
      state: state.evaluation,
      updatedAt: new Date(state.updatedAt),
    };
    const readDatabase = fakeDatabase([[row]]);
    const repository = createCurriculumRuntimeRepository(
      readDatabase.db as never,
      () => id,
    );
    await expect(
      repository.findCurriculumRuntime(
        state.participantId,
        state.evaluation.moduleId,
      ),
    ).resolves.toEqual(runtimeState);
    expect(readDatabase.tx.execute).toHaveBeenCalledTimes(1);

    const missingDatabase = fakeDatabase([[]]);
    const missingRepository = createCurriculumRuntimeRepository(
      missingDatabase.db as never,
      () => id,
    );
    await expect(
      missingRepository.findCurriculumRuntime(
        state.participantId,
        state.evaluation.moduleId,
      ),
    ).resolves.toBeNull();

    const saveDatabase = fakeDatabase([[row]]);
    const saveRepository = createCurriculumRuntimeRepository(
      saveDatabase.db as never,
      () => id,
    );
    await expect(
      saveRepository.saveCurriculumRuntime({
        participantId: state.participantId,
        scopeId: state.scopeId,
        evaluation: state.evaluation,
      }),
    ).resolves.toEqual(runtimeState);
    expect(saveDatabase.inserted).toHaveLength(1);
    expect(saveDatabase.tx.execute).toHaveBeenCalledTimes(1);

    const failedSave = fakeDatabase([[]]);
    const failedRepository = createCurriculumRuntimeRepository(
      failedSave.db as never,
      () => id,
    );
    await expect(
      failedRepository.saveCurriculumRuntime({
        participantId: state.participantId,
        scopeId: state.scopeId,
        evaluation: state.evaluation,
      }),
    ).rejects.toThrow(CurriculumRuntimeMappingError);
  });
});
