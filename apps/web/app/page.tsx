"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

type ActivityItem = Readonly<{
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: string;
  readonly title: string;
  readonly text: string;
  readonly responseMode: "TEXT" | "CHOICE" | "NONE";
  readonly choices?: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }>[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
}>;

type ReflectionProjection = Readonly<{
  readonly status: "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA";
  readonly nextAction:
    | "INICIAR_REFLEXAO"
    | "RETOMAR_REFLEXAO"
    | "ENVIAR_REFLEXAO"
    | "PROXIMA_ACAO";
  readonly itemCount: number;
  readonly answeredItemCount: number;
  readonly answers: readonly Readonly<{
    readonly itemId: string;
    readonly response: string;
    readonly savedAt: string;
  }>[];
  readonly evidence: "REFLEXAO_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type ActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ActivityItem[];
  readonly reflection?: ReflectionProjection;
}>;

type AttemptProjection = Readonly<{
  readonly attemptId: string;
  readonly activityId: string;
  readonly status: string;
  readonly version: number;
  readonly answers: readonly Readonly<{
    readonly itemId: string;
    readonly response: string;
  }>[];
}>;

type ParticipantAppealProjection = Readonly<{
  readonly appealId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly createdAt: string;
  readonly dueAt: string;
  readonly status:
    "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";
  readonly version: number;
  readonly decision?: "MANTER_RESULTADO" | "ANULAR_ITEM" | "ALTERAR_RESULTADO";
}>;

type ParticipantAppealsProjection = Readonly<{
  readonly appeals: readonly ParticipantAppealProjection[];
}>;

type FeedbackTicketType =
  "BUG_TECNICO" | "USABILIDADE" | "ERRO_CONTEUDO" | "MELHORIA" | "CONTESTACAO";

type ParticipantFeedbackTicketProjection = Readonly<{
  readonly ticketId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: string;
  readonly status: string;
  readonly version: number;
}>;

type ParticipantFeedbackTicketsProjection = Readonly<{
  readonly tickets: readonly ParticipantFeedbackTicketProjection[];
}>;

type CurriculumRuntimeProjection = Readonly<{
  readonly moduleId: string;
  readonly version: number;
  readonly status:
    "DOMINIO_DIGITAL" | "EM_REMEDIACAO" | "AGUARDA_CORRECAO_HUMANA";
  readonly nextAction:
    "REVISAR_RETENCAO" | "EXECUTAR_REMEDIACAO" | "AGUARDAR_CORRECAO_HUMANA";
  readonly scorePercent?: number;
  readonly remediationCount: number;
  readonly retentionReviews: readonly Readonly<{
    readonly day: 7 | 30 | 90;
    readonly dueAt: string;
    readonly status: "PENDENTE";
  }>[];
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type JourneyActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly attemptId?: string;
  readonly attemptStatus?: string;
  readonly attemptVersion?: number;
  readonly nextAction: string;
}>;

type LearningJourneyProjection = Readonly<{
  readonly assignments: readonly ApiRecord[];
  readonly activities: readonly JourneyActivityProjection[];
  readonly results: readonly ApiRecord[];
  readonly runtimes: readonly CurriculumRuntimeProjection[];
  readonly nextAction: string;
  readonly nextActionTarget?: Readonly<{
    readonly kind: "ACTIVITY";
    readonly activityId: string;
  }>;
}>;

type CorrectionProjection = Readonly<{
  readonly attemptStatus: "CORRIGIDA_AUTOMATICAMENTE" | "CORRIGIDA_HUMANAMENTE";
  readonly attemptVersion: number;
  readonly resultVersion: number;
  readonly score: number;
  readonly outcome: "APROVADO" | "REFORCO";
  readonly feedback: string;
}>;

type ParticipantDashboardProjection = Readonly<{
  readonly kind: "participant";
  readonly nextAction: string;
  readonly path: readonly Readonly<{
    readonly moduleId: string;
    readonly month: number;
    readonly status: string;
    readonly nextAction: string;
  }>[];
  readonly profile: readonly Readonly<{
    readonly moduleId: string;
    readonly month: number;
    readonly competence: string;
    readonly status: string;
    readonly scorePercent: number | null;
    readonly lastEvaluatedAt?: string;
    readonly evidence: "AVALIACAO_MODULAR_DIGITAL";
    readonly practicalCompetenceClaim: "PROIBIDO_MVP";
  }>[];
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
  readonly progress: Readonly<{
    readonly assignedActivities: number;
    readonly completedActivities: number;
    readonly progressPercent: number | null;
    readonly remediationObjectives: number;
    readonly retentionReviewsPending: number;
    readonly pendingCorrections: number;
  }>;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

type ExperienceState = "idle" | "loading" | "ready" | "empty" | "error";
type RetryAction =
  | "access"
  | "journey"
  | "activity"
  | "appeals"
  | "feedback"
  | "correction"
  | null;

class PublicApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isChoice(value: unknown): value is Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}> {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.text) &&
    value.id.trim().length > 0 &&
    value.label.trim().length > 0 &&
    value.text.trim().length > 0
  );
}

function isReflection(value: unknown): value is ReflectionProjection {
  if (!isRecord(value)) return false;
  const status =
    value.status === "NAO_INICIADA" ||
    value.status === "EM_ANDAMENTO" ||
    value.status === "CONCLUIDA";
  const nextAction =
    value.nextAction === "INICIAR_REFLEXAO" ||
    value.nextAction === "RETOMAR_REFLEXAO" ||
    value.nextAction === "ENVIAR_REFLEXAO" ||
    value.nextAction === "PROXIMA_ACAO";
  return (
    status &&
    nextAction &&
    typeof value.itemCount === "number" &&
    Number.isInteger(value.itemCount) &&
    value.itemCount >= 1 &&
    value.itemCount <= 100 &&
    typeof value.answeredItemCount === "number" &&
    Number.isInteger(value.answeredItemCount) &&
    value.answeredItemCount >= 0 &&
    value.answeredItemCount <= value.itemCount &&
    Array.isArray(value.answers) &&
    value.answers.length === value.answeredItemCount &&
    value.answers.every(
      (answer) =>
        isRecord(answer) &&
        isString(answer.itemId) &&
        isString(answer.response) &&
        answer.response.trim().length > 0 &&
        isString(answer.savedAt),
    ) &&
    value.evidence === "REFLEXAO_DIGITAL" &&
    value.practicalCompetenceClaim === "PROIBIDO_MVP"
  );
}

function isActivity(value: unknown): value is ActivityProjection {
  if (!isRecord(value)) return false;
  if (
    !isString(value.activityId) ||
    !isString(value.slug) ||
    !isString(value.title) ||
    !Array.isArray(value.items)
  ) {
    return false;
  }
  if (value.reflection !== undefined && !isReflection(value.reflection)) {
    return false;
  }

  return value.items.every((item) => {
    if (!isRecord(item)) return false;
    const basicShape =
      isString(item.itemId) &&
      typeof item.ordinal === "number" &&
      isString(item.kind) &&
      isString(item.title) &&
      isString(item.text) &&
      (item.responseMode === "TEXT" ||
        item.responseMode === "CHOICE" ||
        item.responseMode === "NONE");
    if (!basicShape) return false;
    if (
      item.selectionMode !== undefined &&
      item.selectionMode !== "SINGLE" &&
      item.selectionMode !== "MULTIPLE"
    ) {
      return false;
    }
    if (item.choices !== undefined) {
      if (!Array.isArray(item.choices) || !item.choices.every(isChoice)) {
        return false;
      }
    }
    return (
      item.responseMode !== "CHOICE" ||
      (Array.isArray(item.choices) &&
        item.choices.length >= 2 &&
        item.selectionMode !== undefined)
    );
  });
}

function isAttempt(value: unknown): value is AttemptProjection {
  if (!isRecord(value)) return false;
  return (
    isString(value.attemptId) &&
    isString(value.activityId) &&
    isString(value.status) &&
    typeof value.version === "number" &&
    Array.isArray(value.answers) &&
    value.answers.every(
      (answer) =>
        isRecord(answer) &&
        isString(answer.itemId) &&
        isString(answer.response),
    )
  );
}

function isCorrection(value: unknown): value is CorrectionProjection {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set([
    "attemptStatus",
    "attemptVersion",
    "resultVersion",
    "score",
    "outcome",
    "feedback",
  ]);
  return (
    Object.keys(value).every((key) => allowedKeys.has(key)) &&
    (value.attemptStatus === "CORRIGIDA_AUTOMATICAMENTE" ||
      value.attemptStatus === "CORRIGIDA_HUMANAMENTE") &&
    typeof value.attemptVersion === "number" &&
    Number.isInteger(value.attemptVersion) &&
    value.attemptVersion >= 0 &&
    typeof value.resultVersion === "number" &&
    Number.isInteger(value.resultVersion) &&
    value.resultVersion > 0 &&
    typeof value.score === "number" &&
    Number.isInteger(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    (value.outcome === "APROVADO" || value.outcome === "REFORCO") &&
    isString(value.feedback) &&
    value.feedback.trim().length > 0 &&
    value.feedback.length <= 10_000 &&
    !/<[^>]*>/u.test(value.feedback)
  );
}

function isParticipantAppeal(
  value: unknown,
): value is ParticipantAppealProjection {
  if (!isRecord(value)) return false;
  const status =
    value.status === "ABERTA" ||
    value.status === "EM_REVISAO" ||
    value.status === "DECIDIDA" ||
    value.status === "RECALCULO_PENDENTE" ||
    value.status === "ENCERRADA";
  const decision =
    value.decision === undefined ||
    value.decision === "MANTER_RESULTADO" ||
    value.decision === "ANULAR_ITEM" ||
    value.decision === "ALTERAR_RESULTADO";
  return (
    isString(value.appealId) &&
    isString(value.attemptId) &&
    isString(value.itemId) &&
    isString(value.createdAt) &&
    isString(value.dueAt) &&
    status &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version >= 0 &&
    decision
  );
}

function isParticipantAppeals(
  value: unknown,
): value is ParticipantAppealsProjection {
  return (
    isRecord(value) &&
    Array.isArray(value.appeals) &&
    value.appeals.length <= 100 &&
    value.appeals.every(isParticipantAppeal)
  );
}

function isParticipantFeedbackTicket(
  value: unknown,
): value is ParticipantFeedbackTicketProjection {
  if (!isRecord(value)) return false;
  return (
    isString(value.ticketId) &&
    (value.type === "BUG_TECNICO" ||
      value.type === "USABILIDADE" ||
      value.type === "ERRO_CONTEUDO" ||
      value.type === "MELHORIA" ||
      value.type === "CONTESTACAO") &&
    isString(value.description) &&
    isString(value.createdAt) &&
    isString(value.status) &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version >= 0
  );
}

function isParticipantFeedback(
  value: unknown,
): value is ParticipantFeedbackTicketsProjection {
  return (
    isRecord(value) &&
    Array.isArray(value.tickets) &&
    value.tickets.length <= 100 &&
    value.tickets.every(isParticipantFeedbackTicket)
  );
}

function isRuntime(value: unknown): value is CurriculumRuntimeProjection {
  if (!isRecord(value)) return false;
  const status =
    value.status === "DOMINIO_DIGITAL" ||
    value.status === "EM_REMEDIACAO" ||
    value.status === "AGUARDA_CORRECAO_HUMANA";
  const nextAction =
    value.nextAction === "REVISAR_RETENCAO" ||
    value.nextAction === "EXECUTAR_REMEDIACAO" ||
    value.nextAction === "AGUARDAR_CORRECAO_HUMANA";
  return (
    isString(value.moduleId) &&
    /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value.moduleId) &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version >= 1 &&
    status &&
    nextAction &&
    (value.scorePercent === undefined ||
      (typeof value.scorePercent === "number" &&
        Number.isInteger(value.scorePercent) &&
        value.scorePercent >= 0 &&
        value.scorePercent <= 100)) &&
    typeof value.remediationCount === "number" &&
    Number.isInteger(value.remediationCount) &&
    value.remediationCount >= 0 &&
    Array.isArray(value.retentionReviews) &&
    value.retentionReviews.every(
      (review) =>
        isRecord(review) &&
        (review.day === 7 || review.day === 30 || review.day === 90) &&
        isString(review.dueAt) &&
        review.status === "PENDENTE",
    ) &&
    value.practicalCompetenceClaim === "PROIBIDO_MVP"
  );
}

function isTerminalAttemptStatus(value: string | undefined): boolean {
  return (
    value === "CORRIGIDA_AUTOMATICAMENTE" ||
    value === "CORRIGIDA_HUMANAMENTE" ||
    value === "ANULADA"
  );
}

function isJourneyActivity(value: unknown): value is JourneyActivityProjection {
  if (!isRecord(value)) return false;
  return (
    isString(value.activityId) &&
    isString(value.slug) &&
    isString(value.title) &&
    isString(value.status) &&
    isString(value.nextAction) &&
    (value.attemptId === undefined || isString(value.attemptId)) &&
    (value.attemptStatus === undefined || isString(value.attemptStatus)) &&
    (value.attemptVersion === undefined ||
      (typeof value.attemptVersion === "number" &&
        Number.isInteger(value.attemptVersion) &&
        value.attemptVersion >= 0))
  );
}

function isJourney(value: unknown): value is LearningJourneyProjection {
  if (!isRecord(value)) return false;
  const target = value.nextActionTarget;
  const validTarget =
    target === undefined ||
    (isRecord(target) &&
      target.kind === "ACTIVITY" &&
      isString(target.activityId) &&
      Array.isArray(value.activities) &&
      value.activities.some(
        (activity) =>
          isRecord(activity) && activity.activityId === target.activityId,
      ));
  return (
    Array.isArray(value.assignments) &&
    value.assignments.every(isRecord) &&
    Array.isArray(value.activities) &&
    value.activities.every(isJourneyActivity) &&
    Array.isArray(value.results) &&
    value.results.every(isRecord) &&
    Array.isArray(value.runtimes) &&
    value.runtimes.every(isRuntime) &&
    isString(value.nextAction) &&
    validTarget
  );
}

function isParticipantDashboard(
  value: unknown,
): value is ParticipantDashboardProjection {
  if (!isRecord(value) || value.kind !== "participant") return false;
  const progress = value.progress;
  if (!isRecord(progress) || !isString(value.nextAction)) return false;
  const countKeys = [
    "assignedActivities",
    "completedActivities",
    "remediationObjectives",
    "retentionReviewsPending",
    "pendingCorrections",
  ] as const;
  return (
    Array.isArray(value.path) &&
    value.path.length <= 24 &&
    value.path.every(
      (item) =>
        isRecord(item) &&
        isString(item.moduleId) &&
        /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(item.moduleId) &&
        typeof item.month === "number" &&
        Number.isInteger(item.month) &&
        item.month >= 1 &&
        item.month <= 24 &&
        isString(item.status) &&
        isString(item.nextAction),
    ) &&
    Array.isArray(value.profile) &&
    value.profile.length <= 24 &&
    value.profile.every(
      (item) =>
        isRecord(item) &&
        isString(item.moduleId) &&
        /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(item.moduleId) &&
        typeof item.month === "number" &&
        Number.isInteger(item.month) &&
        item.month >= 1 &&
        item.month <= 24 &&
        isString(item.competence) &&
        item.competence.trim().length <= 500 &&
        isString(item.status) &&
        (item.scorePercent === null ||
          (typeof item.scorePercent === "number" &&
            Number.isInteger(item.scorePercent) &&
            item.scorePercent >= 0 &&
            item.scorePercent <= 100)) &&
        (item.lastEvaluatedAt === undefined ||
          isString(item.lastEvaluatedAt)) &&
        item.evidence === "AVALIACAO_MODULAR_DIGITAL" &&
        item.practicalCompetenceClaim === "PROIBIDO_MVP",
    ) &&
    (value.diagnosticProfile === undefined ||
      (Array.isArray(value.diagnosticProfile) &&
        value.diagnosticProfile.length === 3 &&
        value.diagnosticProfile.every(
          (item) =>
            isRecord(item) &&
            (item.themeId === "B07-S1" ||
              item.themeId === "B07-S2" ||
              item.themeId === "B07-S3") &&
            isString(item.themeLabel) &&
            (item.status === "SEM_EVIDENCIA_DIGITAL" ||
              item.status === "BASELINE_REGISTRADA") &&
            (item.scorePercent === null ||
              (typeof item.scorePercent === "number" &&
                Number.isInteger(item.scorePercent) &&
                item.scorePercent >= 0 &&
                item.scorePercent <= 100)) &&
            typeof item.answeredItemCount === "number" &&
            Number.isInteger(item.answeredItemCount) &&
            item.answeredItemCount >= 0 &&
            item.answeredItemCount <= 40 &&
            typeof item.itemCount === "number" &&
            Number.isInteger(item.itemCount) &&
            item.itemCount >= 1 &&
            item.itemCount <= 40 &&
            Array.isArray(item.recommendedModuleIds) &&
            item.recommendedModuleIds.every(
              (moduleId) =>
                isString(moduleId) &&
                /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(moduleId),
            ) &&
            (item.lastEvaluatedAt === undefined ||
              isString(item.lastEvaluatedAt)) &&
            item.evidence === "DIAGNOSTICO_FORMATIVO_DIGITAL" &&
            item.notPunitive === true &&
            item.noGlobalPassFail === true &&
            item.practicalCompetenceClaim === "PROIBIDO_MVP",
        ))) &&
    countKeys.every(
      (key) =>
        typeof progress[key] === "number" &&
        Number.isInteger(progress[key]) &&
        progress[key] >= 0,
    ) &&
    (progress.progressPercent === null ||
      (typeof progress.progressPercent === "number" &&
        Number.isInteger(progress.progressPercent) &&
        progress.progressPercent >= 0 &&
        progress.progressPercent <= 100))
  );
}

function pathStatusLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    DISPONIVEL: "Disponível",
    BLOQUEADO_PRE_REQUISITO: "Aguardando pré-requisito",
    EM_REMEDIACAO: "Em reforço",
    RETENCAO_PENDENTE: "Retenção pendente",
    CONCLUIDO: "Concluído",
    EM_ANDAMENTO: "Em andamento",
    NAO_ATRIBUIDO: "Aguardando atribuição",
  };
  return labels[value] ?? value;
}

function pathActionLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    INICIAR_BASELINE: "Iniciar módulo",
    CONCLUIR_PRE_REQUISITO: "Concluir pré-requisito",
    EXECUTAR_REMEDIACAO: "Executar reforço",
    EXECUTAR_RETENCAO: "Fazer retenção",
    REVISAR_PROXIMO_MODULO: "Revisar próximo módulo",
    RETOMAR_MODULO: "Retomar módulo",
    AGUARDAR_ATRIBUICAO: "Aguardando equipe",
  };
  return labels[value] ?? value;
}

function profileStatusLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    SEM_EVIDENCIA_DIGITAL: "Sem evidência digital",
    EM_DESENVOLVIMENTO_DIGITAL: "Em desenvolvimento digital",
    DOMINIO_DIGITAL: "Domínio digital",
    EM_REMEDIACAO: "Em reforço",
    RETENCAO_PENDENTE: "Retenção pendente",
    AGUARDA_CORRECAO_HUMANA: "Aguarda correção humana",
  };
  return labels[value] ?? value;
}

function CompetencyProfile({
  profile,
}: Readonly<{
  readonly profile: ParticipantDashboardProjection["profile"];
}>): ReactNode {
  if (profile.length === 0) return null;
  return (
    <section className="profile-card" aria-label="Perfil de evolução digital">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Perfil de evolução</p>
          <h2>Competências acompanhadas</h2>
        </div>
        <span className="status-pill">Digital</span>
      </div>
      <div className="profile-grid">
        {profile.map((item) => (
          <article className="profile-item" key={item.moduleId}>
            <div className="profile-item-heading">
              <strong>
                Mês {item.month} · {item.moduleId}
              </strong>
              <span>
                {item.scorePercent === null ? "—" : `${item.scorePercent}%`}
              </span>
            </div>
            <p>{item.competence}</p>
            <small>{profileStatusLabel(item.status)}</small>
          </article>
        ))}
      </div>
      <p className="path-disclaimer">
        Este perfil resume evidências de avaliações digitais. Não representa
        competência prática, autonomia clínica ou autorização de procedimentos.
      </p>
    </section>
  );
}

function diagnosticStatusLabel(value: string): string {
  return value === "BASELINE_REGISTRADA"
    ? "Baseline digital registrada"
    : "Sem evidência digital";
}

function DiagnosticProfile({
  profile,
}: Readonly<{
  readonly profile: NonNullable<
    ParticipantDashboardProjection["diagnosticProfile"]
  >;
}>): ReactNode {
  return (
    <section
      className="diagnostic-profile-card"
      aria-label="Diagnóstico formativo por tema"
    >
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Baseline formativa</p>
          <h2>Diagnóstico por tema</h2>
        </div>
        <span className="status-pill">Sem nota global</span>
      </div>
      <div className="diagnostic-profile-grid">
        {profile.map((item) => (
          <article className="diagnostic-profile-item" key={item.themeId}>
            <div className="profile-item-heading">
              <strong>{item.themeLabel}</strong>
              <span>
                {item.scorePercent === null ? "—" : `${item.scorePercent}%`}
              </span>
            </div>
            <p>
              {item.answeredItemCount} de {item.itemCount} itens respondidos
            </p>
            <small>{diagnosticStatusLabel(item.status)}</small>
          </article>
        ))}
      </div>
      <p className="path-disclaimer">
        O diagnóstico é formativo, não punitivo e não possui aprovação global.
        Ele orienta a trilha digital; não representa competência prática ou
        autorização clínica.
      </p>
    </section>
  );
}

function ParticipantPath({
  path,
}: Readonly<{
  readonly path: ParticipantDashboardProjection["path"];
}>): ReactNode {
  if (path.length === 0) return null;
  return (
    <section className="path-card" aria-label="Evolução da trilha">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Evolução da trilha</p>
          <h2>Plano de 24 meses</h2>
        </div>
        <span className="status-pill">Digital</span>
      </div>
      <ol className="path-list">
        {path.map((item) => (
          <li
            className={`path-item path-${item.status.toLowerCase()}`}
            key={item.moduleId}
          >
            <div>
              <strong>
                Mês {item.month} · {item.moduleId}
              </strong>
              <span>{pathStatusLabel(item.status)}</span>
            </div>
            <span className="path-action">
              {pathActionLabel(item.nextAction)}
            </span>
          </li>
        ))}
      </ol>
      <p className="path-disclaimer">
        A trilha mostra evolução digital. Ela não registra prática presencial,
        não libera procedimentos e não comprova competência clínica.
      </p>
    </section>
  );
}

function JourneyActivities({
  activities,
  nextActionTarget,
  busy,
  onSelect,
}: Readonly<{
  readonly activities: readonly JourneyActivityProjection[];
  readonly nextActionTarget: LearningJourneyProjection["nextActionTarget"];
  readonly busy: boolean;
  readonly onSelect: (activityId: string) => Promise<void>;
}>): ReactNode {
  if (activities.length === 0) {
    return <p className="journey-item">Nenhuma atividade atribuída.</p>;
  }

  return (
    <ul className="journey-activity-list" aria-label="Atividades da jornada">
      {activities.slice(0, 3).map((item) => (
        <li className="journey-activity-item" key={item.activityId}>
          <div>
            <strong>{item.title}</strong>
            <span>{nextActionLabel(item.nextAction)}</span>
          </div>
          {nextActionTarget?.activityId === item.activityId ? (
            <button
              type="button"
              className="button-link"
              aria-label={`Abrir atividade: ${item.title}`}
              onClick={() => void onSelect(item.activityId)}
              disabled={busy}
            >
              Abrir atividade
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function correctionOutcomeLabel(
  value: CorrectionProjection["outcome"],
): string {
  return value === "APROVADO" ? "Aprovado digitalmente" : "Reforço recomendado";
}

function CorrectionFeedbackPanel({
  attemptStatus,
  correction,
  correctionState,
  nextAction,
  busy,
  onRetry,
}: Readonly<{
  readonly attemptStatus: string | undefined;
  readonly correction: CorrectionProjection | null;
  readonly correctionState: ExperienceState;
  readonly nextAction: string | undefined;
  readonly busy: boolean;
  readonly onRetry: () => void;
}>): ReactNode {
  const corrected =
    attemptStatus === "CORRIGIDA_AUTOMATICAMENTE" ||
    attemptStatus === "CORRIGIDA_HUMANAMENTE";
  const waiting =
    attemptStatus === "SUBMETIDA" ||
    attemptStatus === "AGUARDA_CORRECAO_HUMANA";
  if (!corrected && !waiting) return null;

  const awaitingResult =
    correction === null && (waiting || correctionState === "empty");
  const title =
    correctionState === "error"
      ? "Resultado digital indisponível"
      : awaitingResult
        ? "Resultado em processamento"
        : "Resultado digital";

  return (
    <section
      className="item-card correction-panel"
      data-testid="correction-panel"
      aria-labelledby="correction-title"
    >
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Correção digital</p>
          <h2 id="correction-title">{title}</h2>
        </div>
        <span className="status-pill">
          {awaitingResult
            ? "Aguardando"
            : correction === null
              ? "Consulta"
              : correctionOutcomeLabel(correction.outcome)}
        </span>
      </div>
      {correctionState === "loading" ? (
        <p className="feedback pending" role="status">
          Consultando o resultado da correção…
        </p>
      ) : null}
      {correctionState === "error" ? (
        <>
          <p className="feedback warning" role="status">
            Não foi possível consultar o resultado digital. Tente novamente.
          </p>
          <button type="button" onClick={onRetry} disabled={busy}>
            Tentar consultar resultado
          </button>
        </>
      ) : null}
      {awaitingResult && correctionState !== "loading" ? (
        <>
          <p role="status">A correção digital ainda não está disponível.</p>
          {attemptStatus === "AGUARDA_CORRECAO_HUMANA" ? (
            <p className="path-disclaimer">
              A equipe ainda precisa concluir a revisão desta tentativa.
            </p>
          ) : null}
        </>
      ) : null}
      {correction !== null && correctionState === "ready" ? (
        <>
          <div className="correction-summary">
            <strong className="correction-score">{correction.score}%</strong>
            <span>{correctionOutcomeLabel(correction.outcome)}</span>
          </div>
          <p>{correction.feedback}</p>
          {nextAction !== undefined && nextAction.trim().length > 0 ? (
            <p className="correction-next-action">
              Próxima ação: <strong>{nextActionLabel(nextAction)}</strong>
            </p>
          ) : null}
        </>
      ) : null}
      <p className="path-disclaimer">
        Este resultado é uma evidência digital formativa. Não representa
        competência prática, autonomia clínica ou autorização de procedimentos.
      </p>
    </section>
  );
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
    INICIAR_REFLEXAO: "Iniciar reflexão",
    RETOMAR_REFLEXAO: "Retomar reflexão",
    ENVIAR_REFLEXAO: "Enviar reflexão",
    PROXIMA_ACAO: "Próxima ação",
  };
  return labels[value] ?? value;
}

function reflectionStatusLabel(value: ReflectionProjection["status"]): string {
  const labels: Readonly<Record<ReflectionProjection["status"], string>> = {
    NAO_INICIADA: "Ainda não iniciada",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDA: "Concluída",
  };
  return labels[value];
}

function appealStatusLabel(
  value: ParticipantAppealProjection["status"],
): string {
  const labels: Readonly<
    Record<ParticipantAppealProjection["status"], string>
  > = {
    ABERTA: "Recebida",
    EM_REVISAO: "Em revisão",
    DECIDIDA: "Decidida",
    RECALCULO_PENDENTE: "Recálculo pendente",
    ENCERRADA: "Encerrada",
  };
  return labels[value];
}

function feedbackTypeLabel(value: FeedbackTicketType): string {
  const labels: Readonly<Record<FeedbackTicketType, string>> = {
    BUG_TECNICO: "Bug técnico",
    USABILIDADE: "Usabilidade",
    ERRO_CONTEUDO: "Erro de conteúdo",
    MELHORIA: "Melhoria",
    CONTESTACAO: "Contestação",
  };
  return labels[value];
}

function feedbackStatusLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    NOVO: "Recebido",
    TRIADO: "Triado",
    EM_TRATAMENTO: "Em tratamento",
    AGUARDA_USUARIO: "Aguardando você",
    RESOLVIDO: "Resolvido",
    DUPLICADO: "Duplicado",
    NAO_REPRODUZIDO: "Não reproduzido",
    NAO_PLANEJADO: "Não planejado",
  };
  return labels[value] ?? "Em acompanhamento";
}

function moduleIdFromActivity(activity: ActivityProjection): string | null {
  const match = /(?:^|-)m(0[1-9]|1[0-9]|2[0-4])(?:-|$)/iu.exec(activity.slug);
  return match?.[1] === undefined ? null : `M${match[1]}`;
}

function publicErrorMessage(error: unknown): string {
  if (error instanceof PublicApiError && error.code === "not_found") {
    return "O convite não está disponível. Verifique o link interno.";
  }
  if (error instanceof PublicApiError && error.code === "validation_error") {
    return "Revise o token informado e tente novamente.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function selectedChoiceIds(
  item: ActivityItem,
  value: string | undefined,
): readonly string[] {
  if (value === undefined || value.length === 0) return [];
  if (item.selectionMode !== "MULTIPLE") return [value];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isString) : [];
  } catch {
    return [];
  }
}

async function requestJson(
  path: string,
  init: Readonly<{
    readonly method: "GET" | "POST";
    readonly body?: unknown;
  }>,
): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, {
    method: init.method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || payload.success !== true) {
    const error = isRecord(payload)
      ? isRecord(payload.error)
        ? payload.error
        : ({} satisfies ApiRecord)
      : ({} satisfies ApiRecord);
    const code = isString(error.code) ? error.code : "internal_error";
    const message = isString(error.message)
      ? error.message
      : "A operação não foi concluída.";
    throw new PublicApiError(code, message);
  }
  return payload.data;
}

function initialActivityId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("activityId") ?? "";
}

function updateActivityDeepLink(nextActivityId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("activityId", nextActivityId);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export default function HomePage() {
  const [activityId, setActivityId] = useState("");
  const [token, setToken] = useState("");
  const [activity, setActivity] = useState<ActivityProjection | null>(null);
  const [journey, setJourney] = useState<LearningJourneyProjection | null>(
    null,
  );
  const [participantDashboard, setParticipantDashboard] =
    useState<ParticipantDashboardProjection | null>(null);
  const [runtime, setRuntime] = useState<CurriculumRuntimeProjection | null>(
    null,
  );
  const [attempt, setAttempt] = useState<AttemptProjection | null>(null);
  const [correction, setCorrection] = useState<CorrectionProjection | null>(
    null,
  );
  const [correctionState, setCorrectionState] =
    useState<ExperienceState>("idle");
  const [appeals, setAppeals] = useState<
    readonly ParticipantAppealProjection[]
  >([]);
  const [appealState, setAppealState] = useState<ExperienceState>("idle");
  const [appealItemId, setAppealItemId] = useState("");
  const [appealJustification, setAppealJustification] = useState("");
  const [feedbackTickets, setFeedbackTickets] = useState<
    readonly ParticipantFeedbackTicketProjection[]
  >([]);
  const [feedbackState, setFeedbackState] = useState<ExperienceState>("idle");
  const [feedbackType, setFeedbackType] =
    useState<FeedbackTicketType>("MELHORIA");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [journeyState, setJourneyState] = useState<ExperienceState>("idle");
  const [activityState, setActivityState] = useState<ExperienceState>("idle");
  const [retryAction, setRetryAction] = useState<RetryAction>(null);

  useEffect(() => {
    setActivityId(initialActivityId());
  }, []);

  async function loadActivity(nextActivityId: string): Promise<void> {
    setActivityState("loading");
    setRetryAction("activity");
    try {
      const data = await requestJson(
        `/api/v1/activities/${encodeURIComponent(nextActivityId)}`,
        { method: "GET" },
      );
      if (!isActivity(data))
        throw new PublicApiError("internal_error", "invalid projection");
      setActivity(data);
      if (data.reflection !== undefined) {
        const persistedAnswers = Object.fromEntries(
          data.reflection.answers.map((answer) => [
            answer.itemId,
            answer.response,
          ]),
        );
        setAnswers((previous) => ({ ...previous, ...persistedAnswers }));
      }
      const moduleId = moduleIdFromActivity(data);
      if (moduleId === null) {
        setRuntime(null);
        setActivityState("ready");
        setRetryAction(null);
        return;
      }
      try {
        const runtimeData = await requestJson(
          `/api/v1/curriculum/modules/${moduleId}/runtime`,
          { method: "GET" },
        );
        setRuntime(isRuntime(runtimeData) ? runtimeData : null);
      } catch (caught) {
        if (caught instanceof PublicApiError && caught.code === "not_found") {
          setRuntime(null);
        } else {
          throw caught;
        }
      }
      setActivityState("ready");
      setRetryAction(null);
    } catch (caught) {
      setActivityState("error");
      throw caught;
    }
  }

  async function restoreAttemptFromJourney(
    loadedJourney: LearningJourneyProjection,
    nextActivityId: string,
  ): Promise<void> {
    const journeyActivity = loadedJourney.activities.find(
      (item) => item.activityId === nextActivityId,
    );
    if (
      journeyActivity?.attemptId === undefined ||
      journeyActivity.attemptStatus === undefined ||
      journeyActivity.attemptVersion === undefined
    ) {
      setAttempt(null);
      setCorrection(null);
      setCorrectionState("idle");
      setAppeals([]);
      setAppealState("idle");
      return;
    }

    const restoredAttempt: AttemptProjection = {
      attemptId: journeyActivity.attemptId,
      activityId: nextActivityId,
      status: journeyActivity.attemptStatus,
      version: journeyActivity.attemptVersion,
      answers: [],
    };
    setAttempt(restoredAttempt);
    if (
      journeyActivity.attemptStatus === "CORRIGIDA_AUTOMATICAMENTE" ||
      journeyActivity.attemptStatus === "CORRIGIDA_HUMANAMENTE"
    ) {
      await loadAppeals(restoredAttempt.attemptId);
      await loadCorrection(restoredAttempt.attemptId);
    } else if (
      journeyActivity.attemptStatus === "SUBMETIDA" ||
      journeyActivity.attemptStatus === "AGUARDA_CORRECAO_HUMANA"
    ) {
      await loadCorrection(restoredAttempt.attemptId);
    } else {
      setCorrection(null);
      setCorrectionState("idle");
    }
  }

  async function loadJourney(): Promise<LearningJourneyProjection> {
    setJourneyState("loading");
    setRetryAction("journey");
    try {
      const data = await requestJson("/api/v1/learning-path", {
        method: "GET",
      });
      if (!isJourney(data))
        throw new PublicApiError(
          "internal_error",
          "invalid journey projection",
        );
      setJourney(data);
      void loadParticipantDashboard();
      setJourneyState(data.activities.length === 0 ? "empty" : "ready");
      setRetryAction(null);
      return data;
    } catch (caught) {
      setJourneyState("error");
      throw caught;
    }
  }

  async function loadParticipantDashboard(): Promise<void> {
    try {
      const data = await requestJson("/api/v1/dashboard", { method: "GET" });
      if (!isParticipantDashboard(data)) return;
      setParticipantDashboard(data);
    } catch {
      setParticipantDashboard(null);
    }
  }

  async function loadAppeals(attemptId: string): Promise<void> {
    if (attemptId.trim().length === 0) return;
    setAppealState("loading");
    setRetryAction("appeals");
    try {
      const data = await requestJson(
        `/api/v1/appeals?attemptId=${encodeURIComponent(attemptId)}`,
        { method: "GET" },
      );
      if (!isParticipantAppeals(data)) {
        throw new PublicApiError("internal_error", "invalid appeal projection");
      }
      setAppeals(data.appeals);
      setAppealItemId((current) => {
        if (
          current.length > 0 &&
          activity?.items.some((item) => item.itemId === current)
        ) {
          return current;
        }
        return activity?.items[0]?.itemId ?? "";
      });
      setAppealState(data.appeals.length === 0 ? "empty" : "ready");
      setRetryAction(null);
    } catch (caught) {
      setAppealState("error");
      setRetryAction("appeals");
      setError(publicErrorMessage(caught));
    }
  }

  async function loadCorrection(attemptId: string): Promise<void> {
    if (attemptId.trim().length === 0) return;
    setCorrectionState("loading");
    setRetryAction("correction");
    try {
      const data = await requestJson(
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/feedback`,
        { method: "GET" },
      );
      if (!isCorrection(data)) {
        throw new PublicApiError(
          "internal_error",
          "invalid correction projection",
        );
      }
      setCorrection(data);
      setCorrectionState("ready");
      setRetryAction(null);
    } catch (caught) {
      if (caught instanceof PublicApiError && caught.code === "not_found") {
        setCorrection(null);
        setCorrectionState("empty");
        setRetryAction(null);
        return;
      }
      setCorrection(null);
      setCorrectionState("error");
      setRetryAction("correction");
      setError(publicErrorMessage(caught));
    }
  }

  async function loadFeedback(): Promise<void> {
    setFeedbackState("loading");
    setRetryAction("feedback");
    try {
      const data = await requestJson("/api/v1/feedback", { method: "GET" });
      if (!isParticipantFeedback(data)) {
        throw new PublicApiError(
          "internal_error",
          "invalid feedback projection",
        );
      }
      setFeedbackTickets(data.tickets);
      setFeedbackState(data.tickets.length === 0 ? "empty" : "ready");
      setRetryAction(null);
    } catch (caught) {
      setFeedbackState("error");
      setRetryAction("feedback");
      setError(publicErrorMessage(caught));
    }
  }

  async function activateAccess(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    setRetryAction(null);
    try {
      await requestJson("/api/v1/invitations/accept", {
        method: "POST",
        body: { token, sessionExpiresInSeconds: 3600 },
      });
    } catch (caught) {
      setRetryAction("access");
      setError(publicErrorMessage(caught));
      setBusy(false);
      return;
    }

    setAuthenticated(true);
    setNotice("Acesso ativado.");
    try {
      await loadFeedback();
      const loadedJourney = await loadJourney();
      const nextActivityId =
        activityId.trim().length > 0
          ? activityId
          : loadedJourney.nextActionTarget?.activityId;
      if (nextActivityId !== undefined && nextActivityId.length > 0) {
        setActivityId(nextActivityId);
        await loadActivity(nextActivityId);
        await restoreAttemptFromJourney(loadedJourney, nextActivityId);
      }
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleAccept(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void activateAccess();
  }

  async function refreshJourney(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await loadFeedback();
      const loadedJourney = await loadJourney();
      const nextActivityId =
        activityId.trim().length > 0
          ? activityId
          : loadedJourney.nextActionTarget?.activityId;
      if (nextActivityId !== undefined && nextActivityId.length > 0) {
        setActivityId(nextActivityId);
        await loadActivity(nextActivityId);
        await restoreAttemptFromJourney(loadedJourney, nextActivityId);
      }
      setNotice("Jornada atualizada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectJourneyActivity(
    nextActivityId: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    setRetryAction(null);
    try {
      const loadedJourney = journey ?? (await loadJourney());
      if (
        loadedJourney.nextActionTarget?.kind !== "ACTIVITY" ||
        loadedJourney.nextActionTarget.activityId !== nextActivityId
      ) {
        throw new PublicApiError(
          "internal_error",
          "activity is not present in the authorized journey",
        );
      }
      setActivityId(nextActivityId);
      updateActivityDeepLink(nextActivityId);
      await loadActivity(nextActivityId);
      await restoreAttemptFromJourney(loadedJourney, nextActivityId);
      setNotice("Atividade aberta.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function refreshActivity(): Promise<void> {
    if (activityId.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await loadActivity(activityId);
      setNotice("Atividade atualizada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleRetry(): void {
    if (retryAction === "access") void activateAccess();
    if (retryAction === "journey") void refreshJourney();
    if (retryAction === "activity") void refreshActivity();
    if (retryAction === "appeals" && attempt !== null) {
      void loadAppeals(attempt.attemptId);
    }
    if (retryAction === "feedback") void loadFeedback();
    if (retryAction === "correction" && attempt !== null) {
      setError(null);
      void loadCorrection(attempt.attemptId);
    }
  }

  async function handleStartAttempt(): Promise<void> {
    if (activity === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson("/api/v1/attempts", {
        method: "POST",
        body: {
          activityId: activity.activityId,
          idempotencyKey: idempotencyKey("start"),
        },
      });
      if (!isAttempt(data))
        throw new PublicApiError(
          "internal_error",
          "invalid attempt projection",
        );
      setAttempt(data);
      setCorrection(null);
      setCorrectionState("idle");
      await loadActivity(activity.activityId);
      setNotice("Tentativa iniciada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleChoiceChange(
    item: ActivityItem,
    choiceId: string,
    checked: boolean,
  ): void {
    const current = selectedChoiceIds(item, answers[item.itemId]);
    const next =
      item.selectionMode === "MULTIPLE"
        ? checked
          ? [...current, choiceId].filter(
              (value, index, values) => values.indexOf(value) === index,
            )
          : current.filter((value) => value !== choiceId)
        : checked
          ? [choiceId]
          : [];
    setAnswers((previous) => ({
      ...previous,
      [item.itemId]:
        item.selectionMode === "MULTIPLE"
          ? JSON.stringify(next)
          : (next[0] ?? ""),
    }));
  }

  async function handleSaveAnswer(item: ActivityItem): Promise<void> {
    if (activity === null || attempt === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/attempts/${attempt.attemptId}/answers`,
        {
          method: "POST",
          body: {
            attemptId: attempt.attemptId,
            activityId: activity.activityId,
            itemId: item.itemId,
            response: answers[item.itemId] ?? "",
            idempotencyKey: idempotencyKey("answer"),
          },
        },
      );
      if (!isAttempt(data))
        throw new PublicApiError("internal_error", "invalid answer projection");
      setAttempt(data);
      await loadActivity(activity.activityId);
      setNotice("Resposta salva.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitAttempt(): Promise<void> {
    if (attempt === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/attempts/${attempt.attemptId}/submit`,
        {
          method: "POST",
          body: { idempotencyKey: idempotencyKey("submit") },
        },
      );
      if (!isAttempt(data))
        throw new PublicApiError(
          "internal_error",
          "invalid submission projection",
        );
      setAttempt(data);
      await loadActivity(attempt.activityId);
      if (
        data.status === "CORRIGIDA_AUTOMATICAMENTE" ||
        data.status === "CORRIGIDA_HUMANAMENTE"
      ) {
        await loadAppeals(data.attemptId);
        await loadCorrection(data.attemptId);
      } else if (
        data.status === "SUBMETIDA" ||
        data.status === "AGUARDA_CORRECAO_HUMANA"
      ) {
        setCorrection(null);
        setCorrectionState("empty");
      } else {
        setCorrection(null);
        setCorrectionState("idle");
      }
      setNotice("Tentativa submetida.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAppeal(): Promise<void> {
    if (
      attempt === null ||
      appealItemId.length === 0 ||
      appealJustification.trim().length === 0
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson("/api/v1/appeals", {
        method: "POST",
        body: {
          attemptId: attempt.attemptId,
          itemId: appealItemId,
          justification: appealJustification,
        },
      });
      if (!isParticipantAppeal(data)) {
        throw new PublicApiError("internal_error", "invalid appeal projection");
      }
      setAppeals((previous) => [...previous, data]);
      setAppealState("ready");
      setAppealJustification("");
      setNotice("Contestação registrada. Acompanhe o protocolo nesta tela.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFeedback(): Promise<void> {
    if (feedbackDescription.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson("/api/v1/feedback", {
        method: "POST",
        body: {
          type: feedbackType,
          description: feedbackDescription,
        },
      });
      if (!isParticipantFeedbackTicket(data)) {
        throw new PublicApiError(
          "internal_error",
          "invalid feedback ticket projection",
        );
      }
      setFeedbackTickets((previous) => [data, ...previous].slice(0, 100));
      setFeedbackState("ready");
      setFeedbackDescription("");
      setNotice("Feedback enviado. Acompanhe o status nesta tela.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const appealEligibleAttempt =
    attempt?.status === "CORRIGIDA_AUTOMATICAMENTE" ||
    attempt?.status === "CORRIGIDA_HUMANAMENTE";
  const appealableItems =
    activity?.items.filter(
      (item) =>
        (item.kind === "QUESTAO" || item.kind === "CASO") &&
        !appeals.some(
          (appeal) =>
            appeal.itemId === item.itemId && appeal.status !== "ENCERRADA",
        ),
    ) ?? [];
  const currentJourneyActivity =
    journey?.activities.find((item) => item.activityId === activityId) ?? null;
  const canStartNewRemediationAttempt =
    currentJourneyActivity?.status === "EM_REFORCO" &&
    attempt !== null &&
    isTerminalAttemptStatus(attempt.status);
  const correctionNextAction =
    currentJourneyActivity?.nextAction ?? journey?.nextAction;

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header className="topbar" aria-label="Identificação do ambiente">
        <div>
          <p className="eyebrow">CVG · ambiente interno</p>
          <span className="brand">Treinamento veterinário</span>
        </div>
        <span className="status-pill">Acesso protegido</span>
      </header>

      {busy ? (
        <div
          className="feedback pending"
          data-testid="loading-state"
          role="status"
          aria-live="polite"
        >
          Atualizando seu treinamento…
        </div>
      ) : null}

      {authenticated ? (
        <section
          className="item-card feedback-panel"
          data-testid="feedback-panel"
          aria-labelledby="feedback-title"
        >
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Ajude a melhorar</p>
              <h2 id="feedback-title">Relatar problema ou melhoria</h2>
            </div>
            <span className="status-pill">Canal interno</span>
          </div>
          <p>
            Envie um relato sobre a atividade, a experiência ou o conteúdo. A
            equipe acompanha o ticket no ambiente interno.
          </p>
          <p className="path-disclaimer">
            Não inclua dados de pacientes, tutores, prontuários, fotos ou
            qualquer informação clínica real.
          </p>
          {feedbackState === "loading" ? (
            <p className="feedback pending" role="status">
              Consultando seus relatos…
            </p>
          ) : null}
          {feedbackState === "error" ? (
            <p className="feedback warning" role="status">
              Não foi possível consultar seus relatos. Você ainda pode tentar
              enviar um novo relato.
            </p>
          ) : null}
          <form
            className="answer-area"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateFeedback();
            }}
          >
            <label htmlFor="feedback-type">Tipo de relato</label>
            <select
              id="feedback-type"
              value={feedbackType}
              onChange={(event) =>
                setFeedbackType(event.target.value as FeedbackTicketType)
              }
            >
              <option value="MELHORIA">Sugestão de melhoria</option>
              <option value="BUG_TECNICO">Bug técnico</option>
              <option value="USABILIDADE">Usabilidade</option>
              <option value="ERRO_CONTEUDO">Erro de conteúdo</option>
              <option value="CONTESTACAO">Contestação</option>
            </select>
            <label htmlFor="feedback-description">Descrição</label>
            <textarea
              id="feedback-description"
              value={feedbackDescription}
              onChange={(event) => setFeedbackDescription(event.target.value)}
              maxLength={10_000}
              rows={4}
              required
            />
            <button
              type="submit"
              disabled={busy || feedbackDescription.trim().length === 0}
            >
              Enviar feedback
            </button>
          </form>
          {feedbackTickets.length > 0 ? (
            <ul className="journey-list" aria-label="Meus relatos">
              {feedbackTickets.map((ticket) => (
                <li key={ticket.ticketId}>
                  {feedbackTypeLabel(ticket.type)}
                  {" · "}
                  {feedbackStatusLabel(ticket.status)}
                  {" · "}
                  {ticket.createdAt.slice(0, 10)}
                  <br />
                  <span>{ticket.description}</span>
                </li>
              ))}
            </ul>
          ) : feedbackState === "empty" ? (
            <p role="status">Você ainda não enviou um relato.</p>
          ) : null}
        </section>
      ) : null}

      {!authenticated ? (
        <section className="hero-card" aria-labelledby="access-title">
          <div className="hero-copy">
            <p className="eyebrow">Entrada por convite</p>
            <h1 id="access-title">Acesso interno</h1>
            <p>
              Use o convite recebido internamente para ativar sua sessão. Não
              usamos senha ou arquivo clínico nesta etapa.
            </p>
          </div>
          <form className="access-form" onSubmit={handleAccept}>
            <label htmlFor="invitation-token">Token de convite</label>
            <p id="invitation-help" className="field-help">
              O token é usado somente para ativar sua sessão interna.
            </p>
            <input
              id="invitation-token"
              name="token"
              type="password"
              autoComplete="one-time-code"
              aria-describedby="invitation-help"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              minLength={32}
              maxLength={256}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? "Ativando…" : "Ativar acesso"}
            </button>
          </form>
        </section>
      ) : activity === null ? (
        journeyState === "empty" ? (
          <section
            className="hero-card empty-state"
            data-testid="empty-state"
            aria-labelledby="empty-title"
          >
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="empty-title">Nenhuma atividade atribuída</h1>
              <p>
                Sua sessão está ativa, mas ainda não há um módulo disponível.
                Atualize a jornada quando a equipe liberar o próximo conteúdo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshJourney()}
              disabled={busy}
            >
              Atualizar jornada
            </button>
          </section>
        ) : journeyState === "error" ? (
          <section className="hero-card" aria-labelledby="journey-error-title">
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="journey-error-title">Jornada indisponível</h1>
              <p>
                Não conseguimos atualizar as atividades agora. Sua sessão
                permanece protegida; tente novamente em instantes.
              </p>
            </div>
            <button type="button" onClick={handleRetry} disabled={busy}>
              Tentar novamente
            </button>
          </section>
        ) : (
          <section className="hero-card" aria-labelledby="active-title">
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="active-title">Acesso ativado</h1>
              <p>
                {journey === null
                  ? "Abra uma atividade atribuída para continuar seu treinamento."
                  : "Sua jornada está pronta para orientar o próximo passo."}
              </p>
            </div>
            {journey !== null ? (
              <div className="journey-summary" aria-label="Minha jornada">
                <p className="eyebrow">Minha jornada</p>
                <h2>{nextActionLabel(journey.nextAction)}</h2>
                <JourneyActivities
                  activities={journey.activities}
                  nextActionTarget={journey.nextActionTarget}
                  busy={busy}
                  onSelect={handleSelectJourneyActivity}
                />
                {participantDashboard !== null ? (
                  <p className="journey-item">
                    Progresso digital:{" "}
                    {participantDashboard.progress.completedActivities} de{" "}
                    {participantDashboard.progress.assignedActivities}{" "}
                    concluídas ·{" "}
                    {participantDashboard.progress.progressPercent === null
                      ? "sem percentual"
                      : `${participantDashboard.progress.progressPercent}%`}
                  </p>
                ) : null}
                {participantDashboard !== null ? (
                  <ParticipantPath path={participantDashboard.path} />
                ) : null}
                {participantDashboard !== null ? (
                  <CompetencyProfile profile={participantDashboard.profile} />
                ) : null}
                {participantDashboard?.diagnosticProfile !== undefined ? (
                  <DiagnosticProfile
                    profile={participantDashboard.diagnosticProfile}
                  />
                ) : null}
              </div>
            ) : null}
          </section>
        )
      ) : (
        <section className="learning-layout" aria-labelledby="activity-title">
          <div className="content-column">
            {activityState === "error" ? (
              <p className="feedback warning" role="status">
                Esta é a última versão carregada. A atualização falhou; você
                pode tentar novamente.
              </p>
            ) : null}
            <div className="section-heading">
              <div>
                <p className="eyebrow">Atividade atribuída</p>
                <h1 id="activity-title">{activity.title}</h1>
              </div>
              <span className="status-pill">
                {attempt?.status ?? "Disponível"}
              </span>
            </div>
            <p className="intro">
              Responda no seu ritmo. O sistema salva apenas a sua projeção de
              aprendizagem e permite retomar depois.
            </p>
            <CorrectionFeedbackPanel
              attemptStatus={attempt?.status}
              correction={correction}
              correctionState={correctionState}
              nextAction={correctionNextAction}
              busy={busy}
              onRetry={handleRetry}
            />
            {activity.reflection !== undefined ? (
              <section
                className="item-card"
                data-testid="reflection-state"
                aria-label="Estado da reflexão digital"
              >
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Reflexão digital</p>
                    <h2>{reflectionStatusLabel(activity.reflection.status)}</h2>
                  </div>
                  <span className="status-pill">
                    {nextActionLabel(activity.reflection.nextAction)}
                  </span>
                </div>
                <p>
                  {activity.reflection.answeredItemCount} de{" "}
                  {activity.reflection.itemCount} itens respondidos.
                </p>
                <p className="path-disclaimer">
                  Esta é uma reflexão digital para orientar a próxima ação. Não
                  gera nota, gabarito ou comprovação de competência prática.
                </p>
              </section>
            ) : null}
            <div className="item-list">
              {activity.items.map((item) => (
                <article className="item-card" key={item.itemId}>
                  <div className="item-meta">
                    <span>Item {item.ordinal}</span>
                    <span>
                      {item.kind === "REFLEXAO"
                        ? "Reflexão digital"
                        : item.kind}
                    </span>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                  {item.responseMode === "CHOICE" &&
                  attempt !== null &&
                  item.choices !== undefined ? (
                    <fieldset className="answer-area">
                      <legend>Selecione sua resposta</legend>
                      {item.choices.map((choice) => {
                        const selected = selectedChoiceIds(
                          item,
                          answers[item.itemId],
                        ).includes(choice.id);
                        return (
                          <label key={choice.id}>
                            <input
                              type={
                                item.selectionMode === "MULTIPLE"
                                  ? "checkbox"
                                  : "radio"
                              }
                              name={`answer-${item.itemId}`}
                              value={choice.id}
                              checked={selected}
                              onChange={(event) =>
                                handleChoiceChange(
                                  item,
                                  choice.id,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>
                              <strong>{choice.label})</strong> {choice.text}
                            </span>
                          </label>
                        );
                      })}
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSaveAnswer(item)}
                        disabled={
                          busy ||
                          selectedChoiceIds(item, answers[item.itemId])
                            .length === 0
                        }
                      >
                        Salvar resposta
                      </button>
                    </fieldset>
                  ) : item.responseMode === "TEXT" && attempt !== null ? (
                    <div className="answer-area">
                      <label htmlFor={`answer-${item.itemId}`}>
                        Resposta — {item.title}
                      </label>
                      <textarea
                        id={`answer-${item.itemId}`}
                        value={answers[item.itemId] ?? ""}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            [item.itemId]: event.target.value,
                          }))
                        }
                        maxLength={10_000}
                        rows={5}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSaveAnswer(item)}
                        disabled={busy}
                      >
                        Salvar resposta
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="action-row">
              {attempt === null || canStartNewRemediationAttempt ? (
                <button
                  type="button"
                  onClick={() => void handleStartAttempt()}
                  disabled={busy}
                >
                  {canStartNewRemediationAttempt
                    ? "Iniciar nova tentativa"
                    : "Iniciar tentativa"}
                </button>
              ) : isTerminalAttemptStatus(attempt.status) ? (
                <p role="status">Tentativa concluída.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmitAttempt()}
                  disabled={busy || attempt.status === "SUBMETIDA"}
                >
                  Enviar tentativa
                </button>
              )}
            </div>
            {appealEligibleAttempt ? (
              <section
                className="item-card"
                data-testid="appeals-panel"
                aria-labelledby="appeals-title"
              >
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Contestação</p>
                    <h2 id="appeals-title">Questão ou resultado</h2>
                  </div>
                  <span className="status-pill">Fluxo auditável</span>
                </div>
                <p>
                  Registre uma justificativa para uma questão desta tentativa. O
                  protocolo tem prazo de resposta de sete dias úteis.
                </p>
                <p className="path-disclaimer">
                  A contestação não altera sua nota automaticamente e não
                  representa competência prática ou autorização clínica.
                </p>
                {appealState === "loading" ? (
                  <p className="feedback pending" role="status">
                    Consultando seus protocolos…
                  </p>
                ) : appealState === "error" ? (
                  <p className="feedback warning" role="status">
                    Não foi possível consultar os protocolos. Tente novamente.
                  </p>
                ) : null}
                {appealState !== "loading" && appealState !== "error" ? (
                  <>
                    {appealableItems.length > 0 ? (
                      <form
                        className="answer-area"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleCreateAppeal();
                        }}
                      >
                        <label htmlFor="appeal-item">Questão</label>
                        <select
                          id="appeal-item"
                          value={appealItemId}
                          onChange={(event) =>
                            setAppealItemId(event.target.value)
                          }
                          required
                        >
                          <option value="">Selecione uma questão</option>
                          {appealableItems.map((item) => (
                            <option key={item.itemId} value={item.itemId}>
                              Item {item.ordinal} — {item.title}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="appeal-justification">
                          Justificativa
                        </label>
                        <textarea
                          id="appeal-justification"
                          value={appealJustification}
                          onChange={(event) =>
                            setAppealJustification(event.target.value)
                          }
                          maxLength={10_000}
                          rows={4}
                          required
                        />
                        <button
                          type="submit"
                          disabled={
                            busy || appealJustification.trim().length === 0
                          }
                        >
                          Enviar contestação
                        </button>
                      </form>
                    ) : (
                      <p role="status">
                        Todas as questões desta tentativa já possuem um
                        protocolo aberto ou encerrado.
                      </p>
                    )}
                    {appeals.length > 0 ? (
                      <ul className="journey-list" aria-label="Meus protocolos">
                        {appeals.map((appeal) => {
                          const item = activity.items.find(
                            (candidate) => candidate.itemId === appeal.itemId,
                          );
                          return (
                            <li key={appeal.appealId}>
                              Item {item?.ordinal ?? "—"} ·{" "}
                              {appealStatusLabel(appeal.status)} · prazo{" "}
                              {appeal.dueAt.slice(0, 10)}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </section>
            ) : null}
          </div>
          <aside className="privacy-card" aria-label="Proteção de dados">
            <p className="eyebrow">Superfície do participante</p>
            <h2>Somente o necessário</h2>
            <p>
              Fontes, fotos, PDFs, OCR, prompts e decisões internas ficam fora
              desta tela. A atividade chega como uma projeção autorizada.
            </p>
            {journey !== null ? (
              <div className="journey-card" aria-label="Minha jornada">
                <p className="eyebrow">Minha jornada</p>
                <h2>{nextActionLabel(journey.nextAction)}</h2>
                <p>
                  {journey.activities.length} atividade
                  {journey.activities.length === 1 ? "" : "s"} no caminho atual.
                </p>
                <JourneyActivities
                  activities={journey.activities}
                  nextActionTarget={journey.nextActionTarget}
                  busy={busy}
                  onSelect={handleSelectJourneyActivity}
                />
                {participantDashboard !== null ? (
                  <p className="journey-item">
                    Progresso digital:{" "}
                    {participantDashboard.progress.completedActivities} de{" "}
                    {participantDashboard.progress.assignedActivities}{" "}
                    concluídas ·{" "}
                    {participantDashboard.progress.progressPercent === null
                      ? "sem percentual"
                      : `${participantDashboard.progress.progressPercent}%`}
                  </p>
                ) : null}
                {participantDashboard !== null ? (
                  <ParticipantPath path={participantDashboard.path} />
                ) : null}
                {participantDashboard !== null ? (
                  <CompetencyProfile profile={participantDashboard.profile} />
                ) : null}
                {participantDashboard?.diagnosticProfile !== undefined ? (
                  <DiagnosticProfile
                    profile={participantDashboard.diagnosticProfile}
                  />
                ) : null}
              </div>
            ) : null}
            {runtime !== null ? (
              <div className="runtime-card" aria-label="Estado do módulo">
                <p className="eyebrow">Próxima ação</p>
                <h2>{runtime.nextAction}</h2>
                <p>
                  Estado digital: {runtime.status}
                  {runtime.scorePercent === undefined
                    ? ""
                    : ` · ${runtime.scorePercent}%`}
                </p>
                {runtime.remediationCount > 0 ? (
                  <p>Objetivos para reforço: {runtime.remediationCount}.</p>
                ) : null}
                {runtime.retentionReviews.length > 0 ? (
                  <p>Retenções pendentes: {runtime.retentionReviews.length}.</p>
                ) : null}
                <small>
                  Resultado digital não comprova competência prática nem
                  autoriza procedimento.
                </small>
              </div>
            ) : null}
          </aside>
        </section>
      )}

      {error !== null ? (
        <div className="feedback-group">
          <p className="feedback error" role="alert">
            {error}
          </p>
          {retryAction !== null ? (
            <button type="button" onClick={handleRetry} disabled={busy}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
