import { expect, test } from "@playwright/test";

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "e2e-recovery-request" },
  };
}

test.describe("controlled account recovery", () => {
  test("consumes a one-time link and lands on a fresh session", async ({
    page,
  }) => {
    await page.route("**/api/v1/recovery/accept", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        token: "r".repeat(32),
        sessionExpiresInSeconds: 3600,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "set-cookie": "__Host-cvg_session=session" },
        body: JSON.stringify(successEnvelope({ status: "active" })),
      });
    });

    await page.goto(`/recovery?token=${"r".repeat(32)}`);

    await expect(
      page.getByRole("heading", { name: "Acesso recuperado" }),
    ).toBeVisible();
    await expect(
      page.getByText("O link foi consumido e não pode ser reutilizado."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/recovery$/u);
  });
});
