import { describe, expect, it, vi } from "vitest";

import type { AppealState } from "@cvg/domain";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleAppealDecisionImpact,
  handleAppealReviewHistory,
  handleAppealReviewQueue,
  handleCreateAppeal,
  handleGetParticipantAppeals,
  handleTransitionAppeal,
} from "./appeals.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTICIPANT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ATTEMPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ACTIVITY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ITEM_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const APPEAL_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

const gradedAttempt = {
  attemptId: ATTEMPT_ID,
  participantId: PARTICIPANT_ID,
  activityId: ACTIVITY_ID,
  status: "CORRIGIDA_HUMANAMENTE",
  version: 2,
} as const;

const appeal: AppealState = {
  appealId: APPEAL_ID,
  participantId: PARTICIPANT_ID,
  attemptId: ATTEMPT_ID,
  itemId: ITEM_ID,
  justification: "Justificativa sintética.",
  createdAt: "2026-09-09T00:00:00.000Z",
  dueAt: "2026-09-19T00:00:00.000Z",
  status: "ABERTA",
  version: 0,
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    resolveActivityScope: async () => SCOPE,
    hasParticipantActivityItem: async () => true,
    ...overrides,
  } as ApiHttpDependencies;
}

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/appeals", body };
}

describe("appeals feature handlers", () => {
  it("branch=validation/risk=malformed-input: create with invalid body (422)", async () => {
    const createAppeal = vi.fn();
    const response = await handleCreateAppeal(
      request({ attemptId: ATTEMPT_ID }),
      "request-1",
      principal,
      baseDependencies({ createAppeal }),
    );
    expect(response.status).toBe(422);
    expect(createAppeal).not.toHaveBeenCalled();
  });

  it("branch=state-guard/risk=premature-appeal: create on ungraded attempt (409)", async () => {
    const createAppeal = vi.fn();
    const response = await handleCreateAppeal(
      request({
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        justification: "Justificativa sintética.",
      }),
      "request-1",
      principal,
      baseDependencies({
        resolveAttempt: async () => ({
          ...gradedAttempt,
          status: "EM_ANDAMENTO" as const,
        }),
        createAppeal,
      }),
    );
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "state_conflict" },
    });
    expect(createAppeal).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: creates an appeal without leaking internals (201)", async () => {
    const createAppeal = vi.fn(async () => ({ ...appeal }));
    const response = await handleCreateAppeal(
      request({
        attemptId: ATTEMPT_ID,
        itemId: ITEM_ID,
        justification: "Justificativa sintética.",
      }),
      "request-1",
      principal,
      baseDependencies({
        resolveAttempt: async () => ({ ...gradedAttempt }),
        createAppeal,
      }),
    );
    expect(response.status).toBe(201);
    expect(createAppeal).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: PARTICIPANT_ID,
        scopeId: SCOPE,
        attemptId: ATTEMPT_ID,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain("participantId");
  });

  it("branch=not_found/risk=idor-probe: list on unknown attempt (404)", async () => {
    const getParticipantAppeals = vi.fn();
    const response = await handleGetParticipantAppeals(
      {
        method: "GET",
        path: "/api/v1/appeals",
        query: { attemptId: ATTEMPT_ID },
        body: undefined,
      },
      "request-1",
      principal,
      baseDependencies({
        resolveAttempt: async () => null,
        getParticipantAppeals,
      }),
    );
    expect(response.status).toBe(404);
    expect(getParticipantAppeals).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=replay-confusion: transition on appealId mismatch (422)", async () => {
    const transitionAppealReview = vi.fn();
    const response = await handleTransitionAppeal(
      request({
        appealId: APPEAL_ID,
        scopeId: SCOPE,
        version: 1,
        event: "ATRIBUIR_REVISOR",
      }),
      "00000000-0000-4000-8000-000000000000",
      "request-1",
      principal,
      baseDependencies({ transitionAppealReview }),
    );
    expect(response.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: transition denied to participant (403)", async () => {
    const transitionAppealReview = vi.fn();
    const response = await handleTransitionAppeal(
      request({
        appealId: APPEAL_ID,
        scopeId: SCOPE,
        version: 1,
        event: "ATRIBUIR_REVISOR",
      }),
      APPEAL_ID,
      "request-1",
      principal,
      baseDependencies({ transitionAppealReview }),
    );
    expect(response.status).toBe(403);
    expect(transitionAppealReview).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: review queue with unknown query key (422)", async () => {
    const getAppealReviewQueue = vi.fn();
    const response = await handleAppealReviewQueue(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId: SCOPE, evil: "1" },
        body: undefined,
      },
      "request-1",
      principal,
      baseDependencies({ getAppealReviewQueue }),
    );
    expect(response.status).toBe(422);
    expect(getAppealReviewQueue).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: history with invalid appeal id (422)", async () => {
    const getAppealReviewHistory = vi.fn();
    const response = await handleAppealReviewHistory(
      { method: "GET", path: "/x", query: {}, body: undefined },
      "not-an-id",
      "request-1",
      principal,
      baseDependencies({ getAppealReviewHistory }),
    );
    expect(response.status).toBe(422);
    expect(getAppealReviewHistory).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: impact preview rejects a body payload (422)", async () => {
    const getAppealDecisionImpactPreview = vi.fn();
    const response = await handleAppealDecisionImpact(
      {
        method: "GET",
        path: "/x",
        query: { decision: "MANTER_RESULTADO" },
        body: { unexpected: true },
      },
      APPEAL_ID,
      "request-1",
      principal,
      baseDependencies({ getAppealDecisionImpactPreview }),
    );
    expect(response.status).toBe(422);
    expect(getAppealDecisionImpactPreview).not.toHaveBeenCalled();
  });
});
