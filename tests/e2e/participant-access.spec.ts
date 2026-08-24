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
            nextActionTarget: { kind: "ACTIVITY", activityId },
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
    await page.route("**/api/v1/feedback", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope({ tickets: [] })),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            ticketId: "44444444-4444-4444-8444-444444444444",
            type: "USABILIDADE",
            description: "Relato de usabilidade sintético.",
            createdAt: "2026-08-24T12:00:00.000Z",
            status: "NOVO",
            version: 0,
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
            nextActionTarget: { kind: "ACTIVITY", activityId },
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

  test("opens another assigned activity without losing the participant session", async ({
    page,
  }) => {
    const secondActivityId = "55555555-5555-4555-8555-555555555555";
    await page.unroute("**/api/v1/learning-path");
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
                status: "CONCLUIDO",
                nextAction: "CONSULTAR_PROXIMO_PASSO",
              },
              {
                activityId: secondActivityId,
                slug: "internacao-v1",
                title: "Internação",
                status: "DISPONIVEL",
                nextAction: "INICIAR_ATIVIDADE",
              },
            ],
            results: [],
            runtimes: [],
            nextActionTarget: {
              kind: "ACTIVITY",
              activityId: secondActivityId,
            },
            nextAction: "INICIAR_ATIVIDADE",
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
    await page.route(
      `**/api/v1/activities/${secondActivityId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              activityId: secondActivityId,
              slug: "internacao-v1",
              title: "Internação",
              items: [],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(
      page.getByRole("heading", { name: "Emergência" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir atividade: Emergência" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Abrir atividade: Internação" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Internação" }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`activityId=${secondActivityId}`));
    await expect(page.getByLabel("Token de convite")).toHaveCount(0);
  });

  test("opens the server-selected activity for digital remediation", async ({
    page,
  }) => {
    const remediationActivityId = "66666666-6666-4666-8666-666666666666";
    await page.unroute("**/api/v1/learning-path");
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
                status: "EM_REFORCO",
                nextAction: "INICIAR_ATIVIDADE",
              },
              {
                activityId: remediationActivityId,
                slug: "emergencia-reforco-v1",
                title: "Reforço de emergência",
                status: "EM_REFORCO",
                nextAction: "INICIAR_ATIVIDADE",
              },
            ],
            results: [],
            runtimes: [
              {
                moduleId: "M02",
                version: 2,
                status: "EM_REMEDIACAO",
                nextAction: "EXECUTAR_REMEDIACAO",
                remediationCount: 1,
                retentionReviews: [],
                practicalCompetenceClaim: "PROIBIDO_MVP",
              },
            ],
            nextActionTarget: {
              kind: "ACTIVITY",
              activityId: remediationActivityId,
            },
            nextAction: "EXECUTAR_REMEDIACAO",
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
    await page.route(
      `**/api/v1/activities/${remediationActivityId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              activityId: remediationActivityId,
              slug: "emergencia-reforco-v1",
              title: "Reforço de emergência",
              items: [],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(page.getByText("Executar remediação").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Abrir atividade: Reforço de emergência" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Reforço de emergência" }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`activityId=${remediationActivityId}`),
    );
    await expect(page.getByLabel("Token de convite")).toHaveCount(0);
  });

  test("reports feedback and shows only the participant ticket projection", async ({
    page,
  }) => {
    await page.route("**/api/v1/invitations/accept", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route("**/api/v1/activities/" + activityId, async (route) => {
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

    await expect(page.getByTestId("feedback-panel")).toBeVisible();
    await page.getByLabel("Tipo de relato").selectOption("USABILIDADE");
    await page.getByLabel("Descrição").fill("Relato de usabilidade sintético.");
    await page.getByRole("button", { name: "Enviar feedback" }).click();

    await expect(
      page.getByText("Feedback enviado. Acompanhe o status nesta tela.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Meus relatos" }).getByRole("listitem"),
    ).toContainText("Usabilidade");
    await expect(
      page.getByText("Relato de usabilidade sintético."),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("scopeId");
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

  test("opens and tracks a redacted appeal protocol after a digital result", async ({
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
    await page.route("**/api/v1/appeals*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope({ appeals: [] })),
        });
        return;
      }
      const body = route.request().postDataJSON() as Readonly<{
        readonly attemptId: string;
        readonly itemId: string;
        readonly justification: string;
      }>;
      expect(body).toMatchObject({ attemptId, itemId });
      expect(body.justification).toBe("Justificativa sintética.");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            appealId: "44444444-4444-4444-8444-444444444444",
            attemptId,
            itemId,
            createdAt: "2026-08-23T22:00:00.000Z",
            dueAt: "2026-09-02T22:00:00.000Z",
            status: "ABERTA",
            version: 0,
          }),
        ),
      });
    });
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
              status: "CORRIGIDA_AUTOMATICAMENTE",
              version: 3,
              answers: [{ itemId, response: "Prioridade sintética." }],
            }),
          ),
        });
      },
    );
    await page.route(
      `**/api/v1/attempts/${attemptId}/feedback`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
              attemptVersion: 3,
              resultVersion: 1,
              score: 82,
              outcome: "APROVADO",
              feedback: "Feedback formativo próprio.",
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
    await page.getByRole("button", { name: "Enviar tentativa" }).click();
    await expect(page.getByTestId("appeals-panel")).toBeVisible();
    await page.getByLabel("Justificativa").fill("Justificativa sintética.");
    await page.getByRole("button", { name: "Enviar contestação" }).click();
    await expect(
      page.getByText(
        "Contestação registrada. Acompanhe o protocolo nesta tela.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("appeals-panel")).toContainText("Recebida");
    await expect(page.locator("body")).not.toContainText("reviewerId");
    await expect(page.locator("body")).not.toContainText("gabarito");
  });

  test("restores a corrected attempt and its appeal protocol after reload", async ({
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
                status: "EM_REFORCO",
                attemptId,
                attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
                attemptVersion: 3,
                nextAction: "REVISAR_PROXIMO_CONTEUDO",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "REVISAR_PROXIMO_CONTEUDO",
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
    await page.route("**/api/v1/appeals*", async (route) => {
      expect(route.request().method()).toBe("GET");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            appeals: [
              {
                appealId: "44444444-4444-4444-8444-444444444444",
                attemptId,
                itemId,
                createdAt: "2026-08-23T22:00:00.000Z",
                dueAt: "2026-09-02T22:00:00.000Z",
                status: "ABERTA",
                version: 0,
              },
            ],
          }),
        ),
      });
    });
    await page.route(
      `**/api/v1/attempts/${attemptId}/feedback`,
      async (route) => {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
              attemptVersion: 3,
              resultVersion: 1,
              score: 82,
              outcome: "APROVADO",
              feedback: "Feedback formativo próprio.",
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(page.getByTestId("appeals-panel")).toBeVisible();
    await expect(page.getByTestId("appeals-panel")).toContainText("Recebida");
    await expect(
      page.getByRole("button", { name: "Iniciar nova tentativa" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar tentativa" }),
    ).toHaveCount(0);
  });

  test("shows persisted digital correction feedback without internal fields", async ({
    page,
  }) => {
    await page.unroute("**/api/v1/learning-path");
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
                status: "CONCLUIDO",
                attemptId,
                attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
                attemptVersion: 3,
                nextAction: "REVISAR_PROXIMO_CONTEUDO",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "REVISAR_PROXIMO_CONTEUDO",
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
    await page.route("**/api/v1/appeals*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ appeals: [] })),
      });
    });
    await page.route(
      `**/api/v1/attempts/${attemptId}/feedback`,
      async (route) => {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            successEnvelope({
              attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
              attemptVersion: 3,
              resultVersion: 1,
              score: 82,
              outcome: "APROVADO",
              feedback: "Feedback formativo próprio.",
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(page.getByTestId("correction-panel")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Resultado digital" }),
    ).toBeVisible();
    await expect(page.getByText("82%", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Feedback formativo próprio.", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("correction-panel")
        .getByText("Revisar próximo conteúdo"),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("scopeId");
    await expect(page.locator("body")).not.toContainText("resultId");
    await expect(page.locator("body")).not.toContainText("correctedBy");
    await expect(page.locator("body")).not.toContainText("ruleVersion");
  });

  test("shows a bounded waiting state when digital correction is unavailable", async ({
    page,
  }) => {
    await page.unroute("**/api/v1/learning-path");
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
                status: "CONCLUIDO",
                attemptId,
                attemptStatus: "SUBMETIDA",
                attemptVersion: 3,
                nextAction: "AGUARDAR_CORRECAO",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "AGUARDAR_CORRECAO",
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
    await page.route("**/api/v1/appeals*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ appeals: [] })),
      });
    });
    let feedbackReads = 0;
    await page.route(
      `**/api/v1/attempts/${attemptId}/feedback`,
      async (route) => {
        if (feedbackReads === 0) {
          feedbackReads += 1;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: {
                code: "internal_error",
                message: "Falha temporária.",
                details: [],
              },
              meta: { request_id: "e2e-request" },
            }),
          });
          return;
        }
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
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();

    await expect(page.getByTestId("correction-panel")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Resultado digital indisponível" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tentar consultar resultado" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Resultado em processamento" }),
    ).toBeVisible();
    await expect(
      page.getByText("A correção digital ainda não está disponível.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("resultId");
    await expect(page.locator("body")).not.toContainText("correctedBy");
  });

  test("resumes a digital reflection from its persisted participant projection", async ({
    page,
  }) => {
    let activityReads = 0;
    await page.route("**/api/v1/invitations/accept", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });
    await page.route(`**/api/v1/activities/${activityId}`, async (route) => {
      activityReads += 1;
      const hasAttempt = activityReads >= 2;
      const hasAnswer = activityReads >= 3;
      const submitted = activityReads >= 4;
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
                kind: "REFLEXAO",
                title: "Próxima ação",
                text: "Descreva a próxima ação sintética.",
                responseMode: "TEXT",
              },
            ],
            reflection: {
              status: submitted
                ? "CONCLUIDA"
                : hasAttempt
                  ? "EM_ANDAMENTO"
                  : "NAO_INICIADA",
              nextAction: submitted
                ? "PROXIMA_ACAO"
                : hasAnswer
                  ? "ENVIAR_REFLEXAO"
                  : hasAttempt
                    ? "RETOMAR_REFLEXAO"
                    : "INICIAR_REFLEXAO",
              itemCount: 1,
              answeredItemCount: hasAnswer ? 1 : 0,
              answers: hasAnswer
                ? [
                    {
                      itemId,
                      response: "Próxima ação sintética.",
                      savedAt: "2026-08-23T20:00:00.000Z",
                    },
                  ]
                : [],
              evidence: "REFLEXAO_DIGITAL",
              practicalCompetenceClaim: "PROIBIDO_MVP",
            },
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
              answers: [{ itemId, response: "Próxima ação sintética." }],
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
              answers: [{ itemId, response: "Próxima ação sintética." }],
            }),
          ),
        });
      },
    );

    await page.goto(`/?activityId=${activityId}`);
    await page.getByLabel("Token de convite").fill(invitationToken);
    await page.getByRole("button", { name: "Ativar acesso" }).click();
    await expect(page.getByTestId("reflection-state")).toContainText(
      "Ainda não iniciada",
    );
    await page.getByRole("button", { name: "Iniciar tentativa" }).click();
    await page
      .getByLabel("Resposta — Próxima ação")
      .fill("Próxima ação sintética.");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByLabel("Resposta — Próxima ação")).toHaveValue(
      "Próxima ação sintética.",
    );
    await expect(page.getByTestId("reflection-state")).toContainText(
      "Enviar reflexão",
    );
    await page.getByRole("button", { name: "Enviar tentativa" }).click();
    await expect(page.getByTestId("reflection-state")).toContainText(
      "Concluída",
    );
    await expect(page.getByTestId("reflection-state")).toContainText(
      "Próxima ação",
    );
    await expect(page.locator("body")).not.toContainText("score");
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
