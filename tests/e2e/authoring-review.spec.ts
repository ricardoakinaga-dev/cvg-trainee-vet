import { expect, test } from "@playwright/test";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "authoring-e2e" } };
}

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
    sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
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
    readyForClinicalReview: true,
    readyForPublication: false,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: "2026-08-10T05:00:00.000Z",
  },
  availableActions: {
    requestAdjustments: false,
    approveClinically: true,
  },
};

test("clinical reviewer can inspect and decide an internal authoring item", async ({
  page,
}) => {
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-23T20:00:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );
  await page.route(
    `**/api/v1/internal/content/${contentId}/versions/1/authoring**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(authoringRecord)),
      });
    },
  );
  await page.route(
    `**/api/v1/internal/content/${contentId}/review`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            ...authoringRecord,
            contentStatus: "APROVADO_CLINICAMENTE",
          }),
        ),
      });
    },
  );

  await page.goto(
    `/authoring?contentId=${contentId}&version=1&scopeId=${scopeId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Prioridade sintética" }),
  ).toBeVisible();
  await expect(page.getByText("F-02 · interno")).toBeVisible();
  await expect(page.getByText("gabarito")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar clinicamente" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Revisão clínica registrada.",
  );
});

test("scoped reviewer can load the redacted queue and open an item", async ({
  page,
}) => {
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      const requestUrl = new URL(route.request().url());
      expect(requestUrl.searchParams.get("scopeId")).toBe(scopeId);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-23T20:00:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [
              {
                contentId,
                version: 1,
                scopeId,
                moduleId: "M02",
                sessionId: "M02-S1",
                title: "Prioridade sintética",
                authorId: "33333333-3333-4333-8333-333333333333",
                status: "EM_REVISAO_CLINICA",
                preflight: {
                  technicalChecksPassed: true,
                  checkedAt: "2026-08-23T19:00:00.000Z",
                },
                canOpenAuthoring: true,
                updatedAt: "2026-08-23T19:30:00.000Z",
                nextAction: "REVISAR_CLINICAMENTE",
              },
            ],
          }),
        ),
      });
    },
  );
  await page.route(
    `**/api/v1/internal/content/${contentId}/versions/1/authoring**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(authoringRecord)),
      });
    },
  );

  await page.goto(`/authoring?scopeId=${scopeId}`);
  await expect(
    page.getByRole("heading", { name: "Revisão clínica pendente" }),
  ).toBeVisible();
  await expect(page.getByText("M02 · M02-S1 · versão 1")).toBeVisible();
  await expect(page.locator(".queue-item")).not.toContainText("gabarito");
  await expect(page.locator(".queue-item")).not.toContainText("fontes");
  await page.getByRole("link", { name: "Abrir revisão" }).click();
  await expect(page.locator("#review-title")).toHaveText(
    "Prioridade sintética",
  );
});

test("author can create a synthetic RASCUNHO without client-owned identity", async ({
  page,
}) => {
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-23T20:00:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );
  await page.route("**/api/v1/content/drafts", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      scopeId,
      moduleId: "M02",
      sessionId: "M02-S1",
      objectiveId: "M02-OBJ-01",
      responseMode: "CHOICE",
    });
    expect(payload).not.toHaveProperty("contentId");
    expect(payload).not.toHaveProperty("authorId");
    expect(payload).not.toHaveProperty("version");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("participant");
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          ...authoringRecord,
          contentStatus: "RASCUNHO",
          item: {
            ...authoringRecord.item,
            title: "Novo rascunho sintético",
            participant: {
              ...authoringRecord.item.participant,
              title: "Novo rascunho sintético",
            },
          },
          availableActions: {
            requestAdjustments: false,
            approveClinically: false,
          },
        }),
      ),
    });
  });

  await page.goto(`/authoring?scopeId=${scopeId}`);
  await page.getByLabel("Título do item").fill("Novo rascunho sintético");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.locator("#review-title")).toHaveText(
    "Novo rascunho sintético",
  );
  await expect(page.getByText("RASCUNHO").first()).toBeVisible();
  await expect(
    page.getByText(
      "Esta sessão pode consultar a autoria, mas não registrar decisões.",
    ),
  ).toBeVisible();
});

test("author can retry when internal scopes fail to load", async ({ page }) => {
  let scopeRequests = 0;
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    scopeRequests += 1;
    if (scopeRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "internal_error" },
          meta: { request_id: "scope-retry-1" },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-23T20:00:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );

  await page.goto("/authoring");
  await expect(
    page.getByRole("button", { name: "Tentar carregar novamente" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tentar carregar novamente" }).click();
  await expect(page.locator("#draft-scope-id")).toBeEnabled();
  await expect(page.locator("#draft-scope-id")).toHaveValue(scopeId);
  expect(scopeRequests).toBe(2);
});

test("author can start a new attempt after an idempotency conflict", async ({
  page,
}) => {
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [scopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-23T20:00:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );
  let draftRequests = 0;
  await page.route("**/api/v1/content/drafts", async (route) => {
    draftRequests += 1;
    if (draftRequests === 1) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "idempotency_conflict" },
          meta: { request_id: "draft-conflict-1" },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          ...authoringRecord,
          contentStatus: "RASCUNHO",
          item: {
            ...authoringRecord.item,
            title: "Nova tentativa sintética",
            participant: {
              ...authoringRecord.item.participant,
              title: "Nova tentativa sintética",
            },
          },
          availableActions: {
            requestAdjustments: false,
            approveClinically: false,
          },
        }),
      ),
    });
  });

  await page.goto("/authoring");
  await page.getByLabel("Título do item").fill("Nova tentativa sintética");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar nova tentativa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Iniciar nova tentativa" }).click();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.locator("#review-title")).toHaveText(
    "Nova tentativa sintética",
  );
  expect(draftRequests).toBe(2);
});
