import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "./content-use-cases.js";
import {
  createAuthoringDraft,
  reviewAuthoringContent,
  runAuthoringPreflight,
  type CreateAuthoringDraftCommand,
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
    createDraft: vi.fn(async (draft) => draft),
    savePreflight: vi.fn(async (_record, preflight) => ({
      ...value,
      preflight,
    })),
    saveReview: vi.fn(async (_record, review) => {
      savedReview = review;
      return { ...value, latestReview: review };
    }),
    rollbackReview: vi.fn(async () => undefined),
    get savedReview() {
      return savedReview;
    },
  };
}

function workflow(status: ContentRecord["status"]): ContentRecord {
  return { contentId, version: 1, scopeId, status };
}

describe("authoring and clinical review use cases", () => {
  it("derives authoring identity and participant projection server-side in RASCUNHO", async () => {
    const repositoryPort = repository();
    const generatedIds = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    ];
    const command: CreateAuthoringDraftCommand = {
      principalId: authorId,
      accountStatus: "ACTIVE",
      roles: ["AUTHOR"],
      scopes: [scopeId],
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      ordinal: 1,
      title: "Novo item sintético",
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
        { code: "F-02", locator: "localizador interno", updateRequired: true },
      ],
      idempotencyKey: "authoring-draft-2026-08-24-01",
      correlationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    };

    const created = await createAuthoringDraft(command, {
      repository: repositoryPort,
      idFactory: () => {
        const next = generatedIds.shift();
        if (next === undefined) throw new Error("test id factory exhausted");
        return next;
      },
      now: () => "2026-08-24T19:00:00.000Z",
    });

    expect(created.authorId).toBe(authorId);
    expect(created.contentId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(created.contentVersionId).toBe(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(created.editorialRecordId).toBe(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(created.version).toBe(1);
    expect(created.contentStatus).toBe("RASCUNHO");
    expect(created.participant.id).toBe(created.contentId);
    expect(created.participant.kind).toBe("QUESTAO");
    expect(created.preflight.readyForPublication).toBe(false);
    expect(created.preflight.technicalChecksPassed).toBe(true);
    expect(repositoryPort.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId,
        contentStatus: "RASCUNHO",
        contentId: created.contentId,
      }),
      expect.objectContaining({
        idempotencyKey: command.idempotencyKey,
        fingerprint: expect.stringContaining(command.scopeId),
        audit: expect.objectContaining({
          action: "CONTENT_DRAFT_CREATED",
          resourceId: created.contentId,
        }),
      }),
    );

    vi.mocked(repositoryPort.createDraft).mockRejectedValueOnce(
      Object.assign(new Error("same key"), {
        name: "PersistenceConflictError",
      }),
    );
    await expect(
      createAuthoringDraft(command, {
        repository: repositoryPort,
        idFactory: (() => {
          const values = [
            "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            "ffffffff-ffff-4fff-8fff-ffffffffffff",
            "66666666-6666-4666-8666-666666666666",
            "55555555-5555-4555-8555-555555555555",
          ];
          return () => values.shift() ?? "44444444-4444-4444-8444-444444444444";
        })(),
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });

    await expect(
      createAuthoringDraft(
        { ...command, correlationId: "not-a-uuid" },
        {
          repository: repositoryPort,
          idFactory: () => "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("keeps an incomplete correction preflight blocked while allowing a real draft", async () => {
    const repositoryPort = repository();
    const command: CreateAuthoringDraftCommand = {
      principalId: authorId,
      accountStatus: "ACTIVE",
      roles: ["AUTHOR"],
      scopes: [scopeId],
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      ordinal: 2,
      title: "Rascunho incompleto",
      prompt: "Ainda falta a chave.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Uma ação." },
        { id: "b", label: "B", text: "Outra ação." },
      ],
      feedback: "Completar antes da revisão.",
      critical: false,
      remediationTargetObjectiveId: "M02-OBJ-01",
      sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
      idempotencyKey: "authoring-draft-2026-08-24-02",
      correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    };
    const created = await createAuthoringDraft(command, {
      repository: repositoryPort,
      idFactory: (() => {
        const values = [
          "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          "99999999-9999-4999-8999-999999999999",
          "88888888-8888-4888-8888-888888888888",
          "77777777-7777-4777-8777-777777777777",
        ];
        return () => values.shift() ?? "66666666-6666-4666-8666-666666666666";
      })(),
      now: () => "2026-08-24T19:00:00.000Z",
    });

    expect(created.contentStatus).toBe("RASCUNHO");
    expect(created.preflight.technicalChecksPassed).toBe(false);
    expect(created.preflight.readyForClinicalReview).toBe(false);
    expect(created.preflight.checks.correctionMetadata).toBe(false);
    expect(created.preflight.readyForPublication).toBe(false);
  });

  it("rejects inactive, out-of-scope, and invalid curriculum authoring commands before persistence", async () => {
    const repositoryPort = repository();
    const invalid: CreateAuthoringDraftCommand = {
      principalId: authorId,
      accountStatus: "SUSPENDED",
      roles: ["AUTHOR"],
      scopes: [],
      scopeId,
      moduleId: "M99",
      sessionId: "M99-S1",
      objectiveId: "M99-OBJ-01",
      ordinal: 1,
      title: "Não deve persistir",
      prompt: "Prompt.",
      responseMode: "CHOICE",
      feedback: "Feedback.",
      critical: false,
      remediationTargetObjectiveId: "M99-OBJ-01",
      sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
      idempotencyKey: "authoring-draft-2026-08-24-03",
      correlationId: "11111111-1111-4111-8111-111111111111",
    };

    await expect(
      createAuthoringDraft(invalid, {
        repository: repositoryPort,
        idFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(repositoryPort.createDraft).not.toHaveBeenCalled();

    await expect(
      createAuthoringDraft(
        {
          ...invalid,
          accountStatus: "ACTIVE",
          scopes: [scopeId],
          moduleId: "M99",
        },
        {
          repository: repository(),
          idFactory: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

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

  it("compensates the persisted review when the workflow transition fails", async () => {
    const repositoryPort = repository();
    const transition = vi.fn(async () => {
      throw new Error("transition unavailable");
    });

    await expect(
      reviewAuthoringContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          approvedClinicalApproverId: reviewerId,
          contentId,
          version: 1,
          scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Falha sintética após persistência.",
          correlationId: "77777777-7777-4777-8777-777777777777",
        },
        { repository: repositoryPort, transition },
      ),
    ).rejects.toThrow("transition unavailable");
    expect(repositoryPort.rollbackReview).toHaveBeenCalledWith(
      record,
      record.preflight,
      expect.objectContaining({
        reviewerId,
        decision: "APROVAR_CLINICAMENTE",
      }),
    );
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
