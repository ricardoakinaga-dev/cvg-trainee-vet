import { expect, test, type Page } from "@playwright/test";

const loginEmail = "participant@cvg.example";
const loginCredential = "Acesso-" + "CVG-2026!Seguro";
const activityId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "e2e-request" },
  };
}

async function signIn(
  page: Page,
  email = loginEmail,
  credential = loginCredential,
): Promise<void> {
  await page.getByLabel("E-mail profissional").fill(email);
  await page.getByLabel("Senha").fill(credential);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("participant access and learning projection", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/learning-path", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            assignments: [],
            activities: [
              {
                activityId,
                slug: "emergencia-v1",
                title: "Emergência",
                status: "EM_ANDAMENTO",
                nextAction: "RETOMAR_ATIVIDADE",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "RETOMAR_ATIVIDADE",
          }),
        ),
      });
    });
  });

  test("presents a mission-oriented first-access screen", async ({ page }) => {
    await page.route("**/api/v1/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "unauthenticated", message: "Não autenticado." },
        }),
      });
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Entrar no treinamento" }),
    ).toBeVisible();
    await expect(page.getByText("Sua missão começa aqui")).toBeVisible();
    await expect(
      page.getByText("Acesso por convite da operação"),
    ).toBeVisible();

    const password = page.getByLabel("Senha");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Ocultar senha" }),
    ).toBeVisible();
  });

  test("loads the learning path and starts with its next action", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route("**/api/v1/learning-path", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            assignments: [],
            activities: [
              {
                activityId,
                slug: "emergencia-v1",
                title: "Emergência",
                status: "EM_ANDAMENTO",
                nextAction: "RETOMAR_ATIVIDADE",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "RETOMAR_ATIVIDADE",
          }),
        ),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "emergencia-v1",
            title: "Emergência",
            items: [],
          }),
        ),
      });
    });

    await page.goto("/");
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: "Emergência" }),
    ).toBeVisible();
    await expect(page.getByText("Retomar atividade").first()).toBeVisible();
  });

  test("accepts an internal invitation and renders only the participant activity", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "set-cookie": "__Host-cvg_session=synthetic" },
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "emergencia-v1",
            title: "Emergência",
            items: [
              {
                itemId,
                ordinal: 1,
                kind: "QUESTAO",
                title: "Prioridades iniciais",
                text: "Descreva a primeira prioridade.",
                responseMode: "TEXT",
              },
            ],
          }),
        ),
      });
    });

    await page.goto(`/?activityId=${activityId}`);
    await expect(
      page.getByRole("heading", { name: "Entrar no treinamento" }),
    ).toBeVisible();
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: "Emergência" }),
    ).toBeVisible();
    await expect(page.getByText("Prioridades iniciais")).toBeVisible();
    await expect(
      page.getByText("Descreva a primeira prioridade."),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("source");
    await expect(page.locator("body")).not.toContainText("photo");
  });

  test("shows a bounded public error for an unavailable invitation", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "unauthenticated",
            message: "Credenciais inválidas.",
            details: [],
          },
          meta: { request_id: "e2e-request" },
        }),
      });
    });

    await page.goto("/");
    await signIn(page, "missing@cvg.example", "Senha-" + "incorreta-2026!");

    await expect(page.locator("p[role=alert]")).toHaveText(
      "Login ou senha inválidos.",
    );
    await expect(page.locator("body")).not.toContainText("stack");
    await expect(page.locator("body")).not.toContainText("tokenHash");
  });

  test("guides the participant through three-question blocks and saves before advancing", async ({
    page,
  }) => {
    const blockItems = Array.from({ length: 5 }, (_, index) => ({
      itemId: `55555555-5555-4555-8555-55555555555${index + 1}`,
      ordinal: index + 1,
      kind: "QUESTAO",
      title: `Questão ${index + 1}`,
      text: `Escolha a alternativa da questão ${index + 1}.`,
      responseMode: "CHOICE",
      selectionMode: "SINGLE",
      choices: [
        { id: "a", label: "A", text: `Alternativa A ${index + 1}` },
        { id: "b", label: "B", text: `Alternativa B ${index + 1}` },
      ],
    }));
    let savedItemIds: readonly string[] = [];

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "emergencia-v1",
            title: "Emergência",
            items: blockItems,
          }),
        ),
      });
    });
    await page.route("**/api/v1/attempts", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            attemptId,
            activityId,
            status: "EM_ANDAMENTO",
            version: 1,
            answers: [],
          }),
        ),
      });
    });
    await page.route(
      `**/api/v1/attempts/${attemptId}/answers`,
      async (route) => {
        const body = route.request().postDataJSON() as Readonly<{
          readonly itemId: string;
          readonly response: string;
        }>;
        savedItemIds = [...savedItemIds, body.itemId];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptId,
              activityId,
              status: "SALVA",
              version: 2,
              answers: [{ itemId: body.itemId, response: body.response }],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await signIn(page);

    await expect(page.getByTestId("attempt-launch")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar tentativa" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Iniciar tentativa" }).click();

    await expect(page.getByText("Bloco 1 de 2")).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Progresso da atividade" }),
    ).toHaveAttribute("aria-valuenow", "0");
    await page.getByRole("radio", { name: /Alternativa A 1/ }).check();
    await page.getByRole("radio", { name: /Alternativa A 2/ }).check();
    await page.getByRole("radio", { name: /Alternativa A 3/ }).check();
    await page.getByRole("button", { name: "Salvar e avançar" }).click();

    await expect(page.getByText("Bloco 2 de 2")).toBeVisible();
    expect(savedItemIds).toEqual(
      blockItems.slice(0, 3).map((item) => item.itemId),
    );
    await expect(page.getByText("Questões 4–5")).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Progresso da atividade" }),
    ).toHaveAttribute("aria-valuenow", "60");
    await expect(page.locator("body")).not.toContainText("Questão 1");
  });

  test("renders and saves a multi-select question from the public projection", async ({
    page,
  }) => {
    const choiceItemId = "44444444-4444-4444-8444-444444444444";
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "emergencia-v1",
            title: "Emergência",
            items: [
              {
                itemId: choiceItemId,
                ordinal: 1,
                kind: "QUESTAO",
                title: "Ações prioritárias",
                text: "Selecione as ações prioritárias.",
                responseMode: "CHOICE",
                selectionMode: "MULTIPLE",
                choices: [
                  { id: "a", label: "A", text: "Avaliar via aérea." },
                  { id: "b", label: "B", text: "Aguardar sem reavaliar." },
                  { id: "c", label: "C", text: "Designar funções." },
                ],
              },
            ],
          }),
        ),
      });
    });
    await page.route("**/api/v1/attempts", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            attemptId,
            activityId,
            status: "EM_ANDAMENTO",
            version: 1,
            answers: [],
          }),
        ),
      });
    });
    await page.route(
      `**/api/v1/attempts/${attemptId}/answers`,
      async (route) => {
        const body = route.request().postDataJSON() as Readonly<{
          readonly response?: string;
        }>;
        expect(body.response).toBe('["a","c"]');
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptId,
              activityId,
              status: "SALVA",
              version: 2,
              answers: [{ itemId: choiceItemId, response: '["a","c"]' }],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await signIn(page);
    await page.getByRole("button", { name: "Iniciar tentativa" }).click();
    await page.getByRole("checkbox", { name: /Avaliar via aérea/ }).check();
    await page.getByRole("checkbox", { name: /Designar funções/ }).check();
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("Resposta salva.")).toBeVisible();
  });

  test("starts, saves, and submits an attempt through public projections", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "emergencia-v1",
            title: "Emergência",
            items: [
              {
                itemId,
                ordinal: 1,
                kind: "QUESTAO",
                title: "Prioridades iniciais",
                text: "Descreva a primeira prioridade.",
                responseMode: "TEXT",
              },
            ],
          }),
        ),
      });
    });
    await page.route("**/api/v1/attempts", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            attemptId,
            activityId,
            status: "EM_ANDAMENTO",
            version: 1,
            answers: [],
          }),
        ),
      });
    });
    await page.route(
      `**/api/v1/attempts/${attemptId}/answers`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptId,
              activityId,
              status: "SALVA",
              version: 2,
              answers: [{ itemId, response: "Prioridade sintética." }],
            }),
          ),
        });
      },
    );
    await page.route(
      `**/api/v1/attempts/${attemptId}/submit`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptId,
              activityId,
              status: "SUBMETIDA",
              version: 3,
              answers: [{ itemId, response: "Prioridade sintética." }],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await signIn(page);
    await page.getByRole("button", { name: "Iniciar tentativa" }).click();
    await page
      .getByLabel("Resposta — Prioridades iniciais")
      .fill("Prioridade sintética.");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("Resposta salva.")).toBeVisible();
    await page.getByRole("button", { name: "Enviar tentativa" }).click();
    await expect(page.getByText("Tentativa submetida.")).toBeVisible();
  });

  test("renders the persisted curriculum runtime next action without internal fields", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId,
            slug: "m03-training-v1",
            title: "M03 — Cardiologia",
            items: [
              {
                itemId,
                ordinal: 1,
                kind: "QUESTAO",
                title: "Revisão de risco",
                text: "Escolha a próxima ação simulada.",
                responseMode: "TEXT",
              },
            ],
          }),
        ),
      });
    });
    await page.route(
      "**/api/v1/curriculum/modules/M03/runtime",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              moduleId: "M03",
              version: 2,
              status: "DOMINIO_DIGITAL",
              nextAction: "REVISAR_RETENCAO",
              scorePercent: 100,
              remediationCount: 0,
              retentionReviews: [
                {
                  day: 7,
                  dueAt: "2026-08-17T01:00:00.000Z",
                  status: "PENDENTE",
                },
              ],
              practicalCompetenceClaim: "PROIBIDO_MVP",
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await signIn(page);

    await expect(page.getByText("REVISAR_RETENCAO")).toBeVisible();
    await expect(
      page.getByText("Estado digital: DOMINIO_DIGITAL · 100%"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Resultado digital não comprova competência prática nem autoriza procedimento.",
      ),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("objectiveResults");
  });
});
