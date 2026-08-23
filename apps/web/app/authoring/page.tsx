"use client";

import { useEffect, useState } from "react";

type InternalAuthoringRecord = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly authorId: string;
  readonly contentStatus: string;
  readonly item: Readonly<{
    readonly title: string;
    readonly prompt: string;
    readonly responseMode: string;
    readonly choices?: readonly Readonly<{
      readonly id: string;
      readonly label: string;
      readonly text: string;
    }>[];
    readonly correctChoiceIds?: readonly string[];
    readonly rubric?: Readonly<{
      readonly dimensions: readonly Readonly<{
        readonly id: string;
        readonly label: string;
        readonly description: string;
        readonly maxPoints: number;
      }>[];
      readonly passScore: number;
      readonly criticalErrors: readonly string[];
    }>;
    readonly feedback: string;
    readonly critical: boolean;
    readonly remediationTargetObjectiveId: string;
    readonly sourceRefs: readonly Readonly<{
      readonly code: string;
      readonly locator: string;
      readonly updateRequired: boolean;
    }>[];
  }>;
  readonly preflight: Readonly<{
    readonly technicalChecksPassed: boolean;
    readonly readyForClinicalReview?: boolean;
    readonly readyForPublication?: boolean;
  }>;
  readonly latestReview?: Readonly<{
    readonly decision: string;
    readonly rationale: string;
    readonly reviewerId: string;
    readonly reviewedAt: string;
  }>;
  readonly availableActions: Readonly<{
    readonly requestAdjustments: boolean;
    readonly approveClinically: boolean;
  }>;
}>;

type ContentReviewQueueItem = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly authorId: string;
  readonly status: "EM_REVISAO_CLINICA" | "AJUSTES_SOLICITADOS";
  readonly preflight: Readonly<{
    readonly technicalChecksPassed: boolean;
    readonly checkedAt: string;
  }>;
  readonly latestReview?: Readonly<{
    readonly decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";
    readonly reviewedAt: string;
  }>;
  readonly canOpenAuthoring: boolean;
  readonly updatedAt: string;
  readonly nextAction: "REVISAR_CLINICAMENTE" | "AGUARDAR_REENVIO_AUTOR";
}>;

type ContentReviewQueue = Readonly<{
  readonly kind: "content_review_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: "EM_REVISAO_CLINICA" | "AJUSTES_SOLICITADOS";
    readonly limit: number;
  }>;
  readonly items: readonly ContentReviewQueueItem[];
}>;

type InternalSessionScopes = Readonly<{
  readonly kind: "internal_session_scopes";
  readonly scopes: readonly string[];
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isUuid(value: unknown): value is string {
  return (
    isString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function isInternalAuthoringRecord(
  value: unknown,
): value is InternalAuthoringRecord {
  if (
    !isRecord(value) ||
    !isString(value.contentId) ||
    !isRecord(value.availableActions) ||
    !hasOnlyKeys(value, [
      "contentId",
      "version",
      "scopeId",
      "moduleId",
      "sessionId",
      "objectiveId",
      "authorId",
      "contentStatus",
      "item",
      "preflight",
      "latestReview",
      "availableActions",
    ]) ||
    !hasOnlyKeys(value.availableActions, [
      "requestAdjustments",
      "approveClinically",
    ])
  )
    return false;
  if (!isRecord(value.item) || !isRecord(value.preflight)) return false;
  return (
    isUuid(value.contentId) &&
    isUuid(value.scopeId) &&
    typeof value.version === "number" &&
    isString(value.moduleId) &&
    isString(value.sessionId) &&
    isString(value.objectiveId) &&
    isUuid(value.authorId) &&
    isString(value.contentStatus) &&
    isString(value.item.title) &&
    isString(value.item.prompt) &&
    isString(value.item.feedback) &&
    typeof value.item.critical === "boolean" &&
    typeof value.preflight.technicalChecksPassed === "boolean" &&
    typeof value.availableActions.requestAdjustments === "boolean" &&
    typeof value.availableActions.approveClinically === "boolean"
  );
}

function hasOnlyKeys(value: ApiRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isContentReviewQueueItem(
  value: unknown,
): value is ContentReviewQueueItem {
  if (!isRecord(value) || !isRecord(value.preflight)) return false;
  if (
    !hasOnlyKeys(value, [
      "contentId",
      "version",
      "scopeId",
      "moduleId",
      "sessionId",
      "title",
      "authorId",
      "status",
      "preflight",
      "latestReview",
      "canOpenAuthoring",
      "updatedAt",
      "nextAction",
    ]) ||
    !isString(value.contentId) ||
    !isString(value.scopeId) ||
    !isString(value.moduleId) ||
    !isString(value.sessionId) ||
    !isString(value.title) ||
    !isString(value.authorId) ||
    !isString(value.updatedAt) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 1 ||
    (value.status !== "EM_REVISAO_CLINICA" &&
      value.status !== "AJUSTES_SOLICITADOS") ||
    (value.nextAction !== "REVISAR_CLINICAMENTE" &&
      value.nextAction !== "AGUARDAR_REENVIO_AUTOR") ||
    typeof value.preflight.technicalChecksPassed !== "boolean" ||
    !isString(value.preflight.checkedAt) ||
    typeof value.canOpenAuthoring !== "boolean"
  ) {
    return false;
  }
  if (value.latestReview !== undefined) {
    if (
      !isRecord(value.latestReview) ||
      !hasOnlyKeys(value.latestReview, ["decision", "reviewedAt"]) ||
      !isString(value.latestReview.reviewedAt) ||
      (value.latestReview.decision !== "APROVAR_CLINICAMENTE" &&
        value.latestReview.decision !== "SOLICITAR_AJUSTES")
    ) {
      return false;
    }
  }
  return true;
}

function isContentReviewQueue(value: unknown): value is ContentReviewQueue {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;
  if (
    !hasOnlyKeys(value, [
      "kind",
      "scopeId",
      "generatedAt",
      "filters",
      "items",
    ]) ||
    value.kind !== "content_review_queue" ||
    !isString(value.scopeId) ||
    !isString(value.generatedAt) ||
    !isRecord(value.filters) ||
    !hasOnlyKeys(value.filters, ["scopeId", "status", "limit"]) ||
    value.filters.scopeId !== value.scopeId ||
    typeof value.filters.limit !== "number" ||
    !Number.isInteger(value.filters.limit) ||
    value.filters.limit < 1 ||
    value.filters.limit > 100 ||
    !value.items.every(isContentReviewQueueItem)
  ) {
    return false;
  }
  return true;
}

function isInternalSessionScopes(
  value: unknown,
): value is InternalSessionScopes {
  if (!isRecord(value) || !Array.isArray(value.scopes)) return false;
  return (
    hasOnlyKeys(value, ["kind", "scopes"]) &&
    value.kind === "internal_session_scopes" &&
    value.scopes.every(isUuid)
  );
}

async function requestJson(
  path: string,
  init: Readonly<{ method: "GET" | "POST"; body?: unknown }>,
): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, {
    method: init.method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || payload.success !== true) {
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

export default function AuthoringPage() {
  const [record, setRecord] = useState<InternalAuthoringRecord | null>(null);
  const [queue, setQueue] = useState<ContentReviewQueue | null>(null);
  const [sessionScopes, setSessionScopes] = useState<readonly string[]>([]);
  const [contentId, setContentId] = useState("");
  const [version, setVersion] = useState("1");
  const [scopeId, setScopeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const input = queryInput();
    setContentId(input.contentId);
    setVersion(input.version);
    void initialize(input);
  }, []);

  async function initialize(
    input: Readonly<{
      readonly contentId: string;
      readonly version: string;
      readonly scopeId: string;
    }>,
  ): Promise<void> {
    const scopes = await loadSessionScopes();
    const selectedScopeId = scopes.includes(input.scopeId)
      ? input.scopeId
      : (scopes[0] ?? "");
    setScopeId(selectedScopeId);
    if (selectedScopeId.length > 0) {
      await loadQueue(selectedScopeId);
    }
    if (input.contentId.trim().length > 0 && selectedScopeId.length > 0) {
      await loadRecord(input.contentId, input.version, selectedScopeId);
    }
  }

  async function loadSessionScopes(): Promise<readonly string[]> {
    try {
      const data = await requestJson("/api/v1/internal/session/scopes", {
        method: "GET",
      });
      if (!isInternalSessionScopes(data)) throw new Error("Projeção inválida.");
      setSessionScopes(data.scopes);
      return data.scopes;
    } catch {
      setSessionScopes([]);
      setQueue(null);
      setError("Não foi possível carregar os escopos da sessão interna.");
      return [];
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
      setRecord(data);
    } catch {
      setError("Não foi possível carregar o registro de autoria.");
    } finally {
      setBusy(false);
    }
  }

  async function review(
    decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES",
  ) {
    if (record === null) return;
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
            rationale:
              decision === "APROVAR_CLINICAMENTE"
                ? "Revisão clínica concluída na superfície interna."
                : "Ajustes clínicos solicitados na superfície interna.",
          },
        },
      );
      if (!isInternalAuthoringRecord(data))
        throw new Error("Projeção inválida.");
      setRecord(data);
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
        <span className="status-pill">Acesso restrito</span>
      </header>

      <section className="queue-panel" aria-labelledby="queue-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fila operacional</p>
            <h1 id="queue-title">Revisão clínica pendente</h1>
          </div>
          <span className="status-pill">Somente leitura</span>
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
            onChange={(event) => setScopeId(event.target.value)}
            disabled={busy || sessionScopes.length === 0}
          >
            <option value="">Selecione um escopo</option>
            {sessionScopes.map((sessionScopeId) => (
              <option key={sessionScopeId} value={sessionScopeId}>
                {sessionScopeId}
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
        <section className="hero-card" aria-labelledby="authoring-title">
          <p className="eyebrow">Registro editorial</p>
          <h1 id="authoring-title">Abrir item autoral</h1>
          <p>
            Esta superfície exige sessão autorizada de autoria ou revisão
            clínica. Gabaritos, fontes e rubricas nunca são projetados para o
            participante.
          </p>
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
      ) : (
        <section className="review-layout" aria-labelledby="review-title">
          <div className="review-main">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {record.moduleId} · {record.sessionId}
                </p>
                <h1 id="review-title">{record.item.title}</h1>
              </div>
              <span className="status-pill">{record.contentStatus}</span>
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
