import { expect, test } from "@playwright/test";

const invitationToken = "a".repeat(43);
const firstAccessPassword = ["Primeiro-Acesso", "2026", "seguro"].join("-");

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "admin-users-e2e" } };
}

test("superadmin creates a bounded first-access invitation", async ({
  page,
}) => {
  let requestBody: unknown = null;
  await page.route("**/api/v1/internal/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          dependencyStatus: "READY",
          dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
          metrics: { requestsTotal: 12, errorsTotal: 0, p95DurationMs: 8 },
          evidence: {
            collector: "NOT_CONFIGURED",
            retention: "NOT_CONFIGURED",
            traces: "NOT_CONFIGURED",
            load: "NOT_EXECUTED",
            failover: "NOT_EXECUTED",
            replicas: "NOT_EXECUTED",
          },
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/admin/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          curriculumId: "CVG-CURRICULUM-24M",
          curriculumVersion: "3.0.0",
          summary: {
            participantsTotal: 0,
            activeParticipants: 0,
            invitedParticipants: 0,
            participantsInProgress: 0,
            averageProgressPercent: 0,
            assignedModules: 0,
            completedModules: 0,
          },
          participants: [],
          trainingCatalog: Array.from({ length: 24 }, (_, index) => ({
            moduleId: `M${String(index + 1).padStart(2, "0")}`,
            month: index + 1,
            title: `Módulo ${index + 1}`,
            competence: "Raciocínio clínico digital seguro.",
            assignedParticipants: 0,
            activeParticipants: 0,
            completedParticipants: 0,
          })),
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/invitations", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          invitationId: "22222222-2222-4222-8222-222222222222",
          professionalEmail: "nova.pessoa@cvg.example",
          token: invitationToken,
          expiresAt: "2026-08-18T12:00:00.000Z",
        }),
      ),
    });
  });

  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Gestão de usuários" }),
  ).toBeVisible();
  await expect(
    page.getByText("Somente o superadmin pode criar novos acessos."),
  ).toBeVisible();
  await page
    .getByLabel("E-mail profissional do novo usuário")
    .fill("nova.pessoa@cvg.example");
  await page.getByLabel("Perfil de acesso").selectOption("PARTICIPANT");
  await page.getByRole("button", { name: "Criar acesso" }).click();

  await expect(page.locator("p[role=status]")).toHaveText(
    "Acesso criado. Envie o link de primeiro acesso ao usuário.",
  );
  expect(requestBody).toEqual({
    professionalEmail: "nova.pessoa@cvg.example",
    invitedRoles: ["PARTICIPANT"],
    invitedScopes: [],
    expiresInSeconds: 604800,
  });
  await expect(
    page.getByRole("link", { name: "Abrir primeiro acesso" }),
  ).toHaveAttribute("href", `/invite?token=${invitationToken}`);
});

test("first access accepts the invitation and creates the user password", async ({
  page,
}) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await page.route("**/api/v1/invitations/accept", async (route) => {
    calls.push({
      path: "/api/v1/invitations/accept",
      body: route.request().postDataJSON(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ status: "active" })),
    });
  });
  await page.goto(`/invite?token=${invitationToken}`);
  await expect(
    page.getByRole("heading", { name: "Criar senha de primeiro acesso" }),
  ).toBeVisible();
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill(firstAccessPassword);
  await page.getByLabel("Confirmar nova senha").fill(firstAccessPassword);
  await page.getByRole("button", { name: "Ativar meu acesso" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Acesso ativado. Você já pode entrar no treinamento.",
  );
  expect(calls).toEqual([
    {
      path: "/api/v1/invitations/accept",
      body: {
        token: invitationToken,
        password: firstAccessPassword,
        sessionExpiresInSeconds: 3600,
      },
    },
  ]);
  await expect(page.locator("body")).not.toContainText(invitationToken);
  await expect(page.locator("body")).not.toContainText("Primeiro-Acesso-2026!");
});

test("admin updates account status and revokes its sessions", async ({
  page,
}) => {
  const accountId = "33333333-3333-4333-8333-333333333333";
  let accountVersion = 4;
  const account = (status: "ACTIVE" | "SUSPENDED") => ({
    accountId,
    professionalEmail: "conta@cvg.example",
    accountStatus: status,
    roles: ["PARTICIPANT"],
    scopes: ["scope-1"],
    version: accountVersion,
    createdAt: "2026-08-11T20:00:00.000Z",
    updatedAt: "2026-08-11T21:00:00.000Z",
  });
  await page.route("**/api/v1/internal/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          dependencyStatus: "READY",
          dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
          metrics: { requestsTotal: 12, errorsTotal: 0, p95DurationMs: 8 },
          evidence: {
            collector: "NOT_CONFIGURED",
            retention: "NOT_CONFIGURED",
            traces: "NOT_CONFIGURED",
            load: "NOT_EXECUTED",
            failover: "NOT_EXECUTED",
            replicas: "NOT_EXECUTED",
          },
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/admin/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          curriculumId: "CVG-CURRICULUM-24M",
          curriculumVersion: "3.0.0",
          summary: {
            participantsTotal: 0,
            activeParticipants: 0,
            invitedParticipants: 0,
            participantsInProgress: 0,
            averageProgressPercent: 0,
            assignedModules: 0,
            completedModules: 0,
          },
          participants: [],
          trainingCatalog: Array.from({ length: 24 }, (_, index) => ({
            moduleId: `M${String(index + 1).padStart(2, "0")}`,
            month: index + 1,
            title: `Módulo ${index + 1}`,
            competence: "Raciocínio clínico digital seguro.",
            assignedParticipants: 0,
            activeParticipants: 0,
            completedParticipants: 0,
          })),
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/accounts?limit=200", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({ accounts: [account("ACTIVE")], nextCursor: null }),
        ),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/v1/internal/accounts/**", async (route) => {
    const body = route.request().postDataJSON() as {
      expectedVersion: number;
      status: "SUSPENDED";
    };
    expect(route.request().method()).toBe("PATCH");
    expect(body).toEqual({ expectedVersion: 4, status: "SUSPENDED" });
    accountVersion = 5;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          ...account("SUSPENDED"),
          accountStatus: "SUSPENDED",
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/accounts/*/sessions/revoke",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope({ accountId, revokedCount: 2 })),
      });
    },
  );

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Lifecycle de contas" }),
  ).toBeVisible();
  await expect(page.getByText("conta@cvg.example")).toBeVisible();
  await page.getByRole("button", { name: "Suspender" }).click();
  await expect(page.getByRole("status").last()).toHaveText(
    "Status da conta atualizado.",
  );
  await page.getByRole("button", { name: "Revogar sessões" }).click();
  await expect(page.getByRole("status").last()).toHaveText(
    "2 sessão(ões) revogada(s) para conta@cvg.example.",
  );
});
