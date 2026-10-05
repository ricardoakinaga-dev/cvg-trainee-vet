import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  expect,
  test,
  type Page,
  type Response as PlaywrightResponse,
} from "@playwright/test";

type RealFixture = Readonly<{
  readonly token: string;
  readonly activityId: string;
  readonly itemId: string;
  readonly activitySlug: string;
  readonly expectedAnswer: string;
  readonly source: "pre-provisioned-synthetic-activity-v1";
  readonly assignmentSource: "pre-provisioned-learning-assignment-v1";
  readonly staff: Readonly<{
    token: string;
    participantToken: string;
    scopeId: string;
    foreignScopeId: string;
  }>;
}>;

const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";
const webOrigin = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3100")
  .origin;
const fixtureOrigin = `http://127.0.0.1:${process.env.CVG_REAL_E2E_FIXTURE_PORT ?? "3102"}`;
const artifactPrefix =
  process.env.CVG_REAL_E2E_ARTIFACT_PREFIX ??
  `.agent/artifacts/remediation-20261003/r5-runtime-unmanaged-${Date.now()}`;
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
  response: PlaywrightResponse,
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
  response: PlaywrightResponse,
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
  if (requestId === undefined) throw new Error("API request ID is required");
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

async function assertHttpEnvelope(
  response: PlaywrightResponse,
  status: number,
  observations: RuntimeObservation[],
): Promise<ApiRecord> {
  expect(response.status(), await response.text()).toBe(status);
  const url = new URL(response.url());
  expect(url.origin).toBe(webOrigin);
  const requestId = response.headers()["x-request-id"];
  if (requestId === undefined) throw new Error("API request ID is required");
  expect(requestId).toMatch(uuidPattern);
  const payload = asRecord(await response.json(), "API envelope");
  expect(payload).toMatchObject({
    success: status < 400,
    meta: { request_id: requestId },
  });
  if (status >= 400) expect(payload).not.toHaveProperty("data");
  observations.push({
    method: response.request().method(),
    path: url.pathname,
    status,
    requestId,
  });
  return payload;
}

async function browserRequest(
  page: Page,
  method: "GET" | "POST",
  path: string,
  data?: ApiRecord,
): Promise<PlaywrightResponse> {
  const requestId = randomUUID();
  const target = new URL(path, webOrigin);
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        isProxyApiResponse(candidate, method, target.pathname) &&
        new URL(candidate.url()).search === target.search &&
        candidate.request().headers()["x-request-id"] === requestId,
    ),
    page.evaluate(
      async (command) => {
        const response = await fetch(command.path, {
          method: command.method,
          credentials: "include",
          headers: {
            "x-request-id": command.requestId,
            ...(command.data === undefined
              ? {}
              : { "content-type": "application/json" }),
          },
          ...(command.data === undefined
            ? {}
            : {
                body: JSON.stringify(command.data),
              }),
        });
        await response.text();
      },
      { method, path, data, requestId },
    ),
  ]);
  return response;
}

async function paintedScreenshot(page: Page, name: string): Promise<void> {
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.decode().catch(() => undefined),
      ),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: `${artifactPrefix}-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

test.beforeAll(async () => {
  if (process.env.CVG_RUN_REAL_E2E !== "true") {
    throw new Error("real-runtime tests require CVG_RUN_REAL_E2E=true");
  }

  let fixtureResponse: Response;
  try {
    fixtureResponse = await fetch(`${fixtureOrigin}/ready`);
  } catch (error) {
    throw new Error("real E2E fixture runtime is unavailable", {
      cause: error,
    });
  }
  const fixturePayload: unknown = await fixtureResponse.json();
  if (
    !fixtureResponse.ok ||
    !isRecord(fixturePayload) ||
    fixturePayload.ready !== true
  ) {
    throw new Error("real E2E fixture runtime is not ready");
  }

  let dependencyResponse: Response;
  try {
    dependencyResponse = await fetch(`${webOrigin}/health/dependencies`);
  } catch (error) {
    throw new Error("real API runtime is unavailable", { cause: error });
  }
  const dependencyPayload: unknown = await dependencyResponse.json();
  if (
    !dependencyResponse.ok ||
    !isRecord(dependencyPayload) ||
    !isRecord(dependencyPayload.data) ||
    dependencyPayload.data.status !== "READY" ||
    !isRecord(dependencyPayload.data.dependencies) ||
    dependencyPayload.data.dependencies.postgres !== "UP"
  ) {
    throw new Error("real API runtime or PostgreSQL is not ready");
  }
});

test.afterAll(async () => {
  if (process.env.CVG_RUN_REAL_E2E !== "true") return;
  const response = await fetch(`${fixtureOrigin}/shutdown`);
  const payload = (await response.json()) as Readonly<{ cleaned?: unknown }>;
  if (!response.ok || payload.cleaned !== true) {
    throw new Error("real E2E fixture cleanup did not complete");
  }
});

test("participant completes a persisted synthetic activity through the real API", async ({
  page,
  browser,
}) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;

  expect(fixture.source).toBe("pre-provisioned-synthetic-activity-v1");
  expect(fixture.assignmentSource).toBe(
    "pre-provisioned-learning-assignment-v1",
  );
  expect(fixture.activitySlug).toMatch(/^synthetic-real-e2e-[a-f0-9]{32}$/u);
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
      name: "Atividade sintética do fixture",
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
  if (typeof attemptId !== "string") throw new Error("Attempt ID is required");
  await expect(page.getByText("Tentativa iniciada.")).toBeVisible();

  const answerInput = page.locator(`#answer-${fixture.itemId}`);
  await expect(answerInput).toHaveCount(1);
  await expect(answerInput).toBeEditable();
  await answerInput.fill(fixture.expectedAnswer);
  await expect(answerInput).toHaveValue(fixture.expectedAnswer);

  await expect(
    page.getByRole("button", { name: "Enviar tentativa" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Salve as alterações nas respostas antes de enviar a tentativa.",
    ),
  ).toBeVisible();
  const sidebarHeadingLines = async () =>
    page
      .locator(".privacy-card .section-heading h2")
      .evaluateAll((headings) =>
        headings.map(
          (heading) =>
            heading.getBoundingClientRect().height /
            Number.parseFloat(getComputedStyle(heading).lineHeight),
        ),
      );
  expect((await sidebarHeadingLines()).every((lines) => lines <= 3.1)).toBe(
    true,
  );
  await paintedScreenshot(page, "participant-pending-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await sidebarHeadingLines()).every((lines) => lines <= 3.1)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await paintedScreenshot(page, "participant-pending-mobile");
  await page.setViewportSize({ width: 1280, height: 720 });

  const replayedOperations = new Map<string, string>();
  await page.route(
    /\/api\/v1\/attempts\/[^/]+\/(?:answers|submit)$/u,
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      const body = route.request().postData();
      expect(body).not.toBeNull();
      if (replayedOperations.has(path)) {
        expect(body).toBe(replayedOperations.get(path));
        await route.continue();
        return;
      }
      replayedOperations.set(path, body!);
      // Both requests reach the real API/PG concurrently. Lose their response
      // only after confirming the committed projections agree.
      const [first, concurrent] = await Promise.all([
        route.fetch(),
        route.fetch(),
      ]);
      expect(first.status()).toBe(200);
      expect(concurrent.status()).toBe(200);
      const firstPayload = (await first.json()) as { data: unknown };
      const concurrentPayload = (await concurrent.json()) as { data: unknown };
      expect(concurrentPayload.data).toEqual(firstPayload.data);
      await route.abort("failed");
    },
  );

  const answerResponse = page.waitForResponse((response) =>
    isProxyApiResponse(
      response,
      "POST",
      `/api/v1/attempts/${attemptId}/answers`,
    ),
  );
  await page.getByRole("button", { name: "Salvar resposta" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível concluir a operação." }),
  ).toHaveText("Não foi possível concluir a operação. Tente novamente.");
  await expect(answerInput).toHaveValue(fixture.expectedAnswer);
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

  await page.reload();
  await expect(answerInput).toHaveValue(fixture.expectedAnswer);
  await expect(
    page.getByRole("button", { name: "Enviar tentativa" }),
  ).toBeEnabled();
  await paintedScreenshot(page, "participant-restored-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await paintedScreenshot(page, "participant-restored-mobile");
  await page.setViewportSize({ width: 1280, height: 720 });

  const submitResponse = page.waitForResponse((response) =>
    isProxyApiResponse(
      response,
      "POST",
      `/api/v1/attempts/${attemptId}/submit`,
    ),
  );
  await page.getByRole("button", { name: "Enviar tentativa" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível concluir a operação." }),
  ).toHaveText("Não foi possível concluir a operação. Tente novamente.");
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
    storageState: { cookies: persistedCookies, origins: [] },
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
    if (resumed.requestId === null)
      throw new Error("API request ID is required");
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
      count: 2,
      eventTypes: expect.arrayContaining([
        "answer.saved.v1",
        "attempt.submitted.v1",
      ]),
    },
    audit: {
      count: 3,
      actions: expect.arrayContaining([
        "ATTEMPT_STARTED",
        "ANSWER_SAVED",
        "ATTEMPT_SUBMITTED",
      ]),
    },
  });
  expect(persistenceResponse.status).toBe(200);
  expect(replayedOperations.size).toBe(2);

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

test("moderator uses a real invitation/session and protected staff data denies unauthorized access", async ({
  page,
  browser,
}) => {
  const fixture = JSON.parse(
    await readFile(fixtureFile, "utf8"),
  ) as RealFixture;
  expect(
    fixture.staff,
    "fixture must provision a real moderator invitation",
  ).toBeDefined();
  const observations: RuntimeObservation[] = [];
  const protectedPaths = [
    "/api/v1/session/current",
    "/api/v1/dashboard",
    "/api/v1/internal/session/scopes",
  ];
  await page.goto("/");
  for (const path of protectedPaths) {
    await assertHttpEnvelope(
      await browserRequest(page, "GET", path),
      401,
      observations,
    );
  }
  await page.goto("/operations");
  await expect(page).toHaveURL(`${webOrigin}/?access=required`);
  await expect(page.getByLabel("Token de convite")).toBeVisible();
  await expect(page.getByTestId("staff-dashboard")).toHaveCount(0);

  const accepted = await browserRequest(
    page,
    "POST",
    "/api/v1/invitations/accept",
    { token: fixture.staff.token, sessionExpiresInSeconds: 3600 },
  );
  await assertHttpEnvelope(accepted, 200, observations);
  const setCookie = (await accepted.allHeaders())["set-cookie"];
  expect(setCookie).toMatch(/^__Host-cvg_session=[A-Za-z0-9_-]{32,256};/u);
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("Secure");
  expect(setCookie).toContain("SameSite=Lax");
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (cookie) => cookie.name === "__Host-cvg_session",
  );
  expect(sessionCookie).toMatchObject({
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "Lax",
  });
  expect(setCookie).toContain(`__Host-cvg_session=${sessionCookie?.value};`);
  expect(sessionCookie?.value).not.toBe("synthetic-e2e-session");
  const current = await assertHttpEnvelope(
    await browserRequest(page, "GET", "/api/v1/session/current"),
    200,
    observations,
  );
  expect(current.data).toEqual({ status: "active" });
  const scopes = await assertHttpEnvelope(
    await browserRequest(page, "GET", "/api/v1/internal/session/scopes"),
    200,
    observations,
  );
  expect(scopes.data).toMatchObject({
    kind: "internal_session_scopes",
    scopes: [fixture.staff.scopeId],
  });

  const dashboardResponse = page.waitForResponse((response) =>
    isProxyApiResponse(response, "GET", "/api/v1/dashboard"),
  );
  await page.goto("/operations");
  const dashboard = asRecord(
    await assertApiSuccess(await dashboardResponse, 200, observations),
    "staff dashboard",
  );
  expect(dashboard).toMatchObject({
    kind: "staff",
    scopes: [fixture.staff.scopeId],
  });
  await expect(
    page.getByRole("heading", { name: "Saúde do ambiente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Acompanhar evolução" }),
  ).toBeVisible();
  await expect(page.getByTestId("staff-dashboard")).toBeVisible();
  await expect(page.getByTestId("operations-ready")).toContainText(
    "PostgreSQL",
  );
  await paintedScreenshot(page, "staff-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await paintedScreenshot(page, "staff-mobile");

  const reportPath = "/api/v1/internal/reports/continuing-education";
  const ownReport = await assertHttpEnvelope(
    await browserRequest(
      page,
      "GET",
      `${reportPath}?scopeId=${fixture.staff.scopeId}`,
    ),
    200,
    observations,
  );
  expect(ownReport.data).toMatchObject({ scopeId: fixture.staff.scopeId });
  await assertHttpEnvelope(
    await browserRequest(
      page,
      "GET",
      `${reportPath}?scopeId=${fixture.staff.foreignScopeId}`,
    ),
    403,
    observations,
  );
  expect(JSON.stringify(dashboard)).not.toContain(fixture.staff.foreignScopeId);

  const participantContext = await browser.newContext({ baseURL: webOrigin });
  try {
    const participantPage = await participantContext.newPage();
    await participantPage.goto("/");
    const participantAccepted = await browserRequest(
      participantPage,
      "POST",
      "/api/v1/invitations/accept",
      {
        token: fixture.staff.participantToken,
        sessionExpiresInSeconds: 3600,
      },
    );
    await assertHttpEnvelope(participantAccepted, 200, observations);
    await assertHttpEnvelope(
      await browserRequest(
        participantPage,
        "GET",
        "/api/v1/internal/session/scopes",
      ),
      403,
      observations,
    );
    await assertHttpEnvelope(
      await browserRequest(
        participantPage,
        "GET",
        `${reportPath}?scopeId=${fixture.staff.scopeId}`,
      ),
      403,
      observations,
    );
    const participantDashboard = await assertHttpEnvelope(
      await browserRequest(participantPage, "GET", "/api/v1/dashboard"),
      200,
      observations,
    );
    expect(
      asRecord(participantDashboard.data, "participant dashboard").kind,
    ).toBe("participant");
    await participantPage.goto("/operations");
    await expect(participantPage).toHaveURL(`${webOrigin}/?access=required`);
    await expect(participantPage.locator("main")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(
      participantPage.getByText("Sessão ativa", { exact: true }),
    ).toBeVisible();
    await expect(participantPage.getByLabel("Token de convite")).toHaveCount(0);
    await expect(participantPage.getByTestId("staff-dashboard")).toHaveCount(0);
    await assertHttpEnvelope(
      await browserRequest(participantPage, "GET", "/api/v1/session/current"),
      200,
      observations,
    );
  } finally {
    await participantContext.close();
  }

  // Retain the actual issued cookie in a separate context before revocation;
  // replay must fail server-side even though this context still holds it.
  const revokedContext = await browser.newContext({
    baseURL: webOrigin,
    storageState: { cookies, origins: [] },
  });
  try {
    const revoked = await browserRequest(
      page,
      "POST",
      "/api/v1/session/revoke",
      {},
    );
    await assertHttpEnvelope(revoked, 200, observations);
    expect((await revoked.allHeaders())["set-cookie"]).toContain("Max-Age=0");
    const revokedPage = await revokedContext.newPage();
    await revokedPage.goto("/");
    for (const path of protectedPaths) {
      await assertHttpEnvelope(
        await browserRequest(revokedPage, "GET", path),
        401,
        observations,
      );
    }
    await revokedPage.goto("/operations");
    await expect(revokedPage).toHaveURL(`${webOrigin}/?access=required`);
    await expect(revokedPage.getByLabel("Token de convite")).toBeVisible();
    await expect(revokedPage.getByTestId("staff-dashboard")).toHaveCount(0);
  } finally {
    await revokedContext.close();
  }
  const evidence = await fetch(`${fixtureOrigin}/staff-evidence`);
  expect(evidence.status).toBe(200);
  expect(await evidence.json()).toMatchObject({
    verified: true,
    moderator: {
      roles: ["MODERATOR"],
      scopes: [fixture.staff.scopeId],
      revoked: true,
    },
    participant: { roles: ["PARTICIPANT"], scopes: [fixture.staff.scopeId] },
  });
  await test.info().attach("real-staff-access-observations", {
    body: JSON.stringify(observations, null, 2),
    contentType: "application/json",
  });
});
