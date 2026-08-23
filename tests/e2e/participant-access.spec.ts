import { expect, test } from "@playwright/test";

const invitationToken = "a".repeat(32);
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
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "participant",
            nextAction: "RETOMAR_ATIVIDADE",
            progress: {
              assignedActivities: 2,
              completedActivities: 1,
              progressPercent: 50,
              remediationObjectives: 0,
              retentionReviewsPending: 0,
              pendingCorrections: 0,
            },
            path: [
              {
                moduleId: "M01",
                month: 1,
                status: "EM_ANDAMENTO",
                nextAction: "RETOMAR_MODULO",
              },
              {
                moduleId: "M02",
                month: 2,
                status: "NAO_ATRIBUIDO",
                nextAction: "AGUARDAR_ATRIBUICAO",
              },
            ],
            profile: [
              {
                moduleId: "M01",
                month: 1,
                competence:
                  "Organizar dados, reconhecer risco e justificar um plano inicial.",
                status: "EM_DESENVOLVIMENTO_DIGITAL",
                scorePercent: 70,
                lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
                evidence: "AVALIACAO_MODULAR_DIGITAL",
                practicalCompetenceClaim: "PROIBIDO_MVP",
              },
            ],
            diagnosticProfile: [
              {
                themeId: "B07-S1",
                themeLabel: "Núcleo clínico e segurança",
                status: "BASELINE_REGISTRADA",
                scorePercent: 75,
                answeredItemCount: 30,
                itemCount: 40,
                recommendedModuleIds: ["M01", "M11"],
                lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
                evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                notPunitive: true,
                noGlobalPassFail: true,
                practicalCompetenceClaim: "PROIBIDO_MVP",
              },
              {
                themeId: "B07-S2",
                themeLabel: "Emergência e priorização",
                status: "SEM_EVIDENCIA_DIGITAL",
                scorePercent: null,
                answeredItemCount: 0,
                itemCount: 40,
                recommendedModuleIds: [],
                evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                notPunitive: true,
                noGlobalPassFail: true,
                practicalCompetenceClaim: "PROIBIDO_MVP",
              },
              {
                themeId: "B07-S3",
                themeLabel: "Internação, monitoramento e integração",
                status: "SEM_EVIDENCIA_DIGITAL",
                scorePercent: null,
                answeredItemCount: 0,
                itemCount: 40,
                recommendedModuleIds: [],
                evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                notPunitive: true,
                noGlobalPassFail: true,
                practicalCompetenceClaim: "PROIBIDO_MVP",
              },
            ],
          }),
        ),
      });
    });
  });

  test("loads the learning path and starts with its next action", async ({
    page,
  }) => {
    await page.route("**/api/v1/invitations/accept", async (route) => {
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
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(
      page.getByRole("heading", { name: "Emergência" }),
    ).toBeVisible();
    await expect(page.getByText("Retomar atividade").first()).toBeVisible();
    await expect(
      page.getByText(/Progresso digital: 1 de 2 concluídas/u),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plano de 24 meses" }),
    ).toBeVisible();
    await expect(page.getByText("Retomar módulo")).toBeVisible();
    await expect(page.getByText("Aguardando atribuição")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Competências acompanhadas" }),
    ).toBeVisible();
    await expect(page.getByText("Em desenvolvimento digital")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Diagnóstico por tema" }),
    ).toBeVisible();
    await expect(page.getByText("Baseline digital registrada")).toBeVisible();
    await expect(page.getByText("Sem nota global")).toBeVisible();
  });

  test("accepts an internal invitation and renders only the participant activity", async ({
    page,
  }) => {
    await page.route("**/api/v1/invitations/accept", async (route) => {
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
      page.getByRole("heading", { name: "Acesso interno" }),
    ).toBeVisible();
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

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
    await page.route("**/api/v1/invitations/accept", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "not_found",
            message: "O recurso solicitado não foi encontrado.",
            details: [],
          },
          meta: { request_id: "e2e-request" },
        }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Token de convite").fill("b".repeat(32));
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(page.locator("p[role=alert]")).toHaveText(
      "O convite não está disponível. Verifique o link interno.",
    );
    await expect(page.locator("body")).not.toContainText("stack");
    await expect(page.locator("body")).not.toContainText("tokenHash");
  });

  test("renders and saves a multi-select question from the public projection", async ({
    page,
  }) => {
    const choiceItemId = "44444444-4444-4444-8444-444444444444";
    await page.route("**/api/v1/invitations/accept", async (route) => {
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
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();
    await page.getByRole("button", { name: "Iniciar tentativa" }).click();
    await page.getByRole("checkbox", { name: /Avaliar via aérea/ }).check();
    await page.getByRole("checkbox", { name: /Designar funções/ }).check();
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("Resposta salva.")).toBeVisible();
  });

  test("starts, saves, and submits an attempt through public projections", async ({
    page,
  }) => {
    await page.route("**/api/v1/invitations/accept", async (route) => {
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
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();
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
    await page.route("**/api/v1/invitations/accept", async (route) => {
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
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

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
