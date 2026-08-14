import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const loginEmail = "participant@cvg.example";
const loginCredential = "Acesso-" + "CVG-2026!Seguro";

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "e2e-experience-request" },
  };
}

test.describe("web experience and accessibility contract", () => {
  test("provides a keyboard skip path, landmarks, labels, and unique ids", async ({
    page,
  }) => {
    await page.goto("/");

    const skipLink = page.getByRole("link", {
      name: "Pular para o conteúdo principal",
    });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "Entrar no treinamento" }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail profissional")).toHaveAttribute(
      "aria-describedby",
      "login-help",
    );
    await expect(page.getByLabel("Senha")).toHaveAttribute(
      "aria-describedby",
      "password-help",
    );

    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
        (element) => element.id,
      );
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds).toEqual([]);
  });

  test("renders an accessible loading state and recovers through retry", async ({
    page,
  }) => {
    let loginAttempts = 0;
    await page.route("**/api/v1/auth/login", async (route) => {
      loginAttempts += 1;
      if (loginAttempts === 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "internal_error", message: "indisponível" },
            meta: { request_id: "e2e-experience-request" },
          }),
        });
        return;
      }
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
            activities: [],
            results: [],
            runtimes: [],
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          }),
        ),
      });
    });

    await page.goto("/");
    await page.getByLabel("E-mail profissional").fill(loginEmail);
    await page.getByLabel("Senha").fill(loginCredential);
    const loginButton = page.getByRole("button", { name: "Entrar" });
    const loginRequest = loginButton.click();
    await expect(page.getByTestId("loading-state")).toHaveText(
      "Atualizando seu treinamento…",
    );
    await loginRequest;

    await expect(page.locator("p[role=alert]")).toContainText(
      "Não foi possível concluir a operação.",
    );
    await expect(
      page.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByText("Nenhuma atividade atribuída")).toBeVisible();
  });

  test("shows an explicit empty journey and refresh action", async ({
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
            activities: [],
            results: [],
            runtimes: [],
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          }),
        ),
      });
    });

    await page.goto("/");
    await page.getByLabel("E-mail profissional").fill(loginEmail);
    await page.getByLabel("Senha").fill(loginCredential);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Atualizar jornada" }),
    ).toBeVisible();
  });

  test("keeps the entry surface usable at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Entrar no treinamento" }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail profissional")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);
  });

  test("preserves reflow at the 200% and 400% zoom-equivalent widths", async ({
    page,
  }) => {
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");

      await expect(
        page.getByRole("heading", { name: "Entrar no treinamento" }),
      ).toBeVisible();
      const horizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(horizontalOverflow, `unexpected overflow at ${width}px`).toBe(
        false,
      );
    }
  });

  test("has no axe violations on participant and authoring entry surfaces", async ({
    page,
  }) => {
    await page.goto("/");
    const participantResults = await new AxeBuilder({ page }).analyze();
    expect(participantResults.violations).toEqual([]);

    await page.goto("/authoring");
    const authoringResults = await new AxeBuilder({ page }).analyze();
    expect(authoringResults.violations).toEqual([]);
  });
});
