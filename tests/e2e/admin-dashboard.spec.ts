import { expect, test } from "@playwright/test";

const participantId = "22222222-2222-4222-8222-222222222222";
const scopeId = "11111111-1111-4111-8111-111111111111";

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "admin-dashboard-e2e" } };
}

function trainingCatalog() {
  return Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: index === 0 ? "Fundamentos" : `Módulo ${index + 1}`,
    competence: "Raciocínio clínico digital seguro.",
    assignedParticipants: index === 0 ? 1 : 0,
    activeParticipants: index === 0 ? 1 : 0,
    completedParticipants: 0,
  }));
}

test("admin acompanha avanço e disponibiliza um módulo", async ({ page }) => {
  const assignmentBodies: unknown[] = [];
  let transitionCalls = 0;
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
            participantsTotal: 1,
            activeParticipants: 1,
            invitedParticipants: 0,
            participantsInProgress: 1,
            averageProgressPercent: 12,
            assignedModules: 1,
            completedModules: 0,
          },
          participants: [
            {
              participantId,
              professionalEmail: "vet@example.test",
              accountStatus: "ACTIVE",
              scopeIds: [scopeId],
              assignedModules: 1,
              completedModules: 0,
              progressPercent: 12,
              activeModuleId: "M01",
              activeModuleTitle: "Fundamentos",
              nextAction: "INICIAR_BASELINE",
            },
          ],
          trainingCatalog: trainingCatalog(),
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/learning-assignments", async (route) => {
    assignmentBodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          assignmentId: "66666666-6666-4666-8666-666666666666",
          moduleId: "M01",
          availableAt: "2026-08-11T20:00:00.000Z",
          status: "NAO_ATRIBUIDO",
          version: 0,
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/learning-assignments/*/transition",
    async (route) => {
      assignmentBodies.push(route.request().postDataJSON());
      transitionCalls += 1;
      if (transitionCalls === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "internal_error", message: "temporary failure" },
          }),
        });
        return;
      }
      const body = route.request().postDataJSON() as { event: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            assignmentId: "66666666-6666-4666-8666-666666666666",
            moduleId: "M01",
            availableAt: "2026-08-11T20:00:00.000Z",
            status: body.event === "ATRIBUIR" ? "ATRIBUIDO" : "DISPONIVEL",
            version: body.event === "ATRIBUIR" ? 1 : 2,
          }),
        ),
      });
    },
  );

  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Dashboard de treinamento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "vet@example.test" }),
  ).toBeVisible();
  await expect(page.getByText("12% concluído")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Catálogo de treinamentos" }),
  ).toBeVisible();
  await expect(page.getByText("Fundamentos").first()).toBeVisible();

  await page.getByRole("button", { name: "Atribuir módulo" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText(
    "Não foi possível atribuir o treinamento ao veterinário.",
  );
  await page.getByRole("button", { name: "Atribuir módulo" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Treinamento atribuído e disponibilizado.",
  );
  expect(assignmentBodies).toHaveLength(4);
  expect(assignmentBodies[0]).toMatchObject({
    participantId,
    scopeId,
    moduleId: "M01",
  });
  expect(assignmentBodies[1]).toMatchObject({
    event: "ATRIBUIR",
    participantId,
    scopeId,
  });
  expect(assignmentBodies[2]).toMatchObject({
    event: "ATRIBUIR",
    participantId,
    scopeId,
  });
  expect(assignmentBodies[2]).toMatchObject({
    assignmentId: (assignmentBodies[0] as { assignmentId: string })
      .assignmentId,
  });
  expect(assignmentBodies[3]).toMatchObject({
    event: "DISPONIBILIZAR",
    participantId,
    scopeId,
  });
  expect(assignmentBodies[3]).toMatchObject({
    assignmentId: (assignmentBodies[0] as { assignmentId: string })
      .assignmentId,
  });
});
