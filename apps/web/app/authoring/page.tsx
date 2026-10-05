"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  type AdjustmentReceipt,
  type InternalAuthoringRecord,
  type ContentReviewQueue,
  type InternalSessionScopes,
  isRecord,
  isReviewRationale,
  isAdjustmentReceipt,
  isInternalAuthoringRecord,
  isContentReviewQueue,
  isInternalSessionScopes,
} from "./authoring-contracts";
import {
  readDraftRecovery,
  writeDraftRecovery,
  clearDraftRecovery,
  newDraftIdempotencyKey,
} from "./draft-recovery";

const authoringModuleOptions = Array.from(
  { length: 24 },
  (_, index) => `M${String(index + 1).padStart(2, "0")}`,
);
const authoringSessionOptions = ["S1", "S2", "S3", "S4"] as const;
const authoringSourceOptions = [
  "F-01",
  "F-02",
  "F-03",
  "AAHA-2024",
  "RECOVER-2024",
  "WSAVA-2022",
  "AVHTM-TRACS-2021",
] as const;

async function requestJson(
  path: string,
  init: Readonly<{ method: "GET" | "POST"; body?: unknown }>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method,
      credentials: "include",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
  } catch (caught) {
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new Error(
        "A requisição demorou mais que o esperado. Tente novamente com a mesma chave.",
      );
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || payload.success !== true) {
    if (response.status === 409) {
      throw new Error(
        "A chave de idempotência já foi usada com outro conteúdo.",
      );
    }
    if (response.status === 403) {
      throw new Error("A sessão não possui autorização para este escopo.");
    }
    throw new Error("A operação editorial não foi concluída.");
  }
  return payload.data;
}

function queryInput(): Readonly<{
  readonly contentId: string;
  readonly version: string;
  readonly scopeId: string;
}> {
  if (typeof window === "undefined")
    return { contentId: "", version: "1", scopeId: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    contentId: params.get("contentId") ?? "",
    version: params.get("version") ?? "1",
    scopeId: params.get("scopeId") ?? "",
  };
}

function scopeOptionLabel(scopeId: string, index: number): string {
  return `Escopo ${index + 1} · ${scopeId.slice(0, 8)}…`;
}

export default function AuthoringPage() {
  const [session, setSession] = useState<InternalSessionScopes | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const suspended = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    setFailed(false);
    setSession(null);
    void requestJson("/api/v1/internal/session/scopes", { method: "GET" })
      .then((data) => {
        if (generation.current !== current) return;
        if (!isInternalSessionScopes(data))
          throw new Error("Projeção inválida.");
        const recovery = readDraftRecovery();
        const context = data.recoveryContext;
        const ownsRecovery =
          context !== undefined &&
          recovery !== null &&
          recovery.principalId === context.principalId &&
          recovery.sessionBinding === context.sessionBinding;
        const preferred =
          queryInput().scopeId || (ownsRecovery ? recovery.scopeId : "");
        const scope = data.scopes.includes(preferred)
          ? preferred
          : (data.scopes[0] ?? "");
        if (!ownsRecovery || recovery.scopeId !== scope) clearDraftRecovery();
        setSelectedScopeId(scope);
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        if (generation.current !== current) return;
        clearDraftRecovery();
        setSession(null);
        setFailed(true);
        setLoading(false);
      });
    const invalidate = () => {
      suspended.current = true;
      ++generation.current;
      setSession(null);
      setLoading(true);
    };
    const refresh = () => {
      if (!suspended.current) return;
      invalidate();
      suspended.current = false;
      setRevision((value) => value + 1);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") invalidate();
      else refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("blur", invalidate);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("pagehide", invalidate);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      ++generation.current;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("blur", invalidate);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("pagehide", invalidate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [revision]);

  if (loading || failed || session === null || session.scopes.length === 0) {
    return (
      <main className="shell" id="main-content" tabIndex={-1}>
        <section
          className="experience-panel dashboard-message internal-access-gate"
          data-testid="internal-access-gate"
          role={loading ? "status" : "alert"}
          aria-live="polite"
        >
          <h1 className="access-gate-title">
            {loading
              ? "Validando acesso restrito"
              : failed
                ? "Sessão interna necessária"
                : "Nenhum escopo autorizado"}
          </h1>
          <span>
            {loading
              ? "Consultando a autorização server-side da sessão…"
              : failed
                ? "Não foi possível carregar os escopos da sessão interna."
                : "Esta conta não possui escopo para a superfície de autoria."}
          </span>
          {failed ? (
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Tentar carregar novamente
            </button>
          ) : null}
        </section>
      </main>
    );
  }
  return (
    <AuthoringWorkspace
      key={`${revision}:${session.recoveryContext?.principalId ?? "unbound"}:${session.recoveryContext?.sessionBinding ?? "unbound"}:${selectedScopeId}`}
      session={session}
      scopeId={selectedScopeId}
      onScopeChange={(scope) => {
        clearDraftRecovery();
        setSelectedScopeId(session.scopes.includes(scope) ? scope : "");
      }}
    />
  );
}

function AuthoringWorkspace({
  session,
  scopeId,
  onScopeChange,
}: Readonly<{
  session: InternalSessionScopes;
  scopeId: string;
  onScopeChange: (scope: string) => void;
}>) {
  const sessionScopes = session.scopes;
  const active = useRef(true);
  const [record, setRecord] = useState<InternalAuthoringRecord | null>(null);
  const [adjustmentReceipt, setAdjustmentReceipt] =
    useState<AdjustmentReceipt | null>(null);
  const [queue, setQueue] = useState<ContentReviewQueue | null>(null);
  const [contentId, setContentId] = useState("");
  const [version, setVersion] = useState("1");
  const [authoringToolsOpen, setAuthoringToolsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewRationale, setReviewRationale] = useState("");
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [draftConflict, setDraftConflict] = useState(false);
  const [draftIdempotencyKey, setDraftIdempotencyKey] = useState("");
  const [draftModuleId, setDraftModuleId] = useState("M02");
  const [draftSessionSuffix, setDraftSessionSuffix] = useState("S1");
  const [draftObjectiveId, setDraftObjectiveId] = useState("M02-OBJ-01");
  const [draftTitle, setDraftTitle] = useState("Prioridade clínica sintética");
  const [draftPrompt, setDraftPrompt] = useState(
    "Escolha a próxima ação segura em um caso fictício.",
  );
  const [draftChoiceA, setDraftChoiceA] = useState("Priorizar e reavaliar.");
  const [draftChoiceB, setDraftChoiceB] = useState("Aguardar sem meta.");
  const [draftCorrectChoiceId, setDraftCorrectChoiceId] = useState("a");
  const [draftFeedback, setDraftFeedback] = useState(
    "Defina uma meta e reavalie.",
  );
  const [draftSourceCode, setDraftSourceCode] = useState("F-02");
  const [draftSourceLocator, setDraftSourceLocator] = useState(
    "localizador interno a revisar",
  );
  const [draftCritical, setDraftCritical] = useState(false);

  useEffect(() => {
    active.current = true;
    const recovery = readDraftRecovery();
    if (
      recovery !== null &&
      session.recoveryContext !== undefined &&
      recovery.principalId === session.recoveryContext.principalId &&
      recovery.sessionBinding === session.recoveryContext.sessionBinding &&
      recovery.scopeId === scopeId
    ) {
      setDraftIdempotencyKey(recovery.idempotencyKey);
      setDraftModuleId(recovery.moduleId);
      setDraftSessionSuffix(recovery.draftSessionSuffix);
      setDraftObjectiveId(recovery.draftObjectiveId);
      setDraftTitle(recovery.draftTitle);
      setDraftPrompt(recovery.draftPrompt);
      setDraftChoiceA(recovery.draftChoiceA);
      setDraftChoiceB(recovery.draftChoiceB);
      setDraftCorrectChoiceId(recovery.draftCorrectChoiceId);
      setDraftFeedback(recovery.draftFeedback);
      setDraftSourceCode(recovery.draftSourceCode);
      setDraftSourceLocator(recovery.draftSourceLocator);
      setDraftCritical(recovery.draftCritical);
    }
    const input = queryInput();
    setContentId(input.contentId);
    setVersion(input.version);
    void initialize(input);
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      draftIdempotencyKey.length === 0 ||
      session.recoveryContext === undefined
    )
      return;
    writeDraftRecovery({
      ...session.recoveryContext,
      idempotencyKey: draftIdempotencyKey,
      scopeId,
      moduleId: draftModuleId,
      draftSessionSuffix,
      draftObjectiveId,
      draftTitle,
      draftPrompt,
      draftChoiceA,
      draftChoiceB,
      draftCorrectChoiceId,
      draftFeedback,
      draftSourceCode,
      draftSourceLocator,
      draftCritical,
    });
  }, [
    draftChoiceA,
    draftChoiceB,
    draftCritical,
    draftFeedback,
    draftIdempotencyKey,
    draftModuleId,
    draftObjectiveId,
    draftPrompt,
    draftSessionSuffix,
    draftSourceCode,
    draftSourceLocator,
    draftTitle,
    scopeId,
    session.recoveryContext,
  ]);

  async function initialize(
    input: Readonly<{
      readonly contentId: string;
      readonly version: string;
      readonly scopeId: string;
    }>,
  ): Promise<void> {
    if (scopeId.length > 0) {
      await loadQueue(scopeId);
    }
    if (
      active.current &&
      input.contentId.trim().length > 0 &&
      scopeId.length > 0
    ) {
      await loadRecord(input.contentId, input.version, scopeId);
    }
  }

  async function loadQueue(selectedScopeId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        scopeId: selectedScopeId.trim(),
        limit: "50",
      });
      const data = await requestJson(
        `/api/v1/internal/content/review-queue?${params.toString()}`,
        { method: "GET" },
      );
      if (!isContentReviewQueue(data)) throw new Error("Projeção inválida.");
      if (!active.current) return;
      if (data.scopeId !== selectedScopeId)
        throw new Error("Projeção inválida.");
      setQueue(data);
    } catch {
      setQueue(null);
      setError("Não foi possível carregar a fila de revisão clínica.");
    } finally {
      setBusy(false);
    }
  }

  async function loadRecord(
    id: string,
    selectedVersion: string,
    selectedScopeId: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const data = await requestJson(
        `/api/v1/internal/content/${id}/versions/${selectedVersion}/authoring?${new URLSearchParams({ scopeId: selectedScopeId }).toString()}`,
        { method: "GET" },
      );
      if (!isInternalAuthoringRecord(data))
        throw new Error("Projeção inválida.");
      if (!active.current) return;
      if (
        data.scopeId !== selectedScopeId ||
        data.contentId !== id ||
        data.version !== Number(selectedVersion)
      )
        throw new Error("Projeção inválida.");
      setRecord(data);
      setAdjustmentReceipt(null);
      setNotice(null);
    } catch {
      setError("Não foi possível carregar o registro de autoria.");
    } finally {
      setBusy(false);
    }
  }

  async function review(
    decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES",
  ) {
    if (record === null || busy) return;
    const rationale = reviewRationale.trim();
    if (!isReviewRationale(rationale)) {
      setRationaleError(
        "Informe uma justificativa em texto simples, entre 1 e 10.000 caracteres.",
      );
      return;
    }
    setRationaleError(null);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/internal/content/${record.contentId}/review`,
        {
          method: "POST",
          body: {
            version: record.version,
            scopeId: record.scopeId,
            decision,
            rationale,
          },
        },
      );
      if (decision === "SOLICITAR_AJUSTES") {
        if (
          !isAdjustmentReceipt(data) ||
          data.scopeId !== record.scopeId ||
          data.contentId !== record.contentId ||
          data.version !== record.version
        )
          throw new Error("Projeção inválida.");
        if (!active.current) return;
        setAdjustmentReceipt(data);
        setRecord(null);
      } else {
        if (
          !isInternalAuthoringRecord(data) ||
          data.scopeId !== record.scopeId ||
          data.contentId !== record.contentId ||
          data.version !== record.version
        )
          throw new Error("Projeção inválida.");
        if (!active.current) return;
        setRecord(data);
        setAdjustmentReceipt(null);
      }
      setReviewRationale("");
      setNotice(
        decision === "APROVAR_CLINICAMENTE"
          ? "Revisão clínica registrada."
          : "Ajustes solicitados.",
      );
    } catch {
      setError("Não foi possível registrar a decisão clínica.");
    } finally {
      setBusy(false);
    }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (scopeId.trim().length === 0) {
      setError("Selecione um escopo autorizado antes de criar o rascunho.");
      return;
    }
    const requestIdempotencyKey =
      draftIdempotencyKey.length > 0
        ? draftIdempotencyKey
        : newDraftIdempotencyKey();
    setDraftIdempotencyKey(requestIdempotencyKey);
    if (session.recoveryContext !== undefined)
      writeDraftRecovery({
        ...session.recoveryContext,
        idempotencyKey: requestIdempotencyKey,
        scopeId,
        moduleId: draftModuleId,
        draftSessionSuffix,
        draftObjectiveId,
        draftTitle,
        draftPrompt,
        draftChoiceA,
        draftChoiceB,
        draftCorrectChoiceId,
        draftFeedback,
        draftSourceCode,
        draftSourceLocator,
        draftCritical,
      });
    setBusy(true);
    setError(null);
    setNotice(null);
    setDraftConflict(false);
    try {
      const data = await requestJson("/api/v1/content/drafts", {
        method: "POST",
        body: {
          idempotencyKey: requestIdempotencyKey,
          scopeId,
          moduleId: draftModuleId,
          sessionId: `${draftModuleId}-${draftSessionSuffix}`,
          objectiveId: draftObjectiveId,
          ordinal: 1,
          title: draftTitle,
          prompt: draftPrompt,
          responseMode: "CHOICE",
          choices: [
            { id: "a", label: "A", text: draftChoiceA },
            { id: "b", label: "B", text: draftChoiceB },
          ],
          correctChoiceIds: [draftCorrectChoiceId],
          feedback: draftFeedback,
          critical: draftCritical,
          remediationTargetObjectiveId: draftObjectiveId,
          sourceRefs: [
            {
              code: draftSourceCode,
              locator: draftSourceLocator,
              updateRequired: true,
            },
          ],
        },
      });
      if (!isInternalAuthoringRecord(data))
        throw new Error("Projeção inválida.");
      if (!active.current) return;
      if (data.scopeId !== scopeId) throw new Error("Projeção inválida.");
      setRecord(data);
      setNotice(
        "Rascunho criado. O pré-voo técnico não publica nem aprova o conteúdo.",
      );
      clearDraftRecovery();
      setDraftIdempotencyKey("");
    } catch (caught) {
      if (!active.current) return;
      if (
        caught instanceof Error &&
        caught.message.includes("chave de idempotência")
      ) {
        setDraftConflict(true);
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar o rascunho.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header
        className="topbar"
        aria-label="Identificação da superfície interna"
      >
        <div>
          <p className="eyebrow">CVG · superfície interna</p>
          <span className="brand">Autoria e revisão clínica</span>
        </div>
        <span className="status-pill status-pill--neutral">
          Acesso restrito
        </span>
      </header>

      <section className="queue-panel" aria-labelledby="queue-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fila operacional</p>
            <h1 id="queue-title">Revisão clínica pendente</h1>
          </div>
          <span className="status-pill status-pill--neutral">
            Somente leitura
          </span>
        </div>
        <p className="intro">
          Consulte somente metadados do escopo autorizado. O item completo abre
          em uma rota interna separada e a decisão continua humana.
        </p>
        <div className="queue-filter-row">
          <label htmlFor="queue-scope-id">Escopo autorizado</label>
          <select
            id="queue-scope-id"
            name="scopeId"
            value={scopeId}
            onChange={(event) => onScopeChange(event.target.value)}
            disabled={busy || sessionScopes.length === 0}
          >
            <option value="">Selecione um escopo</option>
            {sessionScopes.map((sessionScopeId, index) => (
              <option key={sessionScopeId} value={sessionScopeId}>
                {scopeOptionLabel(sessionScopeId, index)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadQueue(scopeId)}
            disabled={busy || scopeId.trim().length === 0}
          >
            {busy ? "Carregando…" : "Carregar fila"}
          </button>
        </div>
        {queue === null ? (
          <p className="dashboard-empty">
            Selecione um escopo autorizado para consultar a fila.
          </p>
        ) : queue.items.length === 0 ? (
          <p className="dashboard-empty">Nenhum item aguarda revisão.</p>
        ) : (
          <ul className="queue-list">
            {queue.items.map((item) => (
              <li
                className="queue-item"
                key={`${item.contentId}-${item.version}`}
              >
                <div>
                  <p className="eyebrow">
                    {item.moduleId} · {item.sessionId} · versão {item.version}
                  </p>
                  <h2>{item.title}</h2>
                  <p>
                    {item.status} · {item.nextAction}
                  </p>
                  {item.latestReview !== undefined ? (
                    <p className="field-help">
                      Última decisão: {item.latestReview.decision} ·{" "}
                      {item.latestReview.reviewedAt}
                    </p>
                  ) : null}
                </div>
                {item.nextAction === "REVISAR_CLINICAMENTE" &&
                item.canOpenAuthoring ? (
                  <a
                    className="button-link"
                    href={`/authoring?contentId=${encodeURIComponent(item.contentId)}&version=${item.version}&scopeId=${encodeURIComponent(item.scopeId)}`}
                  >
                    Abrir revisão
                  </a>
                ) : (
                  <span className="field-help">
                    {item.nextAction === "AGUARDAR_REENVIO_AUTOR"
                      ? "Aguardar reenvio do autor"
                      : "Acesso à autoria completa indisponível"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {record === null ? (
        <>
          <section
            className="authoring-commandbar"
            aria-labelledby="authoring-actions-title"
          >
            <div>
              <p className="eyebrow">Orquestração do fluxo</p>
              <h2 id="authoring-actions-title">
                Revisar primeiro, criar depois
              </h2>
              <p>
                A fila é o caminho principal. Abra ferramentas de autoria apenas
                quando precisar criar ou consultar um item específico.
              </p>
            </div>
            <div className="authoring-command-actions">
              <button
                type="button"
                className="secondary-button authoring-command-primary"
                aria-label="Criar ou abrir um item"
                aria-controls="authoring-tools"
                aria-expanded={authoringToolsOpen}
                onClick={() => setAuthoringToolsOpen((open) => !open)}
              >
                {authoringToolsOpen
                  ? "Fechar ferramentas"
                  : "Criar ou abrir um item"}
              </button>
            </div>
          </section>

          <div
            className="authoring-tools"
            id="authoring-tools"
            hidden={!authoringToolsOpen}
          >
            <section className="draft-panel" aria-labelledby="draft-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Autoria assistida</p>
                  <h2 id="draft-title">Criar rascunho sintético</h2>
                </div>
                <span className="status-pill status-pill--warning">
                  RASCUNHO · sem publicação
                </span>
              </div>
              <p className="intro">
                Preencha um item de trabalho com caso fictício. O servidor
                deriva a identidade, cria a projeção pública e mantém o conteúdo
                bloqueado até revisão clínica humana.
              </p>
              <form
                className="draft-form"
                onSubmit={(event) => void createDraft(event)}
              >
                <div className="draft-grid">
                  <label htmlFor="draft-scope-id">
                    Escopo autorizado
                    <select
                      id="draft-scope-id"
                      value={scopeId}
                      onChange={(event) => onScopeChange(event.target.value)}
                      required
                      disabled={busy || sessionScopes.length === 0}
                    >
                      <option value="">Selecione um escopo</option>
                      {sessionScopes.map((sessionScopeId, index) => (
                        <option key={sessionScopeId} value={sessionScopeId}>
                          {scopeOptionLabel(sessionScopeId, index)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="draft-module-id">
                    Módulo
                    <select
                      id="draft-module-id"
                      value={draftModuleId}
                      onChange={(event) => {
                        const nextModuleId = event.target.value;
                        setDraftModuleId(nextModuleId);
                        if (/^M\d{2}-OBJ-\d{2}$/u.test(draftObjectiveId)) {
                          setDraftObjectiveId(`${nextModuleId}-OBJ-01`);
                        }
                      }}
                      required
                      disabled={busy}
                    >
                      {authoringModuleOptions.map((moduleId) => (
                        <option key={moduleId} value={moduleId}>
                          {moduleId}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="draft-session-id">
                    Sessão
                    <select
                      id="draft-session-id"
                      value={draftSessionSuffix}
                      onChange={(event) =>
                        setDraftSessionSuffix(event.target.value)
                      }
                      required
                      disabled={busy}
                    >
                      {authoringSessionOptions.map((sessionSuffix) => (
                        <option key={sessionSuffix} value={sessionSuffix}>
                          {draftModuleId}-{sessionSuffix}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="draft-objective-id">
                    Objetivo curricular
                    <input
                      id="draft-objective-id"
                      value={draftObjectiveId}
                      onChange={(event) =>
                        setDraftObjectiveId(event.target.value)
                      }
                      required
                      maxLength={128}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label htmlFor="draft-item-title">
                  Título do item
                  <input
                    id="draft-item-title"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    required
                    maxLength={1000}
                    disabled={busy}
                  />
                </label>
                <label htmlFor="draft-item-prompt">
                  Enunciado
                  <textarea
                    id="draft-item-prompt"
                    value={draftPrompt}
                    onChange={(event) => setDraftPrompt(event.target.value)}
                    required
                    maxLength={10000}
                    rows={4}
                    disabled={busy}
                  />
                </label>
                <fieldset className="draft-fieldset">
                  <legend>Alternativas sintéticas</legend>
                  <div className="draft-choice-grid">
                    <label htmlFor="draft-choice-a">
                      A
                      <input
                        id="draft-choice-a"
                        value={draftChoiceA}
                        onChange={(event) =>
                          setDraftChoiceA(event.target.value)
                        }
                        required
                        maxLength={2000}
                        disabled={busy}
                      />
                    </label>
                    <label htmlFor="draft-choice-b">
                      B
                      <input
                        id="draft-choice-b"
                        value={draftChoiceB}
                        onChange={(event) =>
                          setDraftChoiceB(event.target.value)
                        }
                        required
                        maxLength={2000}
                        disabled={busy}
                      />
                    </label>
                  </div>
                  <div
                    className="draft-radio-row"
                    aria-label="Alternativa correta"
                  >
                    <span className="field-label">Chave técnica</span>
                    <label
                      className="draft-radio-label"
                      htmlFor="draft-correct-a"
                    >
                      <input
                        id="draft-correct-a"
                        type="radio"
                        name="draft-correct-choice"
                        value="a"
                        checked={draftCorrectChoiceId === "a"}
                        onChange={(event) =>
                          setDraftCorrectChoiceId(event.target.value)
                        }
                        disabled={busy}
                      />
                      A
                    </label>
                    <label
                      className="draft-radio-label"
                      htmlFor="draft-correct-b"
                    >
                      <input
                        id="draft-correct-b"
                        type="radio"
                        name="draft-correct-choice"
                        value="b"
                        checked={draftCorrectChoiceId === "b"}
                        onChange={(event) =>
                          setDraftCorrectChoiceId(event.target.value)
                        }
                        disabled={busy}
                      />
                      B
                    </label>
                  </div>
                </fieldset>
                <label htmlFor="draft-feedback">
                  Feedback formativo interno
                  <textarea
                    id="draft-feedback"
                    value={draftFeedback}
                    onChange={(event) => setDraftFeedback(event.target.value)}
                    required
                    maxLength={10000}
                    rows={3}
                    disabled={busy}
                  />
                </label>
                <div className="draft-grid">
                  <label htmlFor="draft-source-code">
                    Código de fonte interna
                    <select
                      id="draft-source-code"
                      value={draftSourceCode}
                      onChange={(event) =>
                        setDraftSourceCode(event.target.value)
                      }
                      required
                      disabled={busy}
                    >
                      {authoringSourceOptions.map((sourceCode) => (
                        <option key={sourceCode} value={sourceCode}>
                          {sourceCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="draft-source-locator">
                    Localizador interno
                    <input
                      id="draft-source-locator"
                      value={draftSourceLocator}
                      onChange={(event) =>
                        setDraftSourceLocator(event.target.value)
                      }
                      required
                      maxLength={512}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label
                  className="draft-checkbox-label"
                  htmlFor="draft-critical"
                >
                  <input
                    id="draft-critical"
                    type="checkbox"
                    checked={draftCritical}
                    onChange={(event) => setDraftCritical(event.target.checked)}
                    disabled={busy}
                  />
                  Marcar como objetivo crítico para revisão humana
                </label>
                <div className="draft-form-footer">
                  <p className="field-help">
                    A chave de idempotência fica no cliente apenas para repetir
                    com segurança uma tentativa interrompida.{" "}
                    {session.recoveryContext === undefined
                      ? "A recuperação após recarga está indisponível nesta sessão. Se o envio falhar, tente novamente antes de fechar esta tela."
                      : "Se o envio falhar, a tentativa pode ser recuperada nesta aba pela mesma conta, sessão e escopo."}
                  </p>
                  {draftConflict ? (
                    <button
                      type="button"
                      className="button-link"
                      onClick={() => {
                        clearDraftRecovery();
                        setDraftIdempotencyKey("");
                        setDraftConflict(false);
                        setError(null);
                      }}
                    >
                      Iniciar nova tentativa
                    </button>
                  ) : null}
                  <button type="submit" disabled={busy || scopeId.length === 0}>
                    {busy ? "Salvando rascunho…" : "Salvar rascunho"}
                  </button>
                </div>
              </form>
            </section>
            <section className="hero-card" aria-labelledby="authoring-title">
              <div className="hero-copy">
                <p className="eyebrow">Registro editorial</p>
                <h2 id="authoring-title">Abrir item autoral</h2>
                <p>
                  Esta superfície exige sessão autorizada de autoria ou revisão
                  clínica. Gabaritos, fontes e rubricas nunca são projetados
                  para o participante.
                </p>
              </div>
              <div className="access-form">
                <label htmlFor="content-id">Content ID</label>
                <p id="content-id-help" className="field-help">
                  Informe o identificador interno recebido da equipe editorial.
                </p>
                <input
                  id="content-id"
                  name="contentId"
                  aria-describedby="content-id-help"
                  value={contentId}
                  onChange={(event) => setContentId(event.target.value)}
                />
                <label htmlFor="content-version">Versão</label>
                <input
                  id="content-version"
                  name="version"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void loadRecord(contentId, version, scopeId)}
                  disabled={busy || scopeId.length === 0}
                >
                  {busy ? "Carregando…" : "Carregar autoria"}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="review-layout" aria-labelledby="review-title">
          <div className="review-main">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {record.moduleId} · {record.sessionId}
                </p>
                <h2 id="review-title">{record.item.title}</h2>
              </div>
              <span className="status-pill status-pill--warning">
                {record.contentStatus}
              </span>
            </div>
            <p className="intro">{record.item.prompt}</p>
            {record.item.choices !== undefined ? (
              <div className="review-card">
                <h2>Alternativas</h2>
                {record.item.choices.map((choice) => (
                  <p key={choice.id}>
                    <strong>{choice.label})</strong> {choice.text}
                    {record.item.correctChoiceIds?.includes(choice.id)
                      ? " · gabarito"
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}
            {record.item.rubric !== undefined ? (
              <div className="review-card">
                <h2>Rubrica</h2>
                {record.item.rubric.dimensions.map((dimension) => (
                  <p key={dimension.id}>
                    <strong>{dimension.label}</strong> · {dimension.description}{" "}
                    · {dimension.maxPoints} pontos
                  </p>
                ))}
                <p>Nota mínima: {record.item.rubric.passScore}</p>
              </div>
            ) : null}
            {record.availableActions.requestAdjustments ||
            record.availableActions.approveClinically ? (
              <div>
                <label htmlFor="review-rationale">
                  Justificativa da decisão
                </label>
                <p className="field-help" id="review-rationale-help">
                  Descreva a fundamentação da sua decisão e, ao solicitar
                  ajustes, indique o que precisa ser corrigido.
                </p>
                <textarea
                  id="review-rationale"
                  value={reviewRationale}
                  onChange={(event) => {
                    setReviewRationale(event.target.value);
                    setRationaleError(null);
                  }}
                  required
                  maxLength={10000}
                  rows={4}
                  disabled={busy}
                  aria-invalid={rationaleError !== null}
                  aria-describedby={`review-rationale-help${rationaleError === null ? "" : " review-rationale-error"}`}
                />
                {rationaleError !== null ? (
                  <p
                    className="feedback error"
                    id="review-rationale-error"
                    role="alert"
                  >
                    {rationaleError}
                  </p>
                ) : null}
                <div className="review-actions">
                  {record.availableActions.requestAdjustments ? (
                    <button
                      type="button"
                      onClick={() => void review("SOLICITAR_AJUSTES")}
                      disabled={busy}
                    >
                      Solicitar ajustes
                    </button>
                  ) : null}
                  {record.availableActions.approveClinically ? (
                    <button
                      type="button"
                      onClick={() => void review("APROVAR_CLINICAMENTE")}
                      disabled={busy || !record.preflight.technicalChecksPassed}
                    >
                      Aprovar clinicamente
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="field-help">
                Esta sessão pode consultar a autoria, mas não registrar
                decisões.
              </p>
            )}
          </div>
          <aside className="privacy-card" aria-label="Governança editorial">
            <p className="eyebrow">Governança</p>
            <h2>Pré-voo técnico</h2>
            <p>
              {record.preflight.technicalChecksPassed
                ? "Completo"
                : "Incompleto"}
            </p>
            <p>Objetivo: {record.objectiveId}</p>
            <p>Crítico: {record.item.critical ? "sim" : "não"}</p>
            <p>Remediação: {record.item.remediationTargetObjectiveId}</p>
            {record.latestReview !== undefined ? (
              <>
                <h3>Última decisão</h3>
                <p>
                  {record.latestReview.decision} ·{" "}
                  {record.latestReview.reviewedAt}
                </p>
                <p>{record.latestReview.rationale}</p>
              </>
            ) : null}
            <h3>Fontes internas</h3>
            {record.item.sourceRefs.map((source) => (
              <p
                className="journey-item"
                key={`${source.code}-${source.locator}`}
              >
                {source.code} · {source.locator}
              </p>
            ))}
          </aside>
        </section>
      )}

      {adjustmentReceipt !== null ? (
        <section
          className="privacy-card"
          aria-label="Decisão editorial registrada"
        >
          <h2>Decisão registrada</h2>
          <p>
            Conteúdo: {adjustmentReceipt.contentId} · versão{" "}
            {adjustmentReceipt.version}
          </p>
          <p>{adjustmentReceipt.contentStatus}</p>
          <p>
            {adjustmentReceipt.review.decision} ·{" "}
            {adjustmentReceipt.review.reviewedAt}
          </p>
          {adjustmentReceipt.review.rationale !== undefined ? (
            <p>{adjustmentReceipt.review.rationale}</p>
          ) : null}
        </section>
      ) : null}

      {error !== null ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
