import { vi } from "vitest";

import type { AnswerState, AttemptState } from "@cvg/domain";
import {
  type AuthoringRecord,
  type ContentRecord,
  type CurriculumRuntimeState,
  type ParticipantActivityState,
  type ParticipantReflectionState,
  type ParticipantProgressState,
  type StaffDashboardState,
  type ContinuingEducationReportState,
  type ReflectionManagementState,
  type ContentReviewQueueState,
  type AppealReviewQueueState,
  type AppealReviewHistoryState,
  type AppealDecisionImpactPreviewState,
  type FeedbackTriageQueueState,
  type FeedbackTicketHistoryState,
} from "@cvg/application";
import {
  createB07DiagnosticSessionCatalog,
  type DiagnosticSessionAggregate,
  type DiagnosticSessionFinalizationState,
  type DiagnosticSessionRepositoryPort,
} from "@cvg/application";

import type { ApiHttpDependencies } from "../http.js";

export const attempt: AttemptState = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  status: "EM_ANDAMENTO",
  version: 1,
};

export const answer: AnswerState = {
  answerId: "44444444-4444-4444-8444-444444444444",
  attemptId: attempt.attemptId,
  itemId: "55555555-5555-4555-8555-555555555555",
  response: "resposta própria",
  savedAt: "2026-08-09T17:00:00.000Z",
};

export const activity: ParticipantActivityState = {
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

export const reflection: ParticipantReflectionState = {
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

export const progress: ParticipantProgressState = {
  participantId: attempt.participantId,
  activityId: activity.activityId,
  scopeId: activity.scopeId,
  assignmentStatus: "EM_ANDAMENTO",
  attemptId: attempt.attemptId,
  attemptStatus: "SALVA",
  attemptVersion: 2,
  nextAction: "RETOMAR_ATIVIDADE",
};

export const staffDashboard: StaffDashboardState = {
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

export const continuingEducationReport: ContinuingEducationReportState = {
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

export const reflectionManagementReport: ReflectionManagementState = {
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

export const contentReviewQueue: ContentReviewQueueState = {
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

export const feedbackTriageQueue: FeedbackTriageQueueState = {
  kind: "feedback_triage_queue",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-24T12:00:00.000Z",
  filters: {
    scopeId: "11111111-1111-4111-8111-111111111111",
    status: "NOVO",
    limit: 25,
  },
  items: [
    {
      ticketId: "22222222-2222-4222-8222-222222222222",
      type: "ERRO_CONTEUDO",
      description: "Relato sintético para triagem.",
      createdAt: "2026-08-24T11:00:00.000Z",
      status: "NOVO",
      version: 0,
      priority: "NORMAL",
    },
  ],
  hasNext: true,
  nextCursor: "cursor-page-2",
};

export const feedbackTicketHistory: FeedbackTicketHistoryState = {
  ticketId: "22222222-2222-4222-8222-222222222222",
  scopeId: "11111111-1111-4111-8111-111111111111",
  events: [
    {
      historyId: "33333333-3333-4333-8333-333333333333",
      ticketId: "22222222-2222-4222-8222-222222222222",
      ticketVersion: 0,
      eventType: "CRIADO",
      toStatus: "NOVO",
      createdAt: "2026-08-24T11:00:00.000Z",
    },
    {
      historyId: "44444444-4444-4444-8444-444444444444",
      ticketId: "22222222-2222-4222-8222-222222222222",
      ticketVersion: 1,
      eventType: "STATUS_ALTERADO",
      fromStatus: "NOVO",
      toStatus: "TRIADO",
      createdAt: "2026-08-24T12:00:00.000Z",
    },
  ],
};

export const appealReviewQueue: AppealReviewQueueState = {
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

export const appealReviewHistory: AppealReviewHistoryState = {
  appealId: "44444444-4444-4444-8444-444444444444",
  scopeId: "11111111-1111-4111-8111-111111111111",
  events: [
    {
      historyId: "55555555-5555-4555-8555-555555555555",
      appealId: "44444444-4444-4444-8444-444444444444",
      appealVersion: 1,
      eventType: "DECIDIR",
      fromStatus: "EM_REVISAO",
      toStatus: "DECIDIDA",
      reviewerId: "66666666-6666-4666-8666-666666666666",
      decision: "MANTER_RESULTADO",
      decisionRationale: "Rationale interno sintético.",
      decisionAt: "2026-08-24T12:00:00.000Z",
      decisionCorrelationId: "77777777-7777-4777-8777-777777777777",
      createdAt: "2026-08-24T12:00:01.000Z",
    },
  ],
};

export const appealDecisionImpact: AppealDecisionImpactPreviewState = {
  kind: "appeal_decision_impact_preview",
  appealId: appealReviewHistory.appealId,
  decision: "ANULAR_ITEM",
  appeal: { status: "EM_REVISAO", version: 1 },
  target: {
    attemptId: "88888888-8888-4888-8888-888888888888",
    itemId: "99999999-9999-4999-8999-999999999999",
    attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
    attemptVersion: 3,
  },
  latestResult: { availability: "AVAILABLE", version: 2 },
  impact: {
    scoreImpact: "NOT_COMPUTED",
    recalculation: "NOT_AVAILABLE_IN_THIS_SLICE",
    automaticMutation: "NONE",
    publication: "NOT_PERFORMED",
  },
};

export const curriculumRuntime: CurriculumRuntimeState = {
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

export const authoringRecord: AuthoringRecord = {
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

export const authoringDraftRequest = {
  idempotencyKey: "authoring-draft-http-2026-08-24",
  scopeId: authoringRecord.scopeId,
  moduleId: authoringRecord.moduleId,
  sessionId: authoringRecord.sessionId,
  objectiveId: authoringRecord.objectiveId,
  ordinal: authoringRecord.participant.ordinal,
  title: authoringRecord.title,
  prompt: authoringRecord.prompt,
  responseMode: "CHOICE" as const,
  choices: authoringRecord.choices,
  correctChoiceIds: authoringRecord.correctChoiceIds,
  feedback: authoringRecord.feedback,
  critical: authoringRecord.critical,
  remediationTargetObjectiveId: authoringRecord.remediationTargetObjectiveId,
  sourceRefs: authoringRecord.sourceRefs,
};

export function dependencies(
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

export const diagnosticCatalog = createB07DiagnosticSessionCatalog();
export const diagnosticSessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const diagnosticAggregate: DiagnosticSessionAggregate = {
  session: {
    sessionId: diagnosticSessionId,
    participantId: attempt.participantId,
    scopeId: "scope-1",
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    startedAt: "2026-08-26T14:00:00.000Z",
    status: "EM_ANDAMENTO",
    version: 0,
  },
  catalog: diagnosticCatalog.snapshot,
  answers: [],
};
export const finalizedDiagnosticAggregate: DiagnosticSessionAggregate = {
  ...diagnosticAggregate,
  session: {
    ...diagnosticAggregate.session,
    status: "FINALIZADA",
    version: 1,
    finalizedAt: "2026-08-26T14:05:00.000Z",
  },
  result: {
    resultId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    participantId: attempt.participantId,
    scopeId: "scope-1",
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    completedAt: "2026-08-26T14:05:00.000Z",
    result: {
      diagnosticId: "B07-DIAGNOSTIC-V1",
      version: "0.1.0",
      notPunitive: true,
      noGlobalPassFail: true,
      totalItemCount: 120,
      answeredItemCount: 0,
      themeResults: [
        {
          themeId: "B07-S1",
          itemCount: 40,
          answeredItemCount: 0,
          earnedPoints: 0,
          possiblePoints: 0,
          percent: 0,
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
      remediationObjectiveIds: [],
    },
  },
};

export function diagnosticDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  const repository: DiagnosticSessionRepositoryPort = {
    start: vi.fn(async () => diagnosticAggregate),
    findCurrent: vi.fn(async () => diagnosticAggregate),
    findById: vi.fn(async () => diagnosticAggregate),
    saveAnswer: vi.fn(async () => diagnosticAggregate),
    finalize: vi.fn(
      async () =>
        ({
          aggregate: finalizedDiagnosticAggregate,
          assignments: {
            diagnosticResultId:
              finalizedDiagnosticAggregate.result?.resultId ?? "",
            participantId: attempt.participantId,
            scopeId: "scope-1",
            assignments: [],
          },
        }) satisfies DiagnosticSessionFinalizationState,
    ),
  };
  return dependencies({
    diagnosticSessionRepository: repository,
    diagnosticSessionCatalog: diagnosticCatalog,
    ...overrides,
  });
}
