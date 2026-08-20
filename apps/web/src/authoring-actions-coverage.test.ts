import { describe, expect, it, vi } from "vitest";

import { createAuthoringActions } from "../app/authoring-actions.js";
import type { AuthoringPageState } from "../app/authoring-state.js";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";

const record = {
  contentId,
  version: 1,
  scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId,
  contentStatus: "AUTOVERIFICADO",
  item: {
    title: "Prioridade sintética",
    prompt: "Escolha a próxima ação segura.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar e reavaliar." },
      { id: "b", label: "B", text: "Aguardar sem meta." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Defina uma meta.",
    critical: true,
    remediationTargetObjectiveId: "M02-OBJ-01",
    sourceRefs: [
      {
        code: "BOOK_ETTINGER_9E",
        locator: "capítulo 123",
        updateRequired: false,
      },
    ],
    participant: {
      id: contentId,
      ordinal: 1,
      kind: "QUESTAO",
      title: "Prioridade sintética",
      prompt: "Escolha a próxima ação segura.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Priorizar e reavaliar." },
        { id: "b", label: "B", text: "Aguardar sem meta." },
      ],
      selectionMode: "SINGLE",
    },
  },
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    readyForPublication: true,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: false,
    },
    checkedAt: "2026-08-16T12:00:00.000Z",
  },
} as const;

const queue = {
  items: [
    {
      contentId,
      version: 1,
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      authorId,
      contentStatus: "PROJECAO_VERIFICADA",
      reviewStatus: "PENDING",
      technicalChecksPassed: true,
      latestReview: null,
    },
  ],
  page: 1,
  perPage: 20,
  total: 1,
} as const;

function response(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as Response;
}

function context(overrides: Partial<AuthoringPageState> = {}) {
  return {
    record,
    contentId,
    version: "1",
    scopeId,
    queue,
    rationale: "Justificativa sintética.",
    busy: false,
    error: null,
    notice: null,
    setRecord: vi.fn(),
    setContentId: vi.fn(),
    setVersion: vi.fn(),
    setScopeId: vi.fn(),
    setQueue: vi.fn(),
    setRationale: vi.fn(),
    setBusy: vi.fn(),
    setError: vi.fn(),
    setNotice: vi.fn(),
    ...overrides,
  } as unknown as AuthoringPageState;
}

describe("authoring actions production coverage", () => {
  it("loads records and paginated clinical queues with bounded errors", async () => {
    const state = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ success: true, data: record }))
        .mockResolvedValueOnce(response({ success: true, data: queue })),
    );
    const actions = createAuthoringActions(state);
    await actions.loadRecord(contentId, "1");
    await actions.loadQueue(scopeId, 1);
    expect(state.setRecord).toHaveBeenCalledWith(record);
    expect(state.setQueue).toHaveBeenCalledWith(queue);

    await actions.loadQueue(" ", 1);
    expect(state.setError).toHaveBeenCalledWith(
      "Informe o escopo da fila clínica.",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await actions.loadRecord(contentId, "1");
    await actions.loadQueue(scopeId, 2);
    expect(state.setError).toHaveBeenCalledWith(
      "Não foi possível carregar a fila de revisão clínica.",
    );
  });

  it("opens queue items, publishes and records both clinical decisions", async () => {
    const openState = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: true, data: record })),
    );
    createAuthoringActions(openState).openQueueItem(queue.items[0]);
    await vi.waitFor(() =>
      expect(openState.setRecord).toHaveBeenCalledWith(record),
    );
    expect(openState.setQueue).toHaveBeenCalledWith(null);

    const state = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: true, data: record })),
    );
    const actions = createAuthoringActions(state);
    await actions.publish();
    await actions.review("APROVAR_CLINICAMENTE");
    await actions.review("SOLICITAR_AJUSTES");
    expect(state.setRecord).toHaveBeenCalledWith(record);
    expect(state.setNotice).toHaveBeenCalledWith(
      "Ajustes clínicos solicitados.",
    );

    const emptyState = context({ record: null });
    const emptyActions = createAuthoringActions(emptyState);
    await emptyActions.publish();
    await emptyActions.review("APROVAR_CLINICAMENTE");
    expect(emptyState.setError).not.toHaveBeenCalled();

    const noRationaleState = context({ rationale: " ", record });
    await createAuthoringActions(noRationaleState).review(
      "APROVAR_CLINICAMENTE",
    );
    expect(noRationaleState.setError).toHaveBeenCalledWith(
      "Informe uma justificativa clínica antes de decidir.",
    );

    const invalidState = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await createAuthoringActions(invalidState).publish();
    expect(invalidState.setError).toHaveBeenCalledWith(
      "Não foi possível publicar o conteúdo verificado.",
    );
    vi.unstubAllGlobals();
  });
});
