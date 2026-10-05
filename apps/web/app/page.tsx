"use client";

import Link from "next/link";
import {
  type ReflectionProjection,
  type ActivityProjection,
  type AttemptProjection,
  type ParticipantAppealProjection,
  type FeedbackTicketType,
  type ParticipantFeedbackTicketProjection,
  type CurriculumRuntimeProjection,
  type LearningJourneyProjection,
  type CorrectionProjection,
  type ParticipantDashboardProjection,
  type ExperienceState,
  type RetryAction,
  PublicApiError,
  isRecord,
  canonicalParticipantResponse,
  sameParticipantResponse,
  isActivity,
  isAttempt,
  isCorrection,
  isParticipantAppeal,
  isParticipantAppeals,
  isParticipantFeedbackTicket,
  isParticipantFeedback,
  isRuntime,
  isTerminalAttemptStatus,
  isEditableAttemptStatus,
  isRemediationStartableActivityStatus,
  isJourney,
  isParticipantDashboard,
} from "./participant-contracts";
import { ParticipantJourneyActions as JourneyActivities } from "./participant-journey-actions";
import {
  ParticipantProjectionCoherence,
  isContextualParticipantCorrection,
  isContextualParticipantAppeal,
} from "./participant-projection-coherence";
import {
  ParticipantMutationReceiptAnchors,
  isParticipantMutationReceipt,
} from "./participant-mutation-receipt";
import {
  ParticipantPendingMutations,
  type PendingParticipantMutation,
} from "./participant-pending-mutations";
import {
  ParticipantReadRequests,
  ParticipantRequestCancelled,
  requestParticipantJson,
  type ParticipantReadResource,
} from "./participant-resource-request";
import {
  participantPublicError as publicErrorMessage,
  focusParticipantField,
} from "./participant-field-validation";
import {
  ParticipantAnswerList,
  selectedChoiceIds,
  type ActivityItem,
} from "./participant-answer-list";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

function pathStatusLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    DISPONIVEL: "Disponível",
    BLOQUEADO_PRE_REQUISITO: "Aguardando pré-requisito",
    EM_REMEDIACAO: "Em reforço",
    RETENCAO_PENDENTE: "Retenção pendente",
    CONCLUIDO: "Concluído",
    EM_ANDAMENTO: "Em andamento",
    PAUSADO: "Pausado",
    BLOQUEADO: "Bloqueado",
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
    CONSULTAR_PROXIMO_PASSO: "Consultar próximo passo",
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
        <span className="status-pill status-pill--info">Digital</span>
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
        <span className="status-pill status-pill--info">Sem nota global</span>
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
        <span className="status-pill status-pill--info">Digital</span>
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
        <span
          className={`status-pill ${
            awaitingResult
              ? "status-pill--warning"
              : correction === null
                ? "status-pill--neutral"
                : "status-pill--info"
          }`}
        >
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

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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
  const projectionCoherence = useRef(new ParticipantProjectionCoherence());
  const activitySnapshot = useRef<ActivityProjection | null>(null);
  const readRequests = useRef(new ParticipantReadRequests());
  const [readErrors, setReadErrors] = useState<
    Partial<Record<ParticipantReadResource, string>>
  >({});
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const [answerErrors, setAnswerErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  function clearFieldError(id: string): void {
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }
  function fieldValidation(
    error: unknown,
    context: "access" | "feedback" | "appeal",
    id: string,
  ): void {
    if (error instanceof ParticipantRequestCancelled) return;
    const message = publicErrorMessage(error, context);
    setError(message);
    if (error instanceof PublicApiError && error.code === "validation_error") {
      setFieldErrors((previous) => ({ ...previous, [id]: message }));
      focusParticipantField(id);
    }
  }
  function readError(resource: ParticipantReadResource, error?: unknown): void {
    setReadErrors((previous) => ({
      ...previous,
      [resource]: error === undefined ? undefined : publicErrorMessage(error),
    }));
  }
  function requestJson(
    path: string,
    init: Readonly<{
      method: "GET" | "POST";
      body?: unknown;
      signal?: AbortSignal;
    }>,
  ): Promise<unknown> {
    return requestParticipantJson(path, {
      ...init,
      signal: init.signal ?? readRequests.current.signal,
    });
  }
  const pendingMutations = useRef(new ParticipantPendingMutations());
  const mutationReceiptAnchors = useRef(
    new ParticipantMutationReceiptAnchors(),
  );
  function isUnresolvedMutation(operation: string, key: string): boolean {
    const pending = pendingMutations.current.get(operation);
    return pending !== undefined && pending.key === key && pending.ambiguous;
  }

  async function requestMutation(
    path: string,
    snapshot: PendingParticipantMutation,
  ): Promise<unknown> {
    let status: number | undefined;
    let rejection: unknown;
    try {
      return await requestParticipantJson(
        path,
        {
          method: "POST",
          body: JSON.parse(snapshot.body) as unknown,
          signal: readRequests.current.signal,
        },
        {
          fetcher: async (input, init) => {
            const response = await fetch(input, init);
            status = response.status;
            // Only a real explicit 422 envelope can prove validation rejected the write.
            // Reading its clone stays inside the same transport/body deadline.
            if (status === 422)
              rejection = await response
                .clone()
                .json()
                .catch(() => null);
            return response;
          },
        },
      );
    } catch (caught) {
      const rejected =
        caught instanceof PublicApiError &&
        caught.code === "validation_error" &&
        pendingMutations.current.rejectValidation(snapshot, status, rejection);
      if (!rejected) pendingMutations.current.markAmbiguous(snapshot);
      throw caught;
    }
  }

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
  const [attemptReadState, setAttemptReadState] =
    useState<ExperienceState>("idle");
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
  const [confirmedAnswers, setConfirmedAnswers] = useState<
    Readonly<Record<string, string>>
  >({});
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [journeyState, setJourneyState] = useState<ExperienceState>("idle");
  const [activityState, setActivityState] = useState<ExperienceState>("idle");
  const [retryAction, setRetryAction] = useState<RetryAction>(null);

  useEffect(() => {
    readRequests.current = new ParticipantReadRequests();
    setActivityId(initialActivityId());
    void restoreAuthenticatedSession();
    return () => readRequests.current.cancelAll();
  }, []);

  async function loadActivity(nextActivityId: string): Promise<void> {
    readRequests.current.cancelDependents();
    const read = readRequests.current.begin("activity");
    readError("activity");
    setActivityState("loading");
    setRetryAction("activity");
    try {
      const data = await requestJson(
        `/api/v1/activities/${encodeURIComponent(nextActivityId)}`,
        { method: "GET", signal: read.signal },
      );
      if (!read.current()) throw new ParticipantRequestCancelled();
      if (!isActivity(data) || data.activityId !== nextActivityId)
        throw new PublicApiError("internal_error", "invalid projection");
      if (
        mutationReceiptAnchors.current.blocksReplacement(
          { activityId: data.activityId },
          isUnresolvedMutation,
        )
      ) {
        setActivityState("ready");
        setRetryAction(null);
        return;
      }
      setActivity(data);
      activitySnapshot.current = data;
      if (
        data.reflection !== undefined &&
        projectionCoherence.current.current?.activityId !== data.activityId
      ) {
        const persistedAnswers = Object.fromEntries(
          data.reflection.answers.map((answer) => [
            answer.itemId,
            answer.response,
          ]),
        );
        setAnswers((previous) => ({
          ...previous,
          ...Object.fromEntries(
            Object.entries(persistedAnswers).filter(
              ([itemId]) =>
                previous[itemId] === undefined ||
                sameParticipantResponse(
                  previous[itemId] ?? "",
                  confirmedAnswers[itemId] ?? "",
                ),
            ),
          ),
        }));
        setConfirmedAnswers((previous) => ({
          ...previous,
          ...persistedAnswers,
        }));
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
          { method: "GET", signal: read.signal },
        );
        if (!read.current()) throw new ParticipantRequestCancelled();
        setRuntime(isRuntime(runtimeData) ? runtimeData : null);
      } catch (caught) {
        if (caught instanceof PublicApiError && caught.code === "not_found") {
          setRuntime(null);
        } else {
          throw caught;
        }
      }
      if (!read.current()) throw new ParticipantRequestCancelled();
      setActivityState("ready");
      setRetryAction(null);
    } catch (caught) {
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        throw new ParticipantRequestCancelled();
      readError("activity", caught);
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
      if (
        mutationReceiptAnchors.current.blocksReplacement(
          { activityId: nextActivityId, attemptId: null },
          isUnresolvedMutation,
        )
      ) {
        setAttemptReadState("ready");
        return;
      }
      if (projectionCoherence.current.current?.activityId === nextActivityId) {
        setAttemptReadState("ready");
        return;
      }
      projectionCoherence.current.clear();
      setAttempt(null);
      setAnswers({});
      setAnswerErrors({});
      setConfirmedAnswers({});
      setAttemptReadState("idle");
      setCorrection(null);
      setCorrectionState("idle");
      setAppeals([]);
      setAppealState("idle");
      return;
    }

    const read = readRequests.current.begin("attempt");
    readError("attempt");
    setAttemptReadState("loading");
    let restoredAttempt: AttemptProjection;
    try {
      const data = await requestJson(
        `/api/v1/attempts/${encodeURIComponent(journeyActivity.attemptId)}`,
        { method: "GET", signal: read.signal },
      );
      if (!read.current()) return;
      if (
        !isAttempt(data) ||
        data.attemptId !== journeyActivity.attemptId ||
        data.activityId !== nextActivityId ||
        data.version < journeyActivity.attemptVersion
      ) {
        throw new PublicApiError(
          "internal_error",
          "invalid restored attempt projection",
        );
      }
      if (
        mutationReceiptAnchors.current.blocksReplacement(
          data,
          isUnresolvedMutation,
        )
      ) {
        setAttemptReadState("ready");
        return;
      }
      restoredAttempt = projectionCoherence.current.read(data, {
        attemptId: journeyActivity.attemptId,
        activityId: nextActivityId,
        status: journeyActivity.attemptStatus,
        version: journeyActivity.attemptVersion,
      });
      if (restoredAttempt !== data) {
        setAttemptReadState("ready");
        return;
      }
      const persisted = Object.fromEntries(
        data.answers.map((answer) => [answer.itemId, answer.response]),
      );
      const sameAttempt = attempt?.attemptId === data.attemptId;
      if (!sameAttempt) setAnswerErrors({});
      setAnswers((previous) =>
        sameAttempt
          ? {
              ...persisted,
              ...Object.fromEntries(
                Object.entries(previous).filter(
                  ([itemId, response]) =>
                    !sameParticipantResponse(
                      response,
                      confirmedAnswers[itemId] ?? "",
                    ),
                ),
              ),
            }
          : persisted,
      );
      setConfirmedAnswers(persisted);
      setAttemptReadState("ready");
    } catch (caught) {
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        return;
      setAttemptReadState("error");
      readError("attempt", caught);
      throw caught;
    }
    setCorrection(null);
    setCorrectionState("idle");
    setAppeals([]);
    setAttempt(restoredAttempt);
    if (
      restoredAttempt.status === "CORRIGIDA_AUTOMATICAMENTE" ||
      restoredAttempt.status === "CORRIGIDA_HUMANAMENTE"
    ) {
      await loadAppeals(restoredAttempt);
      if (!read.current()) return;
      await loadCorrection(restoredAttempt);
    } else if (
      restoredAttempt.status === "SUBMETIDA" ||
      restoredAttempt.status === "AGUARDA_CORRECAO_HUMANA"
    ) {
      await loadCorrection(restoredAttempt);
    } else {
      setCorrection(null);
      setCorrectionState("idle");
    }
  }

  async function loadJourney(): Promise<LearningJourneyProjection> {
    const read = readRequests.current.begin("journey");
    setJourneyState("loading");
    setRetryAction("journey");
    try {
      const data = await requestJson("/api/v1/learning-path", {
        method: "GET",
        signal: read.signal,
      });
      if (!read.current()) throw new ParticipantRequestCancelled();
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
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        throw new ParticipantRequestCancelled();
      setJourneyState("error");
      throw caught;
    }
  }

  async function loadParticipantDashboard(): Promise<void> {
    const read = readRequests.current.begin("dashboard");
    try {
      const data = await requestJson("/api/v1/dashboard", {
        method: "GET",
        signal: read.signal,
      });
      if (!read.current() || !isParticipantDashboard(data)) return;
      setParticipantDashboard(data);
    } catch {
      if (read.current()) setParticipantDashboard(null);
    }
  }

  async function loadAppeals(context: AttemptProjection): Promise<void> {
    const { attemptId } = context;
    if (attemptId.trim().length === 0) return;
    const read = readRequests.current.begin("appeals");
    readError("appeals");
    setAppealState("loading");
    try {
      const data = await requestJson(
        `/api/v1/appeals?attemptId=${encodeURIComponent(attemptId)}`,
        { method: "GET", signal: read.signal },
      );
      if (!read.current()) return;
      if (!isParticipantAppeals(data)) {
        throw new PublicApiError("internal_error", "invalid appeal projection");
      }
      const currentActivity = activitySnapshot.current;
      const itemIds =
        currentActivity?.activityId === context.activityId
          ? currentActivity.items
              .filter((item) => item.kind === "QUESTAO" || item.kind === "CASO")
              .map((item) => item.itemId)
          : [];
      const owned = data.appeals.filter((row) =>
        isContextualParticipantAppeal(
          row,
          context,
          projectionCoherence.current.current,
          itemIds,
        ),
      );
      setAppeals(owned);
      setAppealItemId((current) => {
        if (
          current.length > 0 &&
          currentActivity?.items.some((item) => item.itemId === current)
        ) {
          return current;
        }
        return currentActivity?.items[0]?.itemId ?? "";
      });
      setAppealState(owned.length === 0 ? "empty" : "ready");
    } catch (caught) {
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        return;
      setAppealState("error");
      readError("appeals", caught);
    }
  }

  async function loadCorrection(context: AttemptProjection): Promise<void> {
    const { attemptId } = context;
    if (attemptId.trim().length === 0) return;
    const read = readRequests.current.begin("correction");
    readError("correction");
    setCorrectionState("loading");
    try {
      const data = await requestJson(
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/feedback`,
        { method: "GET", signal: read.signal },
      );
      if (!read.current()) return;
      if (
        !isCorrection(data) ||
        !isContextualParticipantCorrection(
          data,
          context,
          projectionCoherence.current.current,
        )
      ) {
        throw new PublicApiError(
          "internal_error",
          "invalid correction projection",
        );
      }
      setCorrection(data);
      setCorrectionState("ready");
    } catch (caught) {
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        return;
      if (caught instanceof PublicApiError && caught.code === "not_found") {
        setCorrection(null);
        setCorrectionState("empty");
        return;
      }
      setCorrection(null);
      setCorrectionState("error");
      readError("correction", caught);
    }
  }

  async function loadFeedback(): Promise<void> {
    const read = readRequests.current.begin("feedback");
    readError("feedback");
    setFeedbackState("loading");
    try {
      const data = await requestJson("/api/v1/feedback", {
        method: "GET",
        signal: read.signal,
      });
      if (!read.current()) return;
      if (!isParticipantFeedback(data)) {
        throw new PublicApiError(
          "internal_error",
          "invalid feedback projection",
        );
      }
      setFeedbackTickets(data.tickets);
      setFeedbackState(data.tickets.length === 0 ? "empty" : "ready");
    } catch (caught) {
      if (!read.current() || caught instanceof ParticipantRequestCancelled)
        return;
      setFeedbackState("error");
      readError("feedback", caught);
    }
  }

  async function loadAuthenticatedExperience(
    requestedActivityId = activityId,
  ): Promise<void> {
    void loadFeedback();
    const loadedJourney = await loadJourney();
    const nextActivityId =
      requestedActivityId.trim().length > 0
        ? requestedActivityId
        : loadedJourney.nextActionTarget?.activityId;
    if (nextActivityId !== undefined && nextActivityId.length > 0) {
      setActivityId(nextActivityId);
      await loadActivity(nextActivityId);
      await restoreAttemptFromJourney(loadedJourney, nextActivityId);
    }
  }

  async function restoreAuthenticatedSession(): Promise<void> {
    try {
      const data = await requestJson("/api/v1/session/current", {
        method: "GET",
      });
      if (!isRecord(data) || data.status !== "active") return;

      setAuthenticated(true);
      setNotice("Sessão restaurada.");
      await loadAuthenticatedExperience(initialActivityId());
    } catch (caught) {
      // A landing page without a valid cookie is the expected anonymous state.
      // Keep the access form available without exposing session diagnostics.
      if (caught instanceof PublicApiError) return;
    }
  }

  async function activateAccess(): Promise<void> {
    clearFieldError("invitation-token");
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
      fieldValidation(caught, "access", "invitation-token");
      setBusy(false);
      return;
    }

    setFieldErrors({});
    setAuthenticated(true);
    setNotice("Acesso ativado.");
    try {
      await loadAuthenticatedExperience();
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
      if (
        caught instanceof PublicApiError &&
        caught.message === "activity is not present in the authorized journey"
      )
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
      if (journey !== null)
        await restoreAttemptFromJourney(journey, activityId);
      setNotice("Atividade atualizada.");
    } catch (caught) {
      if (
        caught instanceof PublicApiError &&
        caught.message === "activity is not present in the authorized journey"
      )
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
      void loadAppeals(attempt);
    }
    if (retryAction === "feedback") void loadFeedback();
    if (retryAction === "correction" && attempt !== null) {
      setError(null);
      void loadCorrection(attempt);
    }
  }

  async function handleStartAttempt(): Promise<void> {
    if (activity === null) return;
    const operation = `start:${activity.activityId}`;
    const payload = { activityId: activity.activityId };
    const mutation = pendingMutations.current.prepare(operation, payload, () =>
      idempotencyKey("start"),
    );
    const receiptAnchor = mutationReceiptAnchors.current.capture(
      operation,
      mutation.key,
      {
        operation: "start",
        activityId: activity.activityId,
      },
    );
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestMutation("/api/v1/attempts", mutation);
      if (!isParticipantMutationReceipt(data, receiptAnchor))
        throw new PublicApiError(
          "internal_error",
          "invalid attempt projection",
        );
      pendingMutations.current.complete(mutation);
      mutationReceiptAnchors.current.complete(operation, mutation.key);
      setAttempt(projectionCoherence.current.acknowledge(data));
      setAttemptReadState("ready");
      setAnswers({});
      setConfirmedAnswers({});
      setAppeals([]);
      setAppealItemId("");
      setAppealJustification("");
      setAppealState("idle");
      setCorrection(null);
      setCorrectionState("idle");
      await loadActivity(activity.activityId);
      // The activity projection may still carry the prior reflection. A new
      // attempt must begin with an empty response surface regardless of it.
      setAnswers({});
      setConfirmedAnswers({});
      setNotice("Tentativa iniciada.");
    } catch (caught) {
      pendingMutations.current.markAmbiguous(mutation);
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
    if (
      busy ||
      attemptReadState === "error" ||
      activity === null ||
      attempt === null
    )
      return;
    const operation = `answer:${attempt.attemptId}:${item.itemId}`;
    const payload = {
      attemptId: attempt.attemptId,
      activityId: activity.activityId,
      itemId: item.itemId,
      response: answers[item.itemId] ?? "",
    };
    if (
      pendingMutations.current.get(operation) === undefined &&
      canonicalParticipantResponse(payload.response) === null
    ) {
      setAnswerErrors((previous) => ({
        ...previous,
        [item.itemId]: "Revise a resposta deste item e tente salvar novamente.",
      }));
      focusParticipantField(`answer-${item.itemId}`);
      return;
    }
    const mutation = pendingMutations.current.prepare(operation, payload, () =>
      idempotencyKey("answer"),
    );
    const receiptAnchor = mutationReceiptAnchors.current.capture(
      operation,
      mutation.key,
      {
        operation: "answer",
        attemptId: attempt.attemptId,
        activityId: activity.activityId,
        itemId: item.itemId,
        response: payload.response,
        version: attempt.version,
      },
    );
    setAnswerErrors((previous) => {
      const next = { ...previous };
      delete next[item.itemId];
      return next;
    });
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const sent: unknown = JSON.parse(mutation.body);
      if (!isRecord(sent) || typeof sent.response !== "string")
        throw new PublicApiError("internal_error", "invalid pending answer");
      if (canonicalParticipantResponse(sent.response) === null)
        throw new PublicApiError(
          "internal_error",
          "invalid pending answer response",
        );
      const data = await requestMutation(
        `/api/v1/attempts/${attempt.attemptId}/answers`,
        mutation,
      );
      if (!isParticipantMutationReceipt(data, receiptAnchor))
        throw new PublicApiError("internal_error", "invalid answer projection");
      pendingMutations.current.complete(mutation);
      mutationReceiptAnchors.current.complete(operation, mutation.key);
      const retained = projectionCoherence.current.acknowledge(data);
      setAttempt(retained);
      setConfirmedAnswers(
        Object.fromEntries(
          retained.answers.map((answer) => [answer.itemId, answer.response]),
        ),
      );
      await loadActivity(activity.activityId);
      setNotice("Resposta salva.");
    } catch (caught) {
      pendingMutations.current.markAmbiguous(mutation);
      if (
        caught instanceof PublicApiError &&
        caught.code === "validation_error"
      ) {
        setAnswerErrors((previous) => ({
          ...previous,
          [item.itemId]: publicErrorMessage(caught, "answer"),
        }));
        focusParticipantField(`answer-${item.itemId}`);
      } else if (!(caught instanceof ParticipantRequestCancelled))
        setError(publicErrorMessage(caught, "answer"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitAttempt(): Promise<void> {
    if (
      busy ||
      attemptReadState === "error" ||
      attempt === null ||
      hasPendingAnswers
    )
      return;
    const operation = `submit:${attempt.attemptId}`;
    const mutation = pendingMutations.current.prepare(operation, {}, () =>
      idempotencyKey("submit"),
    );
    const receiptAnchor = mutationReceiptAnchors.current.capture(
      operation,
      mutation.key,
      {
        operation: "submit",
        attemptId: attempt.attemptId,
        activityId: attempt.activityId,
        version: attempt.version,
      },
    );
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestMutation(
        `/api/v1/attempts/${attempt.attemptId}/submit`,
        mutation,
      );
      if (!isParticipantMutationReceipt(data, receiptAnchor))
        throw new PublicApiError(
          "internal_error",
          "invalid submission projection",
        );
      pendingMutations.current.complete(mutation);
      mutationReceiptAnchors.current.complete(operation, mutation.key);
      setAttempt(projectionCoherence.current.acknowledge(data));
      await loadActivity(attempt.activityId);
      if (
        data.status === "CORRIGIDA_AUTOMATICAMENTE" ||
        data.status === "CORRIGIDA_HUMANAMENTE"
      ) {
        await loadAppeals(projectionCoherence.current.current ?? data);
        await loadCorrection(projectionCoherence.current.current ?? data);
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
      pendingMutations.current.markAmbiguous(mutation);
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAppeal(): Promise<void> {
    clearFieldError("appeal-justification");
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
      const currentActivity = activitySnapshot.current;
      const itemIds =
        currentActivity?.activityId === attempt.activityId
          ? currentActivity.items
              .filter((item) => item.kind === "QUESTAO" || item.kind === "CASO")
              .map((item) => item.itemId)
          : [];
      if (
        !isParticipantAppeal(data) ||
        !isContextualParticipantAppeal(
          data,
          attempt,
          projectionCoherence.current.current,
          itemIds,
          appealItemId,
        )
      ) {
        throw new PublicApiError("internal_error", "invalid appeal projection");
      }
      setAppeals((previous) => [...previous, data]);
      setAppealState("ready");
      setAppealJustification((current) =>
        current === appealJustification ? "" : current,
      );
      setNotice("Contestação registrada. Acompanhe o protocolo nesta tela.");
    } catch (caught) {
      fieldValidation(caught, "appeal", "appeal-justification");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFeedback(): Promise<void> {
    clearFieldError("feedback-description");
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
      readError("feedback");
      setFeedbackDescription((current) =>
        current === feedbackDescription ? "" : current,
      );
      setNotice("Feedback enviado. Acompanhe o status nesta tela.");
    } catch (caught) {
      fieldValidation(caught, "feedback", "feedback-description");
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
    journey?.nextAction === "EXECUTAR_REMEDIACAO" &&
    journey.nextActionTarget?.kind === "ACTIVITY" &&
    journey.nextActionTarget.activityId ===
      currentJourneyActivity?.activityId &&
    isRemediationStartableActivityStatus(currentJourneyActivity?.status) &&
    attempt !== null &&
    isTerminalAttemptStatus(attempt.status);
  const canEditAttempt =
    attempt !== null && isEditableAttemptStatus(attempt.status);
  const hasPendingAnswers =
    canEditAttempt &&
    (activity?.items.some((item) => {
      if (item.responseMode === "NONE") return false;
      const current = answers[item.itemId] ?? "";
      const confirmed = confirmedAnswers[item.itemId] ?? "";
      return (
        !sameParticipantResponse(current, confirmed) ||
        (attempt !== null &&
          pendingMutations.current.get(
            `answer:${attempt.attemptId}:${item.itemId}`,
          )?.ambiguous === true)
      );
    }) ??
      false);
  const correctionNextAction =
    currentJourneyActivity?.nextAction ?? journey?.nextAction;

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header className="topbar" aria-label="Identificação do ambiente">
        <div>
          <p className="eyebrow">CVG · ambiente interno</p>
          <span className="brand">Treinamento veterinário</span>
        </div>
        <span className="status-pill status-pill--signal">
          Acesso protegido
        </span>
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
              aria-invalid={
                fieldErrors["invitation-token"] !== undefined || undefined
              }
              aria-describedby={
                fieldErrors["invitation-token"] !== undefined
                  ? "invitation-help invitation-error"
                  : "invitation-help"
              }
              value={token}
              onChange={(event) => setToken(event.target.value)}
              minLength={32}
              maxLength={256}
              required
            />
            {fieldErrors["invitation-token"] !== undefined ? (
              <p id="invitation-error">{fieldErrors["invitation-token"]}</p>
            ) : null}
            <button type="submit" disabled={busy}>
              {busy ? "Ativando…" : "Ativar acesso"}
            </button>
          </form>
        </section>
      ) : activity === null ? (
        journeyState === "loading" || journeyState === "idle" ? (
          <section
            className="hero-card"
            data-testid="journey-loading"
            aria-labelledby="journey-loading-title"
          >
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="journey-loading-title">Carregando sua jornada</h1>
              <p role="status" aria-live="polite">
                Aguarde enquanto buscamos as atividades autorizadas para sua
                sessão.
              </p>
            </div>
          </section>
        ) : journeyState === "empty" ? (
          <section
            className="hero-card empty-state"
            data-testid="empty-state"
            aria-labelledby="empty-title"
          >
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="empty-title">Nenhuma atividade atribuída</h1>
              <p className="visually-hidden" role="status" aria-live="polite">
                A jornada está vazia; nenhuma atividade foi atribuída.
              </p>
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
              <p role="alert">
                Não conseguimos atualizar as atividades agora. Sua sessão
                permanece protegida; tente novamente em instantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshJourney()}
              disabled={busy}
            >
              Tentar novamente
            </button>
          </section>
        ) : (
          <section className="hero-card" aria-labelledby="active-title">
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="active-title">Acesso ativado</h1>
              <p className="visually-hidden" role="status" aria-live="polite">
                A sessão está ativa e a jornada está pronta para o próximo
                passo.
              </p>
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
                  nextAction={journey.nextAction}
                  nextActionTarget={journey.nextActionTarget}
                  busy={busy}
                  actionLabel={nextActionLabel}
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
        <div className="learning-layout">
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
              <span className="status-pill status-pill--signal">
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
              onRetry={() => {
                if (attempt !== null) void loadCorrection(attempt);
              }}
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
                  <span className="status-pill status-pill--info">
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
            <ParticipantAnswerList
              items={activity.items}
              answers={answers}
              errors={answerErrors}
              editable={canEditAttempt}
              disabled={busy || attemptReadState === "error"}
              onChoice={handleChoiceChange}
              onText={(itemId, response) =>
                setAnswers((previous) => ({ ...previous, [itemId]: response }))
              }
              onSave={handleSaveAnswer}
            />
            {mutationReceiptAnchors.current.hasUnresolved(
              isUnresolvedMutation,
            ) ? (
              <p role="status" className="feedback warning">
                Há um envio pendente. Repita a operação pelos botões abaixo
                antes de mudar de tentativa. Suas novas edições ficam
                preservadas.
              </p>
            ) : null}
            {canEditAttempt && attempt !== null
              ? activity.items.map((item) => {
                  const pending = pendingMutations.current.get(
                    `answer:${attempt.attemptId}:${item.itemId}`,
                  );
                  if (!pending?.ambiguous) return null;
                  return (
                    <div
                      className="feedback warning"
                      key={item.itemId}
                      aria-label={`Envio pendente de ${item.title}`}
                    >
                      <p role="status">
                        O envio de {item.title} ainda não foi confirmado.
                        Reenviar ou salvar novamente usa os dados originais.
                        Suas novas edições ficam preservadas para salvar depois
                        da confirmação.
                      </p>
                      <button
                        type="button"
                        disabled={busy || attemptReadState === "error"}
                        aria-label={`Reenviar envio pendente de ${item.title}`}
                        onClick={() => void handleSaveAnswer(item)}
                      >
                        Reenviar envio pendente
                      </button>
                    </div>
                  );
                })
              : null}
            {hasPendingAnswers ? (
              <p
                className="feedback warning"
                id="pending-answers"
                role="status"
              >
                Salve as alterações nas respostas antes de enviar a tentativa.
              </p>
            ) : null}
            <div className="action-row">
              {canEditAttempt && attemptReadState === "ready" ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void refreshActivity()}
                >
                  Atualizar respostas
                </button>
              ) : null}
              {attemptReadState === "error" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void refreshJourney()}
                >
                  Tentar carregar respostas
                </button>
              ) : attemptReadState === "loading" ? (
                <p role="status">Carregando respostas salvas…</p>
              ) : attempt === null || canStartNewRemediationAttempt ? (
                <button
                  type="button"
                  onClick={() => void handleStartAttempt()}
                  disabled={busy}
                >
                  {canStartNewRemediationAttempt
                    ? "Iniciar nova tentativa"
                    : "Iniciar tentativa"}
                </button>
              ) : isTerminalAttemptStatus(attempt.status) ||
                attempt.status === "SUBMETIDA" ||
                attempt.status === "AGUARDA_CORRECAO_HUMANA" ? (
                <p role="status">
                  {attempt.status === "AGUARDA_CORRECAO_HUMANA"
                    ? "Aguardando correção humana."
                    : attempt.status === "SUBMETIDA"
                      ? "Tentativa enviada; aguardando correção."
                      : "Tentativa concluída."}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmitAttempt()}
                  disabled={
                    busy || hasPendingAnswers || attempt.status === "SUBMETIDA"
                  }
                  aria-describedby={
                    hasPendingAnswers ? "pending-answers" : undefined
                  }
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
                  <span className="status-pill status-pill--neutral">
                    Fluxo auditável
                  </span>
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
                {appealState === "error" && attempt !== null ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void loadAppeals(attempt)}
                  >
                    Tentar carregar contestações
                  </button>
                ) : null}
                {fieldErrors["appeal-justification"] !== undefined ? (
                  <p id="appeal-error">{fieldErrors["appeal-justification"]}</p>
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
                          aria-invalid={
                            fieldErrors["appeal-justification"] !== undefined ||
                            undefined
                          }
                          aria-describedby={
                            fieldErrors["appeal-justification"] !== undefined
                              ? "appeal-error"
                              : undefined
                          }
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
                          aria-invalid={
                            fieldErrors["appeal-justification"] !== undefined ||
                            undefined
                          }
                          aria-describedby={
                            fieldErrors["appeal-justification"] !== undefined
                              ? "appeal-error"
                              : undefined
                          }
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
            {authenticated ? (
              <Link className="button-link" href="/diagnostic">
                Abrir diagnóstico formativo
              </Link>
            ) : null}
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
                  nextAction={journey.nextAction}
                  nextActionTarget={journey.nextActionTarget}
                  busy={busy}
                  actionLabel={nextActionLabel}
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
        </div>
      )}

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
            <span className="status-pill status-pill--neutral">
              Canal interno
            </span>
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
          {feedbackState === "error" ? (
            <button
              type="button"
              onClick={() => void loadFeedback()}
              disabled={busy}
            >
              Tentar carregar relatos
            </button>
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
              aria-invalid={
                fieldErrors["feedback-description"] !== undefined || undefined
              }
              aria-describedby={
                fieldErrors["feedback-description"] !== undefined
                  ? "feedback-error"
                  : undefined
              }
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
          {fieldErrors["feedback-description"] !== undefined ? (
            <p id="feedback-error">{fieldErrors["feedback-description"]}</p>
          ) : null}
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

      {Object.entries(readErrors)
        .filter(
          ([resource, message]) =>
            resource !== "journey" && message !== undefined,
        )
        .map(([resource, message]) => (
          <div className="feedback-group" key={resource}>
            <p className="feedback error" role="alert">
              {message}
            </p>
            {resource === "activity" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void refreshActivity()}
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ))}
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
