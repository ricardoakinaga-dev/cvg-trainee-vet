import { describe, expect, it } from "vitest";

import {
  deriveParticipantDiagnosticProfile,
  evaluateAndPersistDiagnosticDraft,
  type DiagnosticResultState,
  type DiagnosticResultWritePort,
} from "./diagnostic-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

const result: DiagnosticResultState = {
  resultId: "33333333-3333-4333-8333-333333333333",
  participantId,
  scopeId,
  diagnosticId: "B07-DIAGNOSTIC-V1",
  version: "0.1.0",
  completedAt: "2026-08-23T12:00:00.000Z",
  result: {
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    notPunitive: true,
    noGlobalPassFail: true,
    totalItemCount: 120,
    answeredItemCount: 1,
    themeResults: [
      {
        themeId: "B07-S1",
        itemCount: 40,
        answeredItemCount: 1,
        earnedPoints: 1,
        possiblePoints: 1,
        percent: 100,
        recommendedModuleIds: ["M01"],
      },
      {
        themeId: "B07-S2",
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M02"],
      },
      {
        themeId: "B07-S3",
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M11"],
      },
    ],
    recommendedModuleIds: ["M01", "M02", "M11"],
    remediationObjectiveIds: ["M01-OBJ-01"],
  },
};

describe("diagnostic application use cases", () => {
  it("derives three theme cards and never exposes remediation objective ids", () => {
    const profile = deriveParticipantDiagnosticProfile([result]);

    expect(profile).toHaveLength(3);
    expect(profile[0]).toMatchObject({
      themeId: "B07-S1",
      status: "BASELINE_REGISTRADA",
      scorePercent: 100,
      recommendedModuleIds: ["M01"],
      evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
    expect(JSON.stringify(profile)).not.toContain("M01-OBJ-01");
    expect(JSON.stringify(profile)).not.toContain("answer_key");
  });

  it("returns no-evidence cards before a baseline exists", () => {
    expect(deriveParticipantDiagnosticProfile([])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          themeId: "B07-S1",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
        }),
      ]),
    );
  });

  it("evaluates the draft deterministically and persists only the aggregate result", async () => {
    let saved: DiagnosticResultState | null = null;
    const repository: DiagnosticResultWritePort = {
      saveDiagnosticResult: async (input) => {
        saved = {
          ...result,
          resultId: "44444444-4444-4444-8444-444444444444",
          participantId: input.participantId,
          scopeId: input.scopeId,
          completedAt: input.completedAt,
          result: input.result,
        };
        return saved;
      },
    };

    const persisted = await evaluateAndPersistDiagnosticDraft(
      {
        participantId,
        scopeId,
        answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
        completedAt: "2026-08-23T12:00:00.000Z",
      },
      repository,
    );

    expect(persisted.result.diagnosticId).toBe("B07-DIAGNOSTIC-V1");
    expect(persisted.result.noGlobalPassFail).toBe(true);
    expect(
      (saved as unknown as DiagnosticResultState).result.remediationObjectiveIds
        .length,
    ).toBeGreaterThan(0);
  });
});
