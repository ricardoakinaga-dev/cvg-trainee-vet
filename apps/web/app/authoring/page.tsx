"use client";

import { type FormEvent, useEffect, useState } from "react";

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

type ApiRecord = Readonly<Record<string, unknown>>;
const draftRecoveryStorageKey = "cvg-authoring-draft-recovery-v1";

type DraftRecovery = Readonly<{
  readonly idempotencyKey: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly draftSessionSuffix: string;
  readonly draftObjectiveId: string;
  readonly draftTitle: string;
  readonly draftPrompt: string;
  readonly draftChoiceA: string;
  readonly draftChoiceB: string;
  readonly draftCorrectChoiceId: string;
  readonly draftFeedback: string;
  readonly draftSourceCode: string;
  readonly draftSourceLocator: string;
  readonly draftCritical: boolean;
}>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function readDraftRecovery(): DraftRecovery | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(draftRecoveryStorageKey) ?? "null",
    );
    if (!isRecord(parsed) || parsed.draftCritical === undefined) return null;
    const stringFields = [
      "idempotencyKey",
      "scopeId",
      "moduleId",
      "draftSessionSuffix",
      "draftObjectiveId",
      "draftTitle",
      "draftPrompt",
      "draftChoiceA",
      "draftChoiceB",
      "draftCorrectChoiceId",
      "draftFeedback",
      "draftSourceCode",
      "draftSourceLocator",
    ] as const;
    if (
      !stringFields.every((field) => isString(parsed[field])) ||
      typeof parsed.draftCritical !== "boolean"
    ) {
      return null;
    }
    const stringValue = (field: (typeof stringFields)[number]): string =>
      parsed[field] as string;
    return Object.freeze({
      idempotencyKey: stringValue("idempotencyKey"),
      scopeId: stringValue("scopeId"),
      moduleId: stringValue("moduleId"),
      draftSessionSuffix: stringValue("draftSessionSuffix"),
      draftObjectiveId: stringValue("draftObjectiveId"),
      draftTitle: stringValue("draftTitle"),
      draftPrompt: stringValue("draftPrompt"),
      draftChoiceA: stringValue("draftChoiceA"),
      draftChoiceB: stringValue("draftChoiceB"),
      draftCorrectChoiceId: stringValue("draftCorrectChoiceId"),
      draftFeedback: stringValue("draftFeedback"),
      draftSourceCode: stringValue("draftSourceCode"),
      draftSourceLocator: stringValue("draftSourceLocator"),
      draftCritical: parsed.draftCritical,
    });
  } catch {
    return null;
  }
}

function writeDraftRecovery(recovery: DraftRecovery): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      draftRecoveryStorageKey,
      JSON.stringify(recovery),
    );
  } catch {
    // Session storage is an optional recovery aid; the server remains the authority.
  }
}

function clearDraftRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftRecoveryStorageKey);
  } catch {
    // Ignore storage restrictions; the in-memory retry remains available.
  }
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
  if (!isRecord(payload) || payload.success !== true) {
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

function newDraftIdempotencyKey(): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `authoring-ui-${randomId}`;
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
  const [record, setRecord] = useState<InternalAuthoringRecord | null>(null);
  const [queue, setQueue] = useState<ContentReviewQueue | null>(null);
  const [sessionScopes, setSessionScopes] = useState<readonly string[]>([]);
  const [contentId, setContentId] = useState("");
  const [version, setVersion] = useState("1");
  const [scopeId, setScopeId] = useState("");
  const [authoringToolsOpen, setAuthoringToolsOpen] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeLoadError, setScopeLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    const recovery = readDraftRecovery();
    if (recovery !== null) {
      setDraftIdempotencyKey(recovery.idempotencyKey);
      setScopeId(recovery.scopeId);
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
    const initialScopeId =
      input.scopeId.length > 0 ? input.scopeId : (recovery?.scopeId ?? "");
    setScopeId(initialScopeId);
    void initialize({ ...input, scopeId: initialScopeId });
  }, []);

  useEffect(() => {
    if (draftIdempotencyKey.length === 0) return;
    writeDraftRecovery({
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
  ]);

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
    setScopeLoading(true);
    setScopeLoadError(null);
    setError(null);
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
      const message = "Não foi possível carregar os escopos da sessão interna.";
      setScopeLoadError(message);
      return [];
    } finally {
      setScopeLoading(false);
    }
  }

  async function retrySessionScopes(): Promise<void> {
    const input = queryInput();
    const preferredScopeId = input.scopeId.length > 0 ? input.scopeId : scopeId;
    const scopes = await loadSessionScopes();
    const selectedScopeId = scopes.includes(preferredScopeId)
      ? preferredScopeId
      : (scopes[0] ?? "");
    setScopeId(selectedScopeId);
    if (selectedScopeId.length > 0) await loadQueue(selectedScopeId);
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
    writeDraftRecovery({
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
      setRecord(data);
      setNotice(
        "Rascunho criado. O pré-voo técnico não publica nem aprova o conteúdo.",
      );
      clearDraftRecovery();
      setDraftIdempotencyKey("");
    } catch (caught) {
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

  if (scopeLoading || scopeLoadError !== null || sessionScopes.length === 0) {
    return (
      <main className="shell" id="main-content" tabIndex={-1}>
        <section
          className="experience-panel dashboard-message internal-access-gate"
          data-testid="internal-access-gate"
          role={scopeLoading ? "status" : "alert"}
          aria-live="polite"
        >
          <h1 className="access-gate-title">
            {scopeLoading
              ? "Validando acesso restrito"
              : scopeLoadError !== null
                ? "Sessão interna necessária"
                : "Nenhum escopo autorizado"}
          </h1>
          <span>
            {scopeLoading
              ? "Consultando a autorização server-side da sessão…"
              : (scopeLoadError ??
                "Esta conta não possui escopo para a superfície de autoria.")}
          </span>
          {scopeLoadError !== null ? (
            <button
              type="button"
              onClick={() => void retrySessionScopes()}
              disabled={scopeLoading}
            >
              Tentar carregar novamente
            </button>
          ) : null}
        </section>
      </main>
    );
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
        {scopeLoading ? (
          <p className="dashboard-empty" role="status">
            Carregando escopos autorizados…
          </p>
        ) : null}
        {scopeLoadError !== null ? (
          <div className="feedback error" role="alert">
            <p>{scopeLoadError}</p>
            <button
              type="button"
              onClick={() => void retrySessionScopes()}
              disabled={scopeLoading}
            >
              Tentar carregar novamente
            </button>
          </div>
        ) : null}
        {!scopeLoading &&
        scopeLoadError === null &&
        sessionScopes.length === 0 ? (
          <p className="dashboard-empty" role="status">
            Nenhum escopo autorizado foi disponibilizado para esta sessão.
          </p>
        ) : null}
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
                      onChange={(event) => setScopeId(event.target.value)}
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
                    com segurança uma tentativa interrompida. Em caso de timeout
                    ou recarga, os dados da tentativa permanecem nesta aba para
                    o reenvio seguro da mesma operação.
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
