import { describe, expect, it } from "vitest";

import {
  isClinicalReviewQueuePage,
  isInternalAuthoringRecord,
} from "../app/authoring-model.js";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";

const record = {
  contentId,
  version: 1,
  scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId,
  contentStatus: "AUTOVERIFICADO",
  item: {
    title: "Prioridade sintética",
    prompt: "Escolha a próxima ação segura.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar e reavaliar." },
      { id: "b", label: "B", text: "Aguardar sem meta." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Defina uma meta.",
    critical: true,
    remediationTargetObjectiveId: "M02-OBJ-01",
    sourceRefs: [
      {
        code: "BOOK_ETTINGER_9E",
        locator: "capítulo 123",
        updateRequired: false,
      },
    ],
    participant: {
      id: contentId,
      ordinal: 1,
      kind: "QUESTAO",
      title: "Prioridade sintética",
      prompt: "Escolha a próxima ação segura.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Priorizar e reavaliar." },
        { id: "b", label: "B", text: "Aguardar sem meta." },
      ],
      selectionMode: "SINGLE",
    },
  },
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    readyForPublication: true,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: false,
    },
    checkedAt: "2026-08-16T12:00:00.000Z",
  },
} as const;

const queue = {
  items: [
    {
      contentId,
      version: 1,
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      authorId,
      contentStatus: "PROJECAO_VERIFICADA",
      reviewStatus: "PENDING",
      technicalChecksPassed: true,
      latestReview: null,
    },
  ],
  page: 1,
  perPage: 20,
  total: 1,
} as const;

describe("authoring web contracts", () => {
  it("rejects unbounded record status and incomplete preflight", () => {
    expect(isInternalAuthoringRecord(record)).toBe(true);
    expect(
      isInternalAuthoringRecord({
        ...record,
        contentStatus: "UNKNOWN",
      }),
    ).toBe(false);
    expect(
      isInternalAuthoringRecord({
        ...record,
        preflight: { technicalChecksPassed: true },
      }),
    ).toBe(false);
  });

  it("bounds queue pagination and review status", () => {
    expect(isClinicalReviewQueuePage(queue)).toBe(true);
    expect(
      isClinicalReviewQueuePage({
        ...queue,
        items: [{ ...queue.items[0], reviewStatus: "UNKNOWN" }],
      }),
    ).toBe(false);
    expect(isClinicalReviewQueuePage({ ...queue, page: 0 })).toBe(false);
  });
});
