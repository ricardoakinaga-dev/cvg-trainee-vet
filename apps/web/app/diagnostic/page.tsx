"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type DiagnosticChoice = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

type DiagnosticItem = Readonly<{
  readonly itemId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly text: string;
  readonly responseMode: "CHOICE";
  readonly choices: readonly DiagnosticChoice[];
  readonly selectionMode: "SINGLE" | "MULTIPLE";
}>;

type DiagnosticAnswer = Readonly<{
  readonly itemId: string;
  readonly selectedChoiceIds: readonly string[];
}>;

type DiagnosticTheme = Readonly<{
  readonly themeId: "B07-S1" | "B07-S2" | "B07-S3";
  readonly themeLabel: string;
  readonly status: "SEM_EVIDENCIA_DIGITAL" | "BASELINE_REGISTRADA";
  readonly scorePercent: number | null;
  readonly answeredItemCount: number;
  readonly itemCount: number;
  readonly lastEvaluatedAt?: string;
  readonly evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL";
  readonly notPunitive: true;
  readonly noGlobalPassFail: true;
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type DiagnosticResult = Readonly<{
  readonly completedAt: string;
  readonly themes: readonly DiagnosticTheme[];
}>;

type DiagnosticSession = Readonly<{
  readonly sessionId: string;
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly diagnosticVersion: "0.1.0";
  readonly version: number;
  readonly status: "EM_ANDAMENTO" | "FINALIZADA";
  readonly startedAt: string;
  readonly lastCheckpointAt?: string;
  readonly finalizedAt?: string;
  readonly itemCount: 120;
  readonly answeredItemCount: number;
  readonly currentOrdinal: number | null;
  readonly items: readonly DiagnosticItem[];
  readonly answers: readonly DiagnosticAnswer[];
  readonly result?: DiagnosticResult;
  readonly nextAction?: "CONTINUAR_TRILHA" | "CONSULTAR_PROXIMO_PASSO";
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
type ViewState = "loading" | "needs_start" | "ready" | "error";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

class PublicApiError extends Error {
  public constructor(public readonly code: string) {
    super("public diagnostic request failed");
    this.name = "PublicApiError";
  }
}

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isIsoDate(value: unknown): value is string {
  return isString(value) && !Number.isNaN(new Date(value).getTime());
}

function isUuid(value: unknown): value is string {
  return isString(value) && uuidPattern.test(value);
}

function isDiagnosticTheme(value: unknown): value is DiagnosticTheme {
  if (!isRecord(value)) return false;
  return (
    (value.themeId === "B07-S1" ||
      value.themeId === "B07-S2" ||
      value.themeId === "B07-S3") &&
    isString(value.themeLabel) &&
    (value.status === "SEM_EVIDENCIA_DIGITAL" ||
      value.status === "BASELINE_REGISTRADA") &&
    (value.scorePercent === null ||
      (typeof value.scorePercent === "number" &&
        Number.isInteger(value.scorePercent) &&
        value.scorePercent >= 0 &&
        value.scorePercent <= 100)) &&
    typeof value.answeredItemCount === "number" &&
    Number.isInteger(value.answeredItemCount) &&
    value.answeredItemCount >= 0 &&
    typeof value.itemCount === "number" &&
    Number.isInteger(value.itemCount) &&
    value.itemCount > 0 &&
    (value.lastEvaluatedAt === undefined || isIsoDate(value.lastEvaluatedAt)) &&
    value.evidence === "DIAGNOSTICO_FORMATIVO_DIGITAL" &&
    value.notPunitive === true &&
    value.noGlobalPassFail === true &&
    value.practicalCompetenceClaim === "PROIBIDO_MVP"
  );
}

function parseDiagnosticSession(value: unknown): DiagnosticSession {
  if (!isRecord(value)) throw new PublicApiError("internal_error");
  if (
    !isUuid(value.sessionId) ||
    value.diagnosticId !== "B07-DIAGNOSTIC-V1" ||
    value.diagnosticVersion !== "0.1.0" ||
    (value.status !== "EM_ANDAMENTO" && value.status !== "FINALIZADA") ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    !isIsoDate(value.startedAt) ||
    (value.lastCheckpointAt !== undefined &&
      !isIsoDate(value.lastCheckpointAt)) ||
    (value.finalizedAt !== undefined && !isIsoDate(value.finalizedAt)) ||
    value.itemCount !== 120 ||
    typeof value.answeredItemCount !== "number" ||
    !Number.isInteger(value.answeredItemCount) ||
    value.answeredItemCount < 0 ||
    value.answeredItemCount > 120 ||
    (value.currentOrdinal !== null &&
      (typeof value.currentOrdinal !== "number" ||
        !Number.isInteger(value.currentOrdinal) ||
        value.currentOrdinal < 1 ||
        value.currentOrdinal > 120)) ||
    !Array.isArray(value.items) ||
    value.items.length !== 120 ||
    !Array.isArray(value.answers) ||
    value.answers.length !== value.answeredItemCount
  ) {
    throw new PublicApiError("internal_error");
  }

  const items: DiagnosticItem[] = [];
  for (const candidate of value.items) {
    if (!isRecord(candidate)) throw new PublicApiError("internal_error");
    if (
      !isUuid(candidate.itemId) ||
      typeof candidate.ordinal !== "number" ||
      !Number.isInteger(candidate.ordinal) ||
      candidate.ordinal < 1 ||
      candidate.ordinal > 120 ||
      !isString(candidate.title) ||
      !isString(candidate.text) ||
      candidate.responseMode !== "CHOICE" ||
      (candidate.selectionMode !== "SINGLE" &&
        candidate.selectionMode !== "MULTIPLE") ||
      !Array.isArray(candidate.choices) ||
      candidate.choices.length === 0
    ) {
      throw new PublicApiError("internal_error");
    }
    const choices: DiagnosticChoice[] = [];
    for (const choice of candidate.choices) {
      if (
        !isRecord(choice) ||
        !isString(choice.id) ||
        !isString(choice.label) ||
        !isString(choice.text)
      ) {
        throw new PublicApiError("internal_error");
      }
      choices.push({ id: choice.id, label: choice.label, text: choice.text });
    }
    items.push({
      itemId: candidate.itemId,
      ordinal: candidate.ordinal,
      title: candidate.title,
      text: candidate.text,
      responseMode: "CHOICE",
      choices,
      selectionMode: candidate.selectionMode,
    });
  }

  const itemIds = new Set(items.map((item) => item.itemId));
  const answers: DiagnosticAnswer[] = [];
  for (const candidate of value.answers) {
    if (
      !isRecord(candidate) ||
      !isUuid(candidate.itemId) ||
      !itemIds.has(candidate.itemId) ||
      !Array.isArray(candidate.selectedChoiceIds) ||
      candidate.selectedChoiceIds.length === 0 ||
      candidate.selectedChoiceIds.some((choiceId) => !isString(choiceId))
    ) {
      throw new PublicApiError("internal_error");
    }
    answers.push({
      itemId: candidate.itemId,
      selectedChoiceIds: [...candidate.selectedChoiceIds],
    });
  }

  let result: DiagnosticResult | undefined;
  if (value.result !== undefined) {
    if (!isRecord(value.result) || !isIsoDate(value.result.completedAt)) {
      throw new PublicApiError("internal_error");
    }
    if (
      !Array.isArray(value.result.themes) ||
      value.result.themes.length !== 3 ||
      !value.result.themes.every(isDiagnosticTheme)
    ) {
      throw new PublicApiError("internal_error");
    }
    result = {
      completedAt: value.result.completedAt,
      themes: value.result.themes,
    };
  }
  if (
    (value.status === "FINALIZADA" &&
      (value.finalizedAt === undefined || result === undefined)) ||
    (value.status === "EM_ANDAMENTO" &&
      (value.finalizedAt !== undefined || result !== undefined))
  ) {
    throw new PublicApiError("internal_error");
  }

  return {
    sessionId: value.sessionId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version: value.version,
    status: value.status,
    startedAt: value.startedAt,
    ...(value.lastCheckpointAt === undefined
      ? {}
      : { lastCheckpointAt: value.lastCheckpointAt }),
    ...(value.finalizedAt === undefined
      ? {}
      : { finalizedAt: value.finalizedAt }),
    itemCount: 120,
    answeredItemCount: value.answeredItemCount,
    currentOrdinal: value.currentOrdinal,
    items,
    answers,
    ...(result === undefined ? {} : { result }),
    ...(value.nextAction === "CONTINUAR_TRILHA" ||
    value.nextAction === "CONSULTAR_PROXIMO_PASSO"
      ? { nextAction: value.nextAction }
      : {}),
  };
}

async function requestJson(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || payload.success !== true) {
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    throw new PublicApiError(
      error !== undefined && isString(error.code)
        ? error.code
        : "internal_error",
    );
  }
  return payload.data;
}

function publicErrorMessage(error: unknown): string {
  const code = error instanceof PublicApiError ? error.code : "internal_error";
  if (code === "unauthenticated") {
    return "Ative seu acesso no painel do participante antes de iniciar o diagnóstico.";
  }
  if (code === "forbidden") {
    return "Seu acesso não está autorizado para este diagnóstico.";
  }
  if (code === "not_found") {
    return "O diagnóstico não está disponível neste ambiente.";
  }
  if (code === "state_conflict") {
    return "A sessão mudou em outra janela. Atualize para retomar com a versão mais recente.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

function stableDigest(value: string): string {
  let left = 2_166_136_261;
  let right = 2_247_824_519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 16_777_619);
    right = Math.imul(right ^ code, 2_247_824_519);
  }
  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function clientIdempotencyKey(parts: readonly string[]): string {
  const readablePrefix = `cvg-b07-${parts.slice(0, 3).join("-")}`.replace(
    /[^A-Za-z0-9._:-]/gu,
    "_",
  );
  if (parts.length === 1 && parts[0] === "start-v1") {
    return readablePrefix;
  }
  const value = `${readablePrefix}-${stableDigest(parts.join("|"))}`;
  return value.slice(0, 128).padEnd(16, "0");
}

function firstOpenItemIndex(session: DiagnosticSession): number {
  if (session.currentOrdinal !== null) return session.currentOrdinal - 1;
  const answered = new Set(session.answers.map((answer) => answer.itemId));
  const firstOpen = session.items.findIndex(
    (item) => !answered.has(item.itemId),
  );
  return firstOpen >= 0 ? firstOpen : session.items.length - 1;
}

function answerFor(
  session: DiagnosticSession,
  itemId: string,
): readonly string[] {
  return (
    session.answers.find((answer) => answer.itemId === itemId)
      ?.selectedChoiceIds ?? []
  );
}

function sameChoiceIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every(
    (choiceId, index) => choiceId === normalizedRight[index],
  );
}

function diagnosticStatusLabel(status: DiagnosticSession["status"]): string {
  return status === "FINALIZADA" ? "Finalizado" : "Em andamento";
}

function themeStatusLabel(status: DiagnosticTheme["status"]): string {
  return status === "BASELINE_REGISTRADA"
    ? "Baseline digital registrada"
    : "Sem evidência digital";
}

export default function DiagnosticPage() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draftChoiceIds, setDraftChoiceIds] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const startKeyRef = useRef<string | null>(null);

  const applySession = useCallback((nextSession: DiagnosticSession): void => {
    setSession(nextSession);
    setActiveIndex(firstOpenItemIndex(nextSession));
    setViewState("ready");
  }, []);

  const loadCurrent = useCallback(async (): Promise<void> => {
    setViewState("loading");
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        "/api/v1/diagnostics/b07/sessions/current",
        "GET",
      );
      applySession(parseDiagnosticSession(data));
    } catch (caught) {
      if (caught instanceof PublicApiError && caught.code === "not_found") {
        setSession(null);
        setViewState("needs_start");
        return;
      }
      setViewState("error");
      setError(publicErrorMessage(caught));
    }
  }, [applySession]);

  useEffect(() => {
    void loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    if (session === null) return;
    const item = session.items[activeIndex];
    if (item === undefined) return;
    setDraftChoiceIds(answerFor(session, item.itemId));
  }, [activeIndex, session]);

  function startIdempotencyKey(): string {
    if (startKeyRef.current !== null) return startKeyRef.current;
    const storageKey = "cvg:b07:diagnostic:start:v1";
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(storageKey);
    } catch {
      stored = null;
    }
    const value = stored ?? clientIdempotencyKey(["start-v1"]);
    try {
      window.sessionStorage.setItem(storageKey, value);
    } catch {
      // A stable in-memory key is sufficient when browser storage is blocked.
    }
    startKeyRef.current = value;
    return value;
  }

  async function handleStart(): Promise<void> {
    setViewState("loading");
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        "/api/v1/diagnostics/b07/sessions",
        "POST",
        { idempotencyKey: startIdempotencyKey() },
      );
      applySession(parseDiagnosticSession(data));
      setNotice(
        "Sessão iniciada. Salve cada resposta para poder retomar depois.",
      );
    } catch (caught) {
      setViewState("error");
      setError(publicErrorMessage(caught));
    }
  }

  function activeItem(): DiagnosticItem | null {
    return session?.items[activeIndex] ?? null;
  }

  function toggleChoice(choiceId: string): void {
    const item = activeItem();
    if (item === null || session?.status === "FINALIZADA") return;
    if (item.selectionMode === "SINGLE") {
      setDraftChoiceIds([choiceId]);
      return;
    }
    setDraftChoiceIds((current) =>
      current.includes(choiceId)
        ? current.filter((selected) => selected !== choiceId)
        : [...current, choiceId],
    );
  }

  async function persistAnswer(
    selectedChoiceIds: readonly string[],
    advance: boolean,
  ): Promise<void> {
    if (session === null) return;
    const item = activeItem();
    if (item === null || session.status === "FINALIZADA") return;
    const expectedVersion = session.version;
    setViewState("loading");
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/diagnostics/b07/sessions/${encodeURIComponent(session.sessionId)}/answers/${encodeURIComponent(item.itemId)}`,
        "PUT",
        {
          version: expectedVersion,
          selectedChoiceIds: [...selectedChoiceIds],
          idempotencyKey: clientIdempotencyKey([
            "answer",
            session.sessionId,
            item.itemId,
            String(expectedVersion),
            selectedChoiceIds.length === 0
              ? "clear"
              : [...selectedChoiceIds].sort().join("."),
          ]),
        },
      );
      const nextSession = parseDiagnosticSession(data);
      setSession(nextSession);
      setDraftChoiceIds([...selectedChoiceIds]);
      if (advance && activeIndex < nextSession.items.length - 1) {
        setActiveIndex((current) => current + 1);
      }
      setViewState("ready");
      setNotice(
        selectedChoiceIds.length === 0
          ? "Resposta removida; a sessão continua pronta para retomada."
          : "Resposta salva. Você pode avançar ou voltar quando quiser.",
      );
    } catch (caught) {
      setViewState("ready");
      setError(publicErrorMessage(caught));
    }
  }

  async function handleFinalize(): Promise<void> {
    if (session === null || session.status === "FINALIZADA") return;
    const item = activeItem();
    if (
      item !== null &&
      !sameChoiceIds(answerFor(session, item.itemId), draftChoiceIds)
    ) {
      setError("Salve ou limpe a resposta atual antes de finalizar.");
      return;
    }
    const expectedVersion = session.version;
    setViewState("loading");
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/diagnostics/b07/sessions/${encodeURIComponent(session.sessionId)}/finalize`,
        "POST",
        {
          version: expectedVersion,
          idempotencyKey: clientIdempotencyKey([
            "finalize",
            session.sessionId,
            String(expectedVersion),
          ]),
        },
      );
      applySession(parseDiagnosticSession(data));
      setNotice("Diagnóstico finalizado e resultado formativo registrado.");
    } catch (caught) {
      setViewState("ready");
      setError(publicErrorMessage(caught));
    }
  }

  const item = activeItem();
  const persistedChoiceIds =
    session === null || item === null ? [] : answerFor(session, item.itemId);
  const hasUnsavedChanges = !sameChoiceIds(persistedChoiceIds, draftChoiceIds);
  const busy = viewState === "loading";

  return (
    <main
      className="shell diagnostic-shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={busy}
    >
      <header className="topbar" aria-label="Diagnóstico formativo">
        <div>
          <p className="eyebrow">CVG · superfície do participante</p>
          <span className="brand">Diagnóstico formativo B-07</span>
        </div>
        <Link className="button-link" href="/">
          Voltar ao painel
        </Link>
      </header>

      <section className="diagnostic-card" data-testid="diagnostic-session">
        <div className="section-heading diagnostic-heading">
          <div>
            <p className="eyebrow">Sessão própria · versão 0.1.0</p>
            <h1 id="diagnostic-title">Mapeamento formativo inicial</h1>
          </div>
          <span className="status-pill">
            {session === null
              ? "Acesso protegido"
              : diagnosticStatusLabel(session.status)}
          </span>
        </div>

        <p className="diagnostic-intro">
          Responda no seu ritmo. O diagnóstico é digital, formativo e não gera
          nota global, decisão clínica ou comprovação de competência prática.
        </p>

        {viewState === "loading" && session === null ? (
          <p
            className="feedback pending"
            role="status"
            data-testid="diagnostic-loading"
          >
            Consultando sua sessão…
          </p>
        ) : null}

        {viewState === "needs_start" ? (
          <div
            className="diagnostic-start-panel"
            data-testid="diagnostic-start"
          >
            <h2>Começar uma sessão</h2>
            <p>
              A sessão guarda checkpoints para você sair e voltar sem perder as
              respostas. O servidor controla o escopo e a versão da sessão.
            </p>
            <button type="button" onClick={() => void handleStart()}>
              Iniciar diagnóstico
            </button>
          </div>
        ) : null}

        {viewState === "error" ? (
          <div className="diagnostic-start-panel diagnostic-error-panel">
            <p className="feedback error" role="alert">
              {error ?? "Não foi possível carregar o diagnóstico."}
            </p>
            <button type="button" onClick={() => void loadCurrent()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {session !== null ? (
          <>
            <div
              className="diagnostic-progress"
              aria-label="Progresso do diagnóstico"
            >
              <div className="diagnostic-progress-label">
                <span>
                  {session.answeredItemCount} de {session.itemCount} itens
                  salvos
                </span>
                <strong>
                  {Math.round(
                    (session.answeredItemCount / session.itemCount) * 100,
                  )}
                  %
                </strong>
              </div>
              <progress
                value={session.answeredItemCount}
                max={session.itemCount}
              >
                {session.answeredItemCount} de {session.itemCount}
              </progress>
            </div>

            {session.status === "FINALIZADA" && session.result !== undefined ? (
              <section
                className="diagnostic-result"
                data-testid="diagnostic-result"
                aria-labelledby="diagnostic-result-title"
              >
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Registro digital</p>
                    <h2 id="diagnostic-result-title">
                      Seu resultado formativo
                    </h2>
                  </div>
                  <span className="status-pill">Sem nota global</span>
                </div>
                <p>
                  A sessão foi encerrada em {session.finalizedAt?.slice(0, 10)}.
                  Os cartões abaixo mostram somente evidência digital por tema.
                </p>
                <div className="diagnostic-theme-grid">
                  {session.result.themes.map((theme) => (
                    <article
                      className="diagnostic-theme-card"
                      key={theme.themeId}
                    >
                      <p className="eyebrow">{theme.themeId}</p>
                      <h3>{theme.themeLabel}</h3>
                      <strong>
                        {theme.scorePercent === null
                          ? "Sem percentual"
                          : `${theme.scorePercent}%`}
                      </strong>
                      <span>{themeStatusLabel(theme.status)}</span>
                      <small>
                        {theme.answeredItemCount} de {theme.itemCount} itens
                        respondidos · evidência digital não representa
                        competência prática.
                      </small>
                    </article>
                  ))}
                </div>
                <Link className="button-link" href="/">
                  Continuar trilha
                </Link>
              </section>
            ) : item !== null ? (
              <>
                <div
                  className="diagnostic-item-navigation"
                  aria-label="Navegação dos itens"
                >
                  <button
                    className="diagnostic-secondary"
                    type="button"
                    disabled={busy || hasUnsavedChanges || activeIndex === 0}
                    onClick={() => setActiveIndex((current) => current - 1)}
                  >
                    Item anterior
                  </button>
                  <span>
                    Item {item.ordinal} de {session.itemCount}
                  </span>
                  <button
                    className="diagnostic-secondary"
                    type="button"
                    disabled={
                      busy ||
                      hasUnsavedChanges ||
                      activeIndex === session.items.length - 1
                    }
                    onClick={() => setActiveIndex((current) => current + 1)}
                  >
                    Próximo item
                  </button>
                </div>

                <article
                  className="item-card diagnostic-item"
                  data-testid="diagnostic-item"
                  aria-labelledby="diagnostic-item-title"
                >
                  <p className="eyebrow">
                    Questão objetiva ·{" "}
                    {item.selectionMode === "MULTIPLE"
                      ? "mais de uma escolha"
                      : "uma escolha"}
                  </p>
                  <h2 id="diagnostic-item-title">{item.title}</h2>
                  <p>{item.text}</p>
                  <fieldset className="diagnostic-choice-fieldset">
                    <legend>Selecione sua resposta</legend>
                    <div className="diagnostic-choice-list">
                      {item.choices.map((choice) => (
                        <label className="diagnostic-choice" key={choice.id}>
                          <input
                            type={
                              item.selectionMode === "MULTIPLE"
                                ? "checkbox"
                                : "radio"
                            }
                            name={`diagnostic-${item.itemId}`}
                            value={choice.id}
                            checked={draftChoiceIds.includes(choice.id)}
                            onChange={() => toggleChoice(choice.id)}
                            disabled={busy}
                          />
                          <span>
                            <strong>{choice.label}</strong>
                            {choice.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="diagnostic-action-row">
                    <button
                      type="button"
                      disabled={
                        busy ||
                        draftChoiceIds.length === 0 ||
                        !hasUnsavedChanges
                      }
                      onClick={() => void persistAnswer(draftChoiceIds, true)}
                    >
                      Salvar resposta e avançar
                    </button>
                    <button
                      className="diagnostic-secondary"
                      type="button"
                      disabled={
                        busy ||
                        (persistedChoiceIds.length === 0 &&
                          draftChoiceIds.length === 0)
                      }
                      onClick={() => void persistAnswer([], false)}
                    >
                      Limpar resposta
                    </button>
                  </div>
                  <p className="field-help">
                    Salve para registrar o checkpoint. Para revisar sem perder
                    uma alteração, conclua o salvamento antes de navegar.
                  </p>
                </article>

                <div className="diagnostic-finalize-row">
                  <div>
                    <strong>Terminou por agora?</strong>
                    <span>
                      Você pode finalizar mesmo com itens sem resposta; o
                      resultado continua formativo.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busy || hasUnsavedChanges}
                    onClick={() => void handleFinalize()}
                  >
                    Finalizar diagnóstico
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {error !== null && viewState !== "error" ? (
          <p className="feedback error" role="alert">
            {error}
          </p>
        ) : null}
        {notice !== null ? (
          <p className="feedback success" role="status">
            {notice}
          </p>
        ) : null}
      </section>

      <p className="path-disclaimer diagnostic-disclaimer">
        Não inclua dados reais de pacientes, tutores, prontuários, fotos, PDFs
        ou fontes externas nesta sessão técnica.
      </p>
    </main>
  );
}
