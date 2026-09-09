import { describe, expect, it, vi } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleCorrection,
  handleSaveAnswer,
  handleStart,
  handleSubmit,
} from "./attempts.handler.js";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVITY_ID = "33333333-3333-4333-8333-333333333333";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["scope-1"],
};

const attempt = {
  attemptId: ATTEMPT_ID,
  participantId: PARTICIPANT_ID,
  activityId: ACTIVITY_ID,
  status: "EM_ANDAMENTO",
  version: 1,
} as const;

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    resolveActivityScope: async () => "scope-1",
    resolveAttempt: async () => ({ ...attempt }),
    ...overrides,
  } as ApiHttpDependencies;
}

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/attempts", body };
}

describe("attempts feature handlers", () => {
  it("branch=validation/risk=malformed-input: rejects start with invalid body (422)", async () => {
    const startAttempt = vi.fn(async () => ({ ...attempt }));
    const response = await handleStart(
      request({ activityId: "not-an-id" }),
      "request-1",
      principal,
      baseDependencies({ startAttempt }),
    );
    expect(response.status).toBe(422);
    expect(startAttempt).not.toHaveBeenCalled();
  });

  it("branch=not_found/risk=idor-probe: denies start outside the principal scope (403)", async () => {
    const startAttempt = vi.fn(async () => ({ ...attempt }));
    const response = await handleStart(
      request({
        activityId: ACTIVITY_ID,
        idempotencyKey: "idempotency-key-start-01",
      }),
      "request-1",
      principal,
      baseDependencies({
        resolveActivityScope: async () => "scope-other",
        startAttempt,
      }),
    );
    expect(response.status).toBe(403);
    expect(startAttempt).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: starts an attempt without leaking participantId (201)", async () => {
    const startAttempt = vi.fn(async () => ({ ...attempt }));
    const response = await handleStart(
      request({
        activityId: ACTIVITY_ID,
        idempotencyKey: "idempotency-key-start-01",
      }),
      "request-1",
      principal,
      baseDependencies({ startAttempt }),
    );
    expect(response.status).toBe(201);
    expect(startAttempt).toHaveBeenCalledWith({
      participantId: PARTICIPANT_ID,
      activityId: ACTIVITY_ID,
      scopeId: "scope-1",
      idempotencyKey: "idempotency-key-start-01",
      correlationId: "request-1",
    });
    expect(JSON.stringify(response.body)).not.toContain(PARTICIPANT_ID);
  });

  it("branch=validation/risk=replay-confusion: rejects saveAnswer on attemptId mismatch (422)", async () => {
    const saveAnswer = vi.fn();
    const response = await handleSaveAnswer(
      request({
        attemptId: ATTEMPT_ID,
        activityId: ACTIVITY_ID,
        itemId: "55555555-5555-4555-8555-555555555555",
        response: "resposta própria",
        idempotencyKey: "idempotency-key-answer-01",
      }),
      "99999999-9999-4999-8999-999999999999",
      "request-1",
      principal,
      baseDependencies({ saveAnswer }),
    );
    expect(response.status).toBe(422);
    expect(saveAnswer).not.toHaveBeenCalled();
  });

  it("branch=not_found/risk=idor-probe: denies saveAnswer on unknown attempt (404)", async () => {
    const saveAnswer = vi.fn();
    const response = await handleSaveAnswer(
      request({
        attemptId: ATTEMPT_ID,
        activityId: ACTIVITY_ID,
        itemId: "55555555-5555-4555-8555-555555555555",
        response: "resposta própria",
        idempotencyKey: "idempotency-key-answer-02",
      }),
      ATTEMPT_ID,
      "request-1",
      principal,
      baseDependencies({ resolveAttempt: async () => null, saveAnswer }),
    );
    expect(response.status).toBe(404);
    expect(saveAnswer).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: submits with server timestamp (200)", async () => {
    const submitAttempt = vi.fn(async () => ({
      ...attempt,
      status: "SUBMETIDA" as const,
    }));
    const response = await handleSubmit(
      request({
        attemptId: ATTEMPT_ID,
        idempotencyKey: "idempotency-key-submit-01",
      }),
      ATTEMPT_ID,
      "request-1",
      principal,
      baseDependencies({ submitAttempt }),
    );
    expect(response.status).toBe(200);
    expect(submitAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: ATTEMPT_ID,
        participantId: PARTICIPANT_ID,
        scopeId: "scope-1",
        idempotencyKey: "idempotency-key-submit-01",
      }),
    );
  });

  it("branch=forbidden-scope/risk=cross-scope: denies correction on scope mismatch (403)", async () => {
    const correctOpenResponse = vi.fn();
    const response = await handleCorrection(
      request({
        scopeId: "88888888-8888-4888-8888-888888888888",
        idempotencyKey: "idempotency-key-correct-01",
        score: 8,
        outcome: "APROVADO",
        feedback: "ok",
        ruleVersion: "rubrica-v1",
      }),
      ATTEMPT_ID,
      "request-1",
      principal,
      baseDependencies({ correctOpenResponse }),
    );
    expect(response.status).toBe(403);
    expect(correctOpenResponse).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: corrects an open response (200)", async () => {
    const corrected = {
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: ATTEMPT_ID,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback formativo interno.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    };
    const correctOpenResponse = vi.fn(async () => corrected);
    const response = await handleCorrection(
      request({
        scopeId: "99999999-9999-4999-8999-999999999999",
        idempotencyKey: "idempotency-key-correct-01",
        score: 82,
        outcome: "APROVADO",
        feedback: "Feedback formativo interno.",
        ruleVersion: "rubrica-v1",
      }),
      ATTEMPT_ID,
      "request-1",
      principal,
      baseDependencies({
        resolveActivityScope: async () =>
          "99999999-9999-4999-8999-999999999999",
        correctOpenResponse,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { score: 82, outcome: "APROVADO" },
    });
  });
});
