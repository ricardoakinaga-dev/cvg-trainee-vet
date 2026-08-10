import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "./content-use-cases.js";
import {
  reviewAuthoringContent,
  runAuthoringPreflight,
  type AuthoringRecord,
  type AuthoringRepositoryPort,
  type AuthoringReview,
} from "./authoring-use-cases.js";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";
const reviewerId = "44444444-4444-4444-8444-444444444444";

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
    { code: "F-02", locator: "localizador interno", updateRequired: true },
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
  contentStatus: "EM_REVISAO_CLINICA",
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
): AuthoringRepositoryPort & {
  readonly savedReview: AuthoringReview | undefined;
} {
  let savedReview: AuthoringReview | undefined;
  return {
    find: vi.fn(async () => value),
    savePreflight: vi.fn(async (_record, preflight) => ({
      ...value,
      preflight,
    })),
    saveReview: vi.fn(async (_record, review) => {
      savedReview = review;
      return { ...value, latestReview: review };
    }),
    get savedReview() {
      return savedReview;
    },
  };
}

function workflow(status: ContentRecord["status"]): ContentRecord {
  return { contentId, version: 1, scopeId, status };
}

describe("authoring and clinical review use cases", () => {
  it("runs a deterministic preflight and keeps publication blocked", () => {
    const result = runAuthoringPreflight(record);

    expect(result.technicalChecksPassed).toBe(true);
    expect(result.readyForClinicalReview).toBe(true);
    expect(result.readyForPublication).toBe(false);
    expect(result.checks.publicationBlocked).toBe(true);
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

  it("requires an independent clinical approver and advances only after review", async () => {
    const repositoryPort = repository();
    const transition = vi.fn(async () => workflow("APROVADO_CLINICAMENTE"));

    const result = await reviewAuthoringContent(
      {
        principalId: reviewerId,
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        decision: "APROVAR_CLINICAMENTE",
        rationale: "Revisão clínica sintética concluída.",
        correlationId: "66666666-6666-4666-8666-666666666666",
      },
      { repository: repositoryPort, transition },
    );

    expect(result.review.decision).toBe("APROVAR_CLINICAMENTE");
    expect(result.record.latestReview?.reviewerId).toBe(reviewerId);
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({ event: "APROVAR_CLINICAMENTE" }),
    );
    expect(repositoryPort.saveReview).toHaveBeenCalledOnce();
  });

  it("rejects approval when preflight is incomplete or reviewer is the author", async () => {
    const incomplete = repository({
      ...record,
      correctChoiceIds: [],
    });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Não deve aprovar.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        { repository: incomplete, transition: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    await expect(
      reviewAuthoringContent(
        {
          principalId: authorId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "O autor não pode aprovar seu próprio item.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        { repository: repository(), transition: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("validates review commands, scope, status, and adjustment decisions", async () => {
    const dependencies = {
      repository: repository(),
      transition: vi.fn(async () => workflow("AJUSTES_SOLICITADOS")),
    };

    await expect(
      reviewAuthoringContent(
        {
          principalId: "",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Motivo.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          contentId,
          version: 0,
          scopeId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Motivo.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [],
          contentId,
          version: 1,
          scopeId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Motivo.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Motivo.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        {
          ...dependencies,
          repository: {
            ...repository(),
            find: vi.fn(async () => null),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Motivo.",
          correlationId: "66666666-6666-4666-8666-666666666666",
        },
        {
          ...dependencies,
          repository: repository({
            ...record,
            contentStatus: "RASCUNHO",
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const adjusted = await reviewAuthoringContent(
      {
        principalId: reviewerId,
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        decision: "SOLICITAR_AJUSTES",
        rationale: "Ajustar a explicação do caso.",
        correlationId: "66666666-6666-4666-8666-666666666666",
      },
      dependencies,
    );

    expect(adjusted.review.decision).toBe("SOLICITAR_AJUSTES");
    expect(adjusted.record.contentStatus).toBe("AJUSTES_SOLICITADOS");
  });
});
