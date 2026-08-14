import { describe, expect, it } from "vitest";

import {
  DigitalCaseRuntimeMappingError,
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
});
