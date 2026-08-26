import { expect, test } from "@playwright/test";

const sessionId = "11111111-1111-4111-8111-111111111111";

type DiagnosticAnswer = Readonly<{
  readonly itemId: string;
  readonly selectedChoiceIds: readonly string[];
}>;

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "e2e-diagnostic-session" },
  };
}

function errorEnvelope(code: string) {
  return {
    success: false,
    error: { code, message: "synthetic response" },
    meta: { request_id: "e2e-diagnostic-session" },
  };
}

function itemId(ordinal: number): string {
  return `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;
}

function syntheticItems() {
  return Array.from({ length: 120 }, (_, index) => {
    const ordinal = index + 1;
    return {
      itemId: itemId(ordinal),
      ordinal,
      title: `Questão sintética ${ordinal}`,
      text: `Escolha a alternativa segura para o item ${ordinal}.`,
      responseMode: "CHOICE" as const,
      choices: [
        { id: "A", label: "A", text: "Alternativa sintética A." },
        { id: "B", label: "B", text: "Alternativa sintética B." },
      ],
      selectionMode: "SINGLE" as const,
    };
  });
}

function theme(
  themeId: "B07-S1" | "B07-S2" | "B07-S3",
  scorePercent: number | null,
) {
  return {
    themeId,
    themeLabel:
      themeId === "B07-S1"
        ? "Núcleo clínico e segurança"
        : themeId === "B07-S2"
          ? "Emergência e priorização"
          : "Internação, monitoramento e integração",
    status:
      scorePercent === null ? "SEM_EVIDENCIA_DIGITAL" : "BASELINE_REGISTRADA",
    scorePercent,
    answeredItemCount: scorePercent === null ? 0 : 1,
    itemCount: 40,
    evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
    notPunitive: true,
    noGlobalPassFail: true,
    practicalCompetenceClaim: "PROIBIDO_MVP",
  } as const;
}

test.describe("participant diagnostic session", () => {
  test("starts, checkpoints, clears, resumes and finalizes a safe public projection", async ({
    page,
  }) => {
    const items = syntheticItems();
    let started = false;
    let status: "EM_ANDAMENTO" | "FINALIZADA" = "EM_ANDAMENTO";
    let version = 0;
    let answers: DiagnosticAnswer[] = [];
    let finalizedAt: string | undefined;

    function projection() {
      const currentOrdinal =
        status === "FINALIZADA"
          ? null
          : (items.find(
              (item) =>
                !answers.some((answer) => answer.itemId === item.itemId),
            )?.ordinal ?? null);
      return {
        sessionId,
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        version,
        status,
        startedAt: "2026-08-26T12:00:00.000Z",
        ...(status === "FINALIZADA"
          ? { finalizedAt: finalizedAt ?? "2026-08-26T12:05:00.000Z" }
          : {}),
        itemCount: 120,
        answeredItemCount: answers.length,
        currentOrdinal,
        items,
        answers,
        ...(status === "FINALIZADA"
          ? {
              result: {
                completedAt: finalizedAt ?? "2026-08-26T12:05:00.000Z",
                themes: [
                  theme("B07-S1", 100),
                  theme("B07-S2", null),
                  theme("B07-S3", null),
                ],
              },
              nextAction: "CONTINUAR_TRILHA",
            }
          : {}),
      };
    }

    await page.route(
      "**/api/v1/diagnostics/b07/sessions/current",
      async (route) => {
        if (!started) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify(errorEnvelope("not_found")),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope(projection())),
        });
      },
    );
    await page.route("**/api/v1/diagnostics/b07/sessions", async (route) => {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON() as Readonly<{
        readonly idempotencyKey?: unknown;
      }>;
      expect(body.idempotencyKey).toEqual("cvg-b07-start-v1");
      started = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(projection())),
      });
    });
    await page.route(
      `**/api/v1/diagnostics/b07/sessions/${sessionId}/answers/*`,
      async (route) => {
        expect(route.request().method()).toBe("PUT");
        const body = route.request().postDataJSON() as Readonly<{
          readonly version?: unknown;
          readonly selectedChoiceIds?: unknown;
          readonly idempotencyKey?: unknown;
        }>;
        expect(body.version).toBe(version);
        expect(body.idempotencyKey).toEqual(
          expect.stringMatching(/^cvg-b07-answer-/u),
        );
        const selectedChoiceIds = Array.isArray(body.selectedChoiceIds)
          ? body.selectedChoiceIds.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        const answerItemId = new URL(route.request().url()).pathname
          .split("/")
          .pop();
        if (answerItemId === undefined)
          throw new Error("answer item id is missing");
        answers = answers.filter((answer) => answer.itemId !== answerItemId);
        if (selectedChoiceIds.length > 0) {
          answers.push({ itemId: answerItemId, selectedChoiceIds });
        }
        version += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope(projection())),
        });
      },
    );
    await page.route(
      `**/api/v1/diagnostics/b07/sessions/${sessionId}/finalize`,
      async (route) => {
        expect(route.request().method()).toBe("POST");
        const body = route.request().postDataJSON() as Readonly<{
          readonly version?: unknown;
          readonly idempotencyKey?: unknown;
        }>;
        expect(body.version).toBe(version);
        expect(body.idempotencyKey).toEqual(
          expect.stringMatching(/^cvg-b07-finalize-/u),
        );
        status = "FINALIZADA";
        version += 1;
        finalizedAt = "2026-08-26T12:05:00.000Z";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope(projection())),
        });
      },
    );

    await page.goto("/diagnostic");
    await expect(page.getByTestId("diagnostic-start")).toBeVisible();
    await page.getByRole("button", { name: "Iniciar diagnóstico" }).click();
    await expect(page.getByTestId("diagnostic-item")).toBeVisible();
    await expect(page.getByText("Item 1 de 120")).toBeVisible();

    await page.getByRole("radio").first().check();
    await page
      .getByRole("button", { name: "Salvar resposta e avançar" })
      .click();
    await expect(page.getByText("1 de 120 itens salvos")).toBeVisible();
    await expect(page.getByText("Item 2 de 120")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Item 2 de 120")).toBeVisible();
    await page.getByRole("radio").first().check();
    await page
      .getByRole("button", { name: "Salvar resposta e avançar" })
      .click();
    await expect(page.getByText("2 de 120 itens salvos")).toBeVisible();
    await page.getByRole("button", { name: "Item anterior" }).click();
    await expect(page.getByText("Item 2 de 120")).toBeVisible();
    await page.getByRole("button", { name: "Limpar resposta" }).click();
    await expect(page.getByText("1 de 120 itens salvos")).toBeVisible();

    await page.getByRole("button", { name: "Finalizar diagnóstico" }).click();
    await expect(page.getByTestId("diagnostic-result")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Seu resultado formativo" }),
    ).toBeVisible();
    await expect(page.getByText("Baseline digital registrada")).toBeVisible();
    await expect(page.getByText("Sem evidência digital").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "recommendedModuleIds",
    );
    await expect(page.locator("body")).not.toContainText("canonicalItemId");
    await expect(page.locator("body")).not.toContainText("correctChoiceIds");
    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("scopeId");

    await page.reload();
    await expect(page.getByTestId("diagnostic-result")).toBeVisible();
  });
});
