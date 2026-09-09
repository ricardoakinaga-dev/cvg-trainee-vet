import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@cvg/application";

import { handleApiRequest } from "../http.js";
import { activity, answer, attempt, dependencies } from "./fixtures.js";

describe("API HTTP boundary — attempts boundary", () => {
  it("requires authentication before starting an attempt", async () => {
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({ authenticate: async () => null }),
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "unauthenticated" },
    });
  });
  it("validates, authorizes, and projects start responses without participant internals", async () => {
    const startAttempt = vi.fn(async () => attempt);
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({ startAttempt }),
    );

    expect(response.status).toBe(201);
    expect(startAttempt).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      activityId: attempt.activityId,
      scopeId: "scope-1",
      idempotencyKey: "start-attempt-2026-08-09",
      correlationId: "request-123",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        attemptId: attempt.attemptId,
        activityId: attempt.activityId,
        status: "EM_ANDAMENTO",
        version: 1,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
  });
  it("maps an idempotency conflict to HTTP 409 at the public attempt boundary", async () => {
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-http-conflict",
        },
      },
      dependencies({
        startAttempt: vi.fn(async () => {
          throw new ApplicationError(
            "idempotency_conflict",
            "Idempotency key was already used with another command",
          );
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "idempotency_conflict" },
    });
  });
  it("rejects invalid input and an activity outside the principal scope", async () => {
    const startAttempt = vi.fn(async () => attempt);
    const invalid = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: { activityId: "not-an-id" },
      },
      dependencies({ startAttempt }),
    );
    const outsideScope = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/attempts",
        body: {
          activityId: attempt.activityId,
          idempotencyKey: "start-attempt-2026-08-09",
        },
      },
      dependencies({
        resolveActivityScope: async () => "scope-other",
        startAttempt,
      }),
    );

    expect(invalid.status).toBe(422);
    expect(outsideScope.status).toBe(403);
    expect(startAttempt).not.toHaveBeenCalled();
  });
  it("submits using a server timestamp and returns no internal answer key", async () => {
    const submitAttempt = vi.fn(async () => ({
      ...attempt,
      status: "SUBMETIDA" as const,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/attempts/${attempt.attemptId}/submit`,
        body: { idempotencyKey: "submit-attempt-2026-08-09" },
      },
      dependencies({ submitAttempt }),
    );

    expect(response.status).toBe(200);
    expect(submitAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        participantId: attempt.participantId,
        idempotencyKey: "submit-attempt-2026-08-09",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SUBMETIDA" },
    });
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
  });
  it("saves an own answer and returns only the participant projection", async () => {
    const saveAnswer = vi.fn(async () => ({
      attempt: { ...attempt, status: "SALVA" as const, version: 2 },
      answer,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/attempts/${attempt.attemptId}/answers`,
        body: {
          attemptId: attempt.attemptId,
          activityId: attempt.activityId,
          itemId: answer.itemId,
          response: answer.response,
          idempotencyKey: "save-answer-2026-08-09",
        },
      },
      dependencies({
        saveAnswer,
        getParticipantActivity: async () => ({
          ...activity,
          items: [
            {
              itemId: answer.itemId,
              ordinal: 1,
              kind: "QUESTAO",
              title: "Prioridades",
              text: "Texto autoral.",
              responseMode: "TEXT",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(saveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        participantId: attempt.participantId,
        itemId: answer.itemId,
        correlationId: "request-123",
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "SALVA", answers: [{ itemId: answer.itemId }] },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("answer_key");
  });
  it("rejects an answer item outside the participant activity", async () => {
    const saveAnswer = vi.fn(async () => ({
      attempt: { ...attempt, status: "SALVA" as const, version: 2 },
      answer,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/attempts/${attempt.attemptId}/answers`,
        body: {
          attemptId: attempt.attemptId,
          activityId: attempt.activityId,
          itemId: "99999999-9999-4999-8999-999999999999",
          response: "Resposta sintética.",
          idempotencyKey: "save-answer-outside-activity",
        },
      },
      dependencies({
        saveAnswer,
        hasParticipantActivityItem: async () => false,
      }),
    );

    expect(response.status).toBe(404);
    expect(saveAnswer).not.toHaveBeenCalled();
  });
  it("allows only the configured internal correction route and projects no internal actor data", async () => {
    const correctionScope = "99999999-9999-4999-8999-999999999999";
    const correctOpenResponse = vi.fn(async () => ({
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: attempt.attemptId,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback formativo interno.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/attempts/${attempt.attemptId}/correct`,
        body: {
          scopeId: correctionScope,
          idempotencyKey: "correct-attempt-2026",
          score: 82,
          outcome: "APROVADO",
          feedback: "Feedback formativo interno.",
          ruleVersion: "rubrica-v1",
        },
      },
      dependencies({
        approvedClinicalApproverId: attempt.participantId,
        resolveActivityScope: async () => correctionScope,
        authenticate: async () => ({
          principalId: attempt.participantId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [correctionScope],
        }),
        correctOpenResponse,
      }),
    );

    expect(response.status).toBe(200);
    expect(correctOpenResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: attempt.attemptId,
        approvedClinicalApproverId: attempt.participantId,
        score: 82,
      }),
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        attemptStatus: "CORRIGIDA_HUMANAMENTE",
        resultVersion: 1,
        feedback: "Feedback formativo interno.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("correctedBy");
    expect(JSON.stringify(response.body)).not.toContain("resultId");
  });
  it("returns feedback only to the attempt owner and omits internal correction identity", async () => {
    const getAttemptFeedback = vi.fn(async () => ({
      attempt: {
        ...attempt,
        status: "CORRIGIDA_HUMANAMENTE" as const,
        version: 5,
      },
      result: {
        resultId: "77777777-7777-4777-8777-777777777777",
        attemptId: attempt.attemptId,
        version: 1,
        kind: "HUMANA" as const,
        score: 82,
        outcome: "APROVADO" as const,
        feedback: "Feedback próprio.",
        ruleVersion: "rubrica-v1",
        correctedBy: "88888888-8888-4888-8888-888888888888",
        correctedAt: "2026-08-09T17:00:00.000Z",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/attempts/${attempt.attemptId}/feedback`,
        body: undefined,
      },
      dependencies({ getAttemptFeedback }),
    );

    expect(response.status).toBe(200);
    expect(getAttemptFeedback).toHaveBeenCalledWith(
      attempt.participantId,
      attempt.attemptId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: { feedback: "Feedback próprio.", score: 82 },
    });
    expect(JSON.stringify(response.body)).not.toContain("correctedBy");
    expect(JSON.stringify(response.body)).not.toContain("resultId");
  });
});
