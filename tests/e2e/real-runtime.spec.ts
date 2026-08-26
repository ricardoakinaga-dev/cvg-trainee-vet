import { readFile } from "node:fs/promises";

import { expect, test, type Response } from "@playwright/test";

type RealFixture = Readonly<{
  readonly token: string;
  readonly activityId: string;
  readonly itemId: string;
  readonly activitySlug: string;
  readonly expectedAnswer: string;
  readonly source: "authoring-publication-v1";
  readonly assignmentSource: "pre-provisioned-learning-assignment-v1";
}>;

const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";
const webOrigin = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3100")
  .origin;
const fixtureOrigin = `http://127.0.0.1:${process.env.CVG_REAL_E2E_FIXTURE_PORT ?? "3102"}`;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type ApiRecord = Readonly<Record<string, unknown>>;
type RuntimeObservation = Readonly<{
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly requestId: string;
}>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isProxyApiResponse(
  response: Response,
  method: string,
  path: string,
): boolean {
  try {
    const url = new URL(response.url());
    return (
      url.origin === webOrigin &&
      url.pathname === path &&
      response.request().method() === method
    );
  } catch {
    return false;
  }
}

async function assertApiSuccess(
  response: Response,
  expectedStatus: number,
  observations: RuntimeObservation[],
): Promise<unknown> {
  if (response.status() !== expectedStatus) {
    throw new Error(
      `Expected ${response.request().method()} ${response.url()} to return ${expectedStatus}, got ${response.status()}: ${await response.text()}`,
    );
  }
  const url = new URL(response.url());
  expect(url.origin).toBe(webOrigin);
  const requestId = response.headers()["x-request-id"];
  expect(requestId).toMatch(uuidPattern);
  const payload: unknown = await response.json();
  expect(payload).toMatchObject({
    success: true,
    meta: { request_id: requestId },
  });
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    throw new Error("API success envelope is not an object");
  }
  observations.push({
    method: response.request().method(),
    path: url.pathname,
    status: response.status(),
    requestId,
  });
  return payload.data;
}

function asRecord(value: unknown, label: string): ApiRecord {
  if (!isRecord(value)) throw new Error(`${label} projection is not an object`);
  return value;
}

test.afterAll(async () => {
  if (process.env.CVG_RUN_REAL_E2E !== "true") return;
  const response = await fetch(`${fixtureOrigin}/shutdown`);
  const payload = (await response.json()) as Readonly<{ cleaned?: unknown }>;
  if (!response.ok || payload.cleaned !== true) {
    throw new Error("real E2E fixture cleanup did not complete");
  }
});

test("browser reaches the real API through the web proxy", async ({ page }) => {
  const observations: RuntimeObservation[] = [];
  const dependencyResponse = page.waitForResponse(
    (response) =>
      isProxyApiResponse(response, "GET", "/health/dependencies") &&
      response.request().resourceType() === "fetch",
  );

  await page.goto("/operations");
  const response = await dependencyResponse;

  const dependencyData = asRecord(
    await assertApiSuccess(response, 200, observations),
    "dependency",
  );
  expect(dependencyData).toMatchObject({
    status: "READY",
    dependencies: {
      postgres: "UP",
      qdrant: "DISABLED",
      ai: "DISABLED",
    },
  });
  await expect(page.getByTestId("operations-ready")).toBeVisible();
  await expect(page.getByText(/Estado geral:/u)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("password");
  await expect(page.locator("body")).not.toContainText("api_key");
  await expect(page.locator("body")).not.toContainText("postgresql://");
});

test("participant completes a persisted synthetic activity through the real API", async ({
  page,
  browser,
}) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;

  expect(fixture.source).toBe("authoring-publication-v1");
  expect(fixture.assignmentSource).toBe(
    "pre-provisioned-learning-assignment-v1",
  );
  expect(fixture.activitySlug).toMatch(/^authoring-[a-f0-9]{32}$/u);
  expect(fixture.expectedAnswer).toBe("Resposta sintética persistida.");

  const observations: RuntimeObservation[] = [];
  const invitationResponse = page.waitForResponse((response) =>
    isProxyApiResponse(response, "POST", "/api/v1/invitations/accept"),
  );
  const journeyResponse = page.waitForResponse((response) =>
    isProxyApiResponse(response, "GET", "/api/v1/learning-path"),
  );
  const activityResponse = page.waitForResponse((response) =>
    isProxyApiResponse(
      response,
      "GET",
      `/api/v1/activities/${fixture.activityId}`,
    ),
  );

  await page.goto(`/?activityId=${fixture.activityId}`);
  await page.getByLabel("Token de convite").fill(fixture.token);
  await page.getByRole("button", { name: "Ativar acesso" }).click();

  const [accepted, loadedJourney, loadedActivity] = await Promise.all([
    invitationResponse,
    journeyResponse,
    activityResponse,
  ]);
  const acceptedData = asRecord(
    await assertApiSuccess(accepted, 200, observations),
    "invitation acceptance",
  );
  expect(acceptedData).toEqual({ status: "active" });
  const journeyData = asRecord(
    await assertApiSuccess(loadedJourney, 200, observations),
    "journey",
  );
  expect(journeyData.activities).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        activityId: fixture.activityId,
        status: "DISPONIVEL",
      }),
    ]),
  );
  const activityData = asRecord(
    await assertApiSuccess(loadedActivity, 200, observations),
    "activity",
  );
  expect(activityData.activityId).toBe(fixture.activityId);
  expect(activityData.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        itemId: fixture.itemId,
        responseMode: "TEXT",
      }),
    ]),
  );
  const serializedActivity = JSON.stringify(activityData);
  expect(serializedActivity).not.toContain('"sourceRefs"');
  expect(serializedActivity).not.toContain('"rubric"');
  expect(serializedActivity).not.toContain('"participantText"');

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Atividade real sintética",
    }),
  ).toBeVisible();

  const startResponse = page.waitForResponse((response) =>
    isProxyApiResponse(response, "POST", "/api/v1/attempts"),
  );
  await page.getByRole("button", { name: "Iniciar tentativa" }).click();
  const started = asRecord(
    await assertApiSuccess(await startResponse, 201, observations),
    "attempt start",
  );
  expect(started.activityId).toBe(fixture.activityId);
  expect(started.status).toBe("EM_ANDAMENTO");
  expect(started.version).toBe(1);
  const attemptId = started.attemptId;
  expect(attemptId).toMatch(uuidPattern);
  await expect(page.getByText("Tentativa iniciada.")).toBeVisible();

  const answerInput = page.locator(`#answer-${fixture.itemId}`);
  await expect(answerInput).toHaveCount(1);
  await expect(answerInput).toBeEditable();
  await answerInput.fill(fixture.expectedAnswer);
  await expect(answerInput).toHaveValue(fixture.expectedAnswer);

  const answerResponse = page.waitForResponse((response) =>
    isProxyApiResponse(
      response,
      "POST",
      `/api/v1/attempts/${attemptId}/answers`,
    ),
  );
  await page.getByRole("button", { name: "Salvar resposta" }).click();
  const saved = asRecord(
    await assertApiSuccess(await answerResponse, 200, observations),
    "answer save",
  );
  expect(saved).toMatchObject({
    attemptId,
    activityId: fixture.activityId,
    status: "SALVA",
    version: 2,
    answers: [
      expect.objectContaining({
        itemId: fixture.itemId,
        response: fixture.expectedAnswer,
      }),
    ],
  });
  await expect(page.getByText("Resposta salva.")).toBeVisible();

  const submitResponse = page.waitForResponse((response) =>
    isProxyApiResponse(
      response,
      "POST",
      `/api/v1/attempts/${attemptId}/submit`,
    ),
  );
  await page.getByRole("button", { name: "Enviar tentativa" }).click();
  const submitted = asRecord(
    await assertApiSuccess(await submitResponse, 200, observations),
    "attempt submission",
  );
  expect(submitted).toMatchObject({
    attemptId,
    activityId: fixture.activityId,
    status: "SUBMETIDA",
    version: 3,
  });
  await expect(page.getByText("Tentativa submetida.")).toBeVisible();

  const persistedCookies = await page.context().cookies();
  const resumedContext = await browser.newContext({
    baseURL: webOrigin,
    storageState: { cookies: persistedCookies },
  });
  try {
    const resumedPage = await resumedContext.newPage();
    await resumedPage.goto(`/?activityId=${fixture.activityId}`);
    const resumed = await resumedPage.evaluate(async () => {
      const response = await fetch("/api/v1/learning-path", {
        credentials: "include",
      });
      return {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        payload: await response.json(),
      };
    });
    expect(resumed.status).toBe(200);
    expect(resumed.requestId).toMatch(uuidPattern);
    expect(resumed.payload).toMatchObject({
      success: true,
      meta: { request_id: resumed.requestId },
    });
    const resumedData = asRecord(resumed.payload.data, "resumed journey");
    expect(resumedData.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityId: fixture.activityId,
          attemptId,
          attemptStatus: "SUBMETIDA",
          attemptVersion: 3,
        }),
      ]),
    );
    observations.push({
      method: "GET",
      path: "/api/v1/learning-path",
      status: resumed.status,
      requestId: resumed.requestId,
    });
    await resumedPage.close();
  } finally {
    await resumedContext.close();
  }

  const persistenceResponse = await fetch(
    `${fixtureOrigin}/evidence?attemptId=${encodeURIComponent(attemptId)}`,
  );
  const persistenceEvidence: unknown = await persistenceResponse.json();
  expect(persistenceEvidence).toMatchObject({
    verified: true,
    attempt: { status: "SUBMETIDA", version: 3, hasSubmittedAt: true },
    answer: { itemId: fixture.itemId, response: fixture.expectedAnswer },
    idempotency: { attempt: 2, answer: 1 },
    outbox: {
      eventTypes: expect.arrayContaining([
        "answer.saved.v1",
        "attempt.submitted.v1",
      ]),
    },
    audit: {
      actions: expect.arrayContaining([
        "ATTEMPT_STARTED",
        "ANSWER_SAVED",
        "ATTEMPT_SUBMITTED",
      ]),
    },
  });
  expect(persistenceResponse.status).toBe(200);

  expect(observations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: "POST",
        path: "/api/v1/invitations/accept",
        status: 200,
      }),
      expect.objectContaining({
        method: "GET",
        path: "/api/v1/learning-path",
        status: 200,
      }),
      expect.objectContaining({
        method: "GET",
        path: `/api/v1/activities/${fixture.activityId}`,
        status: 200,
      }),
      expect.objectContaining({
        method: "POST",
        path: "/api/v1/attempts",
        status: 201,
      }),
      expect.objectContaining({
        method: "POST",
        path: `/api/v1/attempts/${attemptId}/answers`,
        status: 200,
      }),
      expect.objectContaining({
        method: "POST",
        path: `/api/v1/attempts/${attemptId}/submit`,
        status: 200,
      }),
    ]),
  );
  await expect(page.locator("body")).not.toContainText("participantId");
  await expect(page.locator("body")).not.toContainText("participantText");
  await expect(page.locator("body")).not.toContainText("tokenHash");
});
