import { readFile } from "node:fs/promises";

import { expect, test, type Page, type Response } from "@playwright/test";

// Staging-only browser journey (AAA-FINAL-006 §43). Unlike the CI-shaped
// real-runtime spec, this runs against the full staging stack: web + API,
// real PostgreSQL, real Qdrant (UP, not DISABLED) and a live worker. It
// authenticates BEFORE touching /operations, because the web proxy
// server-side redirects anonymous /operations traffic (307) by design.
// Selected via CVG_STAGING_BROWSER=1 (see playwright.config.ts testIgnore).

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

async function acceptInvitation(
  page: Page,
  fixture: RealFixture,
  observations: RuntimeObservation[],
): Promise<void> {
  const invitationResponse = page.waitForResponse((response) =>
    isProxyApiResponse(response, "POST", "/api/v1/invitations/accept"),
  );
  await page.goto(`/?activityId=${fixture.activityId}`);
  await page.getByLabel("Token de convite").fill(fixture.token);
  await page.getByRole("button", { name: "Ativar acesso" }).click();
  const acceptedData = asRecord(
    await assertApiSuccess(await invitationResponse, 200, observations),
    "invitation acceptance",
  );
  expect(acceptedData).toEqual({ status: "active" });
}

test.describe("staging browser journey", () => {
  test("participant completes a persisted synthetic activity through the real API", async ({
    page,
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

    await acceptInvitation(page, fixture, observations);
    const journeyData = asRecord(
      await assertApiSuccess(await journeyResponse, 200, observations),
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
      await assertApiSuccess(await activityResponse, 200, observations),
      "activity",
    );
    expect(activityData.activityId).toBe(fixture.activityId);

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
    const attemptId = started.attemptId;
    expect(attemptId).toMatch(uuidPattern);
    // Wait for the client to rehydrate the answer form with attempt/activity
    // state before saving (mirrors the real-runtime spec; otherwise the
    // browser posts before state settles and validation rejects 422).
    await expect(page.getByText("Tentativa iniciada.")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Atividade real sintética",
      }),
    ).toBeVisible();

    const answerInput = page.locator(`#answer-${fixture.itemId}`);
    await answerInput.fill(fixture.expectedAnswer);
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
    });

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
    });

    const persistenceResponse = await fetch(
      `${fixtureOrigin}/evidence?attemptId=${encodeURIComponent(attemptId as string)}`,
    );
    const persistenceEvidence: unknown = await persistenceResponse.json();
    expect(persistenceEvidence).toMatchObject({ verified: true });
    expect(persistenceResponse.status).toBe(200);

    await expect(page.locator("body")).not.toContainText("participantId");
    await expect(page.locator("body")).not.toContainText("tokenHash");
  });
});
