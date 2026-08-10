import { describe, expect, it } from "vitest";

import { authoringRowToRecord } from "./authoring-repository.js";

const row = {
  editorialRecordId: "11111111-1111-4111-8111-111111111111",
  contentVersionId: "22222222-2222-4222-8222-222222222222",
  contentId: "33333333-3333-4333-8333-333333333333",
  scopeId: "44444444-4444-4444-8444-444444444444",
  version: 1,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId: "55555555-5555-4555-8555-555555555555",
  contentStatus: "AUTOVERIFICADO",
  item: {
    title: "Item sintético",
    prompt: "Escolha a prioridade segura.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar." },
      { id: "b", label: "B", text: "Aguardar." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Reavalie.",
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
      id: "33333333-3333-4333-8333-333333333333",
      ordinal: 1,
      kind: "QUESTAO",
      title: "Item sintético",
      prompt: "Escolha a prioridade segura.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Priorizar." },
        { id: "b", label: "B", text: "Aguardar." },
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
} as const;

describe("authoring persistence mapping", () => {
  it("maps internal correction metadata and keeps it separate from participant fields", () => {
    const record = authoringRowToRecord(row);

    expect(record).toMatchObject({
      contentId: row.contentId,
      contentStatus: "AUTOVERIFICADO",
      correctChoiceIds: ["a"],
      preflight: { technicalChecksPassed: true },
    });
    expect(record.participant).not.toHaveProperty("correctChoiceIds");
    expect(record.participant).not.toHaveProperty("sourceRefs");
  });

  it("rejects malformed internal source and preflight data", () => {
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          sourceRefs: [],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, ruleVersion: "unknown" },
      }),
    ).toThrow();
  });
});
