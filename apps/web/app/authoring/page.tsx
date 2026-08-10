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
    readonly sourceVerification?: "VERIFICADO_AUTOMATICAMENTE" | "INVALIDO";
    readonly readyForPublication?: boolean;
  }>;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isInternalAuthoringRecord(
  value: unknown,
): value is InternalAuthoringRecord {
  if (!isRecord(value) || !isString(value.contentId)) return false;
  if (!isRecord(value.item) || !isRecord(value.preflight)) return false;
  return (
    isString(value.scopeId) &&
    typeof value.version === "number" &&
    isString(value.moduleId) &&
    isString(value.sessionId) &&
    isString(value.objectiveId) &&
    isString(value.authorId) &&
    isString(value.contentStatus) &&
    isString(value.item.title) &&
    isString(value.item.prompt) &&
    isString(value.item.feedback) &&
    typeof value.item.critical === "boolean" &&
    typeof value.preflight.technicalChecksPassed === "boolean"
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
}> {
  if (typeof window === "undefined") return { contentId: "", version: "1" };
  const params = new URLSearchParams(window.location.search);
  return {
    contentId: params.get("contentId") ?? "",
    version: params.get("version") ?? "1",
  };
}

export default function AuthoringPage() {
  const [record, setRecord] = useState<InternalAuthoringRecord | null>(null);
  const [contentId, setContentId] = useState("");
  const [version, setVersion] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const input = queryInput();
    setContentId(input.contentId);
    setVersion(input.version);
    if (input.contentId.trim().length === 0) return;
    void loadRecord(input.contentId, input.version);
  }, []);

  async function loadRecord(
    id: string,
    selectedVersion: string,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const data = await requestJson(
        `/api/v1/internal/content/${id}/versions/${selectedVersion}/authoring`,
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

  async function publish() {
    if (record === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        `/api/v1/internal/content/${record.contentId}/publish`,
        {
          method: "POST",
          body: {
            version: record.version,
            scopeId: record.scopeId,
          },
        },
      );
      if (!isInternalAuthoringRecord(data))
        throw new Error("Projeção inválida.");
      setRecord(data);
      setNotice("Fonte verificada automaticamente e conteúdo publicado.");
    } catch {
      setError("Não foi possível publicar o conteúdo verificado.");
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
          <span className="brand">Autoria e publicação</span>
        </div>
        <span className="status-pill">Acesso restrito</span>
      </header>

      {record === null ? (
        <section className="hero-card" aria-labelledby="authoring-title">
          <p className="eyebrow">Registro editorial</p>
          <h1 id="authoring-title">Abrir item autoral</h1>
          <p>
            Esta superfície exige sessão autorizada de autoria. A fonte é
            verificada automaticamente contra o registro imutável; gabaritos,
            fontes e rubricas nunca são projetados para o participante.
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
              onClick={() => void loadRecord(contentId, version)}
              disabled={busy}
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
            <div className="review-actions">
              <button
                type="button"
                onClick={() => void publish()}
                disabled={
                  busy ||
                  !record.preflight.technicalChecksPassed ||
                  record.preflight.readyForPublication === false ||
                  record.contentStatus === "PUBLICADO"
                }
              >
                Publicar conteúdo verificado
              </button>
            </div>
          </div>
          <aside className="privacy-card" aria-label="Governança editorial">
            <p className="eyebrow">Governança</p>
            <h2>Verificação automática</h2>
            <p>
              {record.preflight.technicalChecksPassed
                ? "Completo"
                : "Incompleto"}
            </p>
            <p>Objetivo: {record.objectiveId}</p>
            <p>Fonte: {record.preflight.sourceVerification ?? "PENDENTE"}</p>
            <p>Crítico: {record.item.critical ? "sim" : "não"}</p>
            <p>Remediação: {record.item.remediationTargetObjectiveId}</p>
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
