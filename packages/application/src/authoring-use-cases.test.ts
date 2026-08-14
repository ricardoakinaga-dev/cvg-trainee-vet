import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "./content-use-cases.js";
import {
  publishAuthoringContent,
  reviewAuthoringContent,
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

function repository(
  value: AuthoringRecord = record,
  review:
    Parameters<AuthoringRepositoryPort["saveClinicalReview"]>[0] | null = null,
): AuthoringRepositoryPort {
  return {
    find: vi.fn(async () => value),
    savePreflight: vi.fn(async (_record, preflight) => ({
      ...value,
      preflight,
    })),
    findLatestClinicalReview: vi.fn(async () => review),
    saveClinicalReview: vi.fn(async () => undefined),
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

  it("publishes an authoring record only after clinical approval", async () => {
    const clinicalReview = {
      reviewId: "88888888-8888-4888-8888-888888888888",
      contentId,
      version: 1,
      contentEditorialRecordId: record.editorialRecordId,
      contentVersionId: record.contentVersionId,
      scopeId,
      reviewerId: "99999999-9999-4999-8999-999999999999",
      decision: "APROVAR_CLINICAMENTE" as const,
      rationale: "Revisado para publicação.",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      reviewedAt: "2026-08-11T10:00:00.000Z",
    };
    const repositoryPort = repository(
      {
        ...record,
        contentStatus: "APROVADO_CLINICAMENTE",
      },
      clinicalReview,
    );
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("AUTORIZADO_PARA_PUBLICACAO"))
      .mockResolvedValueOnce(workflow("PUBLICADO"));

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
    expect(transition).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: "AUTORIZAR_PUBLICACAO" }),
    );
    expect(transition).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: "PUBLICAR" }),
    );
  });

  it("records an independent clinical approval before the publication gate", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "PROJECAO_VERIFICADA",
    });
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("APROVADO_CLINICAMENTE"));

    const result = await reviewAuthoringContent(
      {
        principalId: "99999999-9999-4999-8999-999999999999",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        decision: "APROVAR_CLINICAMENTE",
        rationale: "Revisão sintética independente.",
        correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-1",
      },
    );

    expect(result.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
    expect(result.review.reviewerId).not.toBe(record.authorId);
    expect(repositoryPort.saveClinicalReview).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "APROVAR_CLINICAMENTE" }),
    );
  });

  it("rejects author self-approval", async () => {
    await expect(
      reviewAuthoringContent(
        {
          principalId: record.authorId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Autoaprovação proibida.",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        {
          repository: repository(),
          transition: vi.fn(),
          idFactory: () => "review-2",
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("records requested adjustments before a later clinical approval", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "PROJECAO_VERIFICADA",
    });
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("AJUSTES_SOLICITADOS"));

    const result = await reviewAuthoringContent(
      {
        principalId: "99999999-9999-4999-8999-999999999999",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        decision: "SOLICITAR_AJUSTES",
        rationale: "Ajustar a explicação sintética antes da aprovação.",
        correlationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-adjustments-1",
      },
    );

    expect(result.record.contentStatus).toBe("AJUSTES_SOLICITADOS");
    expect(result.review.decision).toBe("SOLICITAR_AJUSTES");
    expect(transition).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: "SOLICITAR_AJUSTES" }),
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
