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
  type DiagnosticResultState,
  type ParticipantActivityState,
  type ParticipantReflectionState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
  type StaffDashboardState,
  type ContinuingEducationReportState,
  type ReflectionManagementState,
  type ContentReviewQueueState,
  type AppealReviewQueueState,
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

const reflection: ParticipantReflectionState = {
  status: "EM_ANDAMENTO",
  nextAction: "RETOMAR_REFLEXAO",
  itemCount: 1,
  answeredItemCount: 1,
  answers: [
    {
      itemId: answer.itemId,
      response: "Próxima ação própria.",
      savedAt: "2026-08-23T20:00:00.000Z",
    },
  ],
  evidence: "REFLEXAO_DIGITAL",
  practicalCompetenceClaim: "PROIBIDO_MVP",
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

const staffDashboard: StaffDashboardState = {
  scopes: ["scope-1"],
  generatedAt: "2026-08-10T05:00:00.000Z",
  metrics: {
    invitedParticipants: 2,
    activeParticipants: 1,
    inactiveParticipants: 0,
    assignedModules: 2,
    completedModules: 1,
    completionRatePercent: 50,
    medianProgressPercent: 50,
    pendingCorrections: 1,
    remediationParticipants: 1,
    retentionReviewsPending: 1,
    openFeedback: 1,
    content: {
      published: 4,
      inReview: 1,
      expired: 0,
      withdrawn: 0,
    },
  },
  participants: [
    {
      participantId: attempt.participantId,
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE",
      scopeIds: ["scope-1"],
      lastSeenAt: "2026-08-10T04:00:00.000Z",
      progress: {
        assignedModules: 2,
        completedModules: 1,
        progressPercent: 50,
        remediationModules: 1,
        retentionReviewsPending: 1,
      },
      pendingCorrections: 1,
      openFeedback: 1,
      nextAction: "AGUARDAR_CORRECAO_HUMANA",
      diagnosticProfile: [
        {
          themeId: "B07-S1",
          themeLabel: "Núcleo clínico e segurança",
          status: "BASELINE_REGISTRADA",
          scorePercent: 75,
          answeredItemCount: 30,
          itemCount: 40,
          recommendedModuleIds: ["M01", "M11"],
          lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S2",
          themeLabel: "Emergência e priorização",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S3",
          themeLabel: "Internação, monitoramento e integração",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      ],
    },
  ],
};

const continuingEducationReport: ContinuingEducationReportState = {
  kind: "continuing_education_report",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-23T20:00:00.000Z",
  filters: {
    scopeId: "11111111-1111-4111-8111-111111111111",
    moduleId: "M02",
    accountStatus: "ACTIVE",
  },
  summary: {
    participantCount: 1,
    invitedParticipants: 0,
    activeParticipants: 1,
    suspendedParticipants: 0,
    deactivatedParticipants: 0,
    assignedModules: 1,
    completedModules: 1,
    completionRatePercent: 100,
    completedDigitalMinutes: 360,
    completedDigitalHours: 6,
  },
  participants: [
    {
      participantId: "22222222-2222-4222-8222-222222222222",
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE",
      assignedModules: 1,
      completedModules: 1,
      progressPercent: 100,
      completedDigitalMinutes: 360,
      completedDigitalHours: 6,
      lastSeenAt: "2026-08-23T19:00:00.000Z",
    },
  ],
  modules: [
    {
      moduleId: "M02",
      month: 2,
      scheduledMinutes: 360,
      assignedParticipants: 1,
      completedParticipants: 1,
      completionRatePercent: 100,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 25,
    totalParticipants: 1,
    totalPages: 1,
    hasNextPage: false,
  },
  learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
  hoursClaim: "NAO_CREDENCIADAS",
  practicalCompetenceClaim: "PROIBIDO_MVP",
};

const reflectionManagementReport: ReflectionManagementState = {
  kind: "reflection_management_aggregate",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-23T20:00:00.000Z",
  modules: [
    {
      moduleId: "M02",
      totalAssignments: 3,
      counts: { NAO_INICIADA: 1, EM_ANDAMENTO: 1, CONCLUIDA: 1 },
    },
  ],
  evidence: "REFLEXAO_DIGITAL",
  practicalCompetenceClaim: "PROIBIDO_MVP",
};

const contentReviewQueue: ContentReviewQueueState = {
  kind: "content_review_queue",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-23T20:00:00.000Z",
  filters: {
    scopeId: "11111111-1111-4111-8111-111111111111",
    status: "EM_REVISAO_CLINICA",
    limit: 25,
  },
  items: [
    {
      contentId: "22222222-2222-4222-8222-222222222222",
      version: 1,
      scopeId: "11111111-1111-4111-8111-111111111111",
      moduleId: "M02",
      sessionId: "M02-S1",
      title: "Prioridade sintética",
      authorId: "33333333-3333-4333-8333-333333333333",
      status: "EM_REVISAO_CLINICA",
      preflight: {
        technicalChecksPassed: true,
        checkedAt: "2026-08-23T19:00:00.000Z",
      },
      updatedAt: "2026-08-23T19:30:00.000Z",
      canOpenAuthoring: true,
      nextAction: "REVISAR_CLINICAMENTE",
    },
  ],
};

const appealReviewQueue: AppealReviewQueueState = {
  kind: "appeal_review_queue",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-23T20:00:00.000Z",
  filters: {
    scopeId: "11111111-1111-4111-8111-111111111111",
    status: "ABERTA",
    limit: 25,
  },
  items: [
    {
      appealId: "22222222-2222-4222-8222-222222222222",
      participantId: "33333333-3333-4333-8333-333333333333",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "55555555-5555-4555-8555-555555555555",
      justification: "Solicito revisão do resultado sintético.",
      createdAt: "2026-08-23T19:00:00.000Z",
      dueAt: "2026-09-02T19:00:00.000Z",
      status: "ABERTA",
      version: 0,
    },
  ],
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
  sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
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
  contentStatus: "EM_REVISAO_CLINICA",
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
    isParticipantInScope: async () => true,
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

  it("records a redacted anonymous rejection with a normalized route", async () => {
    const audit = { append: vi.fn(async () => undefined) };
    const protectedFixture = ["opaque", "audit", "fixture"].join("-");
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts/11111111-1111-4111-8111-111111111111/submit",
        route: "/api/v1/attempts/:attemptId/submit",
        body: { token: protectedFixture },
      },
      dependencies({
        requestIdFactory: () => "11111111-1111-4111-8111-111111111111",
        audit,
        authenticate: async () => null,
      }),
    );

    expect(response.status).toBe(401);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKind: "ANONYMOUS",
        action: "HTTP_REQUEST_REJECTED",
        resourceType: "http_route",
        resourceId: "/api/v1/attempts/:attemptId/submit",
        outcome: "DENIED",
        reasonCode: "api_unauthenticated",
      }),
    );
    expect(JSON.stringify(audit.append.mock.calls[0])).not.toContain(
      protectedFixture,
    );
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

    const denied = await handleApiRequest(
      { method: "GET", path: "/internal/metrics", body: undefined },
      dependencies(),
    );
    expect(denied.status).toBe(403);
  });

  it("exposes a protected operational snapshot with explicit no-data alerts", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    observability.metrics.increment("api.requests.total", {
      route: "/api/v1/dashboard",
      status: "200",
      outcome: "success",
    });
    const dependencyStatus = vi.fn(async () => ({
      status: "DEGRADED" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DOWN" as const,
        ai: "DISABLED" as const,
      },
    }));

    const response = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({
        observability,
        dependencyStatus,
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );

    expect(response).toMatchObject({
      status: 200,
      body: {
        success: true,
        data: {
          status: "DEGRADED",
          dependencies: { postgres: "UP", qdrant: "DOWN", ai: "DISABLED" },
          slos: [
            { id: "core.availability", status: "PASS" },
            { id: "api.read.p95", status: "NO_DATA" },
            { id: "api.mutation.p95", status: "NO_DATA" },
          ],
          alerts: [
            { code: "qdrant_degraded", severity: "warning" },
            { code: "slo_no_data", severity: "warning" },
            { code: "slo_no_data", severity: "warning" },
          ],
        },
      },
    });
    expect(dependencyStatus).toHaveBeenCalledOnce();
    expect(JSON.stringify(response)).not.toMatch(
      /participant|email|token|cookie|prompt|source|photo|pdf/iu,
    );
  });

  it("fails closed when an operational snapshot cannot authenticate or read dependencies", async () => {
    const unauthenticated = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({ authenticate: async () => null }),
    );
    expect(unauthenticated.status).toBe(401);

    const forbidden = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies(),
    );
    expect(forbidden.status).toBe(403);

    const unavailable = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependencies({
        observability: createObservability({
          service: "api",
          sink: () => undefined,
        }),
        dependencyStatus: async () => {
          throw new Error("dependency details stay internal");
        },
        authenticate: async () => ({
          principalId: "auditor-1",
          accountStatus: "ACTIVE",
          roles: ["AUDITOR"],
          scopes: [],
        }),
      }),
    );
    expect(unavailable.status).toBe(503);
    expect(JSON.stringify(unavailable)).not.toContain(
      "dependency details stay internal",
    );
  });

  it("maps ready and not-ready dependency states to explicit operational statuses", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const authenticateAuditor = async () => ({
      principalId: "auditor-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUDITOR" as const],
      scopes: [],
    });
    const dependenciesFor = (
      status: "READY" | "NOT_READY",
    ): ApiHttpDependencies =>
      dependencies({
        observability,
        authenticate: authenticateAuditor,
        dependencyStatus: async () => ({
          status,
          dependencies: {
            postgres: status === "READY" ? ("UP" as const) : ("DOWN" as const),
            qdrant: "DISABLED" as const,
            ai: "DISABLED" as const,
          },
        }),
      });

    const ready = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependenciesFor("READY"),
    );
    const notReady = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      dependenciesFor("NOT_READY"),
    );

    expect(ready).toMatchObject({
      status: 200,
      body: { success: true, data: { status: "READY" } },
    });
    expect(notReady).toMatchObject({
      status: 503,
      body: {
        success: true,
        data: {
          status: "NOT_READY",
          alerts: expect.arrayContaining([
            { code: "postgres_not_ready", severity: "critical" },
          ]),
        },
      },
    });
  });

  it("rejects unexpected operational input and allowlists dependency redaction", async () => {
    const observability = createObservability({
      service: "api",
      sink: () => undefined,
    });
    const dependencyStatus = vi.fn(
      async () =>
        ({
          status: "READY",
          dependencies: {
            postgres: "UP",
            qdrant: "DISABLED",
            ai: "DISABLED",
            internalLeak: "must-not-publish",
          },
        }) as unknown as Awaited<
          ReturnType<NonNullable<ApiHttpDependencies["dependencyStatus"]>>
        >,
    );
    const auditor = async () => ({
      principalId: "auditor-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUDITOR" as const],
      scopes: [],
    });
    const base = dependencies({
      observability,
      dependencyStatus,
      authenticate: auditor,
    });
    const unexpectedQuery = await handleApiRequest(
      {
        method: "GET",
        path: "/internal/operations",
        query: { participantId: "not-accepted" },
        body: undefined,
      },
      base,
    );
    const unexpectedBody = await handleApiRequest(
      {
        method: "GET",
        path: "/internal/operations",
        body: {},
      },
      base,
    );

    expect(unexpectedQuery.status).toBe(422);
    expect(unexpectedBody.status).toBe(422);
    expect(dependencyStatus).not.toHaveBeenCalled();

    const valid = await handleApiRequest(
      { method: "GET", path: "/internal/operations", body: undefined },
      base,
    );
    expect(valid.status).toBe(200);
    expect(valid.body).toMatchObject({
      success: true,
      data: {
        dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
      },
    });
    expect(JSON.stringify(valid)).not.toContain("must-not-publish");
  });

  it("keeps internal authoring metadata behind staff authorization", async () => {
    const getInternalAuthoringRecord = vi.fn(async () => authoringRecord);
    const staffResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/versions/1/authoring`,
        query: { scopeId: authoringRecord.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: authoringRecord.authorId,
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
        query: { scopeId: authoringRecord.scopeId },
        body: undefined,
      },
      dependencies({ getInternalAuthoringRecord }),
    );
    expect(participantResponse.status).toBe(403);
    expect(getInternalAuthoringRecord).toHaveBeenCalledTimes(1);
  });

  it("persists the B-07 draft evaluation only behind scoped moderation and returns theme aggregates", async () => {
    const state: DiagnosticResultState = {
      resultId: "33333333-3333-4333-8333-333333333333",
      participantId: attempt.participantId,
      scopeId: "11111111-1111-4111-8111-111111111111",
      diagnosticId: "B07-DIAGNOSTIC-V1",
      version: "0.1.0",
      completedAt: "2026-08-23T12:00:00.000Z",
      result: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        version: "0.1.0",
        notPunitive: true,
        noGlobalPassFail: true,
        totalItemCount: 120,
        answeredItemCount: 1,
        themeResults: [
          {
            themeId: "B07-S1",
            itemCount: 40,
            answeredItemCount: 1,
            earnedPoints: 1,
            possiblePoints: 1,
            percent: 100,
            recommendedModuleIds: ["M01"],
          },
          {
            themeId: "B07-S2",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M02"],
          },
          {
            themeId: "B07-S3",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M11"],
          },
        ],
        recommendedModuleIds: ["M01", "M02", "M11"],
        remediationObjectiveIds: ["M01-OBJ-01"],
      },
    };
    const evaluateDiagnosticDraft = vi.fn(async () => state);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/diagnostics/b07/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-08-23T12:00:00.000Z",
          answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        evaluateDiagnosticDraft,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        themes: [
          { themeId: "B07-S1", scorePercent: 100 },
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "remediationObjectiveIds",
    );
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
    expect(evaluateDiagnosticDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: attempt.participantId,
        scopeId: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });

  it("rejects a diagnostic draft for a participant outside the moderator scope", async () => {
    const evaluateDiagnosticDraft = vi.fn(async () => {
      throw new Error("must not evaluate an out-of-scope participant");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/diagnostics/b07/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-08-23T12:00:00.000Z",
          answers: [{ itemId: "B07-S1-I001", selectedChoiceIds: ["a"] }],
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        isParticipantInScope: async () => false,
        evaluateDiagnosticDraft,
      }),
    );

    expect(response.status).toBe(403);
    expect(evaluateDiagnosticDraft).not.toHaveBeenCalled();
  });

  it("accepts a scoped clinical review without exposing it to the participant route", async () => {
    const reviewAuthoringContent = vi.fn(async () => ({
      record: {
        ...authoringRecord,
        contentStatus: "APROVADO_CLINICAMENTE" as const,
      },
      review: {
        reviewerId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        decision: "APROVAR_CLINICAMENTE" as const,
        rationale: "Revisão sintética.",
        reviewedAt: "2026-08-10T05:00:00.000Z",
        correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      },
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
        approvedClinicalApproverId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
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
    expect(response.body).toMatchObject({
      success: true,
      data: { contentStatus: "APROVADO_CLINICAMENTE" },
    });
    expect(reviewAuthoringContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: authoringRecord.contentId,
        decision: "APROVAR_CLINICAMENTE",
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

  it("changes a participant account only through an authorized scoped admin route", async () => {
    const changeAccountStatus = vi.fn(async () => ({
      accountId: attempt.participantId,
      status: "DEACTIVATED" as const,
      revokedSessions: 3,
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/accounts/${attempt.participantId}/status`,
        body: {
          scopeId,
          expectedStatus: "ACTIVE",
          status: "DEACTIVATED",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        changeAccountStatus,
      }),
    );

    expect(response.status).toBe(200);
    expect(changeAccountStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
        expectedStatus: "ACTIVE",
        status: "DEACTIVATED",
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "DEACTIVATED", revokedSessions: 3 },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });

  it("resends an invitation only to a scoped administrator and never returns its hash", async () => {
    const resendAccountInvitation = vi.fn(async () => ({
      invitationId: "99999999-9999-4999-8999-999999999999",
      accountId: attempt.participantId,
      professionalEmail: "vet@example.invalid",
      token: "r".repeat(32),
      expiresAt: new Date("2026-08-30T12:00:00.000Z"),
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/accounts/${attempt.participantId}/invitation`,
        body: { scopeId, expiresInSeconds: 3600 },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        resendAccountInvitation,
      }),
    );

    expect(response.status).toBe(200);
    expect(resendAccountInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { professionalEmail: "vet@example.invalid", token: "r".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
    expect(JSON.stringify(response.body)).not.toContain("accountId");
  });

  it("rejects lifecycle actions from a moderator or malformed target before persistence", async () => {
    const changeAccountStatus = vi.fn();
    const response = await handleApiRequest(
      {
        method: "PATCH",
        path: "/api/v1/internal/accounts/not-a-uuid/status",
        body: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          expectedStatus: "ACTIVE",
          status: "SUSPENDED",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        changeAccountStatus,
      }),
    );

    expect(response.status).toBe(422);
    expect(changeAccountStatus).not.toHaveBeenCalled();
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

  it("keeps malformed invitation tokens indistinguishable from unavailable tokens", async () => {
    const acceptInvitation = vi.fn();
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/invitations/accept",
        body: { token: "short", sessionExpiresInSeconds: 3600 },
      },
      dependencies({ acceptInvitation }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("issues scoped recovery only through the internal administrator route", async () => {
    const issueAccountRecovery = vi.fn(async () => ({
      recoveryId: "99999999-9999-4999-8999-999999999999",
      accountId: attempt.participantId,
      professionalEmail: "vet@example.invalid",
      token: "r".repeat(32),
      expiresAt: new Date("2026-08-23T12:30:00.000Z"),
      revokedSessions: 2,
    }));
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/accounts/${attempt.participantId}/recovery`,
        body: { scopeId, expiresInSeconds: 1800 },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
        }),
        issueAccountRecovery,
      }),
    );

    expect(response.status).toBe(200);
    expect(issueAccountRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: attempt.participantId,
        scopeId,
        expiresInSeconds: 1800,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { professionalEmail: "vet@example.invalid", token: "r".repeat(32) },
    });
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
  });

  it("accepts a recovery link anonymously and creates only a new session cookie", async () => {
    const authenticate = vi.fn(async () => null);
    const acceptAccountRecovery = vi.fn(async () => ({
      accountId: attempt.participantId,
      session: {
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        token: "s".repeat(32),
        expiresAt: new Date("2026-08-23T12:30:00.000Z"),
        cookie:
          "__Host-cvg_session=" +
          "s".repeat(32) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/recovery/accept",
        body: { token: "r".repeat(32), sessionExpiresInSeconds: 3600 },
      },
      dependencies({ authenticate, acceptAccountRecovery }),
    );

    expect(response.status).toBe(200);
    expect(authenticate).not.toHaveBeenCalled();
    expect(acceptAccountRecovery).toHaveBeenCalledWith({
      token: "r".repeat(32),
      sessionExpiresInSeconds: 3600,
      correlationId: "request-123",
    });
    expect(response.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "active" },
    });
    expect(JSON.stringify(response.body)).not.toContain("accountId");
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

  it("publishes the participant reflection state without internal or scoring fields", async () => {
    const baseItem = activity.items[0];
    if (baseItem === undefined)
      throw new Error("synthetic activity item missing");
    const reflectionActivity: ParticipantActivityState = {
      ...activity,
      items: [
        {
          ...baseItem,
          kind: "REFLEXAO",
          responseMode: "TEXT",
        },
      ],
      reflection,
    };
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({ getParticipantActivity: async () => reflectionActivity }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        reflection: {
          status: "EM_ANDAMENTO",
          nextAction: "RETOMAR_REFLEXAO",
          answeredItemCount: 1,
          answers: [
            { itemId: answer.itemId, response: "Próxima ação própria." },
          ],
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /score|gabarito|competencia_pratica|scopeId/iu,
    );
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

  it("returns the participant dashboard without internal identity or scope data", async () => {
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
            status: "CONCLUIDO",
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          },
        ],
        results: [],
        runtimes: [],
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
        kind: "participant",
        nextAction: "CONSULTAR_PROXIMO_PASSO",
        progress: {
          assignedActivities: 1,
          completedActivities: 1,
          progressPercent: 100,
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });

  it("returns a scoped staff dashboard only to an active moderator", async () => {
    const getStaffDashboard = vi.fn(async () => staffDashboard);
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["scope-1"],
        }),
        getStaffDashboard,
      }),
    );

    expect(response.status).toBe(200);
    expect(getStaffDashboard).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ["scope-1"],
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "staff",
        scopes: ["scope-1"],
        metrics: { activeParticipants: 1 },
        participants: [
          {
            professionalEmail: "vet@example.invalid",
            diagnosticProfile: expect.arrayContaining([
              expect.objectContaining({
                themeId: "B07-S1",
                scorePercent: 75,
              }),
            ]),
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("M01-OBJ-01");
  });

  it("fails closed when staff dashboard access is not scoped", async () => {
    const getStaffDashboard = vi.fn(async () => staffDashboard);
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "SUSPENDED",
          roles: ["ADMIN"],
          scopes: ["scope-1"],
        }),
        getStaffDashboard,
      }),
    );

    expect(response.status).toBe(403);
    expect(getStaffDashboard).not.toHaveBeenCalled();
  });

  it("returns the filtered digital participation report only to scoped staff", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          moduleId: "M02",
          accountStatus: "ACTIVE",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getContinuingEducationReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getContinuingEducationReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        accountStatus: "ACTIVE",
      },
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "continuing_education_report",
        summary: { completedDigitalHours: 6 },
        hoursClaim: "NAO_CREDENCIADAS",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
  });

  it("fails closed for an invalid or cross-scope metrics query", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const dependenciesValue = dependencies({
      authenticate: async () => ({
        principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: ["11111111-1111-4111-8111-111111111111"],
      }),
      getContinuingEducationReport,
    });
    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: { scopeId: "not-a-uuid" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(invalid.status).toBe(422);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();

    const crossScope = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: { scopeId: "44444444-4444-4444-8444-444444444444" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(crossScope.status).toBe(403);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();
  });

  it("passes bounded report pagination to the scoped application port", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          page: "2",
          pageSize: "50",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getContinuingEducationReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getContinuingEducationReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        scopeId: "11111111-1111-4111-8111-111111111111",
        page: 2,
        pageSize: 50,
      },
    );
  });

  it("returns only scoped reflection state counts and never participant responses", async () => {
    const getReflectionManagementReport = vi.fn(
      async () => reflectionManagementReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getReflectionManagementReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      { scopeId: "11111111-1111-4111-8111-111111111111" },
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "reflection_management_aggregate",
        modules: [
          {
            moduleId: "M02",
            counts: {
              NAO_INICIADA: 1,
              EM_ANDAMENTO: 1,
              CONCLUIDA: 1,
            },
          },
        ],
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("response");
  });

  it("fails closed for participant, cross-scope, and unexpected reflection query input", async () => {
    const getReflectionManagementReport = vi.fn(
      async () => reflectionManagementReport,
    );
    const participant = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({ getReflectionManagementReport }),
    );
    expect(participant.status).toBe(403);

    const crossScope = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "44444444-4444-4444-8444-444444444444",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );
    expect(crossScope.status).toBe(403);

    const unexpected = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          participantId: attempt.participantId,
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );
    expect(unexpected.status).toBe(422);
    expect(getReflectionManagementReport).not.toHaveBeenCalled();
  });

  it("returns the scoped content review queue and rejects invalid scope input", async () => {
    const getContentReviewQueue = vi.fn(async () => contentReviewQueue);
    const dependenciesValue = dependencies({
      authenticate: async () => ({
        principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: ["11111111-1111-4111-8111-111111111111"],
      }),
      getContentReviewQueue,
    });
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          status: "EM_REVISAO_CLINICA",
          limit: "25",
        },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(response.status).toBe(200);
    expect(getContentReviewQueue).toHaveBeenCalledWith({
      principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountStatus: "ACTIVE",
      roles: ["AUTHOR"],
      scopes: ["11111111-1111-4111-8111-111111111111"],
      query: {
        scopeId: "11111111-1111-4111-8111-111111111111",
        status: "EM_REVISAO_CLINICA",
        limit: 25,
      },
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "content_review_queue",
        items: [{ nextAction: "REVISAR_CLINICAMENTE" }],
      },
    });

    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: "not-a-uuid" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(invalid.status).toBe(422);
    expect(getContentReviewQueue).toHaveBeenCalledTimes(1);

    const clinicalDenied = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: contentReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [contentReviewQueue.scopeId],
        }),
        getContentReviewQueue,
      }),
    );
    expect(clinicalDenied.status).toBe(403);

    const clinicalAllowed = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: contentReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        approvedClinicalApproverId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        authenticate: async () => ({
          principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [contentReviewQueue.scopeId],
        }),
        getContentReviewQueue,
      }),
    );
    expect(clinicalAllowed.status).toBe(200);
    expect(getContentReviewQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        approvedClinicalApproverId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    );
  });

  it("fails closed when the content review queue dependency is unavailable", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
      }),
    );
    expect(response.status).toBe(500);
  });

  it("returns the scoped appeal review queue without mutation or public fields", async () => {
    const getAppealReviewQueue = vi.fn(async () => appealReviewQueue);
    const scopeId = appealReviewQueue.scopeId;
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId, status: "ABERTA", limit: "25" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealReviewQueue,
      }),
    );

    expect(response.status).toBe(200);
    expect(getAppealReviewQueue).toHaveBeenCalledWith({
      principalId: "66666666-6666-4666-8666-666666666666",
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [scopeId],
      query: { scopeId, status: "ABERTA", limit: 25 },
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "appeal_review_queue",
        items: [{ justification: "Solicito revisão do resultado sintético." }],
      },
    });
    const item = (
      response.body as {
        readonly data: { readonly items: readonly Record<string, unknown>[] };
      }
    ).data.items[0];
    expect(item).not.toHaveProperty("response");
    expect(item).not.toHaveProperty("score");
    expect(item).not.toHaveProperty("answerKey");
  });

  it("denies participant access and rejects unknown queue filters", async () => {
    const getAppealReviewQueue = vi.fn(async () => appealReviewQueue);
    const scopeId = appealReviewQueue.scopeId;
    const participant = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId },
        body: undefined,
      },
      dependencies({ getAppealReviewQueue }),
    );
    expect(participant.status).toBe(403);
    expect(getAppealReviewQueue).not.toHaveBeenCalled();

    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId, participantId: attempt.participantId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealReviewQueue,
      }),
    );
    expect(invalid.status).toBe(422);
    expect(getAppealReviewQueue).not.toHaveBeenCalled();
  });

  it("fails closed when the appeal review queue dependency is unavailable", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId: appealReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [appealReviewQueue.scopeId],
        }),
      }),
    );
    expect(response.status).toBe(500);
  });

  it("returns only the authenticated internal session scopes", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/session/scopes",
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
          ],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "internal_session_scopes",
        scopes: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      },
    });

    const denied = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/session/scopes",
        body: undefined,
      },
      dependencies(),
    );
    expect(denied.status).toBe(403);
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
      itemId: answer.itemId,
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
    const getParticipantFeedback = vi.fn(async () => [ticket]);
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
          scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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

    const feedbackListResponse = await handleApiRequest(
      { method: "GET", path: "/api/v1/feedback", body: {} },
      dependencies({
        getParticipantFeedback,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(feedbackListResponse.status).toBe(200);
    expect(feedbackListResponse.body).toMatchObject({
      success: true,
      data: { tickets: [{ ticketId: ticket.ticketId, status: "NOVO" }] },
    });
    expect(getParticipantFeedback).toHaveBeenCalledWith({
      participantId,
      scopeIds: [scopeId],
    });
    expect(JSON.stringify(feedbackListResponse.body)).not.toContain(
      "participantId",
    );

    const staffFeedbackListResponse = await handleApiRequest(
      { method: "GET", path: "/api/v1/feedback", body: {} },
      dependencies({
        getParticipantFeedback,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(staffFeedbackListResponse.status).toBe(403);
    expect(getParticipantFeedback).toHaveBeenCalledTimes(1);

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
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        hasParticipantActivityItem: async () => true,
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
    const transitionAppealReview = vi.fn(async () => ({
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
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
        },
      },
      dependencies({
        transitionAppealReview,
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

  it("binds internal appeal transition identity to the authenticated reviewer", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const transitionAppealReview = vi.fn(async () => ({
      appealId,
      participantId: "22222222-2222-4222-8222-222222222222",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "77777777-7777-4777-8777-777777777777",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "EM_REVISAO" as const,
      version: 1,
      reviewerId,
    }));
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };

    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );

    expect(response.status).toBe(200);
    expect(transitionAppealReview).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 0,
      actorId: reviewerId,
      correlationId: "request-123",
      event: { type: "ATRIBUIR_REVISOR" },
    });
    expect(JSON.stringify(response.body)).not.toContain("reviewerId");
  });

  it("rejects client-controlled identities, direct closure, and transition conflicts", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };
    const transitionAppealReview = vi.fn(async () => ({
      appealId,
      participantId: "22222222-2222-4222-8222-222222222222",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "77777777-7777-4777-8777-777777777777",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "EM_REVISAO" as const,
      version: 1,
      reviewerId,
    }));

    const identityInjection = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
          participantId: "22222222-2222-4222-8222-222222222222",
          reviewerId: "99999999-9999-4999-8999-999999999999",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(identityInjection.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const directClosure = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 2,
          event: "ENCERRAR",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(directClosure.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const clientMetadata = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "MANTER_RESULTADO",
          decisionRationale: "A decisão sintética mantém o resultado.",
          decisionAt: "2026-08-24T12:01:00.000Z",
          decisionCorrelationId: "99999999-9999-4999-8999-999999999999",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(clientMetadata.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const forbiddenTransition = vi.fn(async () => {
      throw new ApplicationError(
        "forbidden",
        "Appeal transition requires the assigned reviewer",
      );
    });
    const forbidden = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "MANTER_RESULTADO",
          decisionRationale: "A decisão sintética mantém o resultado.",
        },
      },
      dependencies({
        transitionAppealReview: forbiddenTransition,
        authenticate: async () => staff,
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(forbiddenTransition).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 1,
      actorId: reviewerId,
      correlationId: "request-123",
      event: {
        type: "DECIDIR",
        decision: "MANTER_RESULTADO",
        decisionRationale: "A decisão sintética mantém o resultado.",
      },
    });

    const staleTransition = vi.fn(async () => {
      throw new ApplicationError("state_conflict", "Learning state changed");
    });
    const stale = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
        },
      },
      dependencies({
        transitionAppealReview: staleTransition,
        authenticate: async () => staff,
      }),
    );
    expect(stale.status).toBe(409);
  });

  it("accepts internal decision rationale, binds request correlation, and keeps it out of the public projection", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const correlationId = "99999999-9999-4999-8999-999999999999";
    const decisionRationale = "A revisão sintética fundamenta a decisão.";
    const transitionAppealReview = vi.fn(async () => ({
      appealId,
      participantId: "22222222-2222-4222-8222-222222222222",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "77777777-7777-4777-8777-777777777777",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "DECIDIDA" as const,
      version: 2,
      reviewerId,
      decision: "ANULAR_ITEM" as const,
      decisionRationale,
      decisionAt: "2026-08-24T12:01:00.000Z",
      decisionCorrelationId: correlationId,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "ANULAR_ITEM",
          decisionRationale,
        },
      },
      dependencies({
        requestIdFactory: () => correlationId,
        transitionAppealReview,
        authenticate: async () => ({
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(transitionAppealReview).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 1,
      actorId: reviewerId,
      correlationId,
      event: {
        type: "DECIDIR",
        decision: "ANULAR_ITEM",
        decisionRationale,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("decisionRationale");
    expect(
      JSON.stringify((response.body as { data?: unknown }).data),
    ).not.toContain(correlationId);
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
      approvedClinicalApproverId: "ricardo-account",
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

  it("lists only the participant's redacted appeal protocol", async () => {
    const appeal: AppealState = {
      appealId: "66666666-6666-4666-8666-666666666666",
      participantId: attempt.participantId,
      attemptId: attempt.attemptId,
      itemId: answer.itemId,
      justification: "Não expor esta justificativa na projeção.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      version: 0,
      status: "ABERTA",
      reviewerId: "77777777-7777-4777-8777-777777777777",
    };
    const getParticipantAppeals = vi.fn(async () => [appeal]);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/appeals",
        query: { attemptId: attempt.attemptId },
        body: undefined,
      },
      dependencies({ getParticipantAppeals }),
    );
    expect(response.status).toBe(200);
    expect(getParticipantAppeals).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      scopeId: activity.scopeId,
      attemptId: attempt.attemptId,
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        appeals: [
          {
            appealId: appeal.appealId,
            attemptId: appeal.attemptId,
            itemId: appeal.itemId,
            createdAt: appeal.createdAt,
            dueAt: appeal.dueAt,
            status: "ABERTA",
            version: 0,
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("justificativa");
    expect(JSON.stringify(response.body)).not.toContain("reviewerId");
  });

  it("does not create an appeal for an item outside the owned activity", async () => {
    const createAppeal = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: attempt.attemptId,
          itemId: "88888888-8888-4888-8888-888888888888",
          justification: "Item sintético não pertence à atividade.",
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        hasParticipantActivityItem: async () => false,
      }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
    expect(createAppeal).not.toHaveBeenCalled();
  });

  it("does not create an appeal for a non-answerable activity item", async () => {
    const createAppeal = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: attempt.attemptId,
          itemId: answer.itemId,
          justification: "Item de leitura não deve gerar contestação.",
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        getParticipantActivity: async () => ({
          ...activity,
          items: activity.items.map((item) => ({
            ...item,
            kind: "LEITURA",
          })),
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(createAppeal).not.toHaveBeenCalled();
  });

  it("rejects unexpected appeal query fields at the HTTP boundary", async () => {
    const getParticipantAppeals = vi.fn(async () => []);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/appeals",
        query: { attemptId: attempt.attemptId, scopeId: "scope-1" },
        body: undefined,
      },
      dependencies({ getParticipantAppeals }),
    );

    expect(response.status).toBe(422);
    expect(getParticipantAppeals).not.toHaveBeenCalled();
  });
});
