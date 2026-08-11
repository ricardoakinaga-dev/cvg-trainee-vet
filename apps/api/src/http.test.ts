import { describe, expect, it, vi } from "vitest";

import type {
  AnswerState,
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  ApplicationError,
  type AuthoringRecord,
  type ContentRecord,
  type CurriculumRuntimeState,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
} from "@cvg/application";
import { createObservability } from "@cvg/observability";

import { handleApiRequest, type ApiHttpDependencies } from "./http.js";

const attempt: AttemptState = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  status: "EM_ANDAMENTO",
  version: 1,
};

const answer: AnswerState = {
  answerId: "44444444-4444-4444-8444-444444444444",
  attemptId: attempt.attemptId,
  itemId: "55555555-5555-4555-8555-555555555555",
  response: "resposta própria",
  savedAt: "2026-08-09T17:00:00.000Z",
};

const activity: ParticipantActivityState = {
  activityId: attempt.activityId,
  scopeId: "scope-1",
  slug: "emergencia-v1",
  title: "Emergência",
  items: [
    {
      itemId: answer.itemId,
      ordinal: 1,
      kind: "LEITURA",
      title: "Prioridades",
      text: "Texto autoral.",
      responseMode: "NONE",
    },
  ],
};

const progress: ParticipantProgressState = {
  participantId: attempt.participantId,
  activityId: activity.activityId,
  scopeId: activity.scopeId,
  assignmentStatus: "EM_ANDAMENTO",
  attemptId: attempt.attemptId,
  attemptStatus: "SALVA",
  attemptVersion: 2,
  nextAction: "RETOMAR_ATIVIDADE",
};

const curriculumRuntime: CurriculumRuntimeState = {
  participantId: attempt.participantId,
  scopeId: "scope-1",
  version: 2,
  updatedAt: "2026-08-10T01:00:00.000Z",
  evaluation: {
    moduleId: "M03",
    status: "DOMINIO_DIGITAL",
    nextAction: "REVISAR_RETENCAO",
    objectiveResults: [],
    remediationObjectiveIds: [],
    criticalErrorItemIds: [],
    invalidAnswerItemIds: [],
    unansweredChoiceItemIds: [],
    openResponseItemIds: [],
    retentionReviews: [
      { day: 7, dueAt: "2026-08-17T01:00:00.000Z", status: "PENDENTE" },
    ],
    practicalCompetenceClaim: "PROIBIDO_MVP",
    scorePercent: 100,
  },
};

const authoringRecord: AuthoringRecord = {
  editorialRecordId: "99999999-9999-4999-8999-999999999999",
  contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  version: 1,
  contentVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  scopeId: "11111111-1111-4111-8111-111111111111",
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
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
      locator: "capítulo 123, seção de ressuscitação",
      updateRequired: false,
    },
  ],
  participant: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
  contentStatus: "AUTOVERIFICADO",
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
};

function dependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-123",
    authenticate: async () => ({
      principalId: attempt.participantId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: ["scope-1"],
    }),
    resolveActivityScope: async () => "scope-1",
    resolveAttempt: async () => attempt,
    getParticipantActivity: async () => activity,
    advanceContent: vi.fn(
      async (command) =>
        ({
          contentId: command.contentId,
          version: command.version,
          scopeId: command.scopeId,
          status: "PUBLICADO" as const,
        }) satisfies ContentRecord,
    ),
    getParticipantProgress: async () => progress,
    createInvitation: vi.fn(async (command) => ({
      invitationId: "99999999-9999-4999-8999-999999999999",
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      professionalEmail: command.professionalEmail.trim().toLowerCase(),
      token: "a".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
    })),
    acceptInvitation: vi.fn(async () => ({
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "b".repeat(32),
        expiresAt: new Date("2026-08-09T18:00:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "b".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
      },
    })),
    getAttemptFeedback: vi.fn(async () => null),
    correctOpenResponse: vi.fn(async () => ({
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: attempt.attemptId,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback formativo interno.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    })),
    startAttempt: vi.fn(async () => attempt),
    saveAnswer: vi.fn(async () => ({
      attempt: { ...attempt, status: "SALVA" as const, version: 2 },
      answer,
    })),
    submitAttempt: vi.fn(async () => ({
      ...attempt,
      status: "SUBMETIDA" as const,
    })),
    healthcheck: async () => undefined,
    ...overrides,
  };
}

describe("API HTTP boundary", () => {
  it("returns a liveness envelope without touching dependencies", async () => {
    const healthcheck = vi.fn(async () => undefined);
    const response = await handleApiRequest(
      { method: "GET", path: "/health/live", body: undefined },
      dependencies({ healthcheck }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "live" },
    });
    expect(healthcheck).not.toHaveBeenCalled();
  });

  it("returns redacted dependency health and protects metrics export", async () => {
    const dependencyStatus = vi.fn(async () => ({
      status: "DEGRADED" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DOWN" as const,
        ai: "DISABLED" as const,
      },
    }));
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    observability.metrics.increment("api.requests.total", {
      route: "/health/dependencies",
      outcome: "success",
    });

    const health = await handleApiRequest(
      { method: "GET", path: "/health/dependencies", body: undefined },
      dependencies({ dependencyStatus }),
    );
    expect(health).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: {
          status: "DEGRADED",
          dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
        },
      },
    });
    expect(JSON.stringify(health)).not.toContain("secret");
    expect(dependencyStatus).toHaveBeenCalledOnce();

    const metrics = await handleApiRequest(
      { method: "GET", path: "/internal/metrics", body: undefined },
      dependencies({
        observability,
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );
    expect(metrics).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: { format: "prometheus" },
      },
    });
    expect(JSON.stringify(metrics)).toContain("api_requests_total");
    expect(JSON.stringify(metrics)).not.toContain("participant");

    const scrapeToken = "s".repeat(32);
    const scraped = await handleApiRequest(
      {
        method: "GET",
        path: "/internal/metrics",
        body: undefined,
        headers: { authorization: `Bearer ${scrapeToken}` },
      },
      dependencies({
        observability,
        metricsScrapeToken: scrapeToken,
        authenticate: async () => null,
      }),
    );
    expect(scraped.status).toBe(200);

    const denied = await handleApiRequest(
      { method: "GET", path: "/internal/metrics", body: undefined },
      dependencies(),
    );
    expect(denied.status).toBe(403);
  });

  it("keeps internal authoring metadata behind staff authorization", async () => {
    const getInternalAuthoringRecord = vi.fn(async () => authoringRecord);
    const staffResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/versions/1/authoring`,
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [authoringRecord.scopeId],
        }),
        getInternalAuthoringRecord,
      }),
    );

    expect(staffResponse.status).toBe(200);
    expect(staffResponse.body).toMatchObject({
      success: true,
      data: {
        item: { correctChoiceIds: ["a"] },
        preflight: { technicalChecksPassed: true },
      },
    });

    const participantResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/versions/1/authoring`,
        body: undefined,
      },
      dependencies({ getInternalAuthoringRecord }),
    );
    expect(participantResponse.status).toBe(403);
    expect(getInternalAuthoringRecord).toHaveBeenCalledTimes(2);
  });

  it("exposes only a scoped paginated clinical review queue to an approved reviewer", async () => {
    const getClinicalReviewQueue = vi.fn(async () => ({
      items: [
        {
          contentId: authoringRecord.contentId,
          version: 1,
          scopeId: authoringRecord.scopeId,
          moduleId: authoringRecord.moduleId,
          sessionId: authoringRecord.sessionId,
          objectiveId: authoringRecord.objectiveId,
          authorId: authoringRecord.authorId,
          contentStatus: "PROJECAO_VERIFICADA" as const,
          reviewStatus: "PENDING" as const,
          technicalChecksPassed: true,
          latestReview: null,
        },
      ],
      page: 2,
      perPage: 10,
      total: 11,
    }));
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/authoring/review-queue",
        query: {
          scopeId: authoringRecord.scopeId,
          page: "2",
          per_page: "10",
          status: "PENDING",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [authoringRecord.scopeId],
        }),
        getClinicalReviewQueue,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { page: 2, perPage: 10, total: 11 },
    });
    expect(JSON.stringify(response.body)).not.toContain("correctChoiceIds");
    expect(getClinicalReviewQueue).toHaveBeenCalledWith(
      authoringRecord.scopeId,
      { page: 2, perPage: 10, status: "PENDING" },
    );
  });

  it("exposes a scoped clinical review route without exposing internals publicly", async () => {
    const reviewAuthoringContent = vi.fn(async () => ({
      record: authoringRecord,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/review`,
        body: {
          version: 1,
          scopeId: authoringRecord.scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Revisão sintética.",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [authoringRecord.scopeId],
        }),
        reviewAuthoringContent,
      }),
    );

    expect(response.status).toBe(200);
    expect(reviewAuthoringContent).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "APROVAR_CLINICAMENTE",
        contentId: authoringRecord.contentId,
      }),
    );
  });

  it("publishes authoring content through automatic source verification", async () => {
    const publishAuthoringContent = vi.fn(async () => ({
      record: {
        ...authoringRecord,
        contentStatus: "PUBLICADO" as const,
        preflight: {
          ...authoringRecord.preflight,
          sourceVerification: "VERIFICADO_AUTOMATICAMENTE" as const,
          readyForPublication: true,
          checks: {
            ...authoringRecord.preflight.checks,
            publicationBlocked: false,
          },
        },
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/publish`,
        body: { version: 1, scopeId: authoringRecord.scopeId },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [authoringRecord.scopeId],
        }),
        publishAuthoringContent,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        contentStatus: "PUBLICADO",
        preflight: {
          sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
          readyForPublication: true,
        },
      },
    });
    expect(publishAuthoringContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: authoringRecord.contentId,
        scopeId: authoringRecord.scopeId,
      }),
    );
  });

  it("requires authentication before starting an attempt", async () => {
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({ authenticate: async () => null }),
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "unauthenticated" },
    });
  });

  it("keeps invitation creation internal and returns the one-time token only to an admin", async () => {
    const createInvitation = vi.fn(async (command) => ({
      invitationId: "99999999-9999-4999-8999-999999999999",
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      professionalEmail: command.professionalEmail,
      token: "a".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/invitations",
        body: {
          professionalEmail: "trainee@cvg.example",
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: ["11111111-1111-4111-8111-111111111111"],
          expiresInSeconds: 3600,
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        createInvitation,
      }),
    );

    expect(response.status).toBe(201);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalEmail: "trainee@cvg.example",
        invitedRoles: ["PARTICIPANT"],
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { token: "a".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });

  it("accepts an invitation without authentication and sets a secure session cookie", async () => {
    const authenticate = vi.fn(async () => null);
    const acceptInvitation = vi.fn(async () => ({
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "b".repeat(32),
        expiresAt: new Date("2026-08-09T18:00:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "b".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/invitations/accept",
        body: {
          token: "a".repeat(32),
          sessionExpiresInSeconds: 3600,
        },
      },
      dependencies({ authenticate, acceptInvitation }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).not.toHaveBeenCalled();
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: "a".repeat(32),
      sessionExpiresInSeconds: 3600,
      correlationId: "request-123",
    });
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
    expect(JSON.stringify(response.body)).not.toContain("b".repeat(32));
  });

  it("logs in with credentials and exposes only an active-session projection", async () => {
    const loginWithPassword = vi.fn(async (command) => ({
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "s".repeat(32),
        expiresAt: new Date("2026-08-09T18:00:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "s".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" +
          command.sessionExpiresInSeconds,
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/auth/login",
        body: {
          login: "trainee@cvg.example",
          password: "Acesso-" + "CVG-2026!Seguro",
        },
      },
      dependencies({ loginWithPassword }),
    );

    expect(response.status).toBe(200);
    expect(loginWithPassword).toHaveBeenCalledWith({
      login: "trainee@cvg.example",
      password: "Acesso-" + "CVG-2026!Seguro",
      sessionExpiresInSeconds: 3600,
      correlationId: "request-123",
    });
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("Acesso-CVG");
    expect(JSON.stringify(response.body)).not.toContain("ssssssss");
  });

  it("rejects malformed credential logins before invoking the auth use case", async () => {
    const loginWithPassword = vi.fn();
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/auth/login",
        body: { login: "invalid", password: "short" },
      },
      dependencies({ loginWithPassword }),
    );

    expect(response.status).toBe(422);
    expect(loginWithPassword).not.toHaveBeenCalled();
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "validation_error" },
    });
  });

  it("restores a session without returning roles, scopes, or account identifiers", async () => {
    const authenticate = vi.fn(async () => ({
      principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountStatus: "ACTIVE" as const,
      roles: ["PARTICIPANT" as const],
      scopes: ["11111111-1111-4111-8111-111111111111"],
    }));
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/session",
        body: undefined,
        headers: { cookie: "__Host-cvg_session=" + "s".repeat(32) },
      },
      dependencies({ authenticate }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("aaaaaaaa");
    expect(JSON.stringify(response.body)).not.toContain("PARTICIPANT");
  });

  it("updates a password only for an authenticated active account", async () => {
    const setAccountPassword = vi.fn(async () => undefined);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/account/password",
        body: { password: "N" + "ovo-Acesso-CVG-2026!" },
      },
      dependencies({ setAccountPassword }),
    );

    expect(response.status).toBe(200);
    expect(setAccountPassword).toHaveBeenCalledWith({
      principalId: attempt.participantId,
      password: "N" + "ovo-Acesso-CVG-2026!",
      correlationId: "request-123",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "updated" },
    });
    expect(JSON.stringify(response.body)).not.toContain("Novo-Acesso");
  });

  it("revokes a session without revealing whether the cookie was active", async () => {
    const revokeSession = vi.fn(async () => undefined);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/session/revoke",
        body: undefined,
        headers: { cookie: "__Host-cvg_session=" + "c".repeat(32) },
      },
      dependencies({ revokeSession }),
    );

    expect(response.status).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith(
      "__Host-cvg_session=" + "c".repeat(32),
    );
    expect(response.headers?.["set-cookie"]).toContain("Max-Age=0");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "revoked" },
    });
  });

  it("rotates a session through a bounded contract and returns only a new cookie", async () => {
    const rotateSession = vi.fn(async () => ({
      sessionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      token: "d".repeat(32),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
      cookie:
        "__Host-cvg_session=" +
        "d".repeat(32) +
        "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/session/rotate",
        body: { sessionExpiresInSeconds: 3600 },
        headers: { cookie: "__Host-cvg_session=" + "c".repeat(32) },
      },
      dependencies({ rotateSession }),
    );

    expect(response.status).toBe(200);
    expect(rotateSession).toHaveBeenCalledWith(
      "__Host-cvg_session=" + "c".repeat(32),
      3600,
    );
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "rotated" },
    });
    expect(JSON.stringify(response.body)).not.toContain("dddddddd");
  });

  it("validates, authorizes, and projects start responses without participant internals", async () => {
    const startAttempt = vi.fn(async () => attempt);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({ startAttempt }),
    );

    expect(response.status).toBe(201);
    expect(startAttempt).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      activityId: attempt.activityId,
      idempotencyKey: "start-attempt-2026-08-09",
      correlationId: "request-123",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        attemptId: attempt.attemptId,
        activityId: attempt.activityId,
        status: "EM_ANDAMENTO",
        version: 1,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
  });

  it("rejects invalid input and an activity outside the principal scope", async () => {
    const startAttempt = vi.fn(async () => attempt);
    const invalid = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: { activityId: "not-an-id" },
      },
      dependencies({ startAttempt }),
    );
    const outsideScope = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({
        resolveActivityScope: async () => "scope-other",
        startAttempt,
      }),
    );

    expect(invalid.status).toBe(422);
    expect(outsideScope.status).toBe(403);
    expect(startAttempt).not.toHaveBeenCalled();
  });

  it("submits using a server timestamp and returns no internal answer key", async () => {
    const submitAttempt = vi.fn(async () => ({
      ...attempt,
      status: "SUBMETIDA" as const,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/attempts/${attempt.attemptId}/submit`,
        body: { idempotencyKey: "submit-attempt-2026-08-09" },
      },
      dependencies({ submitAttempt }),
    );

    expect(response.status).toBe(200);
    expect(submitAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        participantId: attempt.participantId,
        idempotencyKey: "submit-attempt-2026-08-09",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SUBMETIDA" },
    });
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
  });

  it("saves an own answer and returns only the participant projection", async () => {
    const saveAnswer = vi.fn(async () => ({
      attempt: { ...attempt, status: "SALVA" as const, version: 2 },
      answer,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/attempts/${attempt.attemptId}/answers`,
        body: {
          attemptId: attempt.attemptId,
          activityId: attempt.activityId,
          itemId: answer.itemId,
          response: answer.response,
          idempotencyKey: "save-answer-2026-08-09",
        },
      },
      dependencies({ saveAnswer }),
    );

    expect(response.status).toBe(200);
    expect(saveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        participantId: attempt.participantId,
        itemId: answer.itemId,
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SALVA", answers: [{ itemId: answer.itemId }] },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
  });

  it("reads only an assigned published activity projection", async () => {
    const getParticipantActivity = vi.fn(async () => activity);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({ getParticipantActivity }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantActivity).toHaveBeenCalledWith(
      attempt.participantId,
      activity.activityId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activityId: activity.activityId,
        items: [{ itemId: answer.itemId }],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("source");
  });

  it("reads only the participant progress projection", async () => {
    const getParticipantProgress = vi.fn(async () => progress);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}/progress`,
        body: undefined,
      },
      dependencies({ getParticipantProgress }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantProgress).toHaveBeenCalledWith(
      attempt.participantId,
      activity.activityId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activityId: activity.activityId,
        assignmentStatus: "EM_ANDAMENTO",
        nextAction: "RETOMAR_ATIVIDADE",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("attemptId");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });

  it("returns the participant learning path as one scoped public projection", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (): Promise<ParticipantLearningJourneyState> => ({
        participantId: attempt.participantId,
        assignments: [],
        activities: [
          {
            scopeId: "scope-1",
            activityId: activity.activityId,
            slug: activity.slug,
            title: activity.title,
            status: "EM_ANDAMENTO",
            attemptId: attempt.attemptId,
            attemptStatus: "SALVA",
            attemptVersion: 2,
            nextAction: "RETOMAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [],
        nextAction: "RETOMAR_ATIVIDADE",
      }),
    );
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/learning-path", body: undefined },
      dependencies({ getParticipantLearningJourney }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantLearningJourney).toHaveBeenCalledWith(
      attempt.participantId,
      ["scope-1"],
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activities: [
          {
            activityId: activity.activityId,
            nextAction: "RETOMAR_ATIVIDADE",
          },
        ],
        nextAction: "RETOMAR_ATIVIDADE",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("participantId");
  });

  it("returns the complete 24-month participant dashboard", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (): Promise<ParticipantLearningJourneyState> => ({
        participantId: attempt.participantId,
        assignments: [],
        activities: [],
        results: [],
        runtimes: [],
        nextAction: "INICIAR_ATIVIDADE",
      }),
    );
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({ getParticipantLearningJourney }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        totalMonths: 24,
        totalModules: 24,
        roadmap: expect.any(Array),
      },
    });
    expect(
      (response.body as { data: { roadmap: readonly unknown[] } }).data.roadmap,
    ).toHaveLength(24);
    expect(JSON.stringify(response.body)).not.toContain("correctChoiceIds");
    expect(JSON.stringify(response.body)).not.toContain("sourceRefs");
  });

  it("exposes operations and account security dashboards with honest evidence states", async () => {
    const operations = await handleApiRequest(
      { method: "GET", path: "/api/v1/internal/dashboard", body: undefined },
      dependencies({
        authenticate: async () => ({
          principalId: "88888888-8888-4888-8888-888888888888",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
        dependencyStatus: async () => ({
          status: "READY" as const,
          dependencies: {
            postgres: "UP" as const,
            qdrant: "DISABLED" as const,
            ai: "DISABLED" as const,
          },
        }),
      }),
    );
    expect(operations.status).toBe(200);
    expect(operations.body).toMatchObject({
      success: true,
      data: {
        dependencyStatus: "READY",
        evidence: { load: "NOT_EXECUTED", failover: "NOT_EXECUTED" },
      },
    });

    const account = await handleApiRequest(
      { method: "GET", path: "/api/v1/account/security", body: undefined },
      dependencies(),
    );
    expect(account).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: {
          provider: "NOT_CONFIGURED",
          recovery: "UNAVAILABLE",
          mfa: "UNAVAILABLE",
          session: "ACTIVE",
        },
      },
    });
  });

  it("delegates recovery and MFA enrollment without storing authentication secrets", async () => {
    const identityProvider = {
      getSecurityStatus: vi.fn(async () => ({
        provider: "EXTERNAL_IDENTITY_PROVIDER" as const,
        recovery: "AVAILABLE" as const,
        mfa: "NOT_ENABLED" as const,
      })),
      beginRecovery: vi.fn(async () => ({
        operationId: "recovery-operation",
        expiresAt: "2026-08-10T06:00:00.000Z",
      })),
      beginMfaEnrollment: vi.fn(async () => ({
        operationId: "mfa-operation",
        expiresAt: "2026-08-10T06:00:00.000Z",
      })),
    };
    const overrides = {
      identityProvider,
      authenticate: async () => ({
        principalId: attempt.participantId,
        accountStatus: "ACTIVE" as const,
        roles: ["PARTICIPANT"] as const,
        scopes: ["scope-1"],
      }),
    };
    const recovery = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/account/recovery/start",
        body: {},
      },
      dependencies(overrides),
    );
    const mfa = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/account/mfa/enrollment",
        body: {},
      },
      dependencies(overrides),
    );

    expect(recovery).toMatchObject({
      status: 202,
      body: { success: true, data: { operationId: "recovery-operation" } },
    });
    expect(mfa).toMatchObject({
      status: 202,
      body: { success: true, data: { operationId: "mfa-operation" } },
    });
    expect(identityProvider.beginRecovery).toHaveBeenCalledWith(
      attempt.participantId,
    );
    expect(identityProvider.beginMfaEnrollment).toHaveBeenCalledWith(
      attempt.participantId,
    );
    expect(JSON.stringify(recovery)).not.toContain("secret");
  });

  it("reads only the public curriculum runtime projection", async () => {
    const getParticipantCurriculumRuntime = vi.fn(
      async () => curriculumRuntime,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/curriculum/modules/M03/runtime",
        body: undefined,
      },
      dependencies({ getParticipantCurriculumRuntime }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantCurriculumRuntime).toHaveBeenCalledWith(
      attempt.participantId,
      "M03",
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        moduleId: "M03",
        version: 2,
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        remediationCount: 0,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("objectiveResults");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });

  it("allows only a scoped moderator to evaluate and persist a curriculum module", async () => {
    const evaluateCurriculumRuntime = vi.fn(async () => curriculumRuntime);
    const runtimeScope = "22222222-2222-4222-8222-222222222222";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/curriculum/modules/M03/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: runtimeScope,
          answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
          completedAt: "2026-08-10T01:00:00.000Z",
          mode: "FORMATIVE_CHOICE",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [runtimeScope],
        }),
        evaluateCurriculumRuntime,
      }),
    );

    expect(response.status).toBe(200);
    expect(evaluateCurriculumRuntime).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      scopeId: runtimeScope,
      answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
      completedAt: "2026-08-10T01:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
      moduleId: "M03",
    });
    expect(JSON.stringify(response.body)).not.toContain("objectiveResults");

    const forbidden = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/curriculum/modules/M03/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: runtimeScope,
          answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
          completedAt: "2026-08-10T01:00:00.000Z",
        },
      },
      dependencies({
        evaluateCurriculumRuntime,
        authenticate: async () => ({
          principalId: attempt.participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [runtimeScope],
        }),
      }),
    );
    expect(forbidden.status).toBe(403);
  });

  it("protects learning-state routes by capability, scope, version and public projection", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const participantId = "22222222-2222-4222-8222-222222222222";
    const assignment: LearningAssignmentState = {
      assignmentId: "33333333-3333-4333-8333-333333333333",
      participantId,
      moduleId: "M03",
      availableAt: "2026-08-10T17:00:00.000Z",
      status: "ATRIBUIDO",
      version: 1,
    };
    const workflow: AssessmentWorkflowState = {
      resultId: "44444444-4444-4444-8444-444444444444",
      attemptId: "55555555-5555-4555-8555-555555555555",
      ruleVersion: "summative-v1",
      status: "RESULTADO_DISPONIVEL",
      version: 1,
    };
    const ticket: FeedbackTicketState = {
      ticketId: "66666666-6666-4666-8666-666666666666",
      participantId,
      type: "ERRO_CONTEUDO",
      description: "Relato sintético.",
      createdAt: "2026-08-10T17:00:00.000Z",
      status: "NOVO",
      version: 0,
    };
    const appeal: AppealState = {
      appealId: "77777777-7777-4777-8777-777777777777",
      participantId,
      attemptId: workflow.attemptId,
      itemId: "88888888-8888-4888-8888-888888888888",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "ABERTA",
      version: 0,
    };
    const createLearningAssignment = vi.fn(async () => assignment);
    const transitionLearningAssignment = vi.fn(async () => ({
      ...assignment,
      status: "DISPONIVEL" as const,
      version: 2,
    }));
    const createFeedbackTicket = vi.fn(async () => ticket);
    const createAppeal = vi.fn(async () => appeal);

    const participantResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/learning-assignments",
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignment.availableAt,
        },
      },
      dependencies({
        createLearningAssignment,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(participantResponse.status).toBe(403);
    expect(createLearningAssignment).not.toHaveBeenCalled();

    const staffResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/learning-assignments",
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignment.availableAt,
        },
      },
      dependencies({
        createLearningAssignment,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(staffResponse.status).toBe(201);
    expect(staffResponse.body).toMatchObject({
      success: true,
      data: { assignmentId: assignment.assignmentId, version: 1 },
    });
    expect(JSON.stringify(staffResponse.body)).not.toContain("participantId");

    const transitionResponse = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/learning-assignments/${assignment.assignmentId}/transition`,
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          version: 1,
          event: "DISPONIBILIZAR",
          now: assignment.availableAt,
        },
      },
      dependencies({
        transitionLearningAssignment,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(transitionResponse.status).toBe(200);
    expect(transitionLearningAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: assignment.assignmentId,
        participantId,
        scopeId,
        version: 1,
        event: { type: "DISPONIBILIZAR", now: assignment.availableAt },
      }),
    );

    const feedbackResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/feedback",
        body: {
          scopeId,
          type: "ERRO_CONTEUDO",
          description: "Relato sintético.",
        },
      },
      dependencies({
        createFeedbackTicket,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(feedbackResponse.status).toBe(201);
    expect(createFeedbackTicket).toHaveBeenCalledWith(
      expect.objectContaining({ participantId, scopeId }),
    );
    expect(JSON.stringify(feedbackResponse.body)).not.toContain(
      "participantId",
    );

    const appealResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: workflow.attemptId,
          itemId: appeal.itemId,
          justification: appeal.justification,
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          participantId,
          activityId: attempt.activityId,
        }),
        resolveActivityScope: async () => scopeId,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(appealResponse.status).toBe(201);
    expect(createAppeal).toHaveBeenCalledWith(
      expect.objectContaining({ participantId, scopeId }),
    );
    expect(JSON.stringify(appealResponse.body)).not.toContain("reviewerId");

    expect(
      handleApiRequest(
        {
          method: "POST",
          path: `/api/v1/internal/learning-assignments/${assignment.assignmentId}/transition`,
          body: {
            assignmentId: assignment.assignmentId,
            participantId,
            scopeId,
            version: 1,
            event: "DISPONIBILIZAR",
            now: assignment.availableAt,
          },
        },
        dependencies({
          transitionLearningAssignment: vi.fn(async () => {
            throw new ApplicationError("state_conflict", "stale");
          }),
          authenticate: async () => ({
            principalId: "99999999-9999-4999-8999-999999999999",
            accountStatus: "ACTIVE",
            roles: ["MODERATOR"],
            scopes: [scopeId],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: 409,
      body: { success: false, error: { code: "state_conflict" } },
    });
  });

  it("routes workflow, ticket and appeal transitions through scoped staff contracts", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const participantId = "22222222-2222-4222-8222-222222222222";
    const resultId = "33333333-3333-4333-8333-333333333333";
    const attemptId = "44444444-4444-4444-8444-444444444444";
    const ticketId = "55555555-5555-4555-8555-555555555555";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const itemId = "77777777-7777-4777-8777-777777777777";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const workflow: AssessmentWorkflowState = {
      resultId,
      attemptId,
      ruleVersion: "summative-v1",
      status: "RESULTADO_EM_PROCESSAMENTO",
      version: 0,
    };
    const ticket: FeedbackTicketState = {
      ticketId,
      participantId,
      type: "CONTESTACAO",
      description: "Relato sintético.",
      createdAt: "2026-08-10T17:00:00.000Z",
      status: "NOVO",
      version: 0,
    };
    const appeal: AppealState = {
      appealId,
      participantId,
      attemptId,
      itemId,
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "ABERTA",
      version: 0,
    };
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };
    const createAssessmentWorkflow = vi.fn(async () => workflow);
    const transitionAssessmentWorkflow = vi.fn(async () => ({
      ...workflow,
      status: "RESULTADO_DISPONIVEL" as const,
      version: 1,
    }));
    const transitionFeedbackTicket = vi.fn(async () => ({
      ...ticket,
      status: "TRIADO" as const,
      version: 1,
    }));
    const transitionAppeal = vi.fn(async () => ({
      ...appeal,
      status: "EM_REVISAO" as const,
      reviewerId,
      version: 1,
    }));

    const createdWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: {
          resultId,
          attemptId,
          participantId,
          scopeId,
          ruleVersion: "summative-v1",
        },
      },
      dependencies({
        createAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(createdWorkflow.status).toBe(201);

    const transitionedWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/assessment-workflows/${resultId}/transition`,
        body: {
          resultId,
          participantId,
          scopeId,
          version: 0,
          event: "DISPONIBILIZAR",
        },
      },
      dependencies({
        transitionAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedWorkflow.status).toBe(200);
    expect(transitionAssessmentWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        resultId,
        event: { type: "DISPONIBILIZAR" },
      }),
    );

    const transitionedTicket = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}`,
        body: {
          ticketId,
          participantId,
          scopeId,
          version: 0,
          event: "TRIAR",
        },
      },
      dependencies({
        transitionFeedbackTicket,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedTicket.status).toBe(200);

    const transitionedAppeal = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          participantId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
          reviewerId,
        },
      },
      dependencies({
        transitionAppeal,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedAppeal.status).toBe(200);
    expect(JSON.stringify(transitionedAppeal.body)).not.toContain("reviewerId");

    const invalidWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: { resultId },
      },
      dependencies({
        createAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(invalidWorkflow.status).toBe(422);

    const forbiddenWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/assessment-workflows/${resultId}/transition`,
        body: {
          resultId,
          participantId,
          scopeId,
          version: 0,
          event: "DISPONIBILIZAR",
        },
      },
      dependencies({
        transitionAssessmentWorkflow,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(forbiddenWorkflow.status).toBe(403);

    const missingDependency = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: {
          resultId,
          attemptId,
          participantId,
          scopeId,
          ruleVersion: "summative-v1",
        },
      },
      dependencies({ authenticate: async () => staff }),
    );
    expect(missingDependency.status).toBe(500);
  });

  it("allows only the configured internal correction route and projects no internal actor data", async () => {
    const correctionScope = "99999999-9999-4999-8999-999999999999";
    const correctOpenResponse = vi.fn(async () => ({
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: attempt.attemptId,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback formativo interno.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/attempts/${attempt.attemptId}/correct`,
        body: {
          scopeId: correctionScope,
          idempotencyKey: "correct-attempt-2026",
          score: 82,
          outcome: "APROVADO",
          feedback: "Feedback formativo interno.",
          ruleVersion: "rubrica-v1",
        },
      },
      dependencies({
        approvedClinicalApproverId: attempt.participantId,
        resolveActivityScope: async () => correctionScope,
        authenticate: async () => ({
          principalId: attempt.participantId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [correctionScope],
        }),
        correctOpenResponse,
      }),
    );

    expect(response.status).toBe(200);
    expect(correctOpenResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        approvedClinicalApproverId: attempt.participantId,
        score: 82,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        attemptStatus: "CORRIGIDA_HUMANAMENTE",
        resultVersion: 1,
        feedback: "Feedback formativo interno.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("correctedBy");
    expect(JSON.stringify(response.body)).not.toContain("resultId");
  });

  it("returns feedback only to the attempt owner and omits internal correction identity", async () => {
    const getAttemptFeedback = vi.fn(async () => ({
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: attempt.attemptId,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback próprio.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/attempts/${attempt.attemptId}/feedback`,
        body: undefined,
      },
      dependencies({ getAttemptFeedback }),
    );

    expect(response.status).toBe(200);
    expect(getAttemptFeedback).toHaveBeenCalledWith(
      attempt.participantId,
      attempt.attemptId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { feedback: "Feedback próprio.", score: 82 },
    });
    expect(JSON.stringify(response.body)).not.toContain("correctedBy");
    expect(JSON.stringify(response.body)).not.toContain("resultId");
  });

  it("does not turn an unavailable activity into a public success", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({
        getParticipantActivity: async () => {
          throw new ApplicationError(
            "not_found",
            "Activity is not available in the current scope",
          );
        },
      }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
  });

  it("routes internal content transitions without returning authored text", async () => {
    const internalScopeId = "22222222-2222-4222-8222-222222222222";
    const advanceContent = vi.fn(async (command) => ({
      contentId: command.contentId,
      version: command.version,
      scopeId: command.scopeId,
      status: "PUBLICADO" as const,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/content/${activity.activityId}/transition`,
        body: {
          version: 1,
          scopeId: internalScopeId,
          event: "PUBLICAR",
        },
      },
      dependencies({
        approvedClinicalApproverId: "ricardo-account",
        authenticate: async () => ({
          principalId: "ricardo-account",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [internalScopeId],
        }),
        advanceContent,
      }),
    );

    expect(response.status).toBe(200);
    expect(advanceContent).toHaveBeenCalledWith({
      principalId: "ricardo-account",
      accountStatus: "ACTIVE",
      roles: ["CLINICAL_APPROVER"],
      scopes: [internalScopeId],
      contentId: activity.activityId,
      version: 1,
      scopeId: internalScopeId,
      event: "PUBLICAR",
      correlationId: "request-123",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        contentId: activity.activityId,
        version: 1,
        status: "PUBLICADO",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("participantText");
  });

  it("returns readiness failure without exposing infrastructure details", async () => {
    const response = await handleApiRequest(
      { method: "GET", path: "/health/ready", body: undefined },
      dependencies({
        healthcheck: async () => {
          throw new Error("postgres password=secret");
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "internal_error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });
});
