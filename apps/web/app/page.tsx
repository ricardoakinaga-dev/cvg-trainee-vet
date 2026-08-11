"use client";

import { type FormEvent, useEffect, useState } from "react";

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

type ActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ActivityItem[];
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

type CurriculumRuntimeProjection = Readonly<{
  readonly moduleId: string;
  readonly version: number;
  readonly status:
    | "PENDENTE"
    | "DOMINIO_DIGITAL"
    | "EM_REMEDIACAO"
    | "AGUARDA_CORRECAO_HUMANA";
  readonly nextAction:
    | "INICIAR_BASELINE"
    | "REVISAR_RETENCAO"
    | "EXECUTAR_REMEDIACAO"
    | "AGUARDAR_CORRECAO_HUMANA";
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
}>;

type ApiRecord = Readonly<Record<string, unknown>>;

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

type ExperienceState = "idle" | "loading" | "ready" | "empty" | "error";
type RetryAction = "login" | "journey" | "activity" | null;

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

function isRuntime(value: unknown): value is CurriculumRuntimeProjection {
  if (!isRecord(value)) return false;
  const status =
    value.status === "PENDENTE" ||
    value.status === "DOMINIO_DIGITAL" ||
    value.status === "EM_REMEDIACAO" ||
    value.status === "AGUARDA_CORRECAO_HUMANA";
  const nextAction =
    value.nextAction === "INICIAR_BASELINE" ||
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
  return (
    Array.isArray(value.assignments) &&
    value.assignments.every(isRecord) &&
    Array.isArray(value.activities) &&
    value.activities.every(isJourneyActivity) &&
    Array.isArray(value.results) &&
    value.results.every(isRecord) &&
    Array.isArray(value.runtimes) &&
    value.runtimes.every(isRuntime) &&
    isString(value.nextAction)
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
    INICIAR_BASELINE: "Iniciar baseline",
    AGUARDAR_CORRECAO_HUMANA: "Aguardar correção humana",
    AGUARDAR_PUBLICACAO: "Aguardar publicação clínica",
  };
  return labels[value] ?? value;
}

function moduleIdFromActivity(activity: ActivityProjection): string | null {
  const match = /(?:^|-)m(0[1-9]|1[0-9]|2[0-4])(?:-|$)/iu.exec(activity.slug);
  return match?.[1] === undefined ? null : `M${match[1]}`;
}

function publicErrorMessage(error: unknown): string {
  if (error instanceof PublicApiError && error.code === "unauthenticated") {
    return "Login ou senha inválidos.";
  }
  if (error instanceof PublicApiError && error.code === "validation_error") {
    return "Informe um e-mail profissional e uma senha válida.";
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

export default function HomePage() {
  const [activityId, setActivityId] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [activity, setActivity] = useState<ActivityProjection | null>(null);
  const [journey, setJourney] = useState<LearningJourneyProjection | null>(
    null,
  );
  const [runtime, setRuntime] = useState<CurriculumRuntimeProjection | null>(
    null,
  );
  const [attempt, setAttempt] = useState<AttemptProjection | null>(null);
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
      const data = await requestJson(`/api/v1/activities/${nextActivityId}`, {
        method: "GET",
      });
      if (!isActivity(data))
        throw new PublicApiError("internal_error", "invalid projection");
      setActivity(data);
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
      setJourneyState(data.activities.length === 0 ? "empty" : "ready");
      setRetryAction(null);
      return data;
    } catch (caught) {
      setJourneyState("error");
      throw caught;
    }
  }

  async function openJourneyActivity(
    loadedJourney: LearningJourneyProjection,
  ): Promise<void> {
    const requestedActivityId =
      activityId.trim().length > 0 ? activityId : initialActivityId();
    if (requestedActivityId.length > 0) {
      setActivityId(requestedActivityId);
      await loadActivity(requestedActivityId);
      return;
    }
    const nextActivity = loadedJourney.activities.find(
      (item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO",
    );
    if (nextActivity !== undefined) {
      setActivityId(nextActivity.activityId);
      await loadActivity(nextActivity.activityId);
    }
  }

  async function signIn(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    setRetryAction(null);
    try {
      await requestJson("/api/v1/auth/login", {
        method: "POST",
        body: { login, password, sessionExpiresInSeconds: 3600 },
      });
    } catch (caught) {
      setRetryAction("login");
      setError(publicErrorMessage(caught));
      setBusy(false);
      return;
    }

    setAuthenticated(true);
    setPassword("");
    setNotice("Login realizado.");
    try {
      const loadedJourney = await loadJourney();
      await openJourneyActivity(loadedJourney);
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void signIn();
  }

  async function restoreSession(): Promise<void> {
    try {
      await requestJson("/api/v1/session", { method: "GET" });
    } catch {
      return;
    }

    setAuthenticated(true);
    try {
      const loadedJourney = await loadJourney();
      await openJourneyActivity(loadedJourney);
    } catch (caught) {
      setError(publicErrorMessage(caught));
    }
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
          : loadedJourney.activities.find(
              (item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO",
            )?.activityId;
      if (nextActivityId !== undefined && nextActivityId.length > 0) {
        setActivityId(nextActivityId);
        await loadActivity(nextActivityId);
      }
      setNotice("Jornada atualizada.");
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
    if (retryAction === "login") void signIn();
    if (retryAction === "journey") void refreshJourney();
    if (retryAction === "activity") void refreshActivity();
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
      setNotice("Tentativa submetida.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void restoreSession();
  }, []);

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

      {!authenticated ? (
        <section className="hero-card" aria-labelledby="access-title">
          <div className="hero-copy">
            <p className="eyebrow">Entrada segura</p>
            <h1 id="access-title">Entrar no treinamento</h1>
            <p>
              Use seu e-mail profissional e sua senha para continuar sua
              jornada. A sessão é protegida e o conteúdo é apresentado apenas
              depois da autenticação.
            </p>
          </div>
          <form className="access-form" onSubmit={handleLogin}>
            <label htmlFor="login">E-mail profissional</label>
            <p id="login-help" className="field-help">
              Use o e-mail cadastrado pela operação do ambiente.
            </p>
            <input
              id="login"
              name="login"
              type="email"
              autoComplete="username"
              aria-describedby="login-help"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              maxLength={320}
              required
            />
            <label htmlFor="password">Senha</label>
            <p id="password-help" className="field-help">
              A senha deve ter pelo menos 12 caracteres.
            </p>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-describedby="password-help"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              maxLength={128}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
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
                {journey.activities.length === 0 ? (
                  <p className="journey-item">Nenhuma atividade atribuída.</p>
                ) : (
                  journey.activities.slice(0, 3).map((item) => (
                    <p className="journey-item" key={item.activityId}>
                      {item.title} · {nextActionLabel(item.nextAction)}
                    </p>
                  ))
                )}
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
            <div className="item-list">
              {activity.items.map((item) => (
                <article className="item-card" key={item.itemId}>
                  <div className="item-meta">
                    <span>Item {item.ordinal}</span>
                    <span>{item.kind}</span>
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
              {attempt === null ? (
                <button
                  type="button"
                  onClick={() => void handleStartAttempt()}
                  disabled={busy}
                >
                  Iniciar tentativa
                </button>
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
