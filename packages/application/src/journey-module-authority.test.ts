import { describe, expect, it } from "vitest";
import {
  hasCoherentModuleCompletion,
  type ModuleCompletionReceiptFact,
} from "./journey-module-authority.js";
import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";

const participantId = "synthetic-participant",
  scopeId = "synthetic-scope";
const receipt: ModuleCompletionReceiptFact = {
  participantId,
  scopeId,
  moduleId: "M02",
  assignmentId: "synthetic-assignment",
  completedAt: "2026-09-30T12:00:00.000Z",
  completedAssignmentVersion: 1,
};
function completed(): ParticipantLearningJourneyState {
  return {
    participantId,
    assignments: [
      {
        scopeId,
        state: {
          participantId,
          assignmentId: "synthetic-assignment",
          moduleId: "M02",
          status: "CONCLUIDO",
          version: 1,
          availableAt: "2026-09-01T00:00:00.000Z",
        },
      },
    ],
    activities: [
      {
        scopeId,
        activityId: "synthetic-activity",
        moduleId: "M02",
        learningAssignmentId: "synthetic-assignment",
        slug: "synthetic",
        title: "Synthetic",
        status: "CONCLUIDO",
        nextAction: "CONSULTAR_PROXIMO_PASSO",
        attemptStatus: "CORRIGIDA_HUMANAMENTE",
      },
    ],
    runtimes: [],
    results: [],
    completionReceipts: [receipt],
  };
}
describe("module completion authority", () => {
  it("requires all mandatory activities to be coherently completed", () => {
    expect(hasCoherentModuleCompletion(completed(), scopeId, "M02")).toBe(true);
    const value = completed();
    const pending: ParticipantLearningJourneyState = {
      ...value,
      activities: [
        ...value.activities,
        {
          ...value.activities[0]!,
          activityId: "pending",
          status: "EM_ANDAMENTO",
          attemptStatus: "SALVA",
          nextAction: "RETOMAR_ATIVIDADE",
        },
      ],
    };
    expect(hasCoherentModuleCompletion(pending, scopeId, "M02")).toBe(true);
    expect(
      hasCoherentModuleCompletion(
        { ...pending, completionReceipts: [] },
        scopeId,
        "M02",
      ),
    ).toBe(false);
  });
  it.each([
    "foreign-participant",
    "foreign-scope",
    "foreign-assignment",
    "pending-human",
  ])("rejects %s completion evidence", (mismatch) => {
    const value = completed();
    const altered = {
      ...value,
      completionReceipts:
        mismatch === "pending-human"
          ? []
          : (value.completionReceipts ?? []).map((item) =>
              mismatch === "foreign-assignment"
                ? { ...item, assignmentId: "foreign" }
                : item,
            ),
      assignments: value.assignments.map((item) => ({
        ...item,
        state: {
          ...item.state,
          participantId:
            mismatch === "foreign-participant" ? "foreign" : participantId,
        },
      })),
      activities: value.activities.map((item) => ({
        ...item,
        scopeId: mismatch === "foreign-scope" ? "foreign" : scopeId,
        learningAssignmentId:
          mismatch === "foreign-assignment"
            ? "foreign"
            : item.learningAssignmentId!,
        attemptStatus:
          mismatch === "pending-human"
            ? ("AGUARDA_CORRECAO_HUMANA" as const)
            : item.attemptStatus!,
      })),
    };
    // An activity from another scope cannot prove completion in that other scope.
    expect(
      hasCoherentModuleCompletion(
        altered,
        mismatch === "foreign-scope" ? "foreign" : scopeId,
        "M02",
      ),
    ).toBe(false);
  });
});
