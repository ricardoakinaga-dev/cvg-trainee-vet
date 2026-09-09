import { describe, expect, it, vi } from "vitest";

import type { FeedbackTicketState } from "@cvg/domain";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleCreateFeedbackTicket,
  handleFeedback,
  handleFeedbackTicketHistory,
  handleFeedbackTriageQueue,
  handleGetParticipantFeedback,
  handleTransitionFeedbackTicket,
  handleUpdateFeedbackTriageMetadata,
} from "./feedback.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTICIPANT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TICKET_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ATTEMPT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

const ticket: FeedbackTicketState = {
  ticketId: TICKET_ID,
  participantId: PARTICIPANT_ID,
  type: "ERRO_CONTEUDO",
  description: "Relato sintético.",
  createdAt: "2026-09-09T00:00:00.000Z",
  status: "NOVO",
  version: 1,
  priority: "NORMAL",
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

function request(
  body: unknown,
  overrides: Partial<ApiHttpRequest> = {},
): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/feedback", body, ...overrides };
}

describe("feedback feature handlers", () => {
  it("branch=validation/risk=malformed-input: create with invalid body (422)", async () => {
    const createFeedbackTicket = vi.fn();
    const response = await handleCreateFeedbackTicket(
      request({ type: "ERRO_CONTEUDO" }),
      "request-1",
      principal,
      baseDependencies({ createFeedbackTicket }),
    );
    expect(response.status).toBe(422);
    expect(createFeedbackTicket).not.toHaveBeenCalled();
  });

  it("branch=scope-ambiguous/risk=scope-confusion: create with several scopes (422 scopeId)", async () => {
    const createFeedbackTicket = vi.fn();
    const multi: ApiPrincipal = { ...principal, scopes: [SCOPE, TICKET_ID] };
    const response = await handleCreateFeedbackTicket(
      request({ type: "ERRO_CONTEUDO", description: "Relato sintético." }),
      "request-1",
      multi,
      baseDependencies({ createFeedbackTicket }),
    );
    expect(response.status).toBe(422);
    expect(createFeedbackTicket).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: creates a ticket without leaking participantId (201)", async () => {
    const createFeedbackTicket = vi.fn(async () => ({ ...ticket }));
    const response = await handleCreateFeedbackTicket(
      request({ type: "ERRO_CONTEUDO", description: "Relato sintético." }),
      "request-1",
      principal,
      baseDependencies({ createFeedbackTicket }),
    );
    expect(response.status).toBe(201);
    expect(createFeedbackTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: PARTICIPANT_ID,
        scopeId: SCOPE,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain(PARTICIPANT_ID);
  });

  it("branch=forbidden/risk=scope-escalation: list denied when a scope is not owned (403)", async () => {
    const getParticipantFeedback = vi.fn();
    const moderator: ApiPrincipal = {
      ...principal,
      principalId: "99999999-9999-4999-8999-999999999999",
      roles: ["MODERATOR"],
    };
    const response = await handleGetParticipantFeedback(
      "request-1",
      moderator,
      baseDependencies({ getParticipantFeedback }),
    );
    expect(response.status).toBe(403);
    expect(getParticipantFeedback).not.toHaveBeenCalled();
  });

  it("branch=not_found/risk=idor-probe: attempt feedback on unknown attempt (404)", async () => {
    const response = await handleFeedback(
      ATTEMPT_ID,
      "request-1",
      principal,
      baseDependencies({ resolveAttempt: async () => null }),
    );
    expect(response.status).toBe(404);
  });

  it("branch=validation/risk=replay-confusion: transition on ticketId mismatch (422)", async () => {
    const transitionFeedbackTicket = vi.fn();
    const response = await handleTransitionFeedbackTicket(
      request({
        ticketId: TICKET_ID,
        scopeId: SCOPE,
        version: 1,
        event: "TRIAR",
      }),
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "request-1",
      principal,
      baseDependencies({ transitionFeedbackTicket }),
    );
    expect(response.status).toBe(422);
    expect(transitionFeedbackTicket).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: triage queue with unknown query key (422)", async () => {
    const getFeedbackTriageQueue = vi.fn();
    const response = await handleFeedbackTriageQueue(
      request({}, { method: "GET", query: { scopeId: SCOPE, evil: "1" } }),
      "request-1",
      principal,
      baseDependencies({ getFeedbackTriageQueue }),
    );
    expect(response.status).toBe(422);
    expect(getFeedbackTriageQueue).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=scope-escalation: history denied without queue scope (403)", async () => {
    const getFeedbackTicketHistory = vi.fn();
    const outsider: ApiPrincipal = {
      ...principal,
      scopes: ["ffffffff-ffff-4fff-8fff-ffffffffffff"],
    };
    const response = await handleFeedbackTicketHistory(
      request({}),
      TICKET_ID,
      "request-1",
      outsider,
      baseDependencies({ getFeedbackTicketHistory }),
    );
    expect(response.status).toBe(403);
    expect(getFeedbackTicketHistory).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: triage metadata with invalid ticket id (422)", async () => {
    const updateFeedbackTriageMetadata = vi.fn();
    const response = await handleUpdateFeedbackTriageMetadata(
      request({ expectedVersion: 1, priority: "NORMAL", assignment: "MANTER" }),
      "not-an-id",
      "request-1",
      principal,
      baseDependencies({ updateFeedbackTriageMetadata }),
    );
    expect(response.status).toBe(422);
    expect(updateFeedbackTriageMetadata).not.toHaveBeenCalled();
  });
});
