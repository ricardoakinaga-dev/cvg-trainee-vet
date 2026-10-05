"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DiagnosticSessionClient,
  DiagnosticRequestCancelled,
  DiagnosticRequestError,
  parseDiagnosticSession,
  requestDiagnosticJson,
  isDiagnosticReceipt,
  sameDiagnosticChoices as sameChoiceIds,
  type DiagnosticSession,
  type PendingDiagnosticMutation,
} from "../diagnostic-session-client";
import { PublicApiError } from "../participant-contracts";
import { participantPublicError } from "../participant-field-validation";

type DiagnosticItem = DiagnosticSession["items"][number];
type DiagnosticTheme = NonNullable<
  DiagnosticSession["result"]
>["themes"][number];
type ViewState = "loading" | "needs_start" | "ready" | "error";
type ItemAnchor = Readonly<{ sessionId: string; itemId: string }>;

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
  if (session.currentOrdinal !== null)
    return session.items.findIndex(
      (item) => item.ordinal === session.currentOrdinal,
    );
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
  const [answerError, setAnswerError] = useState<ItemAnchor | null>(null);
  const startKeyRef = useRef<string | null>(null);
  const clientRef = useRef(new DiagnosticSessionClient());
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const advanceFocusRef = useRef<{ sessionId: string; itemId: string } | null>(
    null,
  );
  const answerFieldRef = useRef<HTMLFieldSetElement | null>(null);
  const validationFocusRef = useRef<ItemAnchor | null>(null);
  const draftRef = useRef(draftChoiceIds);
  draftRef.current = draftChoiceIds;

  const applySession = useCallback((nextSession: DiagnosticSession): void => {
    const current = clientRef.current.readSession(nextSession);
    setSession(current);
    const index = firstOpenItemIndex(current);
    setActiveIndex(index);
    setDraftChoiceIds(answerFor(current, current.items[index]?.itemId ?? ""));
    setViewState("ready");
  }, []);

  const loadCurrent = useCallback(async (): Promise<void> => {
    const client = clientRef.current;
    const read = client.beginRead();
    setViewState("loading");
    setError(null);
    setAnswerError(null);
    setNotice(null);
    try {
      const data = await requestDiagnosticJson(
        "/api/v1/diagnostics/b07/sessions/current",
        { method: "GET", signal: read.signal },
      );
      if (!read.current()) return;
      const next = parseDiagnosticSession(data);
      const original = client.pending?.expected;
      if (client.pending !== null) {
        if (
          original !== undefined &&
          next.sessionId === original.sessionId &&
          next.status === "EM_ANDAMENTO"
        )
          setSession(client.readSession(next));
        setViewState("ready");
        return;
      }
      applySession(next);
    } catch (caught) {
      if (!read.current() || caught instanceof DiagnosticRequestCancelled)
        return;
      if (client.pending !== null) {
        setViewState("ready");
        setError(publicErrorMessage(caught));
      } else if (
        caught instanceof PublicApiError &&
        caught.code === "not_found"
      ) {
        setSession(null);
        setViewState("needs_start");
      } else {
        setViewState("error");
        setError(publicErrorMessage(caught));
      }
    }
  }, [applySession]);

  useEffect(() => {
    const client = new DiagnosticSessionClient();
    clientRef.current = client;
    void loadCurrent();
    return () => {
      client.cancel();
      advanceFocusRef.current = null;
      validationFocusRef.current = null;
    };
  }, [loadCurrent]);

  useEffect(() => {
    if (viewState !== "ready") return;
    const destination = advanceFocusRef.current;
    advanceFocusRef.current = null;
    if (
      destination !== null &&
      session?.status === "EM_ANDAMENTO" &&
      session.sessionId === destination.sessionId &&
      session.items[activeIndex]?.itemId === destination.itemId
    )
      headingRef.current?.focus();
  }, [activeIndex, session, viewState]);

  useEffect(() => {
    if (viewState !== "ready") return;
    const destination = validationFocusRef.current;
    validationFocusRef.current = null;
    if (
      destination !== null &&
      session?.status === "EM_ANDAMENTO" &&
      session.sessionId === destination.sessionId &&
      session.items[activeIndex]?.itemId === destination.itemId &&
      answerError === destination
    )
      answerFieldRef.current?.focus();
  }, [activeIndex, answerError, session, viewState]);

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

  async function executeMutation(
    mutation: PendingDiagnosticMutation,
  ): Promise<void> {
    const client = clientRef.current;
    const draftBefore = [...draftRef.current];
    setViewState("loading");
    setError(null);
    setAnswerError(null);
    setNotice(null);
    try {
      const data = await requestDiagnosticJson(mutation.path, {
        method: mutation.method,
        body: mutation.body,
        signal: client.signal,
      });
      if (client.signal.aborted || clientRef.current !== client) return;
      const next = parseDiagnosticSession(data);
      if (
        mutation.expected !== undefined &&
        !isDiagnosticReceipt(next, mutation.expected)
      )
        throw new PublicApiError(
          "internal_error",
          "unproven diagnostic receipt",
        );
      if (mutation.expected === undefined && next.status !== "EM_ANDAMENTO")
        throw new PublicApiError(
          "internal_error",
          "invalid diagnostic start receipt",
        );
      const acknowledged = client.acknowledgeSession(next);
      client.complete(mutation);
      if (mutation.expected?.operation === "answer") {
        const originalChoices = mutation.expected.selectedChoiceIds ?? [];
        const keepDraft =
          !sameChoiceIds(
            draftBefore,
            mutation.draftChoiceIds ?? originalChoices,
          ) || !sameChoiceIds(draftRef.current, draftBefore);
        setSession(acknowledged);
        if (!keepDraft && mutation.advance) {
          const index = Math.min(
            activeIndex + 1,
            acknowledged.items.length - 1,
          );
          const nextItem = acknowledged.items[index];
          if (index !== activeIndex && nextItem !== undefined)
            advanceFocusRef.current = {
              sessionId: acknowledged.sessionId,
              itemId: nextItem.itemId,
            };
          setActiveIndex(index);
          setDraftChoiceIds(
            answerFor(acknowledged, acknowledged.items[index]?.itemId ?? ""),
          );
        } else if (!keepDraft) setDraftChoiceIds([...originalChoices]);
        setNotice(
          originalChoices.length === 0
            ? "Resposta removida; a sessão continua pronta para retomada."
            : "Resposta salva. Você pode avançar ou voltar quando quiser.",
        );
      } else {
        applySession(acknowledged);
        setNotice(
          mutation.expected?.operation === "finalize"
            ? "Diagnóstico finalizado e resultado formativo registrado."
            : "Sessão iniciada. Salve cada resposta para poder retomar depois.",
        );
      }
      setViewState("ready");
    } catch (caught) {
      if (
        client.signal.aborted ||
        clientRef.current !== client ||
        caught instanceof DiagnosticRequestCancelled
      )
        return;
      client.reject(mutation, caught);
      setViewState(session === null ? "error" : "ready");
      const expected = mutation.expected;
      if (
        caught instanceof DiagnosticRequestError &&
        caught.definitiveRejection &&
        caught.code === "validation_error" &&
        expected?.operation === "answer" &&
        expected.itemId !== undefined
      ) {
        const destination = {
          sessionId: expected.sessionId,
          itemId: expected.itemId,
        };
        setAnswerError(destination);
        validationFocusRef.current = destination;
        setError(participantPublicError(caught, "answer"));
      } else setError(publicErrorMessage(caught));
    }
  }

  async function handleStart(): Promise<void> {
    const mutation = clientRef.current.prepare({
      path: "/api/v1/diagnostics/b07/sessions",
      method: "POST",
      body: JSON.stringify({ idempotencyKey: startIdempotencyKey() }),
      advance: false,
    });
    await executeMutation(mutation);
  }

  function activeItem(): DiagnosticItem | null {
    return session?.items[activeIndex] ?? null;
  }

  function toggleChoice(choiceId: string): void {
    const item = activeItem();
    if (item === null || session?.status === "FINALIZADA") return;
    if (answerError !== null) {
      setAnswerError(null);
      setError(null);
    }
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
    const item = activeItem();
    if (session === null || item === null || session.status === "FINALIZADA")
      return;
    const mutation = clientRef.current.prepare({
      path: `/api/v1/diagnostics/b07/sessions/${encodeURIComponent(session.sessionId)}/answers/${encodeURIComponent(item.itemId)}`,
      method: "PUT",
      advance,
      draftChoiceIds: [...draftRef.current],
      expected: {
        operation: "answer",
        sessionId: session.sessionId,
        version: session.version,
        itemId: item.itemId,
        selectedChoiceIds,
      },
      body: JSON.stringify({
        version: session.version,
        selectedChoiceIds: [...selectedChoiceIds],
        idempotencyKey: clientIdempotencyKey([
          "answer",
          session.sessionId,
          item.itemId,
          String(session.version),
          selectedChoiceIds.length === 0
            ? "clear"
            : [...selectedChoiceIds].sort().join("."),
        ]),
      }),
    });
    await executeMutation(mutation);
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
    if (clientRef.current.pending !== null) return;
    await executeMutation(
      clientRef.current.prepare({
        path: `/api/v1/diagnostics/b07/sessions/${encodeURIComponent(session.sessionId)}/finalize`,
        method: "POST",
        advance: false,
        expected: {
          operation: "finalize",
          sessionId: session.sessionId,
          version: session.version,
        },
        body: JSON.stringify({
          version: session.version,
          idempotencyKey: clientIdempotencyKey([
            "finalize",
            session.sessionId,
            String(session.version),
          ]),
        }),
      }),
    );
  }

  function changeItem(index: number): void {
    if (clientRef.current.pending !== null || session === null) return;
    setAnswerError(null);
    setActiveIndex(index);
    setDraftChoiceIds(answerFor(session, session.items[index]?.itemId ?? ""));
  }

  const item = activeItem();
  const persistedChoiceIds =
    session === null || item === null ? [] : answerFor(session, item.itemId);
  const hasUnsavedChanges = !sameChoiceIds(persistedChoiceIds, draftChoiceIds);
  const busy = viewState === "loading";
  const hasAnswerError =
    answerError !== null &&
    answerError.sessionId === session?.sessionId &&
    answerError.itemId === item?.itemId;
  const pending = clientRef.current.pending;

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
          <span className="status-pill status-pill--info">
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
            <div className="diagnostic-progress">
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
                aria-label="Progresso do diagnóstico"
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
                  <span className="status-pill status-pill--info">
                    Sem nota global
                  </span>
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
                    disabled={
                      busy ||
                      pending !== null ||
                      hasUnsavedChanges ||
                      activeIndex === 0
                    }
                    onClick={() => changeItem(activeIndex - 1)}
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
                      pending !== null ||
                      hasUnsavedChanges ||
                      activeIndex === session.items.length - 1
                    }
                    onClick={() => changeItem(activeIndex + 1)}
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
                  <h2 id="diagnostic-item-title" ref={headingRef} tabIndex={-1}>
                    {item.title}
                  </h2>
                  <p>{item.text}</p>
                  <fieldset
                    className="diagnostic-choice-fieldset"
                    ref={answerFieldRef}
                    tabIndex={-1}
                    aria-invalid={hasAnswerError || undefined}
                    aria-describedby={
                      hasAnswerError ? "diagnostic-answer-error" : undefined
                    }
                  >
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
                        pending !== null ||
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
                        pending !== null ||
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
                    disabled={busy || pending !== null || hasUnsavedChanges}
                    onClick={() => void handleFinalize()}
                  >
                    Finalizar diagnóstico
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {pending !== null ? (
          <div className="feedback warning">
            <p role="status">
              Há um envio pendente. Suas novas escolhas ficam preservadas.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void executeMutation(pending)}
            >
              Reenviar envio pendente
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadCurrent()}
            >
              Atualizar sessão
            </button>
          </div>
        ) : null}

        {error !== null && viewState !== "error" ? (
          <p
            className="feedback error"
            role="alert"
            id={hasAnswerError ? "diagnostic-answer-error" : undefined}
          >
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
