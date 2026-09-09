import { describe, expect, it } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleDiagnosticDraftEvaluation,
  handleFinalizeDiagnosticSession,
  handleGetDiagnosticSession,
  handleSaveDiagnosticSessionAnswer,
  handleStartDiagnosticSession,
} from "./diagnostics.handler.js";

const SCOPE_A = "11111111-1111-4111-8111-111111111111";
const SCOPE_B = "22222222-2222-4222-8222-222222222222";
const PARTICIPANT_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "44444444-4444-4444-8444-444444444444";
const ITEM_ID = "55555555-5555-4555-8555-555555555555";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE_A],
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    isParticipantInScope: async () => true,
    ...overrides,
  } as ApiHttpDependencies;
}

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/diagnostics/b07/sessions", body };
}

describe("diagnostics feature handlers", () => {
  it("branch=dependency-missing/risk=unwired-port: start without repository wiring (404)", async () => {
    const response = await handleStartDiagnosticSession(
      request({ idempotencyKey: "idempotency-key-diag-01" }),
      "request-1",
      principal,
      baseDependencies(),
    );
    expect(response.status).toBe(404);
  });

  it("branch=validation/risk=malformed-input: start with invalid body (422)", async () => {
    const response = await handleStartDiagnosticSession(
      request({ idempotencyKey: "short" }),
      "request-1",
      principal,
      baseDependencies({
        diagnosticSessionRepository: {} as never,
        diagnosticSessionCatalog: {} as never,
      }),
    );
    expect(response.status).toBe(422);
  });

  it("branch=scope-ambiguous/risk=session-confusion: start with two eligible scopes (409)", async () => {
    const multiScope: ApiPrincipal = {
      ...principal,
      scopes: [SCOPE_A, SCOPE_B],
    };
    const response = await handleStartDiagnosticSession(
      request({ idempotencyKey: "idempotency-key-diag-02" }),
      "request-1",
      multiScope,
      baseDependencies({
        diagnosticSessionRepository: {} as never,
        diagnosticSessionCatalog: {} as never,
      }),
    );
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "state_conflict" },
    });
  });

  it("branch=validation/risk=malformed-input: get with invalid session id (422)", async () => {
    const response = await handleGetDiagnosticSession(
      "request-1",
      principal,
      baseDependencies({
        diagnosticSessionRepository: {} as never,
        diagnosticSessionCatalog: {} as never,
      }),
      "not-a-uuid",
    );
    expect(response.status).toBe(422);
  });

  it("branch=validation/risk=malformed-input: saveAnswer with invalid uuids (422)", async () => {
    const response = await handleSaveDiagnosticSessionAnswer(
      request({}),
      "not-a-uuid",
      ITEM_ID,
      "request-1",
      principal,
      baseDependencies({
        diagnosticSessionRepository: {} as never,
        diagnosticSessionCatalog: {} as never,
      }),
    );
    expect(response.status).toBe(422);
  });

  it("branch=validation/risk=malformed-input: finalize with invalid session id (422)", async () => {
    const response = await handleFinalizeDiagnosticSession(
      request({}),
      "not-a-uuid",
      "request-1",
      principal,
      baseDependencies({
        diagnosticSessionRepository: {} as never,
        diagnosticSessionCatalog: {} as never,
      }),
    );
    expect(response.status).toBe(422);
  });

  it("branch=forbidden/risk=privilege-escalation: draft evaluation denied to participant (403)", async () => {
    const evaluateDiagnosticDraft = async () => {
      throw new Error("must not be called");
    };
    const response = await handleDiagnosticDraftEvaluation(
      request({
        participantId: PARTICIPANT_ID,
        scopeId: SESSION_ID,
        answers: [],
        completedAt: "2026-09-09T00:00:00.000Z",
      }),
      "request-1",
      principal,
      baseDependencies({ evaluateDiagnosticDraft }),
    );
    expect(response.status).toBe(403);
  });

  it("branch=dependency-missing/risk=unwired-port: draft evaluation without port (500)", async () => {
    const response = await handleDiagnosticDraftEvaluation(
      request({
        participantId: PARTICIPANT_ID,
        scopeId: SESSION_ID,
        answers: [],
        completedAt: "2026-09-09T00:00:00.000Z",
      }),
      "request-1",
      principal,
      baseDependencies(),
    );
    expect(response.status).toBe(500);
  });
});
