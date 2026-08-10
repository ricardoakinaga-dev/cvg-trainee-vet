import { describe, expect, it } from "vitest";

import {
  authoringReviewRequestSchema,
  parseInternalAuthoringRecordProjection,
} from "./authoring.js";

describe("internal authoring contracts", () => {
  it("accepts a scoped review request and an internal authoring projection", () => {
    expect(
      authoringReviewRequestSchema.parse({
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "Revisão sintética concluída.",
      }),
    ).toMatchObject({ decision: "APROVAR_CLINICAMENTE" });

    expect(
      parseInternalAuthoringRecordProjection({
        contentId: "22222222-2222-4222-8222-222222222222",
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        sessionId: "M02-S1",
        objectiveId: "M02-OBJ-01",
        authorId: "33333333-3333-4333-8333-333333333333",
        contentStatus: "EM_REVISAO_CLINICA",
        item: {
          title: "Item",
          prompt: "Prompt fictício",
          responseMode: "CHOICE",
          choices: [
            { id: "a", label: "A", text: "Uma ação." },
            { id: "b", label: "B", text: "Outra ação." },
          ],
          correctChoiceIds: ["a"],
          feedback: "Feedback.",
          critical: true,
          remediationTargetObjectiveId: "M02-OBJ-01",
          sourceRefs: [
            { code: "F-02", locator: "interno", updateRequired: true },
          ],
          participant: {
            id: "22222222-2222-4222-8222-222222222222",
            ordinal: 1,
            kind: "QUESTAO",
            title: "Item",
            prompt: "Prompt fictício",
            responseMode: "CHOICE",
            choices: [
              { id: "a", label: "A", text: "Uma ação." },
              { id: "b", label: "B", text: "Outra ação." },
            ],
            selectionMode: "SINGLE",
          },
        },
        preflight: {
          ruleVersion: "authoring-preflight-v1",
          technicalChecksPassed: true,
          readyForClinicalReview: true,
          readyForPublication: false,
          checks: {
            requiredFields: true,
            correctionMetadata: true,
            publicBoundary: true,
            sourceTraceability: true,
            publicationBlocked: true,
          },
          checkedAt: "2026-08-10T05:00:00.000Z",
        },
      }),
    ).toMatchObject({ moduleId: "M02" });
  });

  it("rejects participant-shaped payloads at the internal authoring boundary", () => {
    expect(() =>
      authoringReviewRequestSchema.parse({
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "ok",
        correctChoiceIds: ["a"],
      }),
    ).toThrow();
  });
});
