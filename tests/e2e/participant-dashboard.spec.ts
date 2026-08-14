import { expect, test } from "@playwright/test";

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "dashboard-e2e" } };
}

function roadmap() {
  return Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: `Módulo ${index + 1}`,
    competence: "Raciocínio clínico digital seguro.",
    sessionCount: 4,
    status: index === 0 ? "DISPONIVEL" : "BLOQUEADO_PRE_REQUISITO",
    nextAction: index === 0 ? "INICIAR_BASELINE" : "CONCLUIR_PRE_REQUISITO",
  }));
}

test("participant dashboard shows study recommendations and safe quick links", async ({
  page,
}) => {
  await page.route("**/api/v1/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          curriculumId: "CVG-CURRICULUM-24M",
          curriculumVersion: "3.0.0",
          totalMonths: 24,
          totalModules: 24,
          completedModules: 0,
          progressPercent: 0,
          activeModuleId: "M01",
          nextAction: "INICIAR_BASELINE",
          roadmap: roadmap(),
          recommendations: [
            {
              id: "NEXT_STUDY",
              title: "Acompanhe sua próxima ação",
              description: "Veja a próxima atividade digital da sua jornada.",
              href: "/dashboard",
            },
            {
              id: "ACCOUNT_SECURITY",
              title: "Revise sua conta",
              description: "Confira recuperação, MFA e sessões da sua conta.",
              href: "/account",
            },
            {
              id: "REPORT_FEEDBACK",
              title: "Relate um problema ou melhoria",
              description: "Envie um relato sem anexos ou dados sensíveis.",
              href: "/#feedback-report-title",
            },
          ],
        }),
      ),
    });
  });

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Recomendações para você" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Revise sua conta" }),
  ).toHaveAttribute("href", "/account");
  await expect(
    page.getByRole("link", { name: "Relate um problema ou melhoria" }),
  ).toHaveAttribute("href", "/#feedback-report-title");
});
