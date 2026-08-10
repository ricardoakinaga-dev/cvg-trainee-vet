import { describe, expect, it } from "vitest";

import {
  authoringPublicationRequestSchema,
  parseInternalAuthoringRecordProjection,
} from "./authoring.js";

describe("internal authoring contracts", () => {
  it("accepts automatic publication and an internal authoring projection", () => {
    expect(
      authoringPublicationRequestSchema.parse({
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      version: 1,
      scopeId: "11111111-1111-4111-8111-111111111111",
    });

    expect(
      parseInternalAuthoringRecordProjection({
        contentId: "22222222-2222-4222-8222-222222222222",
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        sessionId: "M02-S1",
        objectiveId: "M02-OBJ-01",
        authorId: "33333333-3333-4333-8333-333333333333",
        contentStatus: "AUTOVERIFICADO",
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
            {
              code: "BOOK_ETTINGER_9E",
              locator: "capítulo 123, seção de ressuscitação",
              updateRequired: false,
            },
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
          readyForPublication: true,
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
      authoringPublicationRequestSchema.parse({
        version: 1,
        scopeId: "11111111-1111-4111-8111-111111111111",
        correctChoiceIds: ["a"],
      }),
    ).toThrow();
  });
});
