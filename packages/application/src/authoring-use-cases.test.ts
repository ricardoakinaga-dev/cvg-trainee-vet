import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "./content-use-cases.js";
import { createAuthoringPublicationMethods } from "./authoring-publication.js";
import { createAuthoringReviewMethods } from "./authoring-review.js";
import {
  publishAuthoringContent,
  reviewAuthoringContent,
  runAuthoringPreflight,
  type AuthoringRecord,
  type AuthoringIdempotencyRecord,
  type AuthoringRepositoryPort,
  type AuthoringTransactionPort,
  type ClinicalReviewRecord,
  type PublishAuthoringCommand,
  type ReviewAuthoringCommand,
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

function publishCommand(
  overrides: Partial<PublishAuthoringCommand> = {},
): PublishAuthoringCommand {
  return {
    principalId: authorId,
    accountStatus: "ACTIVE",
    roles: ["AUTHOR"],
    scopes: [scopeId],
    contentId,
    version: 1,
    scopeId,
    correlationId: "66666666-6666-4666-8666-666666666666",
    idempotencyKey: "publish-key-default",
    ...overrides,
  };
}

function reviewCommand(
  overrides: Partial<ReviewAuthoringCommand> = {},
): ReviewAuthoringCommand {
  return {
    principalId: "99999999-9999-4999-8999-999999999999",
    accountStatus: "ACTIVE",
    roles: ["CLINICAL_APPROVER"],
    scopes: [scopeId],
    contentId,
    version: 1,
    scopeId,
    decision: "APROVAR_CLINICAMENTE",
    rationale: "Revisão clínica sintética.",
    correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    idempotencyKey: "review-key-default",
    approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
    ...overrides,
  };
}

function clinicalReview(
  overrides: Partial<ClinicalReviewRecord> = {},
): ClinicalReviewRecord {
  return {
    reviewId: "88888888-8888-4888-8888-888888888888",
    contentId,
    version: 1,
    contentEditorialRecordId: record.editorialRecordId,
    contentVersionId: record.contentVersionId,
    scopeId,
    reviewerId: "99999999-9999-4999-8999-999999999999",
    decision: "APROVAR_CLINICAMENTE",
    rationale: "Revisado para publicação.",
    correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reviewedAt: "2026-08-11T10:00:00.000Z",
    ...overrides,
  };
}

function authoringTransaction(
  repositoryPort: AuthoringRepositoryPort,
  transition: ReturnType<typeof vi.fn>,
  idFactory: () => string = () => "authoring-id-1",
  approverStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE",
): AuthoringTransactionPort {
  const records = new Map<string, AuthoringIdempotencyRecord>();
  return {
    run: vi.fn(async (work) =>
      work({
        repository: repositoryPort,
        approver: {
          findById: vi.fn(async (accountId) => ({
            accountId,
            accountStatus: approverStatus,
            roles: ["CLINICAL_APPROVER" as const],
            scopes: [scopeId],
          })),
        },
        transition,
        idFactory,
        idempotency: {
          find: vi.fn(async (key) => records.get(key) ?? null),
          store: vi.fn(async (key, value) => {
            records.set(key, value);
          }),
        },
      }),
    ),
  };
}

describe("authoring and clinical review use cases", () => {
  it("composes the clinical publication workflow immutably", () => {
    const methods = createAuthoringPublicationMethods({
      runPreflight: runAuthoringPreflight,
    });

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods)).toEqual(["publish"]);
  });

  it("composes the clinical review workflow immutably", () => {
    const methods = createAuthoringReviewMethods({
      runPreflight: runAuthoringPreflight,
    });

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods)).toEqual(["review"]);
  });

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
        idempotencyKey: "publish-first",
      },
      {
        repository: repositoryPort,
        transition,
        transaction: authoringTransaction(repositoryPort, transition),
      },
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

  it("keeps publication fail-closed across validation, scope, approval, and preflight gaps", async () => {
    const dependencies = (repositoryPort: AuthoringRepositoryPort) => {
      const transition = vi.fn();
      return {
        repository: repositoryPort,
        transition,
        transaction: authoringTransaction(repositoryPort, transition),
      };
    };

    await expect(
      publishAuthoringContent(
        publishCommand({ principalId: " " }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      publishAuthoringContent(
        publishCommand({ version: 0 }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      publishAuthoringContent(
        publishCommand({ roles: [] }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    const notFoundRepository = {
      ...repository(),
      find: vi.fn(async () => null),
    };
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(notFoundRepository),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(repository({ ...record, scopeId: "different-scope" })),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      publishAuthoringContent(publishCommand(), dependencies(repository())),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(
          repository({ ...record, contentStatus: "APROVADO_CLINICAMENTE" }),
        ),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(
          repository(
            { ...record, contentStatus: "APROVADO_CLINICAMENTE" },
            clinicalReview({ decision: "SOLICITAR_AJUSTES" }),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(
          repository(
            { ...record, contentStatus: "APROVADO_CLINICAMENTE" },
            clinicalReview({ reviewerId: record.authorId }),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      publishAuthoringContent(
        publishCommand(),
        dependencies(
          repository(
            { ...record, contentStatus: "APROVADO_CLINICAMENTE", title: "" },
            clinicalReview(),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("binds publication to the current persisted clinical approver", async () => {
    const approvedRepository = repository(
      {
        ...record,
        contentStatus: "APROVADO_CLINICAMENTE",
      },
      clinicalReview({ reviewerId: "revoked-approver" }),
    );

    await expect(
      publishAuthoringContent(publishCommand(), {
        repository: approvedRepository,
        transition: vi.fn(),
        transaction: authoringTransaction(
          approvedRepository,
          vi.fn(),
          () => "revoked-publication",
          "SUSPENDED",
        ),
      }),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("AUTORIZADO_PARA_PUBLICACAO"))
      .mockResolvedValueOnce(workflow("PUBLICADO"));
    const published = await publishAuthoringContent(publishCommand(), {
      repository: approvedRepository,
      transition,
      transaction: authoringTransaction(approvedRepository, transition),
    });

    expect(published.record.contentStatus).toBe("PUBLICADO");
    expect(transition).toHaveBeenCalledTimes(2);
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
        idempotencyKey: "review-independent",
        approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
      },
      {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-1",
        transaction: authoringTransaction(repositoryPort, transition),
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
          idempotencyKey: "review-self-approval",
        },
        {
          repository: repository(),
          transition: vi.fn(),
          idFactory: () => "review-2",
          transaction: authoringTransaction(repository(), vi.fn()),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("keeps clinical review fail-closed across validation and state gaps", async () => {
    const dependencies = (repositoryPort: AuthoringRepositoryPort) => {
      const transition = vi.fn();
      return {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-validation",
        transaction: authoringTransaction(repositoryPort, transition),
      };
    };

    await expect(
      reviewAuthoringContent(
        reviewCommand({ principalId: " " }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      reviewAuthoringContent(
        reviewCommand({ version: 0 }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      reviewAuthoringContent(
        reviewCommand({ rationale: "<script>não permitido</script>" }),
        dependencies(repository()),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      reviewAuthoringContent(
        reviewCommand(),
        dependencies({ ...repository(), find: vi.fn(async () => null) }),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      reviewAuthoringContent(
        reviewCommand(),
        dependencies(repository({ ...record, scopeId: "different-scope" })),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      reviewAuthoringContent(
        reviewCommand(),
        dependencies(repository({ ...record, title: "" })),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const awaitingReview = repository({
      ...record,
      contentStatus: "EM_REVISAO_CLINICA",
    });
    const finalTransition = vi
      .fn()
      .mockResolvedValue(workflow("APROVADO_CLINICAMENTE"));
    const result = await reviewAuthoringContent(reviewCommand(), {
      repository: awaitingReview,
      transition: finalTransition,
      idFactory: () => "review-awaiting",
      transaction: authoringTransaction(awaitingReview, finalTransition),
    });
    expect(result.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
    expect(finalTransition).toHaveBeenCalledTimes(1);

    const moderatorRecord = repository({
      ...record,
      contentStatus: "EM_REVISAO_CLINICA",
    });
    const moderationTransition = vi
      .fn()
      .mockResolvedValue(workflow("AJUSTES_SOLICITADOS"));
    const moderationCommand = Object.fromEntries(
      Object.entries(
        reviewCommand({
          roles: ["MODERATOR"],
          decision: "SOLICITAR_AJUSTES",
        }),
      ).filter(([key]) => key !== "approvedClinicalApproverId"),
    ) as Omit<ReviewAuthoringCommand, "approvedClinicalApproverId">;
    const moderation = await reviewAuthoringContent(moderationCommand, {
      repository: moderatorRecord,
      transition: moderationTransition,
      idFactory: () => "review-moderation",
      transaction: authoringTransaction(moderatorRecord, moderationTransition),
    });
    expect(moderation.review.decision).toBe("SOLICITAR_AJUSTES");
    expect(moderationTransition).toHaveBeenCalledTimes(1);
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
        idempotencyKey: "review-adjustments",
        approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
      },
      {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-adjustments-1",
        transaction: authoringTransaction(repositoryPort, transition),
      },
    );

    expect(result.record.contentStatus).toBe("AJUSTES_SOLICITADOS");
    expect(result.review.decision).toBe("SOLICITAR_AJUSTES");
    expect(transition).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: "SOLICITAR_AJUSTES" }),
    );
  });

  it("reopens an approval so a rotated clinical approver can reapprove it", async () => {
    const repositoryPort = repository(
      { ...record, contentStatus: "APROVADO_CLINICAMENTE" },
      clinicalReview({ reviewerId: "old-approver" }),
    );
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("APROVADO_CLINICAMENTE"));

    const result = await reviewAuthoringContent(
      reviewCommand({
        principalId: "new-approver",
        approvedClinicalApproverId: "new-approver",
      }),
      {
        repository: repositoryPort,
        transition,
        idFactory: () => "review-rotated",
        transaction: authoringTransaction(repositoryPort, transition),
      },
    );

    expect(result.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
    expect(transition).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: "REABRIR_REVISAO_CLINICA" }),
    );
    expect(transition).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: "APROVAR_CLINICAMENTE" }),
    );
  });

  it("derives the clinical transition identity from the current approver", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "PROJECAO_VERIFICADA",
    });
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("APROVADO_CLINICAMENTE"));
    const {
      approvedClinicalApproverId: _approvedClinicalApproverId,
      ...command
    } = reviewCommand();
    void _approvedClinicalApproverId;

    const result = await reviewAuthoringContent(command, {
      repository: repositoryPort,
      transition,
      idFactory: () => "review-current-identity",
      transaction: authoringTransaction(repositoryPort, transition),
    });

    expect(result.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "ENVIAR_PARA_REVISAO_CLINICA",
        approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
      }),
    );
  });

  it("executes clinical review once and safely replays the same correlation", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "PROJECAO_VERIFICADA",
    });
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("APROVADO_CLINICAMENTE"));
    const transaction = authoringTransaction(
      repositoryPort,
      transition,
      () => "review-idempotent-1",
    );
    const command = {
      principalId: "99999999-9999-4999-8999-999999999999",
      accountStatus: "ACTIVE" as const,
      roles: ["CLINICAL_APPROVER"] as const,
      scopes: [scopeId],
      contentId,
      version: 1,
      scopeId,
      decision: "APROVAR_CLINICAMENTE" as const,
      rationale: "Revisão sintética independente e repetível.",
      correlationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      idempotencyKey: "review-replay",
      approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
    };

    const first = await reviewAuthoringContent(command, {
      repository: repositoryPort,
      transition,
      idFactory: () => "unused-outside-transaction",
      transaction,
    });
    const second = await reviewAuthoringContent(command, {
      repository: repositoryPort,
      transition,
      idFactory: () => "unused-outside-transaction",
      transaction,
    });

    expect(second).toEqual(first);
    expect(transaction.run).toHaveBeenCalledTimes(2);
    expect(transition).toHaveBeenCalledTimes(2);
    expect(repositoryPort.find).toHaveBeenCalledTimes(1);
    expect(repositoryPort.savePreflight).toHaveBeenCalledTimes(1);
    expect(repositoryPort.saveClinicalReview).toHaveBeenCalledTimes(1);
  });

  it("keeps publication inside one transaction when the second boundary fails", async () => {
    const repositoryPort = repository(
      {
        ...record,
        contentStatus: "APROVADO_CLINICAMENTE",
      },
      clinicalReview(),
    );
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("AUTORIZADO_PARA_PUBLICACAO"))
      .mockRejectedValueOnce(new Error("synthetic publication fault"));
    const transaction = authoringTransaction(repositoryPort, transition);

    await expect(
      publishAuthoringContent(publishCommand(), {
        repository: repositoryPort,
        transition,
        transaction,
      }),
    ).rejects.toThrow("synthetic publication fault");

    expect(transaction.run).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledTimes(2);
    expect(repositoryPort.savePreflight).toHaveBeenCalledTimes(1);
  });

  it("replays publication without re-running authorization transitions", async () => {
    const repositoryPort = repository(
      {
        ...record,
        contentStatus: "APROVADO_CLINICAMENTE",
      },
      clinicalReview(),
    );
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("AUTORIZADO_PARA_PUBLICACAO"))
      .mockResolvedValueOnce(workflow("PUBLICADO"));
    const transaction = authoringTransaction(repositoryPort, transition);

    const first = await publishAuthoringContent(publishCommand(), {
      repository: repositoryPort,
      transition,
      transaction,
    });
    const second = await publishAuthoringContent(publishCommand(), {
      repository: repositoryPort,
      transition,
      transaction,
    });

    expect(second).toEqual(first);
    expect(transition).toHaveBeenCalledTimes(2);
    expect(repositoryPort.find).toHaveBeenCalledTimes(1);
    expect(repositoryPort.findLatestClinicalReview).toHaveBeenCalledTimes(1);
    expect(repositoryPort.savePreflight).toHaveBeenCalledTimes(1);

    await expect(
      publishAuthoringContent(
        publishCommand({ contentId: "44444444-4444-4444-8444-444444444444" }),
        {
          repository: repositoryPort,
          transition,
          transaction,
        },
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("rejects a correlation replay with a different clinical command", async () => {
    const repositoryPort = repository({
      ...record,
      contentStatus: "PROJECAO_VERIFICADA",
    });
    const transition = vi
      .fn()
      .mockResolvedValueOnce(workflow("EM_REVISAO_CLINICA"))
      .mockResolvedValueOnce(workflow("APROVADO_CLINICAMENTE"));
    const transaction = authoringTransaction(repositoryPort, transition);
    const command = {
      principalId: "99999999-9999-4999-8999-999999999999",
      accountStatus: "ACTIVE" as const,
      roles: ["CLINICAL_APPROVER"] as const,
      scopes: [scopeId],
      contentId,
      version: 1,
      scopeId,
      decision: "APROVAR_CLINICAMENTE" as const,
      rationale: "Primeira decisão sintética.",
      correlationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      idempotencyKey: "review-conflict",
      approvedClinicalApproverId: "99999999-9999-4999-8999-999999999999",
    };

    await reviewAuthoringContent(command, {
      repository: repositoryPort,
      transition,
      idFactory: () => "review-idempotent-conflict",
      transaction,
    });
    await expect(
      reviewAuthoringContent(
        { ...command, rationale: "Outra decisão para a mesma correlação." },
        {
          repository: repositoryPort,
          transition,
          idFactory: () => "review-idempotent-conflict-2",
          transaction,
        },
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
    expect(transition).toHaveBeenCalledTimes(2);
    expect(repositoryPort.saveClinicalReview).toHaveBeenCalledTimes(1);
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
