import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

type RealFixture = Readonly<{
  readonly login: string;
  readonly password: string;
  readonly activityId: string;
  readonly itemId: string;
}>;

const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";

test("browser reaches the real API through the web proxy", async ({ page }) => {
  const dependencyResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/health/dependencies") &&
      response.request().resourceType() === "fetch",
  );

  await page.goto("/operations");
  const response = await dependencyResponse;

  expect(response.url()).toBe("http://127.0.0.1:3100/health/dependencies");
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
  await expect(page.getByTestId("operations-ready")).toBeVisible();
  await expect(page.getByText(/Estado geral:/u)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("password");
  await expect(page.locator("body")).not.toContainText("api_key");
  await expect(page.locator("body")).not.toContainText("postgresql://");
});

test("participant completes a persisted synthetic activity through the real API", async ({
  page,
}) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;

  await page.goto(`/?activityId=${fixture.activityId}`);
  await page.getByLabel("E-mail profissional").fill(fixture.login);
  await page.getByLabel("Senha").fill(fixture.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByRole("heading", { name: "Atividade real sintética" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Iniciar tentativa" }).click();
  await page
    .getByLabel("Resposta — Resposta sintética")
    .fill("Resposta sintética persistida.");
  await page.getByRole("button", { name: "Salvar resposta" }).click();
  await expect(page.getByText("Resposta salva.")).toBeVisible();
  await page.getByRole("button", { name: "Enviar tentativa" }).click();
  await expect(page.getByText("Tentativa submetida.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("participantId");
  await expect(page.locator("body")).not.toContainText("participantText");
  await expect(page.locator("body")).not.toContainText("tokenHash");
});
