import { expect, test } from "@playwright/test";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

function successEnvelope(data: unknown) {
  return { success: true, data, meta: { request_id: "authoring-e2e" } };
}

const authoringRecord = {
  contentId,
  version: 1,
  scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId: "33333333-3333-4333-8333-333333333333",
  contentStatus: "EM_REVISAO_CLINICA",
  item: {
    title: "Prioridade sintética",
    prompt: "Escolha a próxima ação segura.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar e reavaliar." },
      { id: "b", label: "B", text: "Aguardar sem meta." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Defina uma meta.",
    critical: true,
    remediationTargetObjectiveId: "M02-OBJ-01",
    sourceRefs: [{ code: "F-02", locator: "interno", updateRequired: true }],
    participant: {
      id: contentId,
      ordinal: 1,
      kind: "QUESTAO",
      title: "Prioridade sintética",
      prompt: "Escolha a próxima ação segura.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Priorizar e reavaliar." },
        { id: "b", label: "B", text: "Aguardar sem meta." },
      ],
      selectionMode: "SINGLE",
    },
  },
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    readyForClinicalReview: true,
    readyForPublication: false,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: "2026-08-10T05:00:00.000Z",
  },
};

test("clinical reviewer can inspect and decide an internal authoring item", async ({
  page,
}) => {
  await page.route(
    `**/api/v1/internal/content/${contentId}/versions/1/authoring`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(authoringRecord)),
      });
    },
  );
  await page.route(
    `**/api/v1/internal/content/${contentId}/review`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            ...authoringRecord,
            contentStatus: "APROVADO_CLINICAMENTE",
          }),
        ),
      });
    },
  );

  await page.goto(`/authoring?contentId=${contentId}&version=1`);
  await expect(
    page.getByRole("heading", { name: "Prioridade sintética" }),
  ).toBeVisible();
  await expect(page.getByText("F-02 · interno")).toBeVisible();
  await expect(page.getByText("gabarito")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar clinicamente" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Revisão clínica registrada.",
  );
});
