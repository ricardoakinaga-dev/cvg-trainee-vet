import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

type RealFixture = Readonly<{
  readonly adminLogin: string;
  readonly adminPassword: string;
  readonly login: string;
  readonly password: string;
  readonly activityId: string;
  readonly itemId: string;
}>;

const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";

test("browser reaches the real API through the web proxy", async ({ page }) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;
  const expectedBaseUrl = new URL(
    process.env.BASE_URL ?? "http://127.0.0.1:3100",
  ).origin;
  const dependencyResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/health/dependencies") &&
      response.request().resourceType() === "fetch",
  );

  await page.goto("/");
  await page.getByLabel("E-mail profissional").fill(fixture.adminLogin);
  await page.getByLabel("Senha").fill(fixture.adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.goto("/operations");
  const response = await dependencyResponse;

  expect(response.url()).toBe(`${expectedBaseUrl}/health/dependencies`);
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

  const initialCase = await page.evaluate(async () => {
    const response = await fetch("/api/v1/curriculum/modules/M24/case");
    return { status: response.status, body: await response.json() };
  });
  expect(initialCase.status).toBe(200);
  expect(initialCase.body.data).toMatchObject({ version: 0, currentStage: 1 });

  const advancedCase = await page.evaluate(async () => {
    const response = await fetch(
      "/api/v1/curriculum/modules/M24/case/advance",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedChoiceIds: ["a"], expectedVersion: 0 }),
      },
    );
    return { status: response.status, body: await response.json() };
  });
  expect(advancedCase.status).toBe(200);
  expect(advancedCase.body.data).toMatchObject({
    version: 1,
    currentStage: 2,
  });
  expect(JSON.stringify(advancedCase.body)).not.toContain("statePatch");
  expect(JSON.stringify(advancedCase.body)).not.toContain("nextStage");

  const persistedCase = await page.evaluate(async () => {
    const response = await fetch("/api/v1/curriculum/modules/M24/case");
    return { status: response.status, body: await response.json() };
  });
  expect(persistedCase.status).toBe(200);
  expect(persistedCase.body.data).toMatchObject({
    version: 1,
    currentStage: 2,
  });

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

test("admin manages a synthetic account lifecycle through real persistence", async ({
  page,
}) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;

  await page.goto("/");
  await page.getByLabel("E-mail profissional").fill(fixture.adminLogin);
  await page.getByLabel("Senha").fill(fixture.adminPassword);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/login") &&
      response.request().resourceType() === "fetch",
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  const login = await loginResponse;
  if (login.status() < 200 || login.status() >= 300) {
    throw new Error(`admin login status ${login.status()}`);
  }
  const operationsResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/internal/dashboard") &&
      response.request().resourceType() === "fetch",
  );
  await page.goto("/admin");
  const operations = await operationsResponse;
  if (operations.status() < 200 || operations.status() >= 300) {
    throw new Error(`admin operations status ${operations.status()}`);
  }

  await expect(
    page.getByRole("heading", { name: "Dashboard de treinamento" }),
  ).toBeVisible();
  const accountRow = page
    .getByRole("table")
    .first()
    .getByRole("row")
    .filter({ hasText: fixture.login });
  await expect(accountRow).toContainText("Ativo");

  await accountRow.getByRole("button", { name: "Suspender" }).click();
  await expect(accountRow).toContainText("Suspenso");
  await accountRow.getByRole("button", { name: "Reativar" }).click();
  await expect(accountRow).toContainText("Ativo");
  await accountRow.getByRole("button", { name: "Revogar sessões" }).click();
  await expect(page.getByText(/sessão\(ões\) revogada\(s\)/u)).toBeVisible();
});
