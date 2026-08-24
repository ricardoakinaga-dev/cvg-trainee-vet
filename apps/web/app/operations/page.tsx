"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

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
type ReportStatusFilter =
  "" | "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
type AppealReviewQueueStatus =
  "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";
type AppealReviewQueueStatusFilter = "" | AppealReviewQueueStatus;

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
): string | undefined {
  const participant = dashboard?.participants.find(
    (candidate) => candidate.participantId === participantId,
  );
  return participant?.scopeIds.find((scopeId) =>
    dashboard?.scopes.includes(scopeId),
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
  const [reportState, setReportState] = useState<ReportLoadState>("idle");
  const [report, setReport] = useState<ContinuingEducationReport | null>(null);
  const [reportPage, setReportPage] = useState(1);
  const reportPageSize = 25;
  const [reflectionReportState, setReflectionReportState] =
    useState<ReportLoadState>("idle");
  const [reflectionReport, setReflectionReport] =
    useState<ReflectionManagementReport | null>(null);
  const [appealQueueState, setAppealQueueState] =
    useState<ReportLoadState>("idle");
  const [appealQueue, setAppealQueue] = useState<AppealReviewQueue | null>(
    null,
  );
  const [appealQueueStatusFilter, setAppealQueueStatusFilter] =
    useState<AppealReviewQueueStatusFilter>("");
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
    const scopeId = dashboard?.scopes[0];
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
    const scopeId = dashboard?.scopes[0];
    if (scopeId === undefined) {
      setReflectionReport(null);
      setReflectionReportState("idle");
      return;
    }
    void loadReflectionManagementReport(scopeId);
  }, [dashboard, loadReflectionManagementReport]);

  const loadAppealReviewQueue = useCallback(
    async (scopeId: string, status: AppealReviewQueueStatusFilter) => {
      setAppealQueueState("loading");
      const query = new URLSearchParams({ scopeId });
      if (status.length > 0) query.set("status", status);
      try {
        const response = await fetch(
          `/api/v1/internal/appeals/review-queue?${query.toString()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) {
          setAppealQueue(null);
          setAppealQueueState(dashboardErrorState(response.status));
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
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
        setAppealQueue(null);
        setAppealQueueState("error");
      }
    },
    [],
  );

  useEffect(() => {
    const scopeId = dashboard?.scopes[0];
    if (scopeId === undefined) {
      setAppealQueue(null);
      setAppealQueueState("idle");
      return;
    }
    void loadAppealReviewQueue(scopeId, appealQueueStatusFilter);
  }, [appealQueueStatusFilter, dashboard, loadAppealReviewQueue]);

  async function createParticipantInvitation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const scopeId = dashboard?.scopes[0];
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
    const scopeId = participantScopeId(dashboard, participantId);
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
    const scopeId = participantScopeId(dashboard, participantId);
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
    const scopeId = participantScopeId(dashboard, participantId);
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
            <p className="dashboard-updated" role="status">
              Atualizado em {lastSeenLabel(dashboard.generatedAt)}
            </p>
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
                      const scopeId = dashboard?.scopes[0];
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
                      const scopeId = dashboard?.scopes[0];
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
                      const scopeId = dashboard?.scopes[0];
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
