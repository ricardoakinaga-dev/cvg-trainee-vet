import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import AuthoringPage from "../app/authoring/page";
import { isAdjustmentReceipt } from "../app/authoring/authoring-contracts";

const scopeId = "22222222-2222-4222-8222-222222222222";
const otherScopeId = "55555555-5555-4555-8555-555555555555";
const recoveryContext = {
  principalId: "33333333-3333-4333-8333-333333333333",
  sessionBinding: "66666666-6666-4666-8666-666666666666",
};
const recoveryKey = "cvg-authoring-draft-recovery-v1";

function seedRecovery(overrides: Record<string, unknown> = {}) {
  sessionStorage.setItem(
    recoveryKey,
    JSON.stringify({
      ...recoveryContext,
      idempotencyKey: "authoring-ui-synthetic-retry",
      scopeId,
      moduleId: "M02",
      draftSessionSuffix: "S1",
      draftObjectiveId: "M02-OBJ-01",
      draftTitle: "Rascunho privado sintético",
      draftPrompt: "Enunciado privado sintético",
      draftChoiceA: "Alternativa privada sintética A",
      draftChoiceB: "Alternativa privada sintética B",
      draftCorrectChoiceId: "b",
      draftFeedback: "Feedback privado sintético",
      draftSourceCode: "F-03",
      draftSourceLocator: "Localizador privado sintético",
      draftCritical: true,
      ...overrides,
    }),
  );
}

function scopedFetch(context: unknown = recoveryContext, scopes = [scopeId]) {
  const base = authoringFetch();
  return vi.fn<typeof fetch>(async (input, init) => {
    if (String(input) === "/api/v1/internal/session/scopes") {
      return successResponse({
        kind: "internal_session_scopes",
        scopes,
        recoveryContext: context,
      });
    }
    if (String(input).startsWith("/api/v1/internal/content/review-queue?")) {
      const selected = new URL(
        String(input),
        window.location.origin,
      ).searchParams.get("scopeId");
      return successResponse({
        kind: "content_review_queue",
        scopeId: selected,
        generatedAt: "2026-10-03T00:00:00.000Z",
        filters: { scopeId: selected, limit: 50 },
        items: [],
      });
    }
    return base(input, init);
  });
}

beforeEach(() => {
  sessionStorage.clear();
});

function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: { request_id: "browser-test" },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function unavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: "synthetic_unavailable", message: "Synthetic fixture." },
    }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "synthetic_forbidden",
        message: "synthetic_internal_detail_must_not_reach_the_UI",
      },
    }),
    { status: 403, headers: { "content-type": "application/json" } },
  );
}

function authoringFetch() {
  return vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/internal/session/scopes") {
      return successResponse({
        kind: "internal_session_scopes",
        scopes: [scopeId],
      });
    }
    if (path.startsWith("/api/v1/internal/content/review-queue?")) {
      return successResponse({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-10-02T00:00:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [],
      });
    }
    return unavailableResponse();
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, document.title, "/");
});

it("loads the authorized review queue and opens the draft tools on demand", async () => {
  window.history.replaceState({}, document.title, "/authoring");
  const fetchMock = authoringFetch();
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<AuthoringPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Revisão clínica pendente" }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Nenhum item aguarda revisão."))
    .toBeVisible();

  const toolsToggle = screen.getByRole("button", {
    name: "Criar ou abrir um item",
  });
  await expect.element(toolsToggle).toHaveAttribute("aria-expanded", "false");
  await toolsToggle.click();
  await expect
    .element(screen.getByRole("heading", { name: "Criar rascunho sintético" }))
    .toBeVisible();
  await expect.element(toolsToggle).toHaveAttribute("aria-expanded", "true");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("opens a scoped review record without exposing queue author identity or decisions", async () => {
  const contentId = "11111111-1111-4111-8111-111111111111";
  const authorId = "33333333-3333-4333-8333-333333333333";
  const requests: { path: string; init?: RequestInit }[] = [];
  const queueItem = {
    contentId,
    version: 1,
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    title: "Item sintético na fila",
    authorId,
    status: "EM_REVISAO_CLINICA",
    preflight: {
      technicalChecksPassed: true,
      checkedAt: "2026-10-02T08:00:00.000Z",
    },
    latestReview: {
      decision: "SOLICITAR_AJUSTES",
      reviewedAt: "2026-10-01T08:00:00.000Z",
    },
    canOpenAuthoring: true,
    updatedAt: "2026-10-02T08:15:00.000Z",
    nextAction: "REVISAR_CLINICAMENTE",
  };
  const authoringRecord = {
    contentId,
    version: 1,
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    objectiveId: "M02-OBJ-01",
    authorId,
    contentStatus: "EM_REVISAO_CLINICA",
    item: {
      title: "Prioridade clínica sintética",
      prompt: "Escolha uma próxima ação para o cenário fictício.",
      responseMode: "CHOICE",
      choices: [
        { id: "safe", label: "A", text: "Priorizar e reavaliar." },
        { id: "wait", label: "B", text: "Aguardar sem meta." },
      ],
      correctChoiceIds: ["safe"],
      feedback: "Defina um prazo e reavalie.",
      critical: false,
      remediationTargetObjectiveId: "M02-OBJ-01",
      sourceRefs: [
        {
          code: "SYNTHETIC-REF",
          locator: "fixture-only",
          updateRequired: true,
        },
      ],
    },
    preflight: {
      technicalChecksPassed: true,
      readyForClinicalReview: true,
      readyForPublication: false,
    },
    availableActions: {
      requestAdjustments: false,
      approveClinically: false,
    },
  };
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    if (path === "/api/v1/internal/session/scopes") {
      return successResponse({
        kind: "internal_session_scopes",
        scopes: [scopeId],
      });
    }
    if (path.startsWith("/api/v1/internal/content/review-queue?")) {
      return successResponse({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-10-02T08:30:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [queueItem],
      });
    }
    if (
      path ===
      `/api/v1/internal/content/${contentId}/versions/1/authoring?scopeId=${scopeId}`
    ) {
      return successResponse(authoringRecord);
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(
    {},
    document.title,
    `/authoring?contentId=${contentId}&version=1&scopeId=${scopeId}`,
  );

  const screen = await render(<AuthoringPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Revisão clínica pendente" }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Item sintético na fila"))
    .toBeVisible();
  await expect
    .element(
      screen.getByText(
        "Última decisão: SOLICITAR_AJUSTES · 2026-10-01T08:00:00.000Z",
      ),
    )
    .toBeVisible();
  await expect
    .element(
      screen.getByRole("heading", { name: "Prioridade clínica sintética" }),
    )
    .toBeVisible();
  await expect.element(screen.getByText("gabarito")).toBeVisible();
  await expect
    .element(
      screen.getByText(
        "Esta sessão pode consultar a autoria, mas não registrar decisões.",
      ),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: "Abrir revisão" }))
    .toHaveAttribute(
      "href",
      `/authoring?contentId=${contentId}&version=1&scopeId=${scopeId}`,
    );
  const queueRequest = requests.find((request) =>
    request.path.startsWith("/api/v1/internal/content/review-queue?"),
  );
  expect(queueRequest?.init?.credentials).toBe("include");
  const queueUrl = new URL(queueRequest?.path ?? "", "http://localhost");
  expect(queueUrl.searchParams.get("scopeId")).toBe(scopeId);
  expect(queueUrl.searchParams.get("limit")).toBe("50");
  const recordRequest = requests.find((request) =>
    request.path.includes(
      `/internal/content/${contentId}/versions/1/authoring?`,
    ),
  );
  expect(recordRequest?.init?.credentials).toBe("include");
  expect(recordRequest?.init?.method).toBe("GET");
  expect(requests.some((request) => request.init?.method === "POST")).toBe(
    false,
  );
  expect(document.body.textContent).not.toContain(authorId);
});

it("requests synthetic content adjustments without allowing publication", async () => {
  const contentId = "11111111-1111-4111-8111-111111111111";
  const authorId = "33333333-3333-4333-8333-333333333333";
  const reviewerId = "44444444-4444-4444-8444-444444444444";
  const requests: { path: string; init?: RequestInit }[] = [];
  const rationale =
    "Esclarecer a prioridade e incluir o prazo de reavaliação no caso fictício.";
  const queueItem = {
    contentId,
    version: 1,
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    title: "Item sintético para ajustes",
    authorId,
    status: "EM_REVISAO_CLINICA",
    preflight: {
      technicalChecksPassed: false,
      checkedAt: "2026-10-02T09:00:00.000Z",
    },
    canOpenAuthoring: true,
    updatedAt: "2026-10-02T09:00:00.000Z",
    nextAction: "REVISAR_CLINICAMENTE",
  };
  const authoringRecord = {
    contentId,
    version: 1,
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    objectiveId: "M02-OBJ-01",
    authorId,
    contentStatus: "EM_REVISAO_CLINICA",
    item: {
      title: "Item sintético para ajustes",
      prompt: "Escolha uma próxima ação para o cenário fictício.",
      responseMode: "CHOICE",
      choices: [
        { id: "safe", label: "A", text: "Definir prioridade e reavaliar." },
        { id: "wait", label: "B", text: "Aguardar sem estabelecer um prazo." },
      ],
      correctChoiceIds: ["safe"],
      feedback: "Justifique a prioridade e o momento de reavaliação.",
      critical: false,
      remediationTargetObjectiveId: "M02-OBJ-01",
      sourceRefs: [
        {
          code: "SYNTHETIC-REF",
          locator: "fixture-only",
          updateRequired: true,
        },
      ],
    },
    preflight: {
      technicalChecksPassed: false,
      readyForClinicalReview: false,
      readyForPublication: false,
    },
    availableActions: {
      requestAdjustments: true,
      approveClinically: false,
    },
  };
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    if (path === "/api/v1/internal/session/scopes") {
      return successResponse({
        kind: "internal_session_scopes",
        scopes: [scopeId],
      });
    }
    if (path.startsWith("/api/v1/internal/content/review-queue?")) {
      return successResponse({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-10-02T09:00:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [queueItem],
      });
    }
    if (
      path ===
      `/api/v1/internal/content/${contentId}/versions/1/authoring?scopeId=${scopeId}`
    ) {
      return successResponse(authoringRecord);
    }
    if (path === `/api/v1/internal/content/${contentId}/review`) {
      return successResponse({
        contentId,
        scopeId,
        version: 1,
        contentStatus: "AJUSTES_SOLICITADOS",
        review: {
          decision: "SOLICITAR_AJUSTES",
          rationale,
          reviewedAt: "2026-10-02T09:05:00.000Z",
          correlationId: "55555555-5555-4555-8555-555555555555",
        },
      });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(
    {},
    document.title,
    `/authoring?contentId=${contentId}&version=1&scopeId=${scopeId}`,
  );

  const screen = await render(<AuthoringPage />);
  const reviewPanel = screen.getByRole("region", {
    name: "Item sintético para ajustes",
  });

  await expect
    .element(
      reviewPanel.getByRole("heading", {
        name: "Item sintético para ajustes",
      }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Solicitar ajustes" }))
    .toBeEnabled();
  expect(document.body.textContent).not.toContain("Aprovar clinicamente");

  await screen.getByRole("button", { name: "Solicitar ajustes" }).click();
  await expect
    .element(screen.getByLabelText("Justificativa da decisão"))
    .toHaveAttribute("aria-invalid", "true");
  expect(requests.some((request) => request.init?.method === "POST")).toBe(
    false,
  );
  await expect
    .element(screen.getByLabelText("Justificativa da decisão"))
    .toHaveAttribute("maxlength", "10000");
  // Exercise defensive validation even when the native length limit is bypassed.
  const rationaleField =
    document.querySelector<HTMLTextAreaElement>("#review-rationale");
  if (rationaleField === null) throw new Error("Missing rationale field.");
  rationaleField.maxLength = 20000;
  for (const invalid of ["   ", "<b>Motivo sintético</b>", "x".repeat(10001)]) {
    await screen.getByLabelText("Justificativa da decisão").fill(invalid);
    await screen.getByRole("button", { name: "Solicitar ajustes" }).click();
    await expect
      .element(screen.getByLabelText("Justificativa da decisão"))
      .toHaveAttribute("aria-invalid", "true");
    expect(requests.some((request) => request.init?.method === "POST")).toBe(
      false,
    );
  }
  rationaleField.maxLength = 10000;
  await screen
    .getByLabelText("Justificativa da decisão")
    .fill(`  ${rationale}  `);
  await screen.getByRole("button", { name: "Solicitar ajustes" }).click();

  await expect
    .element(screen.getByText("Ajustes solicitados.", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("AJUSTES_SOLICITADOS", { exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen.getByText("SOLICITAR_AJUSTES · 2026-10-02T09:05:00.000Z", {
        exact: true,
      }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText(rationale, { exact: true }))
    .toBeVisible();

  const reviewRequest = requests.find((request) =>
    request.path.endsWith(`/internal/content/${contentId}/review`),
  );
  expect(reviewRequest?.init).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      version: 1,
      scopeId,
      decision: "SOLICITAR_AJUSTES",
      rationale,
    }),
  });
  expect(document.body.textContent).not.toContain(authorId);
  expect(document.body.textContent).not.toContain(reviewerId);
  expect(document.body.textContent).not.toContain("PUBLICADO");
  fetchMock.mockResolvedValueOnce(unavailableResponse());
  await screen
    .getByRole("button", { name: "Carregar fila", exact: true })
    .click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Não foi possível carregar a fila de revisão clínica.");
  await expect
    .element(screen.getByText("Ajustes solicitados.", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText(rationale, { exact: true }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  fetchMock.mockResolvedValueOnce(unavailableResponse());
  await screen
    .getByRole("button", { name: "Carregar autoria", exact: true })
    .click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Não foi possível carregar o registro de autoria.");
  await expect
    .element(
      screen.getByRole("region", { name: "Decisão editorial registrada" }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText(rationale, { exact: true }))
    .toBeVisible();
  fetchMock.mockResolvedValueOnce(successResponse(authoringRecord, 503));
  await screen
    .getByRole("button", { name: "Carregar autoria", exact: true })
    .click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Não foi possível carregar o registro de autoria.");
  await expect
    .element(
      screen.getByRole("region", { name: "Decisão editorial registrada" }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText(rationale, { exact: true }))
    .toBeVisible();
});

it("rejects private or malformed adjustment receipts", () => {
  const receipt = {
    contentId: "11111111-1111-4111-8111-111111111111",
    scopeId,
    version: 1,
    contentStatus: "AJUSTES_SOLICITADOS",
    review: {
      decision: "SOLICITAR_AJUSTES",
      reviewedAt: "2026-10-03T00:00:00.000Z",
      rationale: "Corrigir a alternativa sintética.",
      correlationId: "55555555-5555-4555-8555-555555555555",
    },
  };
  expect(isAdjustmentReceipt(receipt)).toBe(true);
  for (const reviewedAt of [
    "2024-02-29T23:59:59.123Z",
    "2026-10-03T00:00:00-03:00",
  ]) {
    expect(
      isAdjustmentReceipt({
        ...receipt,
        review: { ...receipt.review, reviewedAt },
      }),
    ).toBe(true);
  }
  for (const invalid of [
    { ...receipt, item: { correctChoiceIds: ["synthetic-key"] } },
    { ...receipt, sourceRefs: ["synthetic-source"] },
    { ...receipt, contentStatus: "PUBLICADO" },
    { ...receipt, version: 0 },
    { ...receipt, scopeId: "unbound" },
    { ...receipt, review: { ...receipt.review, reviewedAt: "invalid" } },
    {
      ...receipt,
      review: { ...receipt.review, reviewedAt: "2026-02-30T12:00:00Z" },
    },
    {
      ...receipt,
      review: { ...receipt.review, reviewedAt: "2025-02-29T12:00:00Z" },
    },
    {
      ...receipt,
      review: { ...receipt.review, reviewedAt: "2026-04-31T12:00:00Z" },
    },
    { ...receipt, review: { ...receipt.review, rationale: undefined } },
    { ...receipt, review: { ...receipt.review, rationale: "<b>unsafe</b>" } },
    { ...receipt, review: { ...receipt.review, correlationId: "invalid" } },
    {
      ...receipt,
      review: { ...receipt.review, decision: "APROVAR_CLINICAMENTE" },
    },
    { ...receipt, review: { ...receipt.review, answer_key: "synthetic-key" } },
  ])
    expect(isAdjustmentReceipt(invalid)).toBe(false);
});

it.each([
  "errorEnvelope",
  403,
  409,
  500,
  503,
  "missingRationale",
  "invalidCalendar",
] as const)(
  "keeps a rejected adjustments decision generic and unpublished: %s",
  async (rejection) => {
    const contentId = "11111111-1111-4111-8111-111111111111";
    const rationale = "Esclarecer o prazo de reavaliação do cenário fictício.";
    const requests: { path: string; init?: RequestInit }[] = [];
    const authoringRecord = {
      contentId,
      version: 1,
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      authorId: "33333333-3333-4333-8333-333333333333",
      contentStatus: "EM_REVISAO_CLINICA",
      item: {
        title: "Item sintético com decisão negada",
        prompt: "Escolha uma próxima ação para o cenário fictício.",
        responseMode: "CHOICE",
        choices: [
          { id: "safe", label: "A", text: "Definir prioridade e reavaliar." },
          {
            id: "wait",
            label: "B",
            text: "Aguardar sem estabelecer um prazo.",
          },
        ],
        correctChoiceIds: ["safe"],
        feedback: "Justifique a prioridade e o momento de reavaliação.",
        critical: false,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          {
            code: "SYNTHETIC-REF",
            locator: "fixture-only",
            updateRequired: true,
          },
        ],
      },
      preflight: {
        technicalChecksPassed: false,
        readyForClinicalReview: false,
        readyForPublication: false,
      },
      availableActions: {
        requestAdjustments: true,
        approveClinically: false,
      },
    };
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const path = typeof input === "string" ? input : input.toString();
      requests.push({ path, init });
      if (path === "/api/v1/internal/session/scopes") {
        return successResponse({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        });
      }
      if (path.startsWith("/api/v1/internal/content/review-queue?")) {
        return successResponse({
          kind: "content_review_queue",
          scopeId,
          generatedAt: "2026-10-02T09:10:00.000Z",
          filters: { scopeId, limit: 50 },
          items: [],
        });
      }
      if (
        path ===
        `/api/v1/internal/content/${contentId}/versions/1/authoring?scopeId=${scopeId}`
      ) {
        return successResponse(authoringRecord);
      }
      if (path === `/api/v1/internal/content/${contentId}/review`) {
        if (rejection === "errorEnvelope") return forbiddenResponse();
        return successResponse(
          {
            contentId,
            scopeId,
            version: 1,
            contentStatus: "AJUSTES_SOLICITADOS",
            review: {
              decision: "SOLICITAR_AJUSTES",
              reviewedAt:
                rejection === "invalidCalendar"
                  ? "2026-02-30T00:00:00Z"
                  : "2026-10-03T00:00:00.000Z",
              ...(rejection === "missingRationale" ? {} : { rationale }),
            },
          },
          typeof rejection === "number" ? rejection : 200,
        );
      }
      return unavailableResponse();
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(
      {},
      document.title,
      `/authoring?contentId=${contentId}&version=1&scopeId=${scopeId}`,
    );

    const screen = await render(<AuthoringPage />);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Item sintético com decisão negada",
        }),
      )
      .toBeVisible();
    await screen.getByLabelText("Justificativa da decisão").fill(rationale);
    await screen.getByRole("button", { name: "Solicitar ajustes" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Não foi possível registrar a decisão clínica.");
    expect(document.body.textContent).not.toContain(
      "synthetic_internal_detail_must_not_reach_the_UI",
    );
    expect(document.body.textContent).not.toContain("AJUSTES_SOLICITADOS");
    expect(document.body.textContent).not.toContain("PUBLICADO");
    expect(document.body.textContent).not.toContain("Aprovar clinicamente");
    await expect
      .element(screen.getByLabelText("Justificativa da decisão"))
      .toHaveValue(rationale);

    const reviewRequest = requests.find((request) =>
      request.path.endsWith(`/internal/content/${contentId}/review`),
    );
    expect(reviewRequest?.init).toMatchObject({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        version: 1,
        scopeId,
        decision: "SOLICITAR_AJUSTES",
        rationale,
      }),
    });

    const correctedRationale =
      "Corrigir a alternativa sintética e definir o prazo de reavaliação.";
    fetchMock.mockResolvedValueOnce(
      successResponse({
        contentId,
        scopeId,
        version: 1,
        contentStatus: "AJUSTES_SOLICITADOS",
        review: {
          decision: "SOLICITAR_AJUSTES",
          rationale: correctedRationale,
          reviewedAt: "2026-10-03T00:00:00.000Z",
          correlationId: "55555555-5555-4555-8555-555555555555",
        },
      }),
    );
    await screen
      .getByLabelText("Justificativa da decisão")
      .fill(correctedRationale);
    await screen.getByRole("button", { name: "Solicitar ajustes" }).click();
    await expect
      .element(screen.getByText(correctedRationale, { exact: true }))
      .toBeVisible();
    const reviewCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(reviewCalls).toHaveLength(2);
    expect(JSON.parse(String(reviewCalls.at(-1)?.[1]?.body))).toMatchObject({
      rationale: correctedRationale,
      scopeId,
    });
  },
);

it("shows a retry path when the internal scope is unavailable", async () => {
  window.history.replaceState({}, document.title, "/authoring");
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(unavailableResponse());
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<AuthoringPage />);

  await expect
    .element(
      screen.getByText(
        "Não foi possível carregar os escopos da sessão interna.",
      ),
    )
    .toBeVisible();
  const retryButton = screen.getByRole("button", {
    name: "Tentar carregar novamente",
  });
  await expect.element(retryButton).toBeVisible();
  await retryButton.click();
  await expect.element(retryButton).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("reuses the same idempotency key after a draft request fails", async () => {
  window.history.replaceState({}, document.title, "/authoring");
  const fetchMock = scopedFetch();
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  const saveButton = screen.getByRole("button", { name: "Salvar rascunho" });

  await saveButton.click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("A operação editorial não foi concluída.");

  const draftRequests = fetchMock.mock.calls.filter(([input]) => {
    const path = typeof input === "string" ? input : input.toString();
    return path === "/api/v1/content/drafts";
  });
  expect(draftRequests).toHaveLength(1);

  const firstBody = JSON.parse(String(draftRequests[0]?.[1]?.body)) as {
    idempotencyKey: string;
    scopeId: string;
    moduleId: string;
    sessionId: string;
    objectiveId: string;
    responseMode: string;
    choices: readonly { id: string; label: string; text: string }[];
  };
  expect(firstBody).toMatchObject({
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    objectiveId: "M02-OBJ-01",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
  });
  expect(firstBody.idempotencyKey).toMatch(
    /^authoring-ui-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
  expect(
    JSON.parse(
      sessionStorage.getItem("cvg-authoring-draft-recovery-v1") ?? "null",
    ),
  ).toMatchObject({
    idempotencyKey: firstBody.idempotencyKey,
    scopeId,
    moduleId: "M02",
    draftTitle: "Prioridade clínica sintética",
  });

  await saveButton.click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("A operação editorial não foi concluída.");
  const retriedRequests = fetchMock.mock.calls.filter(([input]) => {
    const path = typeof input === "string" ? input : input.toString();
    return path === "/api/v1/content/drafts";
  });
  expect(retriedRequests).toHaveLength(2);
  expect(JSON.parse(String(retriedRequests[1]?.[1]?.body))).toMatchObject({
    idempotencyKey: firstBody.idempotencyKey,
  });
});

it("never hydrates stored authoring fields while memberships are delayed", async () => {
  seedRecovery();
  let resolveScopes!: (response: Response) => void;
  const deferred = new Promise<Response>((resolve) => {
    resolveScopes = resolve;
  });
  const base = scopedFetch();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) =>
      String(input) === "/api/v1/internal/session/scopes"
        ? deferred
        : base(input, init),
    ),
  );
  const screen = await render(<AuthoringPage />);
  await expect
    .element(screen.getByRole("heading", { name: "Validando acesso restrito" }))
    .toBeVisible();
  expect(document.querySelector("#draft-item-prompt")).toBeNull();
  resolveScopes(
    successResponse({
      kind: "internal_session_scopes",
      scopes: [scopeId],
      recoveryContext,
    }),
  );
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Enunciado privado sintético");
  await expect
    .element(screen.getByLabelText("Localizador interno"))
    .toHaveValue("Localizador privado sintético");
  await expect
    .element(screen.getByLabelText("B", { exact: true }).last())
    .toBeChecked();
});

it.each([
  [
    "other principal",
    { ...recoveryContext, principalId: "77777777-7777-4777-8777-777777777777" },
  ],
  [
    "logout/login of the same principal",
    {
      ...recoveryContext,
      sessionBinding: "88888888-8888-4888-8888-888888888888",
    },
  ],
  ["missing server identity", undefined],
])("discards recovery for %s in the same tab", async (_name, context) => {
  seedRecovery();
  vi.stubGlobal(
    "fetch",
    context === undefined ? authoringFetch() : scopedFetch(context),
  );
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
  await expect
    .element(screen.getByLabelText("Localizador interno"))
    .toHaveValue("localizador interno a revisar");
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("discards incompatible recovery when the authorized scope changes", async () => {
  seedRecovery();
  vi.stubGlobal("fetch", scopedFetch(recoveryContext, [scopeId, otherScopeId]));
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Enunciado privado sintético");
  await screen
    .getByLabelText("Escopo autorizado")
    .first()
    .selectOptions(otherScopeId);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("discards recovery when the URL selects a different authorized scope", async () => {
  seedRecovery();
  window.history.replaceState(
    {},
    document.title,
    `/authoring?scopeId=${otherScopeId}`,
  );
  vi.stubGlobal("fetch", scopedFetch(recoveryContext, [scopeId, otherScopeId]));
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it.each([
  "{invalid-json",
  JSON.stringify({ draftCritical: false }),
  JSON.stringify({ principalId: "invalid" }),
])("discards invalid storage without exposing it: %s", async (stored) => {
  sessionStorage.setItem(recoveryKey, stored);
  vi.stubGlobal("fetch", scopedFetch());
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("recovers only its own draft across an intentional remount", async () => {
  vi.stubGlobal("fetch", scopedFetch());
  const first = await render(<AuthoringPage />);
  await first.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await first.getByLabelText("Enunciado").fill("Enunciado privado sintético");
  await first.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect.element(first.getByRole("alert")).toBeVisible();
  const saved = sessionStorage.getItem(recoveryKey);
  await first.unmount();
  const second = await render(<AuthoringPage />);
  await second.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(second.getByLabelText("Enunciado"))
    .toHaveValue("Enunciado privado sintético");
  expect(sessionStorage.getItem(recoveryKey)).toBe(saved);
});

it("revalidates an open tab before revealing a draft after logout/login", async () => {
  seedRecovery();
  let currentContext = recoveryContext;
  let release!: (response: Response) => void;
  let delay = false;
  const base = scopedFetch();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) => {
      if (String(input) === "/api/v1/internal/session/scopes") {
        if (delay)
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        return Promise.resolve(
          successResponse({
            kind: "internal_session_scopes",
            scopes: [scopeId],
            recoveryContext: currentContext,
          }),
        );
      }
      return base(input, init);
    }),
  );
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Enunciado privado sintético");
  window.dispatchEvent(new Event("blur"));
  await expect
    .element(screen.getByRole("heading", { name: "Validando acesso restrito" }))
    .toBeVisible();
  currentContext = {
    ...recoveryContext,
    sessionBinding: "88888888-8888-4888-8888-888888888888",
  };
  delay = true;
  window.dispatchEvent(new Event("focus"));
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  expect(document.querySelector("#draft-item-prompt")).toBeNull();
  release(
    successResponse({
      kind: "internal_session_scopes",
      scopes: [scopeId],
      recoveryContext: currentContext,
    }),
  );
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("ignores an old memberships response after a new session was validated", async () => {
  seedRecovery();
  let release!: (response: Response) => void;
  let calls = 0;
  const base = scopedFetch();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) => {
      if (String(input) === "/api/v1/internal/session/scopes") {
        if (++calls === 1)
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        return Promise.resolve(
          successResponse({
            kind: "internal_session_scopes",
            scopes: [otherScopeId],
            recoveryContext: {
              ...recoveryContext,
              principalId: "77777777-7777-4777-8777-777777777777",
            },
          }),
        );
      }
      return base(input, init);
    }),
  );
  const screen = await render(<AuthoringPage />);
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  window.dispatchEvent(new Event("blur"));
  window.dispatchEvent(new Event("focus"));
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  release(
    successResponse({
      kind: "internal_session_scopes",
      scopes: [scopeId],
      recoveryContext,
    }),
  );
  await expect
    .element(screen.getByLabelText("Escopo autorizado").first())
    .toHaveValue(otherScopeId);
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("clears recovery after authorization fails and allows a safe retry", async () => {
  seedRecovery();
  const mock = scopedFetch();
  mock.mockResolvedValueOnce(forbiddenResponse());
  vi.stubGlobal("fetch", mock);
  const screen = await render(<AuthoringPage />);
  await expect.element(screen.getByRole("alert")).toBeVisible();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
  await screen
    .getByRole("button", { name: "Tentar carregar novamente" })
    .click();
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await expect
    .element(screen.getByLabelText("Enunciado"))
    .toHaveValue("Escolha a próxima ação segura em um caso fictício.");
});

it("keeps a failed retry in memory without storing an unbound draft", async () => {
  const mock = authoringFetch();
  vi.stubGlobal("fetch", mock);
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  const calls = mock.mock.calls.filter(
    ([input]) => String(input) === "/api/v1/content/drafts",
  );
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[1]?.body).toBe(calls[0]?.[1]?.body);
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

function createdDraftResponse(latestReview?: unknown) {
  return successResponse(
    {
      contentId: "11111111-1111-4111-8111-111111111111",
      version: 1,
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      authorId: recoveryContext.principalId,
      contentStatus: "RASCUNHO",
      item: {
        title: "Rascunho confirmado sintético",
        prompt: "Cenário fictício confirmado",
        responseMode: "CHOICE",
        choices: [
          { id: "a", label: "A", text: "Alternativa sintética" },
          { id: "b", label: "B", text: "Outra alternativa sintética" },
        ],
        correctChoiceIds: ["a"],
        feedback: "Feedback sintético",
        critical: false,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          { code: "F-02", locator: "fixture-only", updateRequired: true },
        ],
      },
      preflight: { technicalChecksPassed: true, readyForPublication: false },
      availableActions: { requestAdjustments: false, approveClinically: false },
      ...(latestReview === undefined ? {} : { latestReview }),
    },
    201,
  );
}

it("rejects a malformed returned review rationale without rendering it", async () => {
  const base = scopedFetch();
  window.history.replaceState(
    {},
    document.title,
    `/authoring?contentId=11111111-1111-4111-8111-111111111111&version=1&scopeId=${scopeId}`,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) =>
      String(input).includes("/versions/1/authoring?")
        ? Promise.resolve(
            createdDraftResponse({
              decision: "SOLICITAR_AJUSTES",
              rationale: { privateText: "Synthetic malformed rationale" },
              reviewerId: "44444444-4444-4444-8444-444444444444",
              reviewedAt: "2026-10-03T00:00:00.000Z",
            }),
          )
        : base(input, init),
    ),
  );
  const screen = await render(<AuthoringPage />);
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Não foi possível carregar o registro de autoria.");
  expect(document.body.textContent).not.toContain(
    "Synthetic malformed rationale",
  );
});

it("clears bound recovery after the server confirms a draft", async () => {
  const base = scopedFetch();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) =>
      String(input) === "/api/v1/content/drafts"
        ? Promise.resolve(createdDraftResponse())
        : base(input, init),
    ),
  );
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect
    .element(
      screen.getByRole("heading", { name: "Rascunho confirmado sintético" }),
    )
    .toBeVisible();
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it("does not let a late draft response erase recovery belonging to a new scope", async () => {
  let release!: (response: Response) => void;
  const base = scopedFetch(recoveryContext, [scopeId, otherScopeId]);
  let draftCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) => {
      if (String(input) === "/api/v1/content/drafts") {
        if (++draftCalls === 1)
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        return Promise.resolve(unavailableResponse());
      }
      return base(input, init);
    }),
  );
  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  window.dispatchEvent(new Event("blur"));
  window.dispatchEvent(new Event("focus"));
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen
    .getByLabelText("Escopo autorizado")
    .first()
    .selectOptions(otherScopeId);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  const newRecovery = sessionStorage.getItem(recoveryKey);
  expect(JSON.parse(newRecovery ?? "null")).toMatchObject({
    scopeId: otherScopeId,
  });
  release(createdDraftResponse());
  await expect
    .element(screen.getByRole("heading", { name: "Criar rascunho sintético" }))
    .toBeVisible();
  expect(sessionStorage.getItem(recoveryKey)).toBe(newRecovery);
  expect(document.body.textContent).not.toContain(
    "Rascunho confirmado sintético",
  );
});

it("creates a synthetic draft while keeping publication blocked", async () => {
  window.history.replaceState({}, document.title, "/authoring");
  const fetchMock = authoringFetch();
  fetchMock.mockImplementation(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/internal/session/scopes") {
      return successResponse({
        kind: "internal_session_scopes",
        scopes: [scopeId],
      });
    }
    if (path.startsWith("/api/v1/internal/content/review-queue?")) {
      return successResponse({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-10-02T00:00:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [],
      });
    }
    if (path === "/api/v1/content/drafts") {
      return successResponse(
        {
          contentId: "11111111-1111-4111-8111-111111111111",
          version: 1,
          scopeId,
          moduleId: "M02",
          sessionId: "M02-S1",
          objectiveId: "M02-OBJ-01",
          authorId: "33333333-3333-4333-8333-333333333333",
          contentStatus: "RASCUNHO",
          item: {
            title: "Novo rascunho sintético",
            prompt: "Escolha a próxima ação segura em um caso fictício.",
            responseMode: "CHOICE",
            choices: [
              { id: "a", label: "A", text: "Priorizar e reavaliar." },
              { id: "b", label: "B", text: "Aguardar sem meta." },
            ],
            correctChoiceIds: ["a"],
            feedback: "Defina uma meta e reavalie.",
            critical: false,
            remediationTargetObjectiveId: "M02-OBJ-01",
            sourceRefs: [
              {
                code: "SYNTHETIC-FIXTURE",
                locator: "fixture-only",
                updateRequired: true,
              },
            ],
          },
          preflight: {
            technicalChecksPassed: true,
            readyForClinicalReview: true,
            readyForPublication: false,
          },
          availableActions: {
            requestAdjustments: false,
            approveClinically: false,
          },
        },
        201,
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<AuthoringPage />);
  await screen.getByRole("button", { name: "Criar ou abrir um item" }).click();
  await screen.getByLabelText("Título do item").fill("Novo rascunho sintético");
  await screen.getByRole("button", { name: "Salvar rascunho" }).click();

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(
      "Rascunho criado. O pré-voo técnico não publica nem aprova o conteúdo.",
    );
  await expect
    .element(screen.getByRole("heading", { name: "Novo rascunho sintético" }))
    .toBeVisible();
  await expect
    .element(screen.getByText("RASCUNHO", { exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen.getByText(
        "Esta sessão pode consultar a autoria, mas não registrar decisões.",
      ),
    )
    .toBeVisible();
  expect(sessionStorage.getItem("cvg-authoring-draft-recovery-v1")).toBeNull();

  const draftRequests = fetchMock.mock.calls.filter(([input]) => {
    const path = typeof input === "string" ? input : input.toString();
    return path === "/api/v1/content/drafts";
  });
  expect(draftRequests).toHaveLength(1);
  expect(draftRequests[0]?.[1]?.method).toBe("POST");
  const draftBody = JSON.parse(String(draftRequests[0]?.[1]?.body)) as Record<
    string,
    unknown
  >;
  expect(draftBody).toMatchObject({
    scopeId,
    moduleId: "M02",
    sessionId: "M02-S1",
    objectiveId: "M02-OBJ-01",
    title: "Novo rascunho sintético",
    responseMode: "CHOICE",
    correctChoiceIds: ["a"],
    sourceRefs: [
      {
        code: "F-02",
        locator: "localizador interno a revisar",
        updateRequired: true,
      },
    ],
  });
  expect(draftBody.idempotencyKey).toMatch(
    /^authoring-ui-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
  for (const field of [
    "authorId",
    "contentId",
    "participant",
    "status",
    "version",
    "readyForPublication",
  ]) {
    expect(draftBody).not.toHaveProperty(field);
  }
});
