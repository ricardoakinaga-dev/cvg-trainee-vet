"use client";

import {
  isClinicalReviewQueuePage,
  isInternalAuthoringRecord,
} from "./authoring-model";
import type { ClinicalReviewQueueItem } from "./authoring-model";
import type { AuthoringPageState } from "./authoring-state";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export type ClinicalReviewDecision =
  "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";

export type AuthoringActions = Readonly<{
  readonly loadRecord: (id: string, selectedVersion: string) => Promise<void>;
  readonly loadQueue: (selectedScopeId: string, page: number) => Promise<void>;
  readonly openQueueItem: (item: ClinicalReviewQueueItem) => void;
  readonly publish: () => Promise<void>;
  readonly review: (decision: ClinicalReviewDecision) => Promise<void>;
}>;

type JsonResult = Readonly<{
  readonly response: Response;
  readonly data: unknown;
}>;

async function requestJson(
  path: string,
  init: Readonly<{ method: "GET" | "POST"; body?: unknown }>,
): Promise<unknown> {
  const result = await requestPayload(path, init);
  if (!result.response.ok || !isSuccessEnvelope(result.data)) {
    throw new Error("A operação editorial não foi concluída.");
  }
  return result.data.data;
}

async function requestPayload(
  path: string,
  init: Readonly<{ method: "GET" | "POST"; body?: unknown }>,
): Promise<JsonResult> {
  const response = await fetch(`${apiBase}${path}`, {
    method: init.method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  return { response, data: await response.json().catch(() => null) };
}

function isSuccessEnvelope(value: unknown): value is Readonly<{
  readonly success: true;
  readonly data: unknown;
}> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "success" in value &&
    value.success === true &&
    "data" in value
  );
}

async function loadRecord(
  context: AuthoringPageState,
  id: string,
  selectedVersion: string,
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  try {
    const data = await requestJson(
      `/api/v1/internal/content/${id}/versions/${selectedVersion}/authoring`,
      { method: "GET" },
    );
    if (!isInternalAuthoringRecord(data)) throw new Error("Projeção inválida.");
    context.setRecord(data);
  } catch {
    context.setError("Não foi possível carregar o registro de autoria.");
  } finally {
    context.setBusy(false);
  }
}

async function loadQueue(
  context: AuthoringPageState,
  selectedScopeId: string,
  page: number,
): Promise<void> {
  if (selectedScopeId.trim().length === 0) {
    context.setError("Informe o escopo da fila clínica.");
    return;
  }
  context.setBusy(true);
  context.setError(null);
  try {
    const query = new URLSearchParams({
      scopeId: selectedScopeId,
      page: String(page),
      per_page: "20",
      status: "PENDING",
    });
    const data = await requestJson(
      `/api/v1/internal/authoring/review-queue?${query.toString()}`,
      { method: "GET" },
    );
    if (!isClinicalReviewQueuePage(data))
      throw new Error("Fila clínica inválida.");
    context.setQueue(data);
  } catch {
    context.setError("Não foi possível carregar a fila de revisão clínica.");
  } finally {
    context.setBusy(false);
  }
}

function openQueueItem(
  context: AuthoringPageState,
  item: ClinicalReviewQueueItem,
): void {
  context.setQueue(null);
  context.setScopeId(item.scopeId);
  void loadRecord(context, item.contentId, String(item.version));
}

async function publish(context: AuthoringPageState): Promise<void> {
  if (context.record === null) return;
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const data = await requestJson(
      `/api/v1/internal/content/${context.record.contentId}/publish`,
      {
        method: "POST",
        body: {
          version: context.record.version,
          scopeId: context.record.scopeId,
        },
      },
    );
    if (!isInternalAuthoringRecord(data)) throw new Error("Projeção inválida.");
    context.setRecord(data);
    context.setNotice("Fonte verificada automaticamente e conteúdo publicado.");
  } catch {
    context.setError("Não foi possível publicar o conteúdo verificado.");
  } finally {
    context.setBusy(false);
  }
}

async function review(
  context: AuthoringPageState,
  decision: ClinicalReviewDecision,
): Promise<void> {
  if (context.record === null) return;
  if (context.rationale.trim().length === 0) {
    context.setError("Informe uma justificativa clínica antes de decidir.");
    return;
  }
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const data = await requestJson(
      `/api/v1/internal/content/${context.record.contentId}/review`,
      {
        method: "POST",
        body: {
          version: context.record.version,
          scopeId: context.record.scopeId,
          decision,
          rationale: context.rationale,
        },
      },
    );
    if (!isInternalAuthoringRecord(data)) throw new Error("Projeção inválida.");
    context.setRecord(data);
    context.setNotice(
      decision === "APROVAR_CLINICAMENTE"
        ? "Conteúdo aprovado clinicamente."
        : "Ajustes clínicos solicitados.",
    );
  } catch {
    context.setError("Não foi possível registrar a decisão clínica.");
  } finally {
    context.setBusy(false);
  }
}

export function createAuthoringActions(
  context: AuthoringPageState,
): AuthoringActions {
  return {
    loadRecord: (id, selectedVersion) =>
      loadRecord(context, id, selectedVersion),
    loadQueue: (selectedScopeId, page) =>
      loadQueue(context, selectedScopeId, page),
    openQueueItem: (item) => openQueueItem(context, item),
    publish: () => publish(context),
    review: (decision) => review(context, decision),
  };
}
