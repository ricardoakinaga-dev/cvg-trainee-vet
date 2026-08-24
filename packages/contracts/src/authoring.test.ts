import { describe, expect, it } from "vitest";

import {
  authoringDraftCreateRequestSchema,
  authoringReviewRequestSchema,
  parseInternalAuthoringRecordProjection,
} from "./authoring.js";

describe("internal authoring contracts", () => {
  it("accepts a bounded authoring draft without client-owned identity or state", () => {
    expect(
      authoringDraftCreateRequestSchema.parse({
        idempotencyKey: "authoring-draft-2026-08-24-01",
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        sessionId: "M02-S1",
        objectiveId: "M02-OBJ-01",
        ordinal: 1,
        title: "Item sintético",
        prompt: "Escolha a próxima ação segura em um caso fictício.",
        responseMode: "CHOICE",
        choices: [
          { id: "a", label: "A", text: "Priorizar e reavaliar." },
          { id: "b", label: "B", text: "Aguardar sem meta." },
        ],
        correctChoiceIds: ["a"],
        feedback: "Defina uma meta e reavalie.",
        critical: true,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          {
            code: "F-02",
            locator: "localizador interno",
            updateRequired: true,
          },
        ],
      }),
    ).toMatchObject({ moduleId: "M02", responseMode: "CHOICE" });
  });

  it("rejects client-owned identity, publication state, preflight, and public projection", () => {
    expect(() =>
      authoringDraftCreateRequestSchema.parse({
        idempotencyKey: "authoring-draft-2026-08-24-02",
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        sessionId: "M02-S1",
        objectiveId: "M02-OBJ-01",
        ordinal: 1,
        title: "Item sintético",
        prompt: "Prompt fictício.",
        responseMode: "CHOICE",
        feedback: "Feedback.",
        critical: false,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          { code: "F-02", locator: "interno", updateRequired: true },
        ],
        authorId: "33333333-3333-4333-8333-333333333333",
        contentId: "22222222-2222-4222-8222-222222222222",
        version: 1,
        status: "PUBLICADO",
        preflight: {},
        participant: {},
      }),
    ).toThrow();
  });

  it("rejects unsupported sources, curriculum-shaped identifiers, and inconsistent choices", () => {
    const base = {
      idempotencyKey: "authoring-draft-2026-08-24-03",
      scopeId: "11111111-1111-4111-8111-111111111111",
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      ordinal: 1,
      title: "Item sintético",
      prompt: "Prompt fictício.",
      responseMode: "CHOICE" as const,
      choices: [
        { id: "a", label: "A", text: "Uma ação." },
        { id: "b", label: "B", text: "Outra ação." },
      ],
      correctChoiceIds: ["unknown"],
      feedback: "Feedback.",
      critical: false,
      remediationTargetObjectiveId: "M02-OBJ-01",
      sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
    };
    expect(() =>
      authoringDraftCreateRequestSchema.parse({
        ...base,
        sourceRefs: [
          {
            code: "UNTRUSTED-SOURCE",
            locator: "interno",
            updateRequired: true,
          },
        ],
      }),
    ).toThrow();
    expect(() => authoringDraftCreateRequestSchema.parse(base)).toThrow();
    expect(() =>
      authoringDraftCreateRequestSchema.parse({ ...base, moduleId: "M99" }),
    ).toThrow();
  });

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
        availableActions: {
          requestAdjustments: false,
          approveClinically: true,
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
