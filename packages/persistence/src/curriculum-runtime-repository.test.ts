import { describe, expect, it } from "vitest";

import {
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
