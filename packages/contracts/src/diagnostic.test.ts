import { describe, expect, it } from "vitest";

import {
  diagnosticEvaluationRequestSchema,
  diagnosticResultProjectionSchema,
  participantDiagnosticProfileItemSchema,
  parseParticipantDiagnosticProfile,
} from "./diagnostic.js";

const profileItem = {
  themeId: "B07-S1",
  themeLabel: "Núcleo clínico e segurança",
  status: "BASELINE_REGISTRADA",
  scorePercent: 75,
  answeredItemCount: 30,
  itemCount: 40,
  recommendedModuleIds: ["M01", "M11"],
  lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
  notPunitive: true,
  noGlobalPassFail: true,
  practicalCompetenceClaim: "PROIBIDO_MVP",
} as const;

describe("diagnostic contracts", () => {
  it("accepts only bounded choice answers for the internal technical evaluation", () => {
    expect(
      diagnosticEvaluationRequestSchema.parse({
        participantId: "11111111-1111-4111-8111-111111111111",
        scopeId: "22222222-2222-4222-8222-222222222222",
        completedAt: "2026-08-23T12:00:00.000Z",
        answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
      }),
    ).toMatchObject({ answers: [{ itemId: "B07-S1-I001" }] });

    expect(() =>
      diagnosticEvaluationRequestSchema.parse({
        participantId: "11111111-1111-4111-8111-111111111111",
        scopeId: "22222222-2222-4222-8222-222222222222",
        completedAt: "2026-08-23T12:00:00.000Z",
        answers: [
          {
            itemId: "B07-S1-I001",
            selectedChoiceIds: ["a"],
            text: "não publicar",
          },
        ],
      }),
    ).toThrow();
  });

  it("parses a public theme profile without internal authoring fields", () => {
    expect(parseParticipantDiagnosticProfile(profileItem)).toEqual(profileItem);
    expect(() =>
      participantDiagnosticProfileItemSchema.parse({
        ...profileItem,
        answer_key: ["a"],
      }),
    ).toThrow();
  });

  it("keeps the internal response bounded to safe aggregates", () => {
    expect(
      diagnosticResultProjectionSchema.parse({
        resultId: "33333333-3333-4333-8333-333333333333",
        diagnosticId: "B07-DIAGNOSTIC-V1",
        version: "0.1.0",
        completedAt: "2026-08-23T12:00:00.000Z",
        themes: [
          profileItem,
          { ...profileItem, themeId: "B07-S2" },
          { ...profileItem, themeId: "B07-S3" },
        ],
      }),
    ).toMatchObject({
      themes: [profileItem, expect.anything(), expect.anything()],
    });
  });
});
