import { describe, expect, it } from "vitest";

import {
  CurriculumRuntimeMappingError,
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
        day: 7 as const,
        dueAt: "2026-08-17T01:00:00.000Z",
        status: "PENDENTE" as const,
      },
    ],
    practicalCompetenceClaim: "PROIBIDO_MVP" as const,
    scorePercent: 100,
  },
};

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
});

import { createFakeDatabase } from "./test-support/fake-database.js";
import { createCurriculumRuntimeRepository } from "./curriculum-runtime-repository.js";

describe("curriculum runtime mapping validation", () => {
  const row = {
    id: "33333333-3333-4333-8333-333333333333",
    participantId: state.participantId,
    scopeId: state.scopeId,
    moduleId: "M03",
    version: 2,
    state: state.evaluation,
    updatedAt: new Date(state.updatedAt),
  };

  it("rejects rows with empty fields, invalid module ids or versions", () => {
    expect(() => curriculumRuntimeRowToState({ ...row, id: "" })).toThrow(
      CurriculumRuntimeMappingError,
    );
    expect(() =>
      curriculumRuntimeRowToState({ ...row, participantId: " " }),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() => curriculumRuntimeRowToState({ ...row, scopeId: " " })).toThrow(
      CurriculumRuntimeMappingError,
    );
    expect(() =>
      curriculumRuntimeRowToState({ ...row, moduleId: "M99" }),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() => curriculumRuntimeRowToState({ ...row, version: 0 })).toThrow(
      CurriculumRuntimeMappingError,
    );
    expect(() =>
      curriculumRuntimeRowToState({
        ...row,
        state: { ...state.evaluation, moduleId: "M04" },
      }),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeRowToState({
        ...row,
        updatedAt: new Date("invalid"),
      }),
    ).toThrow(CurriculumRuntimeMappingError);
  });

  it("rejects write inputs with invalid fields or timestamps", () => {
    expect(() => curriculumRuntimeStateToRow(state, "")).toThrow(
      CurriculumRuntimeMappingError,
    );
    expect(() =>
      curriculumRuntimeStateToRow({ ...state, participantId: "" }, "id"),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow({ ...state, scopeId: "" }, "id"),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow({ ...state, version: 0 }, "id"),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow({ ...state, updatedAt: "bad" }, "id"),
    ).toThrow(CurriculumRuntimeMappingError);
    expect(() =>
      curriculumRuntimeStateToRow(
        {
          ...state,
          evaluation: { ...state.evaluation, moduleId: "M30" },
        },
        "id",
      ),
    ).toThrow(CurriculumRuntimeMappingError);
  });
});

describe("curriculum runtime repository", () => {
  const row = {
    id: "33333333-3333-4333-8333-333333333333",
    participantId: state.participantId,
    scopeId: state.scopeId,
    moduleId: "M03",
    version: 1,
    state: state.evaluation,
    updatedAt: new Date(state.updatedAt),
  };

  function repository(db: ReturnType<typeof createFakeDatabase>) {
    return createCurriculumRuntimeRepository(
      db as unknown as Parameters<typeof createCurriculumRuntimeRepository>[0],
      () => "fixed-id",
    );
  }

  it("finds a runtime state for a participant", async () => {
    const db = createFakeDatabase({ rows: [[], [row]] });
    const found = await repository(db).findCurriculumRuntime(
      state.participantId,
      "M03",
    );
    expect(found).toMatchObject({ version: 1 });
    const empty = createFakeDatabase({ rows: [[], []] });
    expect(
      await repository(empty).findCurriculumRuntime(state.participantId, "M03"),
    ).toBeNull();
  });

  it("saves a runtime state and reads it back", async () => {
    const db = createFakeDatabase({ rows: [[], [], [row]] });
    const saved = await repository(db).saveCurriculumRuntime({
      participantId: state.participantId,
      scopeId: state.scopeId,
      evaluation: state.evaluation,
    });
    expect(saved).toMatchObject({ version: 1 });
  });

  it("fails when the saved runtime state cannot be read back", async () => {
    const db = createFakeDatabase({ rows: [[], [], []] });
    await expect(
      repository(db).saveCurriculumRuntime({
        participantId: state.participantId,
        scopeId: state.scopeId,
        evaluation: state.evaluation,
      }),
    ).rejects.toThrow("not found");
  });
});
