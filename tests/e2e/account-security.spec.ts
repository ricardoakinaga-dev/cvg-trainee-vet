import { expect, test } from "@playwright/test";

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "account-security-e2e" } };
}

test("completes provider-mediated recovery and MFA verification without echoing codes", async ({
  page,
}) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await page.route("**/api/v1/account/security", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          provider: "EXTERNAL_IDENTITY_PROVIDER",
          recovery: "AVAILABLE",
          mfa: "NOT_ENABLED",
          session: "ACTIVE",
        }),
      ),
    });
  });
  await page.route("**/api/v1/account/recovery/start", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          operationId: "recovery-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
      ),
    });
  });
  await page.route("**/api/v1/account/mfa/enrollment", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          operationId: "mfa-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
      ),
    });
  });
  await page.route("**/api/v1/account/recovery/complete", async (route) => {
    calls.push({
      path: "/recovery/complete",
      body: route.request().postDataJSON(),
    });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          operationId: "recovery-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
      ),
    });
  });
  await page.route("**/api/v1/account/mfa/enrollment/verify", async (route) => {
    calls.push({
      path: "/mfa/enrollment/verify",
      body: route.request().postDataJSON(),
    });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          operationId: "mfa-operation",
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
      ),
    });
  });

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Recuperação e MFA" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Iniciar recuperação" }).click();
  await page.getByLabel("Código de recuperação").fill("recovery-code");
  await page.getByRole("button", { name: "Concluir recuperação" }).click();
  await expect(page.getByRole("status")).toContainText("Recuperação concluída");

  await page.getByRole("button", { name: "Configurar MFA" }).click();
  await page.getByLabel("Código de confirmação MFA").fill("123456");
  await page.getByRole("button", { name: "Confirmar MFA" }).click();
  await expect(page.getByRole("status")).toContainText("MFA confirmado");

  expect(calls).toEqual([
    {
      path: "/recovery/complete",
      body: {
        operationId: "recovery-operation",
        verificationCode: "recovery-code",
      },
    },
    {
      path: "/mfa/enrollment/verify",
      body: { operationId: "mfa-operation", verificationCode: "123456" },
    },
  ]);
  await expect(page.locator("body")).not.toContainText("recovery-code");
  await expect(page.locator("body")).not.toContainText("123456");
});
