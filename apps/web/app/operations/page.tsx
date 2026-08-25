"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type DependencyState = Readonly<{
  readonly status: "READY" | "DEGRADED" | "NOT_READY";
  readonly dependencies: Readonly<{
    readonly postgres: "UP" | "DOWN";
    readonly qdrant: "UP" | "DOWN" | "DISABLED";
    readonly ai: "ENABLED" | "DISABLED";
  }>;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
type LoadState = "loading" | "ready" | "error";
type DashboardLoadState =
  "loading" | "ready" | "unauthenticated" | "forbidden" | "error";
type ReportLoadState =
  "idle" | "loading" | "ready" | "unauthenticated" | "forbidden" | "error";
type AuditTrailLoadState = Exclude<ReportLoadState, "idle"> | "idle";
type ReportStatusFilter =
  "" | "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
type AppealReviewQueueStatus =
  "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";
type AppealReviewQueueStatusFilter = "" | AppealReviewQueueStatus;
type FeedbackTriageQueueStatus =
  | "NOVO"
  | "TRIADO"
  | "EM_TRATAMENTO"
  | "AGUARDA_USUARIO"
  | "RESOLVIDO"
  | "DUPLICADO"
  | "NAO_REPRODUZIDO"
  | "NAO_PLANEJADO";
type FeedbackTriageQueueStatusFilter = "" | FeedbackTriageQueueStatus;
type FeedbackTriageQueuePriority = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
type FeedbackTriageMetadataAssignment = "MANTER" | "ASSUMIR" | "LIBERAR";
type FeedbackTriageEvent =
  | "TRIAR"
  | "INICIAR_TRATAMENTO"
  | "AGUARDAR_USUARIO"
  | "RESOLVER"
  | "MARCAR_DUPLICADO"
  | "MARCAR_NAO_REPRODUZIDO"
  | "MARCAR_NAO_PLANEJADO"
  | "RETOMAR_TRATAMENTO";

type AuditTrail = Readonly<{
  readonly kind: "audit_trail";
  readonly scopeId: string;
  readonly generatedAt?: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly action?: string;
    readonly resourceType?: string;
    readonly resourceId?: string;
    readonly principalId?: string;
    readonly actorKind?: "AUTHENTICATED" | "ANONYMOUS";
    readonly outcome?: "SUCCESS" | "DENIED" | "FAILURE";
    readonly from?: string;
    readonly to?: string;
    readonly limit: number;
  }>;
  readonly items: readonly Readonly<{
    readonly auditId: string;
    readonly occurredAt: string;
    readonly actorKind: "AUTHENTICATED" | "ANONYMOUS";
    readonly principalId?: string;
    readonly action: string;
    readonly resourceType: string;
    readonly resourceId?: string;
    readonly scopeId?: string;
    readonly outcome: "SUCCESS" | "DENIED" | "FAILURE";
    readonly reasonCode?: string;
    readonly requestId: string;
    readonly correlationId: string;
    readonly beforeHash?: string;
    readonly afterHash?: string;
  }>[];
  readonly hasNext: boolean;
  readonly nextCursor?: string;
}>;

type AppealReviewHistoryEvent = Readonly<{
  readonly historyId: string;
  readonly appealId: string;
  readonly appealVersion: number;
  readonly eventType:
    | "ATRIBUIR_REVISOR"
    | "DECIDIR"
    | "SOLICITAR_RECALCULO"
    | "CONCLUIR_RECALCULO";
  readonly fromStatus:
    "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE";
  readonly toStatus:
    "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";
  readonly reviewerId?: string;
  readonly decision?: "MANTER_RESULTADO" | "ANULAR_ITEM" | "ALTERAR_RESULTADO";
  readonly decisionRationale?: string;
  readonly decisionAt?: string;
  readonly decisionCorrelationId?: string;
  readonly createdAt: string;
}>;

type AppealReviewHistory = Readonly<{
  readonly appealId: string;
  readonly events: readonly AppealReviewHistoryEvent[];
}>;

type FeedbackTicketHistoryEvent = Readonly<{
  readonly historyId: string;
  readonly ticketId: string;
  readonly ticketVersion: number;
  readonly eventType: "CRIADO" | "STATUS_ALTERADO" | "METADATA_ALTERADO";
  readonly fromStatus?: FeedbackTriageQueueStatus;
  readonly toStatus: FeedbackTriageQueueStatus;
  readonly fromPriority?: FeedbackTriageQueuePriority;
  readonly toPriority?: FeedbackTriageQueuePriority;
  readonly fromAssigneeId?: string | null;
  readonly toAssigneeId?: string | null;
  readonly createdAt: string;
}>;

type FeedbackTicketHistory = Readonly<{
  readonly ticketId: string;
  readonly events: readonly FeedbackTicketHistoryEvent[];
}>;

type FeedbackTriageQueue = Readonly<{
  readonly kind: "feedback_triage_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: FeedbackTriageQueueStatus;
    readonly limit: number;
  }>;
  readonly items: readonly Readonly<{
    readonly ticketId: string;
    readonly type:
      | "BUG_TECNICO"
      | "USABILIDADE"
      | "ERRO_CONTEUDO"
      | "MELHORIA"
      | "CONTESTACAO";
    readonly description: string;
    readonly createdAt: string;
    readonly status: FeedbackTriageQueueStatus;
    readonly version: number;
    readonly priority: FeedbackTriageQueuePriority;
    readonly assigneeId?: string;
  }>[];
  readonly hasNext: boolean;
  readonly nextCursor?: string;
}>;

type FeedbackTriageMetadata = Readonly<{
  readonly ticketId: string;
  readonly scopeId: string;
  readonly status: FeedbackTriageQueueStatus;
  readonly version: number;
  readonly priority: FeedbackTriageQueuePriority;
  readonly assigneeId?: string;
}>;

type InvitationState = "idle" | "submitting" | "success" | "error";
type InvitationContext = "created" | "resent";
type AccountActionState = "idle" | "submitting" | "success" | "error";

type InvitationResult = Readonly<{
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: string;
}>;

type RecoveryResult = Readonly<{
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: string;
  readonly revokedSessions: number;
}>;

type StaffDashboard = Readonly<{
  readonly kind: "staff";
  readonly scopes: readonly string[];
  readonly generatedAt: string;
  readonly metrics: Readonly<{
    readonly invitedParticipants: number;
    readonly activeParticipants: number;
    readonly inactiveParticipants: number;
    readonly assignedModules: number;
    readonly completedModules: number;
    readonly completionRatePercent: number | null;
    readonly medianProgressPercent: number | null;
    readonly pendingCorrections: number;
    readonly remediationParticipants: number;
    readonly retentionReviewsPending: number;
    readonly openFeedback: number;
    readonly content: Readonly<{
      readonly published: number;
      readonly inReview: number;
      readonly expired: number;
      readonly withdrawn: number;
    }>;
  }>;
  readonly participants: readonly Readonly<{
    readonly participantId: string;
    readonly professionalEmail: string;
    readonly accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    readonly scopeIds: readonly string[];
    readonly lastSeenAt?: string;
    readonly progress: Readonly<{
      readonly assignedModules: number;
      readonly completedModules: number;
      readonly progressPercent: number | null;
      readonly remediationModules: number;
      readonly retentionReviewsPending: number;
    }>;
    readonly pendingCorrections: number;
    readonly openFeedback: number;
    readonly nextAction: string;
    readonly diagnosticProfile?: readonly Readonly<{
      readonly themeId: "B07-S1" | "B07-S2" | "B07-S3";
      readonly themeLabel: string;
      readonly status: "SEM_EVIDENCIA_DIGITAL" | "BASELINE_REGISTRADA";
      readonly scorePercent: number | null;
      readonly answeredItemCount: number;
      readonly itemCount: number;
      readonly recommendedModuleIds: readonly string[];
      readonly lastEvaluatedAt?: string;
      readonly evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL";
      readonly notPunitive: true;
      readonly noGlobalPassFail: true;
      readonly practicalCompetenceClaim: "PROIBIDO_MVP";
    }>[];
  }>[];
}>;

type AppealDecisionImpactPreview = Readonly<{
  readonly kind: "appeal_decision_impact_preview";
  readonly appealId: string;
  readonly decision: "ANULAR_ITEM";
  readonly appeal: Readonly<{
    readonly status: AppealReviewQueueStatus;
    readonly version: number;
  }>;
  readonly target: Readonly<{
    readonly attemptId: string;
    readonly itemId: string;
    readonly attemptStatus:
      | "CRIADA"
      | "EM_ANDAMENTO"
      | "SALVA"
      | "SUBMETIDA"
      | "CORRIGIDA_AUTOMATICAMENTE"
      | "AGUARDA_CORRECAO_HUMANA"
      | "CORRIGIDA_HUMANAMENTE"
      | "ANULADA";
    readonly attemptVersion: number;
  }>;
  readonly latestResult: Readonly<{
    readonly availability: "AVAILABLE" | "NOT_AVAILABLE";
    readonly version?: number;
  }>;
  readonly impact: Readonly<{
    readonly scoreImpact: "NOT_COMPUTED";
    readonly recalculation: "NOT_AVAILABLE_IN_THIS_SLICE";
    readonly automaticMutation: "NONE";
    readonly publication: "NOT_PERFORMED";
  }>;
}>;

type ContinuingEducationReport = Readonly<{
  readonly kind: "continuing_education_report";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly moduleId?: string;
    readonly accountStatus?: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  }>;
  readonly summary: Readonly<{
    readonly participantCount: number;
    readonly invitedParticipants: number;
    readonly activeParticipants: number;
    readonly suspendedParticipants: number;
    readonly deactivatedParticipants: number;
    readonly assignedModules: number;
    readonly completedModules: number;
    readonly completionRatePercent: number | null;
    readonly completedDigitalMinutes: number;
    readonly completedDigitalHours: number;
  }>;
  readonly participants: readonly Readonly<{
    readonly participantId: string;
    readonly professionalEmail: string;
    readonly accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    readonly assignedModules: number;
    readonly completedModules: number;
    readonly progressPercent: number | null;
    readonly completedDigitalMinutes: number;
    readonly completedDigitalHours: number;
    readonly lastSeenAt?: string;
  }>[];
  readonly modules: readonly Readonly<{
    readonly moduleId: string;
    readonly month: number;
    readonly scheduledMinutes: number;
    readonly assignedParticipants: number;
    readonly completedParticipants: number;
    readonly completionRatePercent: number | null;
  }>[];
  readonly pagination: Readonly<{
    readonly page: number;
    readonly pageSize: number;
    readonly totalParticipants: number;
    readonly totalPages: number;
    readonly hasNextPage: boolean;
  }>;
  readonly learningEvidence: "ATIVIDADE_MODULAR_DIGITAL";
  readonly hoursClaim: "NAO_CREDENCIADAS";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type ReflectionManagementReport = Readonly<{
  readonly kind: "reflection_management_aggregate";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly modules: readonly Readonly<{
    readonly moduleId: string;
    readonly totalAssignments: number;
    readonly counts: Readonly<{
      readonly NAO_INICIADA: number;
      readonly EM_ANDAMENTO: number;
      readonly CONCLUIDA: number;
    }>;
  }>[];
  readonly evidence: "REFLEXAO_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type AppealReviewQueue = Readonly<{
  readonly kind: "appeal_review_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: AppealReviewQueueStatus;
    readonly limit: number;
  }>;
  readonly items: readonly Readonly<{
    readonly appealId: string;
    readonly participantId: string;
    readonly attemptId: string;
    readonly itemId: string;
    readonly justification: string;
    readonly createdAt: string;
    readonly dueAt: string;
    readonly status: AppealReviewQueueStatus;
    readonly version: number;
    readonly reviewerId?: string;
    readonly decision?:
      "MANTER_RESULTADO" | "ANULAR_ITEM" | "ALTERAR_RESULTADO";
  }>[];
}>;

type ManagedAccountStatus = Exclude<
  StaffDashboard["participants"][number]["accountStatus"],
  "INVITED"
>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function hasOnlyKeys(
  value: ApiRecord,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isDependencyState(value: unknown): value is DependencyState {
  if (!isRecord(value) || !isRecord(value.dependencies)) return false;
  return (
    (value.status === "READY" ||
      value.status === "DEGRADED" ||
      value.status === "NOT_READY") &&
    (value.dependencies.postgres === "UP" ||
      value.dependencies.postgres === "DOWN") &&
    (value.dependencies.qdrant === "UP" ||
      value.dependencies.qdrant === "DOWN" ||
      value.dependencies.qdrant === "DISABLED") &&
    (value.dependencies.ai === "ENABLED" ||
      value.dependencies.ai === "DISABLED")
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPercent(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100)
  );
}

function isDiagnosticProfile(
  value: unknown,
): value is NonNullable<
  StaffDashboard["participants"][number]["diagnosticProfile"]
> {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(
      (item) =>
        isRecord(item) &&
        (item.themeId === "B07-S1" ||
          item.themeId === "B07-S2" ||
          item.themeId === "B07-S3") &&
        typeof item.themeLabel === "string" &&
        (item.status === "SEM_EVIDENCIA_DIGITAL" ||
          item.status === "BASELINE_REGISTRADA") &&
        isPercent(item.scorePercent) &&
        isCount(item.answeredItemCount) &&
        item.answeredItemCount <= 40 &&
        isCount(item.itemCount) &&
        item.itemCount >= 1 &&
        item.itemCount <= 40 &&
        Array.isArray(item.recommendedModuleIds) &&
        item.recommendedModuleIds.every(
          (moduleId) =>
            typeof moduleId === "string" &&
            /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(moduleId),
        ) &&
        (item.lastEvaluatedAt === undefined ||
          typeof item.lastEvaluatedAt === "string") &&
        item.evidence === "DIAGNOSTICO_FORMATIVO_DIGITAL" &&
        item.notPunitive === true &&
        item.noGlobalPassFail === true &&
        item.practicalCompetenceClaim === "PROIBIDO_MVP",
    )
  );
}

function isStaffDashboard(value: unknown): value is StaffDashboard {
  if (!isRecord(value) || value.kind !== "staff") return false;
  const metrics = value.metrics;
  if (!isRecord(metrics)) return false;
  const content = metrics.content;
  if (
    !Array.isArray(value.scopes) ||
    value.scopes.length === 0 ||
    !value.scopes.every(
      (scope) =>
        typeof scope === "string" &&
        scope.trim().length > 0 &&
        scope.length <= 128,
    ) ||
    !isRecord(content) ||
    !Array.isArray(value.participants) ||
    typeof value.generatedAt !== "string"
  ) {
    return false;
  }
  const dashboardScopes = value.scopes as readonly string[];

  const countKeys = [
    "invitedParticipants",
    "activeParticipants",
    "inactiveParticipants",
    "assignedModules",
    "completedModules",
    "pendingCorrections",
    "remediationParticipants",
    "retentionReviewsPending",
    "openFeedback",
  ] as const;
  const contentCountKeys = [
    "published",
    "inReview",
    "expired",
    "withdrawn",
  ] as const;
  if (
    !countKeys.every((key) => isCount(metrics[key])) ||
    !contentCountKeys.every((key) => isCount(content[key])) ||
    !isPercent(metrics.completionRatePercent) ||
    !isPercent(metrics.medianProgressPercent)
  ) {
    return false;
  }

  return value.participants.every((participant) => {
    if (!isRecord(participant) || !isRecord(participant.progress)) return false;
    return (
      typeof participant.participantId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        participant.participantId,
      ) &&
      typeof participant.professionalEmail === "string" &&
      Array.isArray(participant.scopeIds) &&
      participant.scopeIds.length > 0 &&
      participant.scopeIds.every(
        (scopeId) =>
          typeof scopeId === "string" &&
          scopeId.trim().length > 0 &&
          dashboardScopes.includes(scopeId),
      ) &&
      (participant.accountStatus === "INVITED" ||
        participant.accountStatus === "ACTIVE" ||
        participant.accountStatus === "SUSPENDED" ||
        participant.accountStatus === "DEACTIVATED") &&
      (participant.lastSeenAt === undefined ||
        typeof participant.lastSeenAt === "string") &&
      isCount(participant.progress.assignedModules) &&
      isCount(participant.progress.completedModules) &&
      isPercent(participant.progress.progressPercent) &&
      isCount(participant.progress.remediationModules) &&
      isCount(participant.progress.retentionReviewsPending) &&
      isCount(participant.pendingCorrections) &&
      isCount(participant.openFeedback) &&
      typeof participant.nextAction === "string" &&
      (participant.diagnosticProfile === undefined ||
        isDiagnosticProfile(participant.diagnosticProfile))
    );
  });
}

function participantScopeId(
  dashboard: StaffDashboard | null,
  participantId: string,
  preferredScopeId?: string,
): string | undefined {
  const participant = dashboard?.participants.find(
    (candidate) => candidate.participantId === participantId,
  );
  if (participant === undefined) return undefined;
  return (
    (preferredScopeId !== undefined &&
    participant.scopeIds.includes(preferredScopeId)
      ? preferredScopeId
      : undefined) ??
    participant.scopeIds.find((scopeId) => dashboard?.scopes.includes(scopeId))
  );
}

function isAccountStatus(
  value: unknown,
): value is ManagedAccountStatus | "INVITED" {
  return (
    value === "INVITED" ||
    value === "ACTIVE" ||
    value === "SUSPENDED" ||
    value === "DEACTIVATED"
  );
}

function isContinuingEducationReport(
  value: unknown,
): value is ContinuingEducationReport {
  if (!isRecord(value) || value.kind !== "continuing_education_report") {
    return false;
  }
  if (
    typeof value.scopeId !== "string" ||
    typeof value.generatedAt !== "string" ||
    !isRecord(value.filters) ||
    !isRecord(value.summary) ||
    !Array.isArray(value.participants) ||
    !Array.isArray(value.modules) ||
    value.learningEvidence !== "ATIVIDADE_MODULAR_DIGITAL" ||
    value.hoursClaim !== "NAO_CREDENCIADAS" ||
    value.practicalCompetenceClaim !== "PROIBIDO_MVP"
  ) {
    return false;
  }
  const summary = value.summary;
  if (
    typeof value.filters.scopeId !== "string" ||
    (value.filters.moduleId !== undefined &&
      (typeof value.filters.moduleId !== "string" ||
        !/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value.filters.moduleId))) ||
    (value.filters.accountStatus !== undefined &&
      !isAccountStatus(value.filters.accountStatus))
  ) {
    return false;
  }
  const summaryKeys = [
    "participantCount",
    "invitedParticipants",
    "activeParticipants",
    "suspendedParticipants",
    "deactivatedParticipants",
    "assignedModules",
    "completedModules",
    "completedDigitalMinutes",
  ] as const;
  if (
    !summaryKeys.every((key) => isCount(summary[key])) ||
    !isPercent(summary.completionRatePercent) ||
    typeof summary.completedDigitalHours !== "number" ||
    !Number.isFinite(summary.completedDigitalHours) ||
    summary.completedDigitalHours < 0
  ) {
    return false;
  }
  if (!isRecord(value.pagination)) return false;
  if (
    !isCount(value.pagination.page) ||
    value.pagination.page < 1 ||
    !isCount(value.pagination.pageSize) ||
    value.pagination.pageSize < 1 ||
    value.pagination.pageSize > 100 ||
    !isCount(value.pagination.totalParticipants) ||
    !isCount(value.pagination.totalPages) ||
    typeof value.pagination.hasNextPage !== "boolean"
  ) {
    return false;
  }
  if (
    value.participants.some((participant) => {
      if (!isRecord(participant)) return true;
      return (
        typeof participant.participantId !== "string" ||
        typeof participant.professionalEmail !== "string" ||
        !isAccountStatus(participant.accountStatus) ||
        !isCount(participant.assignedModules) ||
        !isCount(participant.completedModules) ||
        !isPercent(participant.progressPercent) ||
        !isCount(participant.completedDigitalMinutes) ||
        typeof participant.completedDigitalHours !== "number" ||
        !Number.isFinite(participant.completedDigitalHours) ||
        participant.completedDigitalHours < 0 ||
        (participant.lastSeenAt !== undefined &&
          typeof participant.lastSeenAt !== "string")
      );
    })
  ) {
    return false;
  }
  return !value.modules.some((module) => {
    if (!isRecord(module)) return true;
    return (
      typeof module.moduleId !== "string" ||
      !/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(module.moduleId) ||
      !isCount(module.month) ||
      module.month < 1 ||
      module.month > 24 ||
      !isCount(module.scheduledMinutes) ||
      !isCount(module.assignedParticipants) ||
      !isCount(module.completedParticipants) ||
      !isPercent(module.completionRatePercent)
    );
  });
}

function isReflectionManagementReport(
  value: unknown,
): value is ReflectionManagementReport {
  if (
    !isRecord(value) ||
    value.kind !== "reflection_management_aggregate" ||
    typeof value.scopeId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value.scopeId,
    ) ||
    typeof value.generatedAt !== "string" ||
    value.evidence !== "REFLEXAO_DIGITAL" ||
    value.practicalCompetenceClaim !== "PROIBIDO_MVP" ||
    !Array.isArray(value.modules) ||
    value.modules.length > 24
  ) {
    return false;
  }
  const moduleIds = new Set<string>();
  return value.modules.every((module) => {
    if (!isRecord(module)) return false;
    const counts = module.counts;
    if (
      typeof module.moduleId !== "string" ||
      !/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(module.moduleId) ||
      moduleIds.has(module.moduleId) ||
      !isCount(module.totalAssignments) ||
      !isRecord(counts) ||
      !isCount(counts.NAO_INICIADA) ||
      !isCount(counts.EM_ANDAMENTO) ||
      !isCount(counts.CONCLUIDA)
    ) {
      return false;
    }
    moduleIds.add(module.moduleId);
    return (
      counts.NAO_INICIADA + counts.EM_ANDAMENTO + counts.CONCLUIDA ===
      module.totalAssignments
    );
  });
}

function isAppealReviewQueueStatus(
  value: unknown,
): value is AppealReviewQueueStatus {
  return (
    value === "ABERTA" ||
    value === "EM_REVISAO" ||
    value === "DECIDIDA" ||
    value === "RECALCULO_PENDENTE" ||
    value === "ENCERRADA"
  );
}

function isAppealReviewQueue(value: unknown): value is AppealReviewQueue {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "kind",
      "scopeId",
      "generatedAt",
      "filters",
      "items",
    ]) ||
    value.kind !== "appeal_review_queue" ||
    !isUuid(value.scopeId) ||
    typeof value.generatedAt !== "string" ||
    Number.isNaN(new Date(value.generatedAt).getTime()) ||
    !isRecord(value.filters) ||
    !hasOnlyKeys(value.filters, ["scopeId", "status", "limit"]) ||
    !isUuid(value.filters.scopeId) ||
    value.filters.scopeId !== value.scopeId ||
    (value.filters.status !== undefined &&
      !isAppealReviewQueueStatus(value.filters.status)) ||
    !isCount(value.filters.limit) ||
    value.filters.limit < 1 ||
    value.filters.limit > 100 ||
    !Array.isArray(value.items) ||
    value.items.length > 100
  ) {
    return false;
  }

  return value.items.every((item) => {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "appealId",
        "participantId",
        "attemptId",
        "itemId",
        "justification",
        "createdAt",
        "dueAt",
        "status",
        "version",
        "reviewerId",
        "decision",
      ]) ||
      !isUuid(item.appealId) ||
      !isUuid(item.participantId) ||
      !isUuid(item.attemptId) ||
      !isUuid(item.itemId) ||
      typeof item.justification !== "string" ||
      item.justification.trim().length === 0 ||
      item.justification.length > 10_000 ||
      /<[^>]*>/u.test(item.justification) ||
      typeof item.createdAt !== "string" ||
      Number.isNaN(new Date(item.createdAt).getTime()) ||
      typeof item.dueAt !== "string" ||
      Number.isNaN(new Date(item.dueAt).getTime()) ||
      !isAppealReviewQueueStatus(item.status) ||
      !isCount(item.version) ||
      (item.reviewerId !== undefined && !isUuid(item.reviewerId)) ||
      (item.decision !== undefined &&
        item.decision !== "MANTER_RESULTADO" &&
        item.decision !== "ANULAR_ITEM" &&
        item.decision !== "ALTERAR_RESULTADO")
    ) {
      return false;
    }
    return true;
  });
}

function isFeedbackTriageQueueStatus(
  value: unknown,
): value is FeedbackTriageQueueStatus {
  return (
    value === "NOVO" ||
    value === "TRIADO" ||
    value === "EM_TRATAMENTO" ||
    value === "AGUARDA_USUARIO" ||
    value === "RESOLVIDO" ||
    value === "DUPLICADO" ||
    value === "NAO_REPRODUZIDO" ||
    value === "NAO_PLANEJADO"
  );
}

function isFeedbackTriageQueuePriority(
  value: unknown,
): value is FeedbackTriageQueuePriority {
  return (
    value === "BAIXA" ||
    value === "NORMAL" ||
    value === "ALTA" ||
    value === "URGENTE"
  );
}

function isFeedbackTriageQueue(
  value: unknown,
): value is Omit<FeedbackTriageQueue, "hasNext" | "nextCursor"> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "kind",
      "scopeId",
      "generatedAt",
      "filters",
      "items",
    ]) ||
    value.kind !== "feedback_triage_queue" ||
    !isUuid(value.scopeId) ||
    typeof value.generatedAt !== "string" ||
    Number.isNaN(new Date(value.generatedAt).getTime()) ||
    !isRecord(value.filters) ||
    !hasOnlyKeys(value.filters, ["scopeId", "status", "limit"]) ||
    !isUuid(value.filters.scopeId) ||
    value.filters.scopeId !== value.scopeId ||
    (value.filters.status !== undefined &&
      !isFeedbackTriageQueueStatus(value.filters.status)) ||
    !isCount(value.filters.limit) ||
    value.filters.limit < 1 ||
    value.filters.limit > 100 ||
    !Array.isArray(value.items) ||
    value.items.length > 100
  ) {
    return false;
  }

  return value.items.every((item) => {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "ticketId",
        "type",
        "description",
        "createdAt",
        "status",
        "version",
        "priority",
        "assigneeId",
      ]) ||
      !isUuid(item.ticketId) ||
      (item.type !== "BUG_TECNICO" &&
        item.type !== "USABILIDADE" &&
        item.type !== "ERRO_CONTEUDO" &&
        item.type !== "MELHORIA" &&
        item.type !== "CONTESTACAO") ||
      typeof item.description !== "string" ||
      item.description.trim().length === 0 ||
      item.description.length > 10_000 ||
      /<[^>]*>/u.test(item.description) ||
      typeof item.createdAt !== "string" ||
      Number.isNaN(new Date(item.createdAt).getTime()) ||
      !isFeedbackTriageQueueStatus(item.status) ||
      !isCount(item.version) ||
      !isFeedbackTriageQueuePriority(item.priority) ||
      (item.assigneeId !== undefined && !isUuid(item.assigneeId))
    ) {
      return false;
    }
    return true;
  });
}

function isFeedbackTriageMetadata(
  value: unknown,
): value is FeedbackTriageMetadata {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "ticketId",
      "scopeId",
      "status",
      "version",
      "priority",
      "assigneeId",
    ]) &&
    isUuid(value.ticketId) &&
    isUuid(value.scopeId) &&
    isFeedbackTriageQueueStatus(value.status) &&
    isCount(value.version) &&
    isFeedbackTriageQueuePriority(value.priority) &&
    (value.assigneeId === undefined || isUuid(value.assigneeId))
  );
}

function isFeedbackTicketHistoryEvent(
  value: unknown,
): value is FeedbackTicketHistoryEvent {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "historyId",
      "ticketId",
      "ticketVersion",
      "eventType",
      "fromStatus",
      "toStatus",
      "fromPriority",
      "toPriority",
      "fromAssigneeId",
      "toAssigneeId",
      "createdAt",
    ]) ||
    !isUuid(value.historyId) ||
    !isUuid(value.ticketId) ||
    !isCount(value.ticketVersion) ||
    (value.eventType !== "CRIADO" &&
      value.eventType !== "STATUS_ALTERADO" &&
      value.eventType !== "METADATA_ALTERADO") ||
    (value.fromStatus !== undefined &&
      !isFeedbackTriageQueueStatus(value.fromStatus)) ||
    !isFeedbackTriageQueueStatus(value.toStatus) ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(new Date(value.createdAt).getTime()) ||
    (value.eventType === "CRIADO" && value.fromStatus !== undefined) ||
    (value.eventType === "STATUS_ALTERADO" && value.fromStatus === undefined) ||
    (value.eventType === "METADATA_ALTERADO" &&
      (value.fromStatus === undefined ||
        value.fromStatus !== value.toStatus ||
        !isFeedbackTriageQueuePriority(value.fromPriority) ||
        !isFeedbackTriageQueuePriority(value.toPriority) ||
        (value.fromAssigneeId !== null &&
          value.fromAssigneeId !== undefined &&
          !isUuid(value.fromAssigneeId)) ||
        (value.toAssigneeId !== null &&
          value.toAssigneeId !== undefined &&
          !isUuid(value.toAssigneeId))))
  ) {
    return false;
  }
  return true;
}

function isFeedbackTicketHistory(
  value: unknown,
): value is FeedbackTicketHistory {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["ticketId", "events"]) ||
    !isUuid(value.ticketId) ||
    !Array.isArray(value.events) ||
    value.events.length > 100 ||
    !value.events.every(isFeedbackTicketHistoryEvent)
  ) {
    return false;
  }
  const versions = new Set<number>();
  return value.events.every((event) => {
    if (
      event.ticketId !== value.ticketId ||
      versions.has(event.ticketVersion)
    ) {
      return false;
    }
    versions.add(event.ticketVersion);
    return true;
  });
}

function isAppealReviewHistoryEvent(
  value: unknown,
): value is AppealReviewHistoryEvent {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "historyId",
      "appealId",
      "appealVersion",
      "eventType",
      "fromStatus",
      "toStatus",
      "reviewerId",
      "decision",
      "decisionRationale",
      "decisionAt",
      "decisionCorrelationId",
      "createdAt",
    ]) ||
    !isUuid(value.historyId) ||
    !isUuid(value.appealId) ||
    !isCount(value.appealVersion) ||
    value.appealVersion < 1 ||
    (value.eventType !== "ATRIBUIR_REVISOR" &&
      value.eventType !== "DECIDIR" &&
      value.eventType !== "SOLICITAR_RECALCULO" &&
      value.eventType !== "CONCLUIR_RECALCULO") ||
    (value.fromStatus !== "ABERTA" &&
      value.fromStatus !== "EM_REVISAO" &&
      value.fromStatus !== "DECIDIDA" &&
      value.fromStatus !== "RECALCULO_PENDENTE") ||
    (value.toStatus !== "EM_REVISAO" &&
      value.toStatus !== "DECIDIDA" &&
      value.toStatus !== "RECALCULO_PENDENTE" &&
      value.toStatus !== "ENCERRADA") ||
    (value.reviewerId !== undefined && !isUuid(value.reviewerId)) ||
    (value.decision !== undefined &&
      value.decision !== "MANTER_RESULTADO" &&
      value.decision !== "ANULAR_ITEM" &&
      value.decision !== "ALTERAR_RESULTADO") ||
    (value.decisionRationale !== undefined &&
      (typeof value.decisionRationale !== "string" ||
        value.decisionRationale.trim().length === 0 ||
        value.decisionRationale.length > 10_000 ||
        /<[^>]*>/u.test(value.decisionRationale))) ||
    (value.decisionAt !== undefined &&
      (typeof value.decisionAt !== "string" ||
        Number.isNaN(new Date(value.decisionAt).getTime()))) ||
    (value.decisionCorrelationId !== undefined &&
      !isUuid(value.decisionCorrelationId)) ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(new Date(value.createdAt).getTime())
  ) {
    return false;
  }
  return true;
}

function isAppealReviewHistory(value: unknown): value is AppealReviewHistory {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["appealId", "events"]) &&
    isUuid(value.appealId) &&
    Array.isArray(value.events) &&
    value.events.length <= 100 &&
    value.events.every(isAppealReviewHistoryEvent)
  );
}

function isAppealDecisionImpactPreview(
  value: unknown,
): value is AppealDecisionImpactPreview {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "kind",
      "appealId",
      "decision",
      "appeal",
      "target",
      "latestResult",
      "impact",
    ]) ||
    value.kind !== "appeal_decision_impact_preview" ||
    !isUuid(value.appealId) ||
    value.decision !== "ANULAR_ITEM" ||
    !isRecord(value.appeal) ||
    !hasOnlyKeys(value.appeal, ["status", "version"]) ||
    !isAppealReviewQueueStatus(value.appeal.status) ||
    !isCount(value.appeal.version) ||
    !isRecord(value.target) ||
    !hasOnlyKeys(value.target, [
      "attemptId",
      "itemId",
      "attemptStatus",
      "attemptVersion",
    ]) ||
    !isUuid(value.target.attemptId) ||
    !isUuid(value.target.itemId) ||
    typeof value.target.attemptStatus !== "string" ||
    ![
      "CRIADA",
      "EM_ANDAMENTO",
      "SALVA",
      "SUBMETIDA",
      "CORRIGIDA_AUTOMATICAMENTE",
      "AGUARDA_CORRECAO_HUMANA",
      "CORRIGIDA_HUMANAMENTE",
      "ANULADA",
    ].includes(value.target.attemptStatus) ||
    !isCount(value.target.attemptVersion) ||
    !isRecord(value.latestResult) ||
    !hasOnlyKeys(value.latestResult, ["availability", "version"]) ||
    (value.latestResult.availability !== "AVAILABLE" &&
      value.latestResult.availability !== "NOT_AVAILABLE") ||
    (value.latestResult.availability === "AVAILABLE" &&
      (!isCount(value.latestResult.version) ||
        value.latestResult.version < 1)) ||
    (value.latestResult.availability === "NOT_AVAILABLE" &&
      value.latestResult.version !== undefined) ||
    !isRecord(value.impact) ||
    !hasOnlyKeys(value.impact, [
      "scoreImpact",
      "recalculation",
      "automaticMutation",
      "publication",
    ]) ||
    value.impact.scoreImpact !== "NOT_COMPUTED" ||
    value.impact.recalculation !== "NOT_AVAILABLE_IN_THIS_SLICE" ||
    value.impact.automaticMutation !== "NONE" ||
    value.impact.publication !== "NOT_PERFORMED"
  ) {
    return false;
  }
  return true;
}

function isAuditTrail(
  value: unknown,
): value is Omit<AuditTrail, "hasNext" | "nextCursor"> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["kind", "scopeId", "filters", "items"]) ||
    value.kind !== "audit_trail" ||
    !isUuid(value.scopeId) ||
    !isRecord(value.filters) ||
    !hasOnlyKeys(value.filters, [
      "scopeId",
      "action",
      "resourceType",
      "resourceId",
      "principalId",
      "actorKind",
      "outcome",
      "from",
      "to",
      "limit",
    ]) ||
    !isUuid(value.filters.scopeId) ||
    value.filters.scopeId !== value.scopeId ||
    (value.filters.action !== undefined &&
      (typeof value.filters.action !== "string" ||
        !/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(value.filters.action))) ||
    (value.filters.resourceType !== undefined &&
      (typeof value.filters.resourceType !== "string" ||
        !/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(
          value.filters.resourceType,
        ))) ||
    (value.filters.resourceId !== undefined &&
      (typeof value.filters.resourceId !== "string" ||
        value.filters.resourceId.trim().length === 0 ||
        value.filters.resourceId.length > 256)) ||
    (value.filters.principalId !== undefined &&
      !isUuid(value.filters.principalId)) ||
    (value.filters.actorKind !== undefined &&
      value.filters.actorKind !== "AUTHENTICATED" &&
      value.filters.actorKind !== "ANONYMOUS") ||
    (value.filters.outcome !== undefined &&
      value.filters.outcome !== "SUCCESS" &&
      value.filters.outcome !== "DENIED" &&
      value.filters.outcome !== "FAILURE") ||
    (value.filters.from !== undefined &&
      (typeof value.filters.from !== "string" ||
        Number.isNaN(new Date(value.filters.from).getTime()))) ||
    (value.filters.to !== undefined &&
      (typeof value.filters.to !== "string" ||
        Number.isNaN(new Date(value.filters.to).getTime()))) ||
    !isCount(value.filters.limit) ||
    value.filters.limit < 1 ||
    value.filters.limit > 100 ||
    !Array.isArray(value.items) ||
    value.items.length > 100
  ) {
    return false;
  }
  return value.items.every((item) => {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "auditId",
        "occurredAt",
        "actorKind",
        "principalId",
        "action",
        "resourceType",
        "resourceId",
        "scopeId",
        "outcome",
        "reasonCode",
        "requestId",
        "correlationId",
        "beforeHash",
        "afterHash",
      ]) ||
      !isUuid(item.auditId) ||
      typeof item.occurredAt !== "string" ||
      Number.isNaN(new Date(item.occurredAt).getTime()) ||
      (item.actorKind !== "AUTHENTICATED" && item.actorKind !== "ANONYMOUS") ||
      (item.actorKind === "AUTHENTICATED" && !isUuid(item.principalId)) ||
      (item.actorKind === "ANONYMOUS" && item.principalId !== undefined) ||
      typeof item.action !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(item.action) ||
      typeof item.resourceType !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(item.resourceType) ||
      (item.resourceId !== undefined &&
        (typeof item.resourceId !== "string" ||
          item.resourceId.trim().length === 0 ||
          item.resourceId.length > 256)) ||
      (item.scopeId !== undefined && item.scopeId !== value.scopeId) ||
      (item.outcome !== "SUCCESS" &&
        item.outcome !== "DENIED" &&
        item.outcome !== "FAILURE") ||
      (item.reasonCode !== undefined &&
        (typeof item.reasonCode !== "string" ||
          !/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(item.reasonCode))) ||
      !isUuid(item.requestId) ||
      !isUuid(item.correlationId) ||
      (item.beforeHash !== undefined &&
        (typeof item.beforeHash !== "string" ||
          !/^[a-f0-9]{64}$/u.test(item.beforeHash))) ||
      (item.afterHash !== undefined &&
        (typeof item.afterHash !== "string" ||
          !/^[a-f0-9]{64}$/u.test(item.afterHash)))
    ) {
      return false;
    }
    return true;
  });
}

function isInvitationResult(value: unknown): value is InvitationResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.professionalEmail === "string" &&
    typeof value.token === "string" &&
    /^[A-Za-z0-9_-]{32,256}$/u.test(value.token) &&
    typeof value.expiresAt === "string"
  );
}

function isRecoveryResult(value: unknown): value is RecoveryResult {
  return (
    isRecord(value) &&
    typeof value.professionalEmail === "string" &&
    typeof value.token === "string" &&
    /^[A-Za-z0-9_-]{32,256}$/u.test(value.token) &&
    typeof value.expiresAt === "string" &&
    isCount(value.revokedSessions)
  );
}

function dashboardErrorState(status: number): DashboardLoadState {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  return "error";
}

function percentageLabel(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function nextActionLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    INICIAR_ATIVIDADE: "Iniciar atividade",
    RETOMAR_ATIVIDADE: "Retomar atividade",
    AGUARDAR_CORRECAO: "Aguardar correção",
    REVISAR_PROXIMO_CONTEUDO: "Revisar próximo conteúdo",
    CONSULTAR_PROXIMO_PASSO: "Consultar próximo passo",
    EXECUTAR_REMEDIACAO: "Executar remediação",
    REVISAR_RETENCAO: "Revisar retenção",
    AGUARDAR_CORRECAO_HUMANA: "Aguardar correção humana",
  };
  return labels[value] ?? value;
}

function accountStatusLabel(
  value: StaffDashboard["participants"][number]["accountStatus"],
): string {
  const labels: Readonly<Record<typeof value, string>> = {
    INVITED: "Convite enviado",
    ACTIVE: "Ativo",
    SUSPENDED: "Suspenso",
    DEACTIVATED: "Desativado",
  };
  return labels[value];
}

function appealReviewStatusLabel(value: AppealReviewQueueStatus): string {
  const labels: Readonly<Record<AppealReviewQueueStatus, string>> = {
    ABERTA: "Aberta",
    EM_REVISAO: "Em revisão",
    DECIDIDA: "Decidida",
    RECALCULO_PENDENTE: "Recálculo pendente",
    ENCERRADA: "Encerrada",
  };
  return labels[value];
}

function appealReviewDecisionLabel(
  value:
    NonNullable<AppealReviewQueue["items"][number]["decision"]> | undefined,
): string {
  if (value === undefined) return "Ainda não decidida";
  const labels: Readonly<
    Record<NonNullable<AppealReviewQueue["items"][number]["decision"]>, string>
  > = {
    MANTER_RESULTADO: "Manter resultado",
    ANULAR_ITEM: "Anular item",
    ALTERAR_RESULTADO: "Alterar resultado",
  };
  return labels[value];
}

function appealReviewHistoryEventLabel(
  value: AppealReviewHistoryEvent["eventType"],
): string {
  const labels: Readonly<
    Record<AppealReviewHistoryEvent["eventType"], string>
  > = {
    ATRIBUIR_REVISOR: "Revisor atribuído",
    DECIDIR: "Decisão registrada",
    SOLICITAR_RECALCULO: "Recálculo solicitado",
    CONCLUIR_RECALCULO: "Recálculo concluído",
  };
  return labels[value];
}

function appealReviewHistoryStatusLabel(
  value:
    | AppealReviewHistoryEvent["fromStatus"]
    | AppealReviewHistoryEvent["toStatus"],
): string {
  const labels: Readonly<Record<string, string>> = {
    ABERTA: "Aberta",
    EM_REVISAO: "Em revisão",
    DECIDIDA: "Decidida",
    RECALCULO_PENDENTE: "Recálculo pendente",
    ENCERRADA: "Encerrada",
  };
  return labels[value];
}

function feedbackTriageStatusLabel(value: FeedbackTriageQueueStatus): string {
  const labels: Readonly<Record<FeedbackTriageQueueStatus, string>> = {
    NOVO: "Novo",
    TRIADO: "Triado",
    EM_TRATAMENTO: "Em tratamento",
    AGUARDA_USUARIO: "Aguardando usuário",
    RESOLVIDO: "Resolvido",
    DUPLICADO: "Duplicado",
    NAO_REPRODUZIDO: "Não reproduzido",
    NAO_PLANEJADO: "Não planejado",
  };
  return labels[value];
}

function feedbackTriagePriorityLabel(
  value: FeedbackTriageQueuePriority,
): string {
  const labels: Readonly<Record<FeedbackTriageQueuePriority, string>> = {
    BAIXA: "Baixa",
    NORMAL: "Normal",
    ALTA: "Alta",
    URGENTE: "Urgente",
  };
  return labels[value];
}

function feedbackTriageAssigneeLabel(
  assigneeId: string | null | undefined,
): string {
  return assigneeId === null || assigneeId === undefined
    ? "Sem responsável"
    : "Responsável definido";
}

function feedbackTriageTypeLabel(
  value: FeedbackTriageQueue["items"][number]["type"],
): string {
  const labels: Readonly<
    Record<FeedbackTriageQueue["items"][number]["type"], string>
  > = {
    BUG_TECNICO: "Bug técnico",
    USABILIDADE: "Usabilidade",
    ERRO_CONTEUDO: "Erro de conteúdo",
    MELHORIA: "Melhoria",
    CONTESTACAO: "Contestação",
  };
  return labels[value];
}

function feedbackTriageEventLabel(value: FeedbackTriageEvent): string {
  const labels: Readonly<Record<FeedbackTriageEvent, string>> = {
    TRIAR: "Triar",
    INICIAR_TRATAMENTO: "Iniciar tratamento",
    AGUARDAR_USUARIO: "Aguardar usuário",
    RESOLVER: "Resolver",
    MARCAR_DUPLICADO: "Marcar duplicado",
    MARCAR_NAO_REPRODUZIDO: "Não reproduzido",
    MARCAR_NAO_PLANEJADO: "Não planejado",
    RETOMAR_TRATAMENTO: "Retomar tratamento",
  };
  return labels[value];
}

function feedbackTriageEvents(
  status: FeedbackTriageQueueStatus,
): readonly FeedbackTriageEvent[] {
  switch (status) {
    case "NOVO":
      return ["TRIAR"];
    case "TRIADO":
      return ["INICIAR_TRATAMENTO"];
    case "EM_TRATAMENTO":
      return [
        "AGUARDAR_USUARIO",
        "RESOLVER",
        "MARCAR_DUPLICADO",
        "MARCAR_NAO_REPRODUZIDO",
        "MARCAR_NAO_PLANEJADO",
      ];
    case "AGUARDA_USUARIO":
      return ["RETOMAR_TRATAMENTO"];
    default:
      return [];
  }
}

function feedbackQueueViewKey(
  scopeId: string | undefined,
  status: FeedbackTriageQueueStatusFilter,
  cursor: string | undefined,
  cursorStack: readonly (string | undefined)[],
): string {
  return JSON.stringify({
    scopeId: scopeId ?? null,
    status,
    cursor: cursor ?? null,
    cursorStack: cursorStack.map((value) => value ?? null),
  });
}

function lastSeenLabel(value: string | undefined): string {
  if (value === undefined) return "Nunca acessou";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@]/u.test(text) ? `\t${text}` : text;
  return /[",\r\n]/u.test(safeText)
    ? `"${safeText.replaceAll('"', '""')}"`
    : safeText;
}

function downloadContinuingEducationCsv(
  report: ContinuingEducationReport,
): void {
  const header = [
    "email_profissional",
    "status_conta",
    "modulos_atribuidos",
    "modulos_concluidos",
    "progresso_percentual",
    "minutos_digitais_concluidos",
    "horas_digitais_concluidas",
    "ultimo_acesso",
  ];
  const rows = report.participants.map((participant) => [
    participant.professionalEmail,
    participant.accountStatus,
    participant.assignedModules,
    participant.completedModules,
    participant.progressPercent,
    participant.completedDigitalMinutes,
    participant.completedDigitalHours,
    participant.lastSeenAt,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cvg-participacao-digital-pagina-${report.pagination.page}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function diagnosticStatusLabel(value: string): string {
  return value === "BASELINE_REGISTRADA"
    ? "Baseline registrada"
    : "Sem evidência digital";
}

function isAccountStatusResult(value: unknown): value is Readonly<{
  readonly status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  readonly revokedSessions: number;
}> {
  return (
    isRecord(value) &&
    (value.status === "ACTIVE" ||
      value.status === "SUSPENDED" ||
      value.status === "DEACTIVATED") &&
    isCount(value.revokedSessions)
  );
}

export default function OperationsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [dependencies, setDependencies] = useState<DependencyState | null>(
    null,
  );
  const [dashboardState, setDashboardState] =
    useState<DashboardLoadState>("loading");
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [reportState, setReportState] = useState<ReportLoadState>("idle");
  const [report, setReport] = useState<ContinuingEducationReport | null>(null);
  const [reportPage, setReportPage] = useState(1);
  const reportPageSize = 25;
  const [reflectionReportState, setReflectionReportState] =
    useState<ReportLoadState>("idle");
  const [reflectionReport, setReflectionReport] =
    useState<ReflectionManagementReport | null>(null);
  const [feedbackQueueState, setFeedbackQueueState] =
    useState<ReportLoadState>("idle");
  const [feedbackQueue, setFeedbackQueue] =
    useState<FeedbackTriageQueue | null>(null);
  const feedbackQueueRequestVersion = useRef(0);
  const [feedbackQueueCursor, setFeedbackQueueCursor] = useState<
    string | undefined
  >();
  const [feedbackQueueCursorStack, setFeedbackQueueCursorStack] = useState<
    readonly (string | undefined)[]
  >([]);
  const [feedbackQueueStatusFilter, setFeedbackQueueStatusFilter] =
    useState<FeedbackTriageQueueStatusFilter>("");
  const [feedbackActionKey, setFeedbackActionKey] = useState<string | null>(
    null,
  );
  const [feedbackActionError, setFeedbackActionError] = useState<string | null>(
    null,
  );
  const [feedbackHistoryState, setFeedbackHistoryState] =
    useState<ReportLoadState>("idle");
  const [feedbackHistory, setFeedbackHistory] =
    useState<FeedbackTicketHistory | null>(null);
  const [feedbackHistoryTicketId, setFeedbackHistoryTicketId] = useState<
    string | null
  >(null);
  const [appealQueueState, setAppealQueueState] =
    useState<ReportLoadState>("idle");
  const [appealQueue, setAppealQueue] = useState<AppealReviewQueue | null>(
    null,
  );
  const appealQueueRequestVersion = useRef(0);
  const [appealQueueStatusFilter, setAppealQueueStatusFilter] =
    useState<AppealReviewQueueStatusFilter>("");
  const [appealHistoryState, setAppealHistoryState] =
    useState<ReportLoadState>("idle");
  const [appealHistory, setAppealHistory] =
    useState<AppealReviewHistory | null>(null);
  const [appealHistoryAppealId, setAppealHistoryAppealId] = useState<
    string | null
  >(null);
  const [appealImpactState, setAppealImpactState] =
    useState<ReportLoadState>("idle");
  const [appealImpact, setAppealImpact] =
    useState<AppealDecisionImpactPreview | null>(null);
  const [appealImpactAppealId, setAppealImpactAppealId] = useState<
    string | null
  >(null);
  const appealImpactRequestVersion = useRef(0);
  const [auditTrailState, setAuditTrailState] =
    useState<AuditTrailLoadState>("idle");
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const auditRequestVersion = useRef(0);
  const [reportModuleFilter, setReportModuleFilter] = useState("");
  const [reportStatusFilter, setReportStatusFilter] =
    useState<ReportStatusFilter>("");
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationState, setInvitationState] =
    useState<InvitationState>("idle");
  const [invitationResult, setInvitationResult] =
    useState<InvitationResult | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationContext, setInvitationContext] =
    useState<InvitationContext>("created");
  const [accountActionState, setAccountActionState] =
    useState<AccountActionState>("idle");
  const [accountActionKey, setAccountActionKey] = useState<string | null>(null);
  const [accountActionMessage, setAccountActionMessage] = useState<
    string | null
  >(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null,
  );
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(
    null,
  );

  const loadDependencies = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/health/dependencies", {
        cache: "no-store",
        credentials: "include",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!isRecord(payload) || payload.success !== true) throw new Error();
      if (!isDependencyState(payload.data)) throw new Error();
      setDependencies(payload.data);
      setState("ready");
    } catch {
      setDependencies(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadDependencies();
  }, [loadDependencies]);

  const loadDashboard = useCallback(async () => {
    setDashboardState("loading");
    try {
      const response = await fetch("/api/v1/dashboard", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        setDashboard(null);
        setDashboardState(dashboardErrorState(response.status));
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      if (!isRecord(payload) || payload.success !== true) throw new Error();
      if (!isStaffDashboard(payload.data)) throw new Error();
      setDashboard(payload.data);
      setDashboardState("ready");
    } catch {
      setDashboard(null);
      setDashboardState("error");
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const managementScopeId =
    selectedScopeId.length > 0
      ? selectedScopeId
      : (dashboard?.scopes[0] ?? undefined);

  const feedbackQueueViewKeyRef = useRef(
    feedbackQueueViewKey(
      managementScopeId,
      feedbackQueueStatusFilter,
      feedbackQueueCursor,
      feedbackQueueCursorStack,
    ),
  );
  feedbackQueueViewKeyRef.current = feedbackQueueViewKey(
    managementScopeId,
    feedbackQueueStatusFilter,
    feedbackQueueCursor,
    feedbackQueueCursorStack,
  );

  useEffect(() => {
    setSelectedScopeId((current) => {
      if (dashboard !== null && dashboard.scopes.includes(current)) {
        return current;
      }
      return dashboard?.scopes[0] ?? "";
    });
  }, [dashboard]);

  const loadAuditTrail = useCallback(
    async (scopeId: string, cursor?: string): Promise<void> => {
      const requestVersion = ++auditRequestVersion.current;
      setAuditTrailState("loading");
      const query = new URLSearchParams({ scopeId, limit: "25" });
      if (cursor !== undefined) query.set("cursor", cursor);
      try {
        const response = await fetch(`/api/v1/audit?${query.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (requestVersion !== auditRequestVersion.current) return;
        if (!response.ok) {
          setAuditTrail(null);
          setAuditTrailState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (requestVersion !== auditRequestVersion.current) return;
        if (!isRecord(payload) || payload.success !== true) throw new Error();
        if (!isAuditTrail(payload.data) || !isRecord(payload.meta)) {
          throw new Error();
        }
        const hasNext = payload.meta.has_next;
        const nextCursor = payload.meta.next_cursor;
        const normalizedNextCursor =
          typeof nextCursor === "string" ? nextCursor : undefined;
        if (
          typeof hasNext !== "boolean" ||
          (hasNext && normalizedNextCursor === undefined) ||
          (!hasNext && nextCursor !== undefined)
        ) {
          throw new Error();
        }
        if (requestVersion !== auditRequestVersion.current) return;
        setAuditTrail({
          ...payload.data,
          hasNext,
          ...(normalizedNextCursor === undefined
            ? {}
            : { nextCursor: normalizedNextCursor }),
        });
        setAuditTrailState("ready");
      } catch {
        if (requestVersion !== auditRequestVersion.current) return;
        setAuditTrail(null);
        setAuditTrailState("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (managementScopeId === undefined) {
      auditRequestVersion.current += 1;
      setAuditTrail(null);
      setAuditTrailState("idle");
      return;
    }
    void loadAuditTrail(managementScopeId);
  }, [loadAuditTrail, managementScopeId]);

  const loadContinuingEducationReport = useCallback(
    async (
      scopeId: string,
      moduleId: string,
      accountStatus: ReportStatusFilter,
      page: number,
    ): Promise<void> => {
      setReportState("loading");
      const query = new URLSearchParams({ scopeId });
      query.set("page", String(page));
      query.set("pageSize", String(reportPageSize));
      if (moduleId.length > 0) query.set("moduleId", moduleId);
      if (accountStatus.length > 0) query.set("accountStatus", accountStatus);
      try {
        const response = await fetch(
          `/api/v1/internal/reports/continuing-education?${query.toString()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          setReport(null);
          setReportState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isContinuingEducationReport(payload.data)
        ) {
          throw new Error();
        }
        setReport(payload.data);
        setReportState("ready");
      } catch {
        setReport(null);
        setReportState("error");
      }
    },
    [reportPageSize],
  );

  useEffect(() => {
    const scopeId = managementScopeId;
    if (scopeId === undefined) {
      setReport(null);
      setReportState("idle");
      return;
    }
    void loadContinuingEducationReport(
      scopeId,
      reportModuleFilter,
      reportStatusFilter,
      reportPage,
    );
  }, [
    dashboard,
    loadContinuingEducationReport,
    managementScopeId,
    reportModuleFilter,
    reportPage,
    reportStatusFilter,
  ]);

  const loadReflectionManagementReport = useCallback(
    async (scopeId: string): Promise<void> => {
      setReflectionReportState("loading");
      try {
        const query = new URLSearchParams({ scopeId });
        const response = await fetch(
          `/api/v1/internal/reports/reflections?${query.toString()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          setReflectionReport(null);
          setReflectionReportState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isReflectionManagementReport(payload.data)
        ) {
          throw new Error();
        }
        setReflectionReport(payload.data);
        setReflectionReportState("ready");
      } catch {
        setReflectionReport(null);
        setReflectionReportState("error");
      }
    },
    [],
  );

  useEffect(() => {
    const scopeId = managementScopeId;
    if (scopeId === undefined) {
      setReflectionReport(null);
      setReflectionReportState("idle");
      return;
    }
    void loadReflectionManagementReport(scopeId);
  }, [dashboard, loadReflectionManagementReport, managementScopeId]);

  const loadFeedbackTriageQueue = useCallback(
    async (
      scopeId: string,
      status: FeedbackTriageQueueStatusFilter,
      cursor?: string,
      cursorStack: readonly (string | undefined)[] = [],
    ): Promise<void> => {
      const requestVersion = ++feedbackQueueRequestVersion.current;
      const requestedViewKey = feedbackQueueViewKey(
        scopeId,
        status,
        cursor,
        cursorStack,
      );
      feedbackQueueViewKeyRef.current = requestedViewKey;
      setFeedbackQueueCursor(cursor);
      setFeedbackQueueCursorStack(cursorStack);
      setFeedbackQueueState("loading");
      setFeedbackActionError(null);
      const query = new URLSearchParams({ scopeId });
      if (status.length > 0) query.set("status", status);
      if (cursor !== undefined) query.set("cursor", cursor);
      try {
        const response = await fetch(
          `/api/v1/internal/feedback?${query.toString()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (requestVersion !== feedbackQueueRequestVersion.current) return;
        if (!response.ok) {
          setFeedbackQueue(null);
          setFeedbackQueueState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (requestVersion !== feedbackQueueRequestVersion.current) return;
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isFeedbackTriageQueue(payload.data) ||
          !isRecord(payload.meta)
        ) {
          throw new Error();
        }
        const hasNext = payload.meta.has_next;
        const nextCursor = payload.meta.next_cursor;
        const normalizedNextCursor =
          typeof nextCursor === "string" ? nextCursor : undefined;
        if (
          typeof hasNext !== "boolean" ||
          (hasNext && normalizedNextCursor === undefined) ||
          (!hasNext && nextCursor !== undefined)
        ) {
          throw new Error();
        }
        if (requestVersion !== feedbackQueueRequestVersion.current) return;
        setFeedbackQueue({
          ...payload.data,
          hasNext,
          ...(normalizedNextCursor === undefined
            ? {}
            : { nextCursor: normalizedNextCursor }),
        });
        setFeedbackQueueCursor(cursor);
        setFeedbackQueueCursorStack(cursorStack);
        setFeedbackQueueState("ready");
      } catch {
        if (requestVersion !== feedbackQueueRequestVersion.current) return;
        setFeedbackQueue(null);
        setFeedbackQueueState("error");
      }
    },
    [],
  );

  const loadFeedbackTicketHistory = useCallback(
    async (ticketId: string): Promise<void> => {
      setFeedbackHistoryTicketId(ticketId);
      setFeedbackHistoryState("loading");
      try {
        const response = await fetch(
          `/api/v1/internal/feedback/${encodeURIComponent(ticketId)}/history?limit=100`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          setFeedbackHistory(null);
          setFeedbackHistoryState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isFeedbackTicketHistory(payload.data)
        ) {
          throw new Error();
        }
        setFeedbackHistory(payload.data);
        setFeedbackHistoryState("ready");
      } catch {
        setFeedbackHistory(null);
        setFeedbackHistoryState("error");
      }
    },
    [],
  );

  useEffect(() => {
    const scopeId = managementScopeId;
    if (scopeId === undefined) {
      feedbackQueueRequestVersion.current += 1;
      setFeedbackQueue(null);
      setFeedbackQueueCursor(undefined);
      setFeedbackQueueCursorStack([]);
      setFeedbackQueueState("idle");
      return;
    }
    void loadFeedbackTriageQueue(scopeId, feedbackQueueStatusFilter);
  }, [
    dashboard,
    feedbackQueueStatusFilter,
    loadFeedbackTriageQueue,
    managementScopeId,
  ]);

  const transitionFeedbackTicket = useCallback(
    async (
      item: FeedbackTriageQueue["items"][number],
      event: FeedbackTriageEvent,
    ) => {
      if (feedbackQueue === null) return;
      const transitionViewKey = feedbackQueueViewKey(
        feedbackQueue.scopeId,
        feedbackQueueStatusFilter,
        feedbackQueueCursor,
        feedbackQueueCursorStack,
      );
      const actionKey = `${item.ticketId}:${event}`;
      setFeedbackActionKey(actionKey);
      setFeedbackActionError(null);
      try {
        const response = await fetch(
          `/api/v1/internal/feedback/${encodeURIComponent(item.ticketId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ticketId: item.ticketId,
              scopeId: feedbackQueue.scopeId,
              version: item.version,
              event,
            }),
          },
        );
        if (!response.ok) throw new Error();
        const payload: unknown = await response.json().catch(() => null);
        if (!isRecord(payload) || payload.success !== true) throw new Error();
        if (feedbackQueueViewKeyRef.current !== transitionViewKey) return;
        await loadFeedbackTriageQueue(
          feedbackQueue.scopeId,
          feedbackQueueStatusFilter,
          feedbackQueueCursor,
          feedbackQueueCursorStack,
        );
      } catch {
        setFeedbackActionError(
          "Não foi possível atualizar o relato. O estado pode ter mudado; tente novamente.",
        );
      } finally {
        setFeedbackActionKey(null);
      }
    },
    [
      feedbackQueue,
      feedbackQueueCursor,
      feedbackQueueCursorStack,
      feedbackQueueStatusFilter,
      loadFeedbackTriageQueue,
    ],
  );

  const updateFeedbackTriageMetadata = useCallback(
    async (
      item: FeedbackTriageQueue["items"][number],
      priority: FeedbackTriageQueuePriority,
      assignment: FeedbackTriageMetadataAssignment,
    ) => {
      if (feedbackQueue === null) return;
      const metadataViewKey = feedbackQueueViewKey(
        feedbackQueue.scopeId,
        feedbackQueueStatusFilter,
        feedbackQueueCursor,
        feedbackQueueCursorStack,
      );
      const actionKey = `${item.ticketId}:metadata:${priority}:${assignment}`;
      setFeedbackActionKey(actionKey);
      setFeedbackActionError(null);
      try {
        const response = await fetch(
          `/api/v1/internal/feedback/${encodeURIComponent(item.ticketId)}/triage-metadata`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              expectedVersion: item.version,
              priority,
              assignment,
            }),
          },
        );
        if (!response.ok) throw new Error();
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isFeedbackTriageMetadata(payload.data)
        ) {
          throw new Error();
        }
        if (feedbackQueueViewKeyRef.current !== metadataViewKey) return;
        await loadFeedbackTriageQueue(
          feedbackQueue.scopeId,
          feedbackQueueStatusFilter,
          feedbackQueueCursor,
          feedbackQueueCursorStack,
        );
      } catch {
        setFeedbackActionError(
          "Não foi possível atualizar a prioridade ou a atribuição. O estado pode ter mudado; tente novamente.",
        );
      } finally {
        setFeedbackActionKey(null);
      }
    },
    [
      feedbackQueue,
      feedbackQueueCursor,
      feedbackQueueCursorStack,
      feedbackQueueStatusFilter,
      loadFeedbackTriageQueue,
    ],
  );

  const loadAppealReviewQueue = useCallback(
    async (scopeId: string, status: AppealReviewQueueStatusFilter) => {
      const requestVersion = ++appealQueueRequestVersion.current;
      setAppealQueueState("loading");
      setAppealQueue(null);
      const query = new URLSearchParams({ scopeId });
      if (status.length > 0) query.set("status", status);
      try {
        const response = await fetch(
          `/api/v1/internal/appeals/review-queue?${query.toString()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (requestVersion !== appealQueueRequestVersion.current) return;
        if (!response.ok) {
          setAppealQueue(null);
          setAppealQueueState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (requestVersion !== appealQueueRequestVersion.current) return;
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isAppealReviewQueue(payload.data)
        ) {
          throw new Error();
        }
        setAppealQueue(payload.data);
        setAppealQueueState("ready");
      } catch {
        if (requestVersion !== appealQueueRequestVersion.current) return;
        setAppealQueue(null);
        setAppealQueueState("error");
      }
    },
    [],
  );

  const loadAppealReviewHistory = useCallback(
    async (appealId: string): Promise<void> => {
      setAppealHistoryAppealId(appealId);
      setAppealHistoryState("loading");
      try {
        const response = await fetch(
          `/api/v1/internal/appeals/${encodeURIComponent(appealId)}/history`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          setAppealHistory(null);
          setAppealHistoryState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isAppealReviewHistory(payload.data)
        ) {
          throw new Error();
        }
        setAppealHistory(payload.data);
        setAppealHistoryState("ready");
      } catch {
        setAppealHistory(null);
        setAppealHistoryState("error");
      }
    },
    [],
  );

  const loadAppealDecisionImpact = useCallback(
    async (appealId: string): Promise<void> => {
      appealImpactRequestVersion.current += 1;
      const requestVersion = appealImpactRequestVersion.current;
      setAppealImpactAppealId(appealId);
      setAppealImpact(null);
      setAppealImpactState("loading");
      try {
        const response = await fetch(
          `/api/v1/internal/appeals/${encodeURIComponent(appealId)}/impact-preview?decision=ANULAR_ITEM`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          if (appealImpactRequestVersion.current !== requestVersion) return;
          setAppealImpact(null);
          setAppealImpactState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (
          !isRecord(payload) ||
          payload.success !== true ||
          !isAppealDecisionImpactPreview(payload.data)
        ) {
          throw new Error();
        }
        if (appealImpactRequestVersion.current !== requestVersion) return;
        setAppealImpact(payload.data);
        setAppealImpactState("ready");
      } catch {
        if (appealImpactRequestVersion.current !== requestVersion) return;
        setAppealImpact(null);
        setAppealImpactState("error");
      }
    },
    [],
  );

  useEffect(() => {
    const scopeId = managementScopeId;
    appealQueueRequestVersion.current += 1;
    appealImpactRequestVersion.current += 1;
    setAppealImpact(null);
    setAppealImpactAppealId(null);
    setAppealImpactState("idle");
    setAppealHistory(null);
    setAppealHistoryAppealId(null);
    setAppealHistoryState("idle");
    if (scopeId === undefined) {
      setAppealQueue(null);
      setAppealQueueState("idle");
      return;
    }
    void loadAppealReviewQueue(scopeId, appealQueueStatusFilter);
  }, [appealQueueStatusFilter, loadAppealReviewQueue, managementScopeId]);

  async function createParticipantInvitation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const scopeId = managementScopeId;
    if (scopeId === undefined) {
      setInvitationState("error");
      setInvitationError("Nenhum escopo de gestão está disponível.");
      return;
    }

    setInvitationState("submitting");
    setInvitationResult(null);
    setInvitationError(null);
    setInvitationContext("created");
    try {
      const response = await fetch("/api/v1/internal/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalEmail: invitationEmail,
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: [scopeId],
          expiresInSeconds: 604_800,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isInvitationResult(payload.data)
      ) {
        setInvitationState("error");
        setInvitationError(
          response.status === 403
            ? "Esta conta não pode criar convites."
            : "Não foi possível criar o convite.",
        );
        return;
      }
      setInvitationResult(payload.data);
      setInvitationState("success");
      setInvitationEmail("");
    } catch {
      setInvitationState("error");
      setInvitationError("Não foi possível criar o convite.");
    }
  }

  async function resendParticipantInvitation(
    participantId: string,
  ): Promise<void> {
    const scopeId = participantScopeId(
      dashboard,
      participantId,
      managementScopeId,
    );
    if (scopeId === undefined) return;
    const actionKey = `${participantId}:resend`;
    setAccountActionState("submitting");
    setAccountActionKey(actionKey);
    setAccountActionMessage(null);
    setAccountActionError(null);
    try {
      const response = await fetch(
        `/api/v1/internal/accounts/${encodeURIComponent(participantId)}/invitation`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scopeId, expiresInSeconds: 604_800 }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isInvitationResult(payload.data)
      ) {
        throw new Error();
      }
      setInvitationResult(payload.data);
      setInvitationContext("resent");
      setInvitationState("success");
      setAccountActionState("success");
      setAccountActionMessage("Convite reenviado com sucesso.");
    } catch {
      setAccountActionState("error");
      setAccountActionError("Não foi possível reenviar o convite.");
    } finally {
      setAccountActionKey(null);
    }
  }

  async function changeParticipantStatus(
    participantId: string,
    expectedStatus: ManagedAccountStatus,
    status: ManagedAccountStatus,
  ): Promise<void> {
    const scopeId = participantScopeId(
      dashboard,
      participantId,
      managementScopeId,
    );
    if (scopeId === undefined) return;
    if (
      status === "DEACTIVATED" &&
      typeof window !== "undefined" &&
      !window.confirm(
        "Desativar esta conta? O histórico será preservado e as sessões ativas serão revogadas.",
      )
    ) {
      return;
    }
    const actionKey = `${participantId}:${status}`;
    setAccountActionState("submitting");
    setAccountActionKey(actionKey);
    setAccountActionMessage(null);
    setAccountActionError(null);
    try {
      const response = await fetch(
        `/api/v1/internal/accounts/${encodeURIComponent(participantId)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scopeId, expectedStatus, status }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isAccountStatusResult(payload.data)
      ) {
        throw new Error();
      }
      setAccountActionState("success");
      setAccountActionMessage(
        `Conta atualizada: ${accountStatusLabel(payload.data.status)}. Sessões revogadas: ${payload.data.revokedSessions}.`,
      );
      await loadDashboard();
    } catch {
      setAccountActionState("error");
      setAccountActionError("Não foi possível atualizar a conta.");
    } finally {
      setAccountActionKey(null);
    }
  }

  async function issueParticipantRecovery(
    participantId: string,
  ): Promise<void> {
    const scopeId = participantScopeId(
      dashboard,
      participantId,
      managementScopeId,
    );
    if (scopeId === undefined) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Gerar um link de recuperação? As sessões atuais serão revogadas e a conta permanecerá ativa.",
      )
    ) {
      return;
    }
    const actionKey = `${participantId}:recovery`;
    setAccountActionState("submitting");
    setAccountActionKey(actionKey);
    setAccountActionMessage(null);
    setAccountActionError(null);
    setRecoveryResult(null);
    try {
      const response = await fetch(
        `/api/v1/internal/accounts/${encodeURIComponent(participantId)}/recovery`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scopeId, expiresInSeconds: 1800 }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isRecoveryResult(payload.data)
      ) {
        throw new Error();
      }
      setRecoveryResult(payload.data);
      setAccountActionState("success");
      setAccountActionMessage(
        `Recuperação emitida. Sessões revogadas: ${payload.data.revokedSessions}.`,
      );
    } catch {
      setAccountActionState("error");
      setAccountActionError("Não foi possível gerar a recuperação.");
    } finally {
      setAccountActionKey(null);
    }
  }

  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={state === "loading" || dashboardState === "loading"}
    >
      <header className="topbar" aria-label="Identificação da operação">
        <div>
          <p className="eyebrow">CVG · superfície interna</p>
          <span className="brand">Estado operacional</span>
        </div>
        <span className="status-pill" role="status" aria-live="polite">
          Operação
        </span>
      </header>

      <section
        className="hero-card operations-card"
        aria-labelledby="operations-title"
      >
        <div className="hero-copy">
          <p className="eyebrow">Dependências redigidas</p>
          <h1 id="operations-title">Saúde do ambiente</h1>
          <p>
            Esta tela mostra apenas o estado agregado permitido para operação.
            URLs, segredos, payloads e dados de participantes não são exibidos.
          </p>
        </div>

        {state === "loading" ? (
          <div
            className="experience-panel"
            data-testid="operations-loading"
            role="status"
          >
            Consultando dependências…
          </div>
        ) : state === "error" ? (
          <div className="experience-panel error-panel" role="alert">
            <p>Não foi possível consultar o estado operacional.</p>
            <button type="button" onClick={() => void loadDependencies()}>
              Tentar novamente
            </button>
          </div>
        ) : dependencies !== null ? (
          <div className="experience-panel" data-testid="operations-ready">
            <p className="operations-status">
              Estado geral: <strong>{dependencies.status}</strong>
            </p>
            <dl className="dependency-list">
              <div>
                <dt>PostgreSQL</dt>
                <dd>{dependencies.dependencies.postgres}</dd>
              </div>
              <div>
                <dt>Qdrant</dt>
                <dd>{dependencies.dependencies.qdrant}</dd>
              </div>
              <div>
                <dt>IA assistiva</dt>
                <dd>{dependencies.dependencies.ai}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>

      <section
        className="management-card"
        aria-labelledby="management-title"
        data-testid="staff-dashboard"
      >
        <div className="management-header">
          <div>
            <p className="eyebrow">Gestão do treinamento</p>
            <h2 id="management-title">Acompanhar evolução</h2>
            <p>
              Visão agregada por escopo para orientar acompanhamento, reforço,
              retenção e correções. A plataforma não transforma estes sinais em
              decisão clínica automática.
            </p>
          </div>
          {dashboardState === "ready" && dashboard !== null ? (
            <div className="section-heading compact-heading">
              {dashboard.scopes.length > 1 ? (
                <label>
                  Escopo de gestão
                  <select
                    value={managementScopeId ?? ""}
                    onChange={(event) => setSelectedScopeId(event.target.value)}
                  >
                    {dashboard.scopes.map((scopeId) => (
                      <option key={scopeId} value={scopeId}>
                        Escopo autorizado {scopeId.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="dashboard-updated" role="status">
                Atualizado em {lastSeenLabel(dashboard.generatedAt)}
              </p>
            </div>
          ) : null}
        </div>

        {dashboardState === "loading" ? (
          <div className="experience-panel" role="status">
            Carregando acompanhamento da trilha…
          </div>
        ) : dashboardState === "unauthenticated" ? (
          <div className="experience-panel dashboard-message">
            <strong>Sessão de gestão necessária</strong>
            <span>Entre com uma conta interna para consultar esta visão.</span>
          </div>
        ) : dashboardState === "forbidden" ? (
          <div className="experience-panel dashboard-message">
            <strong>Visão restrita</strong>
            <span>
              Esta conta não possui escopo para acompanhar profissionais.
            </span>
          </div>
        ) : dashboardState === "error" || dashboard === null ? (
          <div className="experience-panel error-panel" role="alert">
            <p>Não foi possível carregar o acompanhamento do treinamento.</p>
            <button type="button" onClick={() => void loadDashboard()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <div
              className="dashboard-metrics"
              aria-label="Indicadores do treinamento"
            >
              <article className="metric-card">
                <span>Profissionais ativos</span>
                <strong>{dashboard.metrics.activeParticipants}</strong>
                <small>{dashboard.metrics.inactiveParticipants} inativos</small>
              </article>
              <article className="metric-card">
                <span>Conclusão da trilha</span>
                <strong>
                  {percentageLabel(dashboard.metrics.completionRatePercent)}
                </strong>
                <small>
                  {dashboard.metrics.completedModules} de{" "}
                  {dashboard.metrics.assignedModules} módulos
                </small>
              </article>
              <article className="metric-card">
                <span>Correções pendentes</span>
                <strong>{dashboard.metrics.pendingCorrections}</strong>
                <small>
                  {dashboard.metrics.openFeedback} feedbacks abertos
                </small>
              </article>
              <article className="metric-card">
                <span>Reforço e retenção</span>
                <strong>{dashboard.metrics.remediationParticipants}</strong>
                <small>
                  {dashboard.metrics.retentionReviewsPending} revisões pendentes
                </small>
              </article>
            </div>

            <div className="dashboard-summary" aria-label="Estado editorial">
              <span>{dashboard.metrics.invitedParticipants} convites</span>
              <span>
                {dashboard.metrics.content.inReview} conteúdos em revisão
              </span>
              <span>
                {dashboard.metrics.content.published} conteúdos publicados
              </span>
              <span>
                Mediana de progresso:{" "}
                {percentageLabel(dashboard.metrics.medianProgressPercent)}
              </span>
            </div>

            <section
              className="dashboard-panel continuing-education-panel"
              aria-labelledby="continuing-education-title"
              data-testid="continuing-education-report"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Educação continuada</p>
                  <h3 id="continuing-education-title">
                    Participação digital da trilha
                  </h3>
                  <p>
                    Minutos concluídos conforme o catálogo da trilha. O total é
                    evidência educacional interna, não hora CPD credenciada,
                    certificado ou prova de competência prática.
                  </p>
                </div>
                {reportState === "ready" && report !== null ? (
                  <span className="status-pill">
                    Atualizado {lastSeenLabel(report.generatedAt)}
                  </span>
                ) : null}
              </div>
              {reportState === "loading" ? (
                <div className="experience-panel" role="status">
                  Consolidando participação digital…
                </div>
              ) : reportState === "forbidden" ||
                reportState === "unauthenticated" ? (
                <div className="experience-panel dashboard-message">
                  <strong>Relatório restrito</strong>
                  <span>
                    Esta conta não possui autorização para consultar métricas do
                    programa.
                  </span>
                </div>
              ) : reportState === "error" || report === null ? (
                <div className="experience-panel error-panel" role="alert">
                  <p>Não foi possível carregar o relatório educacional.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const scopeId = managementScopeId;
                      if (scopeId !== undefined) {
                        void loadContinuingEducationReport(
                          scopeId,
                          reportModuleFilter,
                          reportStatusFilter,
                          reportPage,
                        );
                      }
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="report-filter-row"
                    aria-label="Filtros do relatório"
                  >
                    <label>
                      Módulo
                      <select
                        value={reportModuleFilter}
                        onChange={(event) => {
                          setReportPage(1);
                          setReportModuleFilter(event.target.value);
                        }}
                      >
                        <option value="">Todos os módulos</option>
                        {report.modules.map((module) => (
                          <option key={module.moduleId} value={module.moduleId}>
                            {module.moduleId} · mês {module.month}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Conta
                      <select
                        value={reportStatusFilter}
                        onChange={(event) => {
                          setReportPage(1);
                          setReportStatusFilter(
                            event.target.value as ReportStatusFilter,
                          );
                        }}
                      >
                        <option value="">Todos os status</option>
                        <option value="ACTIVE">Ativas</option>
                        <option value="INVITED">Convidadas</option>
                        <option value="SUSPENDED">Suspensas</option>
                        <option value="DEACTIVATED">Desativadas</option>
                      </select>
                    </label>
                  </div>
                  <div
                    className="dashboard-metrics"
                    aria-label="Resumo de participação digital"
                  >
                    <article className="metric-card">
                      <span>Horas digitais concluídas</span>
                      <strong>{report.summary.completedDigitalHours}</strong>
                      <small>
                        {report.summary.completedDigitalMinutes} minutos
                      </small>
                    </article>
                    <article className="metric-card">
                      <span>Conclusão filtrada</span>
                      <strong>
                        {percentageLabel(report.summary.completionRatePercent)}
                      </strong>
                      <small>
                        {report.summary.completedModules} de{" "}
                        {report.summary.assignedModules} módulos
                      </small>
                    </article>
                    <article className="metric-card">
                      <span>Participantes no recorte</span>
                      <strong>{report.summary.participantCount}</strong>
                      <small>
                        {report.summary.activeParticipants} ativas ·{" "}
                        {report.summary.invitedParticipants} convidadas
                      </small>
                    </article>
                  </div>
                  <div
                    className="dashboard-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Tabela de módulos do relatório de participação digital"
                  >
                    <table className="dashboard-table">
                      <caption className="visually-hidden">
                        Participação digital por módulo
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Módulo</th>
                          <th scope="col">Carga do catálogo</th>
                          <th scope="col">Participantes atribuídos</th>
                          <th scope="col">Participantes concluídos</th>
                          <th scope="col">Conclusão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.modules.length === 0 ? (
                          <tr>
                            <td colSpan={5}>Nenhuma atribuição no recorte.</td>
                          </tr>
                        ) : (
                          report.modules.map((module) => (
                            <tr key={module.moduleId}>
                              <th scope="row">{module.moduleId}</th>
                              <td>{module.scheduledMinutes} min</td>
                              <td>{module.assignedParticipants}</td>
                              <td>{module.completedParticipants}</td>
                              <td>
                                {percentageLabel(module.completionRatePercent)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="report-filter-row"
                    aria-label="Participantes paginados do relatório"
                  >
                    <button
                      type="button"
                      disabled={report.pagination.page <= 1}
                      onClick={() =>
                        setReportPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Página anterior
                    </button>
                    <span role="status">
                      Página {report.pagination.page} de{" "}
                      {Math.max(report.pagination.totalPages, 1)} ·{" "}
                      {report.pagination.totalParticipants} participantes
                    </span>
                    <button
                      type="button"
                      disabled={!report.pagination.hasNextPage}
                      onClick={() => setReportPage((page) => page + 1)}
                    >
                      Próxima página
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadContinuingEducationCsv(report)}
                    >
                      Exportar página CSV
                    </button>
                  </div>
                  <div
                    className="dashboard-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Participantes do relatório de participação digital"
                  >
                    <table className="dashboard-table">
                      <caption className="visually-hidden">
                        Participantes na página atual do relatório de
                        participação digital
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Profissional</th>
                          <th scope="col">Conta</th>
                          <th scope="col">Módulos</th>
                          <th scope="col">Progresso</th>
                          <th scope="col">Minutos digitais</th>
                          <th scope="col">Horas digitais</th>
                          <th scope="col">Último acesso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.participants.length === 0 ? (
                          <tr>
                            <td colSpan={7}>
                              Nenhum participante no recorte atual.
                            </td>
                          </tr>
                        ) : (
                          report.participants.map((participant) => (
                            <tr key={participant.participantId}>
                              <th scope="row">
                                <span className="participant-email">
                                  {participant.professionalEmail}
                                </span>
                              </th>
                              <td>
                                {accountStatusLabel(participant.accountStatus)}
                              </td>
                              <td>
                                {participant.completedModules} de{" "}
                                {participant.assignedModules} concluídos
                              </td>
                              <td>
                                {percentageLabel(participant.progressPercent)}
                              </td>
                              <td>{participant.completedDigitalMinutes}</td>
                              <td>{participant.completedDigitalHours}</td>
                              <td>{lastSeenLabel(participant.lastSeenAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section
              className="dashboard-panel"
              aria-labelledby="feedback-triage-queue-title"
              data-testid="feedback-triage-queue"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Suporte interno</p>
                  <h3 id="feedback-triage-queue-title">
                    Fila de relatos do produto
                  </h3>
                  <p>
                    Consulta escopada de relatos sem anexos ou dados clínicos.
                    Esta tela aplica transições previstas e permite ajustar
                    prioridade ou assumir/liberar a responsabilidade. Resposta
                    ao participante e SLA continuam fora deste recorte.
                  </p>
                </div>
                {feedbackQueueState === "ready" && feedbackQueue !== null ? (
                  <span className="status-pill">
                    Atualizado {lastSeenLabel(feedbackQueue.generatedAt)}
                  </span>
                ) : null}
              </div>
              {feedbackQueueState === "loading" ? (
                <div className="experience-panel" role="status">
                  Consultando relatos…
                </div>
              ) : feedbackQueueState === "forbidden" ||
                feedbackQueueState === "unauthenticated" ? (
                <div className="experience-panel dashboard-message">
                  <strong>Fila restrita</strong>
                  <span>
                    Esta conta não possui autorização para triagem de relatos.
                  </span>
                </div>
              ) : feedbackQueueState === "error" || feedbackQueue === null ? (
                <div className="experience-panel error-panel" role="alert">
                  <p>Não foi possível carregar a fila de relatos.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const scopeId = managementScopeId;
                      if (scopeId !== undefined) {
                        void loadFeedbackTriageQueue(
                          scopeId,
                          feedbackQueueStatusFilter,
                          feedbackQueueCursor,
                          feedbackQueueCursorStack,
                        );
                      }
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="report-filter-row"
                    aria-label="Filtros da fila de relatos"
                  >
                    <label>
                      Status
                      <select
                        value={feedbackQueueStatusFilter}
                        onChange={(event) =>
                          setFeedbackQueueStatusFilter(
                            event.target
                              .value as FeedbackTriageQueueStatusFilter,
                          )
                        }
                      >
                        <option value="">Todos os estados</option>
                        <option value="NOVO">Novos</option>
                        <option value="TRIADO">Triados</option>
                        <option value="EM_TRATAMENTO">Em tratamento</option>
                        <option value="AGUARDA_USUARIO">
                          Aguardando usuário
                        </option>
                        <option value="RESOLVIDO">Resolvidos</option>
                        <option value="DUPLICADO">Duplicados</option>
                        <option value="NAO_REPRODUZIDO">
                          Não reproduzidos
                        </option>
                        <option value="NAO_PLANEJADO">Não planejados</option>
                      </select>
                    </label>
                  </div>
                  {feedbackQueue.items.length === 0 ? (
                    <p className="dashboard-empty">
                      Nenhum relato no recorte autorizado.
                    </p>
                  ) : (
                    <div
                      className="dashboard-table-wrap"
                      tabIndex={0}
                      role="region"
                      aria-label="Tabela de relatos para triagem"
                    >
                      <table className="dashboard-table">
                        <caption className="visually-hidden">
                          Relatos para triagem interna
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Tipo</th>
                            <th scope="col">Relato</th>
                            <th scope="col">Criado</th>
                            <th scope="col">Status</th>
                            <th scope="col">Prioridade</th>
                            <th scope="col">Responsável</th>
                            <th scope="col">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedbackQueue.items.map((item) => {
                            const events = feedbackTriageEvents(item.status);
                            return (
                              <tr key={item.ticketId}>
                                <th scope="row">
                                  {feedbackTriageTypeLabel(item.type)}
                                </th>
                                <td>{item.description}</td>
                                <td>{lastSeenLabel(item.createdAt)}</td>
                                <td>
                                  {feedbackTriageStatusLabel(item.status)}
                                </td>
                                <td>
                                  <label
                                    className="visually-hidden"
                                    htmlFor={`feedback-priority-${item.ticketId}`}
                                  >
                                    Prioridade do relato {item.ticketId}
                                  </label>
                                  <select
                                    id={`feedback-priority-${item.ticketId}`}
                                    value={item.priority}
                                    disabled={feedbackActionKey !== null}
                                    onChange={(event) =>
                                      void updateFeedbackTriageMetadata(
                                        item,
                                        event.target
                                          .value as FeedbackTriageQueuePriority,
                                        "MANTER",
                                      )
                                    }
                                  >
                                    <option value="BAIXA">Baixa</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="ALTA">Alta</option>
                                    <option value="URGENTE">Urgente</option>
                                  </select>
                                </td>
                                <td>
                                  <span>
                                    {item.assigneeId === undefined
                                      ? "Sem responsável"
                                      : "Responsável definido"}
                                  </span>
                                </td>
                                <td>
                                  <div className="account-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void loadFeedbackTicketHistory(
                                          item.ticketId,
                                        )
                                      }
                                    >
                                      Ver histórico do relato
                                    </button>
                                    {events.length === 0 ? (
                                      <span>Estado final</span>
                                    ) : (
                                      <div className="account-actions">
                                        {events.map((event) => {
                                          const actionKey = `${item.ticketId}:${event}`;
                                          return (
                                            <button
                                              key={event}
                                              type="button"
                                              disabled={
                                                feedbackActionKey !== null
                                              }
                                              onClick={() =>
                                                void transitionFeedbackTicket(
                                                  item,
                                                  event,
                                                )
                                              }
                                            >
                                              {feedbackActionKey === actionKey
                                                ? "Atualizando…"
                                                : feedbackTriageEventLabel(
                                                    event,
                                                  )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      disabled={feedbackActionKey !== null}
                                      onClick={() =>
                                        void updateFeedbackTriageMetadata(
                                          item,
                                          item.priority,
                                          item.assigneeId === undefined
                                            ? "ASSUMIR"
                                            : "LIBERAR",
                                        )
                                      }
                                    >
                                      {feedbackActionKey?.startsWith(
                                        `${item.ticketId}:metadata:`,
                                      )
                                        ? "Atualizando…"
                                        : item.assigneeId === undefined
                                          ? "Assumir para mim"
                                          : "Liberar responsável"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="report-filter-row">
                    <span role="status">
                      Página atual · {feedbackQueue.items.length} relatos
                    </span>
                    <div className="account-actions">
                      <button
                        type="button"
                        disabled={feedbackQueueCursorStack.length === 0}
                        onClick={() => {
                          const scopeId = managementScopeId;
                          if (
                            scopeId === undefined ||
                            feedbackQueueCursorStack.length === 0
                          ) {
                            return;
                          }
                          const previousCursor =
                            feedbackQueueCursorStack[
                              feedbackQueueCursorStack.length - 1
                            ];
                          void loadFeedbackTriageQueue(
                            scopeId,
                            feedbackQueueStatusFilter,
                            previousCursor,
                            feedbackQueueCursorStack.slice(0, -1),
                          );
                        }}
                      >
                        Página anterior
                      </button>
                      <button
                        type="button"
                        disabled={
                          !feedbackQueue.hasNext ||
                          feedbackQueue.nextCursor === undefined
                        }
                        onClick={() => {
                          const scopeId = managementScopeId;
                          if (
                            scopeId === undefined ||
                            feedbackQueue.nextCursor === undefined
                          ) {
                            return;
                          }
                          void loadFeedbackTriageQueue(
                            scopeId,
                            feedbackQueueStatusFilter,
                            feedbackQueue.nextCursor,
                            [...feedbackQueueCursorStack, feedbackQueueCursor],
                          );
                        }}
                      >
                        Próxima página
                      </button>
                    </div>
                  </div>
                  {feedbackActionError !== null ? (
                    <p className="feedback error" role="alert">
                      {feedbackActionError}
                    </p>
                  ) : null}
                  {feedbackHistoryTicketId !== null ? (
                    <section
                      className="experience-panel"
                      aria-labelledby="feedback-history-title"
                      data-testid="feedback-history"
                    >
                      <div className="section-heading compact-heading">
                        <div>
                          <p className="eyebrow">Trilha interna</p>
                          <h4 id="feedback-history-title">
                            Linha do tempo do relato
                          </h4>
                        </div>
                        <span className="status-pill">Somente leitura</span>
                      </div>
                      {feedbackHistoryState === "loading" ? (
                        <p role="status">Consultando o histórico…</p>
                      ) : feedbackHistoryState === "forbidden" ||
                        feedbackHistoryState === "unauthenticated" ? (
                        <p>
                          Esta conta não possui autorização para consultar este
                          histórico.
                        </p>
                      ) : feedbackHistoryState === "error" ||
                        feedbackHistory === null ? (
                        <div role="alert">
                          <p>Não foi possível carregar o histórico.</p>
                          <button
                            type="button"
                            onClick={() =>
                              void loadFeedbackTicketHistory(
                                feedbackHistoryTicketId,
                              )
                            }
                          >
                            Tentar novamente
                          </button>
                        </div>
                      ) : feedbackHistory.events.length === 0 ? (
                        <p>Nenhum evento histórico registrado.</p>
                      ) : (
                        <ol className="journey-list">
                          {feedbackHistory.events.map((event) => (
                            <li key={event.historyId}>
                              <strong>
                                v{event.ticketVersion} ·{" "}
                                {event.eventType === "CRIADO"
                                  ? "Relato criado"
                                  : event.eventType === "METADATA_ALTERADO"
                                    ? "Metadata de triagem alterada"
                                    : "Status alterado"}
                              </strong>
                              <br />
                              {event.eventType === "METADATA_ALTERADO" ? (
                                <>
                                  Prioridade{" "}
                                  {feedbackTriagePriorityLabel(
                                    event.fromPriority as FeedbackTriageQueuePriority,
                                  )}{" "}
                                  →{" "}
                                  {feedbackTriagePriorityLabel(
                                    event.toPriority as FeedbackTriageQueuePriority,
                                  )}
                                  <br />
                                  Responsabilidade{" "}
                                  {feedbackTriageAssigneeLabel(
                                    event.fromAssigneeId,
                                  )}{" "}
                                  →{" "}
                                  {feedbackTriageAssigneeLabel(
                                    event.toAssigneeId,
                                  )}
                                </>
                              ) : (
                                <>
                                  {event.fromStatus === undefined
                                    ? "Sem status anterior"
                                    : feedbackTriageStatusLabel(
                                        event.fromStatus,
                                      )}{" "}
                                  → {feedbackTriageStatusLabel(event.toStatus)}
                                </>
                              )}
                              <br />
                              Registrado {lastSeenLabel(event.createdAt)}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  ) : null}
                </>
              )}
            </section>

            <section
              className="dashboard-panel"
              aria-labelledby="reflection-management-title"
              data-testid="reflection-management-report"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Reflexão digital</p>
                  <h3 id="reflection-management-title">
                    Estado agregado por módulo
                  </h3>
                  <p>
                    Conta atribuições digitais não iniciadas, em andamento e
                    concluídas. Não exibe respostas, identidade de
                    participantes, nota ou competência prática.
                  </p>
                </div>
                {reflectionReportState === "ready" &&
                reflectionReport !== null ? (
                  <span className="status-pill">
                    Atualizado {lastSeenLabel(reflectionReport.generatedAt)}
                  </span>
                ) : null}
              </div>
              {reflectionReportState === "loading" ? (
                <div className="experience-panel" role="status">
                  Consolidando estados de reflexão…
                </div>
              ) : reflectionReportState === "forbidden" ||
                reflectionReportState === "unauthenticated" ? (
                <div className="experience-panel dashboard-message">
                  <strong>Visão restrita</strong>
                  <span>
                    Esta conta não possui autorização para consultar este
                    agregado.
                  </span>
                </div>
              ) : reflectionReportState === "error" ||
                reflectionReport === null ? (
                <div className="experience-panel error-panel" role="alert">
                  <p>Não foi possível carregar o agregado de reflexão.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const scopeId = managementScopeId;
                      if (scopeId !== undefined) {
                        void loadReflectionManagementReport(scopeId);
                      }
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : reflectionReport.modules.length === 0 ? (
                <p className="dashboard-empty">
                  Nenhuma atribuição de reflexão digital publicada neste escopo.
                </p>
              ) : (
                <div
                  className="dashboard-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela de estados de reflexão digital por módulo"
                >
                  <table className="dashboard-table">
                    <caption className="visually-hidden">
                      Estados agregados de reflexão digital por módulo
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Módulo</th>
                        <th scope="col">Não iniciada</th>
                        <th scope="col">Em andamento</th>
                        <th scope="col">Concluída</th>
                        <th scope="col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reflectionReport.modules.map((module) => (
                        <tr key={module.moduleId}>
                          <th scope="row">{module.moduleId}</th>
                          <td>{module.counts.NAO_INICIADA}</td>
                          <td>{module.counts.EM_ANDAMENTO}</td>
                          <td>{module.counts.CONCLUIDA}</td>
                          <td>{module.totalAssignments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              className="dashboard-panel"
              aria-labelledby="appeal-review-queue-title"
              data-testid="appeal-review-queue"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Revisão interna</p>
                  <h3 id="appeal-review-queue-title">Fila de contestação</h3>
                  <p>
                    Fila somente leitura para triagem por escopo. Exibe a
                    justificativa e o estado do fluxo, sem dados de resposta,
                    pontuação, chave de correção, fonte ou alegação de
                    competência prática.
                  </p>
                </div>
                {appealQueueState === "ready" && appealQueue !== null ? (
                  <span className="status-pill">
                    Atualizado {lastSeenLabel(appealQueue.generatedAt)}
                  </span>
                ) : null}
              </div>
              {appealQueueState === "loading" ? (
                <div className="experience-panel" role="status">
                  Consultando a fila de contestação…
                </div>
              ) : appealQueueState === "forbidden" ||
                appealQueueState === "unauthenticated" ? (
                <div className="experience-panel dashboard-message">
                  <strong>Fila restrita</strong>
                  <span>
                    Esta conta não possui autorização para revisar contestações.
                  </span>
                </div>
              ) : appealQueueState === "error" || appealQueue === null ? (
                <div className="experience-panel error-panel" role="alert">
                  <p>Não foi possível carregar a fila de contestação.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const scopeId = managementScopeId;
                      if (scopeId !== undefined) {
                        void loadAppealReviewQueue(
                          scopeId,
                          appealQueueStatusFilter,
                        );
                      }
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="report-filter-row"
                    aria-label="Filtros da fila de contestação"
                  >
                    <label>
                      Status
                      <select
                        value={appealQueueStatusFilter}
                        onChange={(event) =>
                          setAppealQueueStatusFilter(
                            event.target.value as AppealReviewQueueStatusFilter,
                          )
                        }
                      >
                        <option value="">Ativas e encerradas</option>
                        <option value="ABERTA">Abertas</option>
                        <option value="EM_REVISAO">Em revisão</option>
                        <option value="DECIDIDA">Decididas</option>
                        <option value="RECALCULO_PENDENTE">
                          Recálculo pendente
                        </option>
                        <option value="ENCERRADA">Encerradas</option>
                      </select>
                    </label>
                  </div>
                  {appealQueue.items.length === 0 ? (
                    <p className="dashboard-empty">
                      Nenhuma contestação no recorte autorizado.
                    </p>
                  ) : (
                    <div
                      className="dashboard-table-wrap"
                      tabIndex={0}
                      role="region"
                      aria-label="Tabela de contestações para revisão"
                    >
                      <table className="dashboard-table">
                        <caption className="visually-hidden">
                          Contestações para revisão interna
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Justificativa</th>
                            <th scope="col">Prazo</th>
                            <th scope="col">Status</th>
                            <th scope="col">Revisor</th>
                            <th scope="col">Decisão</th>
                            <th scope="col">Histórico</th>
                            <th scope="col">Prévia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appealQueue.items.map((item) => (
                            <tr key={item.appealId}>
                              <td>{item.justification}</td>
                              <td>{lastSeenLabel(item.dueAt)}</td>
                              <td>{appealReviewStatusLabel(item.status)}</td>
                              <td>
                                {item.reviewerId === undefined
                                  ? "Não atribuído"
                                  : "Revisor atribuído"}
                              </td>
                              <td>
                                {appealReviewDecisionLabel(item.decision)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void loadAppealReviewHistory(item.appealId)
                                  }
                                >
                                  Ver histórico
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  disabled={
                                    item.status !== "ABERTA" &&
                                    item.status !== "EM_REVISAO"
                                  }
                                  onClick={() =>
                                    void loadAppealDecisionImpact(item.appealId)
                                  }
                                >
                                  {item.status === "ABERTA" ||
                                  item.status === "EM_REVISAO"
                                    ? "Prévia de anulação"
                                    : "Prévia indisponível neste estado"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {appealHistoryAppealId !== null ? (
                    <section
                      className="experience-panel"
                      aria-labelledby="appeal-history-title"
                      data-testid="appeal-history"
                    >
                      <div className="section-heading compact-heading">
                        <div>
                          <p className="eyebrow">Trilha interna</p>
                          <h4 id="appeal-history-title">
                            Linha do tempo da contestação
                          </h4>
                        </div>
                        <span className="status-pill">Somente leitura</span>
                      </div>
                      {appealHistoryState === "loading" ? (
                        <p role="status">Consultando o histórico…</p>
                      ) : appealHistoryState === "forbidden" ||
                        appealHistoryState === "unauthenticated" ? (
                        <p>
                          Esta conta não possui autorização para consultar este
                          histórico.
                        </p>
                      ) : appealHistoryState === "error" ||
                        appealHistory === null ? (
                        <div role="alert">
                          <p>Não foi possível carregar o histórico.</p>
                          <button
                            type="button"
                            onClick={() =>
                              void loadAppealReviewHistory(
                                appealHistoryAppealId,
                              )
                            }
                          >
                            Tentar novamente
                          </button>
                        </div>
                      ) : appealHistory.events.length === 0 ? (
                        <p>Nenhum evento histórico registrado.</p>
                      ) : (
                        <ol className="journey-list">
                          {appealHistory.events.map((event) => (
                            <li key={event.historyId}>
                              <strong>
                                v{event.appealVersion} ·{" "}
                                {appealReviewHistoryEventLabel(event.eventType)}
                              </strong>
                              <br />
                              {appealReviewHistoryStatusLabel(
                                event.fromStatus,
                              )}{" "}
                              → {appealReviewHistoryStatusLabel(event.toStatus)}
                              {event.reviewerId === undefined
                                ? " · Sem revisor identificado"
                                : " · Revisor identificado"}
                              {event.decision === undefined ? null : (
                                <>
                                  <br />
                                  Decisão:{" "}
                                  {appealReviewDecisionLabel(event.decision)}
                                </>
                              )}
                              {event.decisionRationale === undefined ? null : (
                                <>
                                  <br />
                                  Rationale: {event.decisionRationale}
                                </>
                              )}
                              <br />
                              Registrado {lastSeenLabel(event.createdAt)}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  ) : null}
                  {appealImpactAppealId !== null ? (
                    <section
                      className="experience-panel"
                      aria-labelledby="appeal-impact-title"
                      data-testid="appeal-impact-preview"
                    >
                      <div className="section-heading compact-heading">
                        <div>
                          <p className="eyebrow">Prévia operacional</p>
                          <h4 id="appeal-impact-title">
                            Impacto técnico de `ANULAR_ITEM`
                          </h4>
                        </div>
                        <span className="status-pill">Somente leitura</span>
                      </div>
                      {appealImpactState === "loading" ? (
                        <p role="status">Consultando o impacto persistido…</p>
                      ) : appealImpactState === "forbidden" ||
                        appealImpactState === "unauthenticated" ? (
                        <p>
                          Esta conta não possui autorização para consultar esta
                          prévia.
                        </p>
                      ) : appealImpactState === "error" ||
                        appealImpact === null ? (
                        <div role="alert">
                          <p>Não foi possível carregar a prévia.</p>
                          <button
                            type="button"
                            onClick={() =>
                              void loadAppealDecisionImpact(
                                appealImpactAppealId,
                              )
                            }
                          >
                            Tentar novamente
                          </button>
                        </div>
                      ) : (
                        <>
                          <p>
                            Cenário candidato; nenhuma decisão foi registrada e
                            nenhuma mutação foi executada.
                          </p>
                          <dl className="summary-list">
                            <div>
                              <dt>Contestação</dt>
                              <dd>
                                {appealReviewStatusLabel(
                                  appealImpact.appeal.status,
                                )}
                                {" · "}versão {appealImpact.appeal.version}
                              </dd>
                            </div>
                            <div>
                              <dt>Tentativa alvo</dt>
                              <dd>
                                {appealImpact.target.attemptId}
                                {" · "}
                                {appealImpact.target.attemptStatus}
                                {" · "}versão{" "}
                                {appealImpact.target.attemptVersion}
                              </dd>
                            </div>
                            <div>
                              <dt>Item alvo</dt>
                              <dd>{appealImpact.target.itemId}</dd>
                            </div>
                            <div>
                              <dt>Resultado atual</dt>
                              <dd>
                                {appealImpact.latestResult.availability ===
                                "AVAILABLE"
                                  ? `Disponível · versão ${appealImpact.latestResult.version}`
                                  : "Não disponível"}
                              </dd>
                            </div>
                          </dl>
                          <p>
                            Score: não calculado · recálculo: indisponível nesta
                            fatia · publicação: não executada.
                          </p>
                        </>
                      )}
                    </section>
                  ) : null}
                </>
              )}
            </section>

            <section
              className="dashboard-panel"
              aria-labelledby="audit-trail-title"
              data-testid="audit-trail"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Governança</p>
                  <h3 id="audit-trail-title">Trilha de auditoria</h3>
                  <p>
                    Consulta somente leitura dos eventos do escopo selecionado.
                    A superfície mostra apenas metadados operacionais redigidos;
                    não permite editar, exportar ou alterar decisões.
                  </p>
                </div>
                {auditTrailState === "ready" && auditTrail !== null ? (
                  <span className="status-pill">
                    {auditTrail.items.length} eventos
                  </span>
                ) : null}
              </div>
              {auditTrailState === "loading" ? (
                <div className="experience-panel" role="status">
                  Consultando a trilha de auditoria…
                </div>
              ) : auditTrailState === "forbidden" ||
                auditTrailState === "unauthenticated" ? (
                <div className="experience-panel dashboard-message">
                  <strong>Trilha restrita</strong>
                  <span>
                    Esta conta não possui autorização para consultar os eventos
                    deste escopo.
                  </span>
                </div>
              ) : auditTrailState === "error" || auditTrail === null ? (
                <div className="experience-panel error-panel" role="alert">
                  <p>Não foi possível carregar a trilha de auditoria.</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (managementScopeId !== undefined) {
                        void loadAuditTrail(managementScopeId);
                      }
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : auditTrail.items.length === 0 ? (
                <p className="dashboard-empty">
                  Nenhum evento no recorte autorizado.
                </p>
              ) : (
                <>
                  <div
                    className="dashboard-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Tabela da trilha de auditoria"
                  >
                    <table className="dashboard-table">
                      <caption className="visually-hidden">
                        Eventos da trilha de auditoria no escopo selecionado
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Quando</th>
                          <th scope="col">Ação</th>
                          <th scope="col">Recurso</th>
                          <th scope="col">Resultado</th>
                          <th scope="col">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditTrail.items.map((item) => (
                          <tr key={item.auditId}>
                            <th scope="row">
                              {lastSeenLabel(item.occurredAt)}
                            </th>
                            <td>{item.action}</td>
                            <td>
                              {item.resourceType}
                              {item.resourceId === undefined
                                ? ""
                                : ` · ${item.resourceId}`}
                            </td>
                            <td>{item.outcome}</td>
                            <td>{item.reasonCode ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="report-filter-row">
                    <span role="status">
                      Página atual · {auditTrail.items.length} eventos
                    </span>
                    <button
                      type="button"
                      disabled={
                        !auditTrail.hasNext ||
                        auditTrail.nextCursor === undefined
                      }
                      onClick={() => {
                        if (
                          managementScopeId !== undefined &&
                          auditTrail.nextCursor !== undefined
                        ) {
                          void loadAuditTrail(
                            managementScopeId,
                            auditTrail.nextCursor,
                          );
                        }
                      }}
                    >
                      Próxima página
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="invite-panel" aria-labelledby="invite-title">
              <div>
                <p className="eyebrow">Entrada controlada</p>
                <h3 id="invite-title">Adicionar veterinário</h3>
                <p>
                  Crie um convite de participante no primeiro escopo autorizado.
                  Entregue o token somente pelo canal interno aprovado; ele não
                  é salvo nesta tela nem enviado para logs.
                </p>
              </div>
              <form
                className="invite-form"
                onSubmit={(event) => void createParticipantInvitation(event)}
              >
                <label htmlFor="professional-email">E-mail profissional</label>
                <div className="invite-form-row">
                  <input
                    id="professional-email"
                    name="professionalEmail"
                    type="email"
                    autoComplete="email"
                    value={invitationEmail}
                    onChange={(event) => setInvitationEmail(event.target.value)}
                    placeholder="veterinario@exemplo.invalid"
                    required
                    maxLength={320}
                  />
                  <button
                    type="submit"
                    disabled={invitationState === "submitting"}
                  >
                    {invitationState === "submitting"
                      ? "Criando…"
                      : "Criar convite"}
                  </button>
                </div>
              </form>
              {invitationState === "error" && invitationError !== null ? (
                <p className="feedback error" role="alert">
                  {invitationError}
                </p>
              ) : null}
              {invitationState === "success" && invitationResult !== null ? (
                <div className="invite-success" role="status">
                  <strong>
                    Convite{" "}
                    {invitationContext === "resent" ? "reenviado" : "criado"}{" "}
                    para {invitationResult.professionalEmail}
                  </strong>
                  <label htmlFor="created-invitation-token">
                    Token de convite criado
                  </label>
                  <input
                    id="created-invitation-token"
                    aria-label="Token de convite criado"
                    type="text"
                    value={invitationResult.token}
                    readOnly
                  />
                  <small>
                    Expira em {lastSeenLabel(invitationResult.expiresAt)}. O
                    token é exibido uma única vez nesta superfície autorizada.
                  </small>
                </div>
              ) : null}
              {accountActionState === "success" &&
              accountActionMessage !== null ? (
                <p className="feedback success" role="status">
                  {accountActionMessage}
                </p>
              ) : null}
              {accountActionState === "error" && accountActionError !== null ? (
                <p className="feedback error" role="alert">
                  {accountActionError}
                </p>
              ) : null}
              {recoveryResult !== null ? (
                <div className="invite-success" role="status">
                  <strong>
                    Link de recuperação para {recoveryResult.professionalEmail}
                  </strong>
                  <label htmlFor="account-recovery-token">
                    Token de recuperação criado
                  </label>
                  <input
                    id="account-recovery-token"
                    aria-label="Token de recuperação criado"
                    type="text"
                    value={recoveryResult.token}
                    readOnly
                  />
                  <small>
                    Expira em {lastSeenLabel(recoveryResult.expiresAt)}.
                    Entregue somente pelo canal aprovado; este link é de uso
                    único e não reativa contas suspensas ou desativadas.
                  </small>
                </div>
              ) : null}
            </section>

            <section
              className="dashboard-panel"
              aria-labelledby="participants-title"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Acompanhamento individual</p>
                  <h3 id="participants-title">Profissionais da sua alçada</h3>
                </div>
                <span className="status-pill">
                  {dashboard.participants.length} registros
                </span>
              </div>
              {dashboard.participants.length === 0 ? (
                <p className="dashboard-empty">
                  Nenhum profissional atribuído a este escopo.
                </p>
              ) : (
                <div
                  className="dashboard-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela de evolução dos profissionais"
                >
                  <table className="dashboard-table">
                    <caption className="visually-hidden">
                      Evolução dos profissionais no escopo atual
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Profissional</th>
                        <th scope="col">Progresso</th>
                        <th scope="col">Baseline diagnóstica</th>
                        <th scope="col">Próximo passo</th>
                        <th scope="col">Sinais de atenção</th>
                        <th scope="col">Conta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.participants.map((participant) => (
                        <tr key={participant.professionalEmail}>
                          <th scope="row">
                            <span className="participant-email">
                              {participant.professionalEmail}
                            </span>
                            <small>
                              {accountStatusLabel(participant.accountStatus)} ·
                              último acesso:{" "}
                              {lastSeenLabel(participant.lastSeenAt)}
                            </small>
                          </th>
                          <td>
                            <strong>
                              {percentageLabel(
                                participant.progress.progressPercent,
                              )}
                            </strong>
                            <small>
                              {participant.progress.completedModules} de{" "}
                              {participant.progress.assignedModules} módulos
                            </small>
                          </td>
                          <td>
                            {participant.diagnosticProfile === undefined ? (
                              <small>Sem diagnóstico registrado</small>
                            ) : (
                              <div
                                className="staff-diagnostic-profile"
                                aria-label="Diagnóstico formativo por tema"
                              >
                                <strong>Diagnóstico formativo por tema</strong>
                                <small className="staff-diagnostic-disclaimer">
                                  Sem nota global; não representa competência
                                  prática ou autorização clínica.
                                </small>
                                {participant.diagnosticProfile.map((item) => (
                                  <span key={item.themeId}>
                                    <b>{item.themeLabel}</b>
                                    <small>
                                      {diagnosticStatusLabel(item.status)} ·{" "}
                                      {percentageLabel(item.scorePercent)}
                                    </small>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>{nextActionLabel(participant.nextAction)}</td>
                          <td>
                            <small>
                              {participant.pendingCorrections} correções ·{" "}
                              {participant.progress.remediationModules} reforços
                              · {participant.openFeedback} feedbacks
                            </small>
                          </td>
                          <td>
                            <div className="account-actions">
                              {participant.accountStatus === "INVITED" ? (
                                <button
                                  type="button"
                                  disabled={accountActionState === "submitting"}
                                  onClick={() =>
                                    void resendParticipantInvitation(
                                      participant.participantId,
                                    )
                                  }
                                >
                                  {accountActionKey ===
                                  `${participant.participantId}:resend`
                                    ? "Reenviando…"
                                    : "Reenviar convite"}
                                </button>
                              ) : null}
                              {participant.accountStatus === "ACTIVE" ? (
                                <>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={
                                      accountActionState === "submitting"
                                    }
                                    onClick={() =>
                                      void issueParticipantRecovery(
                                        participant.participantId,
                                      )
                                    }
                                  >
                                    {accountActionKey ===
                                    `${participant.participantId}:recovery`
                                      ? "Gerando…"
                                      : "Gerar recuperação"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      accountActionState === "submitting"
                                    }
                                    onClick={() =>
                                      void changeParticipantStatus(
                                        participant.participantId,
                                        "ACTIVE",
                                        "SUSPENDED",
                                      )
                                    }
                                  >
                                    {accountActionKey ===
                                    `${participant.participantId}:SUSPENDED`
                                      ? "Suspendo…"
                                      : "Suspender"}
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={
                                      accountActionState === "submitting"
                                    }
                                    onClick={() =>
                                      void changeParticipantStatus(
                                        participant.participantId,
                                        "ACTIVE",
                                        "DEACTIVATED",
                                      )
                                    }
                                  >
                                    Desativar
                                  </button>
                                </>
                              ) : null}
                              {participant.accountStatus === "SUSPENDED" ||
                              participant.accountStatus === "DEACTIVATED" ? (
                                <button
                                  type="button"
                                  disabled={accountActionState === "submitting"}
                                  onClick={() =>
                                    void changeParticipantStatus(
                                      participant.participantId,
                                      participant.accountStatus === "SUSPENDED"
                                        ? "SUSPENDED"
                                        : "DEACTIVATED",
                                      "ACTIVE",
                                    )
                                  }
                                >
                                  {accountActionKey ===
                                  `${participant.participantId}:ACTIVE`
                                    ? "Reativando…"
                                    : "Reativar"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
