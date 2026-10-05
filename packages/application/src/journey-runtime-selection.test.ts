import { describe, expect, it } from "vitest";
import { deriveParticipantDashboard } from "./dashboard-use-cases.js";
import {
  deriveJourneyNextAction,
  type ParticipantLearningJourneyState,
} from "./journey-use-cases.js";
import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
function runtime(version = 1, remediation = false): CurriculumRuntimeState {
  return {
    participantId,
    scopeId,
    version,
    updatedAt: "2026-09-02T00:00:00.000Z",
    evaluation: {
      moduleId: "M01",
      status: remediation ? "EM_REMEDIACAO" : "DOMINIO_DIGITAL",
      nextAction: remediation ? "EXECUTAR_REMEDIACAO" : "REVISAR_RETENCAO",
      objectiveResults: [],
      remediationObjectiveIds: remediation ? ["synthetic-objective"] : [],
      criticalErrorItemIds: [],
      invalidAnswerItemIds: [],
      unansweredChoiceItemIds: [],
      openResponseItemIds: [],
      retentionReviews: [],
      practicalCompetenceClaim: "PROIBIDO_MVP",
      scorePercent: remediation ? 40 : 100,
    },
  };
}
function journey(
  runtimes: readonly CurriculumRuntimeState[],
): ParticipantLearningJourneyState {
  return {
    participantId,
    assignments: [
      {
        scopeId,
        state: {
          assignmentId: "33333333-3333-4333-8333-333333333333",
          participantId,
          moduleId: "M01",
          status: "CONCLUIDO",
          version: 1,
          availableAt: "2026-09-01T00:00:00.000Z",
        },
      },
    ],
    activities: [],
    results: [],
    runtimes,
    completionReceipts: [
      {
        participantId,
        scopeId,
        moduleId: "M01",
        assignmentId: "33333333-3333-4333-8333-333333333333",
        completedAt: "2026-09-02T00:00:00.000Z",
        completedAssignmentVersion: 1,
      },
    ],
  };
}
describe("one current runtime per scope/module across all consumers", () => {
  it.each([false, true])(
    "ignores old remediation in path/count/profile/action; reversed=%s",
    (reverse) => {
      const old = runtime(1, true),
        current = runtime(2);
      const value = journey(reverse ? [current, old] : [old, current]);
      const dashboard = deriveParticipantDashboard(value);
      expect(dashboard.path[0]?.status).toBe("CONCLUIDO");
      expect(dashboard.progress.remediationObjectives).toBe(0);
      expect(dashboard.profile[0]?.status).toBe("DOMINIO_DIGITAL");
      expect(deriveJourneyNextAction(value)).toBe("REVISAR_RETENCAO");
    },
  );
  it.each([false, true])(
    "version beats a newer timestamp; reversed=%s",
    (reverse) => {
      const old = { ...runtime(), updatedAt: "2026-09-03T00:00:00.000Z" },
        current = runtime(2, true);
      const value = journey(reverse ? [current, old] : [old, current]);
      const dashboard = deriveParticipantDashboard(value);
      expect(dashboard.profile[0]?.status).toBe("EM_REMEDIACAO");
      expect(dashboard.path[0]?.status).toBe("EM_REMEDIACAO");
      expect(dashboard.progress.remediationObjectives).toBe(1);
      expect(dashboard.nextAction).toBe("EXECUTAR_REMEDIACAO");
    },
  );
  it("uses timestamp only within the same version", () => {
    const old = { ...runtime(2, true), updatedAt: "2026-09-01T00:00:00.000Z" };
    expect(
      deriveParticipantDashboard(journey([runtime(2), old])).progress
        .remediationObjectives,
    ).toBe(0);
  });
  it.each([false, true])(
    "ignores conflicting stale revisions below the current version; reversed=%s",
    (reverse) => {
      const values = [runtime(1), runtime(1, true), runtime(2)];
      const value = journey(reverse ? values.reverse() : values);
      expect(
        deriveParticipantDashboard(value).progress.remediationObjectives,
      ).toBe(0);
      expect(deriveJourneyNextAction(value)).toBe("REVISAR_RETENCAO");
    },
  );
  it("does not count duplicated or superseded retention evidence", () => {
    const old = runtime(1);
    const stale = {
      ...old,
      evaluation: {
        ...old.evaluation,
        retentionReviews: [
          {
            day: 30 as const,
            dueAt: "2026-10-01T00:00:00.000Z",
            status: "PENDENTE" as const,
          },
        ],
      },
    };
    const value = journey([stale, structuredClone(stale), runtime(2)]);
    expect(
      deriveParticipantDashboard(value).progress.retentionReviewsPending,
    ).toBe(0);
    const duplicateCurrent = journey([stale, structuredClone(stale)]);
    expect(
      deriveParticipantDashboard(duplicateCurrent).progress
        .retentionReviewsPending,
    ).toBe(1);
  });
  it("deduplicates identical revisions without mutating the input", () => {
    const current = runtime(2, true);
    const value = journey(Object.freeze([current, structuredClone(current)]));
    expect(
      deriveParticipantDashboard(value).progress.remediationObjectives,
    ).toBe(1);
    expect(value.runtimes).toHaveLength(2);
  });
  it.each([false, true])(
    "fails closed on conflicting equal version/time; reversed=%s",
    (reverse) => {
      const values = [runtime(2), runtime(2, true)];
      const value = journey(reverse ? values.reverse() : values);
      expect(() => deriveParticipantDashboard(value)).toThrow(
        expect.objectContaining({ code: "state_conflict" }),
      );
      expect(() => deriveJourneyNextAction(value)).toThrow(
        expect.objectContaining({ code: "state_conflict" }),
      );
    },
  );
  it.each([false, true])(
    "keeps scopes independent and profile conservative; reversed=%s",
    (reverse) => {
      const mastered = { ...runtime(9), scopeId: "another-synthetic-scope" },
        pending = runtime(1, true);
      const value = journey(
        reverse ? [mastered, pending] : [pending, mastered],
      );
      const dashboard = deriveParticipantDashboard(value);
      expect(dashboard.profile[0]?.status).toBe("EM_REMEDIACAO");
      expect(dashboard.path[0]?.status).toBe("EM_REMEDIACAO");
      expect(dashboard.progress.remediationObjectives).toBe(1);
      expect(dashboard.nextAction).toBe("EXECUTAR_REMEDIACAO");
    },
  );
  it.each([
    { version: 0 },
    { updatedAt: "invalid" },
    { participantId: "foreign" },
  ])("rejects invalid authority/order metadata %j", (patch) => {
    expect(() =>
      deriveParticipantDashboard(journey([{ ...runtime(), ...patch }])),
    ).toThrow();
  });
  it("derives dashboard action rather than trusting an optional stale action", () => {
    expect(
      deriveParticipantDashboard({
        ...journey([runtime(2, true)]),
        nextAction: "REVISAR_RETENCAO",
      }).nextAction,
    ).toBe("EXECUTAR_REMEDIACAO");
  });
});
