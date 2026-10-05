import { expect, it, vi } from "vitest";

import { handleApiRequest } from "../http.js";
import { answer, attempt, dependencies } from "./fixtures.js";

it("returns the own attempt and saved responses without internal fields", async () => {
  const read = vi.fn(async () => ({ attempt, answers: [answer] }));
  const api = dependencies({ getParticipantAttempt: read });
  const response = await handleApiRequest(
    {
      method: "GET",
      path: `/api/v1/attempts/${attempt.attemptId}`,
      body: undefined,
    },
    api,
  );
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    success: true,
    data: {
      attemptId: attempt.attemptId,
      activityId: attempt.activityId,
      version: attempt.version,
      answers: [
        {
          itemId: answer.itemId,
          response: answer.response,
          savedAt: answer.savedAt,
        },
      ],
    },
  });
  expect(read).toHaveBeenCalledWith(attempt.participantId, attempt.attemptId);
  expect(JSON.stringify(response.body)).not.toMatch(
    /participantId|answerId|scopeId|rubric|sourceRefs/u,
  );
});

it("denies anonymous, foreign-owner and missing-scope reads before loading answers", async () => {
  const read = vi.fn(async () => ({ attempt, answers: [answer] }));
  const request = {
    method: "GET" as const,
    path: `/api/v1/attempts/${attempt.attemptId}`,
    body: undefined,
  };
  const anonymous = await handleApiRequest(
    request,
    dependencies({
      authenticate: async () => null,
      getParticipantAttempt: read,
    }),
  );
  expect(anonymous.status).toBe(401);
  const foreign = await handleApiRequest(
    request,
    dependencies({
      resolveAttempt: async () => ({ ...attempt, participantId: "foreign" }),
      getParticipantAttempt: read,
    }),
  );
  expect(foreign.status).toBe(403);
  const missingScope = await handleApiRequest(
    request,
    dependencies({
      resolveActivityScope: async () => null,
      getParticipantAttempt: read,
    }),
  );
  expect(missingScope.status).toBe(404);
  expect(read).not.toHaveBeenCalled();
});

it("fails closed for invalid identifiers and missing read integration", async () => {
  const malformed = await handleApiRequest(
    { method: "GET", path: "/api/v1/attempts/not-a-uuid", body: undefined },
    dependencies(),
  );
  expect(malformed.status).toBe(422);
  const unavailable = await handleApiRequest(
    {
      method: "GET",
      path: `/api/v1/attempts/${attempt.attemptId}`,
      body: undefined,
    },
    dependencies(),
  );
  expect(unavailable.status).toBe(503);
});
