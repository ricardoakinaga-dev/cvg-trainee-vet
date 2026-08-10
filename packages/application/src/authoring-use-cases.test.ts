import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "./content-use-cases.js";
import {
  publishAuthoringContent,
  runAuthoringPreflight,
  type AuthoringRecord,
  type AuthoringRepositoryPort,
} from "./authoring-use-cases.js";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";

const record: AuthoringRecord = {
  editorialRecordId: "77777777-7777-4777-8777-777777777777",
  contentId,
  version: 1,
  contentVersionId: "55555555-5555-4555-8555-555555555555",
  scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId,
  title: "Prioridade sintética",
  prompt: "Em um caso fictício, qual é a próxima ação segura?",
  responseMode: "CHOICE",
  choices: [
    { id: "a", label: "A", text: "Priorizar e reavaliar." },
    { id: "b", label: "B", text: "Aguardar sem meta." },
  ],
  correctChoiceIds: ["a"],
  feedback: "Defina meta e reavalie.",
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
    id: contentId,
    ordinal: 1,
    kind: "QUESTAO",
    title: "Prioridade sintética",
    prompt: "Em um caso fictício, qual é a próxima ação segura?",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar e reavaliar." },
      { id: "b", label: "B", text: "Aguardar sem meta." },
    ],
    selectionMode: "SINGLE",
  },
  contentStatus: "AUTOVERIFICADO",
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: "2026-08-10T05:00:00.000Z",
  },
};

function repository(value: AuthoringRecord = record): AuthoringRepositoryPort {
  return {
    find: vi.fn(async () => value),
    savePreflight: vi.fn(async (_record, preflight) => ({
      ...value,
      preflight,
    })),
  };
}

function workflow(status: ContentRecord["status"]): ContentRecord {
  return { contentId, version: 1, scopeId, status };
}

describe("authoring and clinical review use cases", () => {
  it("runs deterministic source preflight and enables publication", () => {
    const result = runAuthoringPreflight(record);

    expect(result.technicalChecksPassed).toBe(true);
    expect(result.readyForPublication).toBe(true);
    expect(result.sourceVerification).toBe("VERIFICADO_AUTOMATICAMENTE");
    expect(result.checks.publicationBlocked).toBe(false);
  });

  it("publishes an authoring record after automatic source preflight", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "AUTOVERIFICADO",
    });
    const transition = vi.fn(async () => workflow("PUBLICADO"));

    const result = await publishAuthoringContent(
      {
        principalId: authorId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        correlationId: "66666666-6666-4666-8666-666666666666",
      },
      { repository: repositoryPort, transition },
    );

    expect(result.record.contentStatus).toBe("PUBLICADO");
    expect(result.record.preflight.sourceVerification).toBe(
      "VERIFICADO_AUTOMATICAMENTE",
    );
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({ event: "PUBLICAR_AUTOMATICAMENTE" }),
    );
  });

  it("covers text and non-response correction policies", () => {
    const choiceFreeRecord = Object.fromEntries(
      Object.entries(record).filter(
        ([key]) => key !== "choices" && key !== "correctChoiceIds",
      ),
    ) as Omit<AuthoringRecord, "choices" | "correctChoiceIds">;
    const textRecord: AuthoringRecord = {
      ...choiceFreeRecord,
      responseMode: "TEXT",
      rubric: {
        dimensions: [
          {
            id: "clinical-priority",
            label: "Prioridade clínica",
            description: "Define a prioridade e a reavaliação.",
            maxPoints: 2,
          },
        ],
        passScore: 1,
        criticalErrors: ["Omitir reavaliação"],
      },
      participant: {
        id: record.participant.id,
        ordinal: record.participant.ordinal,
        kind: record.participant.kind,
        title: record.participant.title,
        prompt: record.participant.prompt,
        responseMode: "TEXT",
      },
    };

    expect(runAuthoringPreflight(textRecord).checks.correctionMetadata).toBe(
      true,
    );
    const textWithoutRubric = Object.fromEntries(
      Object.entries(textRecord).filter(([key]) => key !== "rubric"),
    ) as Omit<AuthoringRecord, "rubric">;
    expect(
      runAuthoringPreflight(textWithoutRubric).checks.correctionMetadata,
    ).toBe(false);
    expect(
      runAuthoringPreflight({
        ...textRecord,
        rubric: { ...textRecord.rubric!, dimensions: [] },
      }).checks.correctionMetadata,
    ).toBe(false);
    expect(
      runAuthoringPreflight({
        ...textRecord,
        rubric: { ...textRecord.rubric!, passScore: 0 },
      }).checks.correctionMetadata,
    ).toBe(false);
    expect(
      runAuthoringPreflight({
        ...textRecord,
        rubric: { ...textRecord.rubric!, criticalErrors: [] },
      }).checks.correctionMetadata,
    ).toBe(false);
    expect(
      runAuthoringPreflight({ ...record, responseMode: "NONE" }).checks
        .correctionMetadata,
    ).toBe(true);
  });
});
