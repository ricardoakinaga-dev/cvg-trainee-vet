import { describe, expect, it, vi } from "vitest";

import type { ContentRecord } from "@cvg/application";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleAuthoringReview,
  handleContentReviewQueue,
  handleContentTransition,
  handleCreateAuthoringDraft,
  handleInternalAuthoringRecord,
} from "./content.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONTENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AUTHOR_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const author: ApiPrincipal = {
  principalId: AUTHOR_ID,
  accountStatus: "ACTIVE",
  roles: ["AUTHOR"],
  scopes: [SCOPE],
};

const participant: ApiPrincipal = {
  principalId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/content/drafts", body };
}

describe("content feature handlers", () => {
  it("branch=validation/risk=malformed-input: transition with invalid body (422)", async () => {
    const advanceContent = vi.fn();
    const response = await handleContentTransition(
      request({ version: 0 }),
      CONTENT_ID,
      "request-1",
      author,
      baseDependencies({ advanceContent }),
    );
    expect(response.status).toBe(422);
    expect(advanceContent).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: transitions content (200)", async () => {
    const advanceContent = vi.fn(
      async (command: { contentId: string; version: number }) =>
        ({
          contentId: command.contentId,
          version: command.version,
          scopeId: SCOPE,
          status: "EM_REVISAO_CLINICA" as const,
        }) satisfies ContentRecord,
    );
    const response = await handleContentTransition(
      request({ version: 1, scopeId: SCOPE, event: "INICIAR_REVISAO_CLINICA" }),
      CONTENT_ID,
      "request-1",
      author,
      baseDependencies({ advanceContent }),
    );
    expect(response.status).toBe(200);
    expect(advanceContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: CONTENT_ID,
        version: 1,
        scopeId: SCOPE,
        event: "INICIAR_REVISAO_CLINICA",
      }),
    );
  });

  it("branch=forbidden/risk=privilege-escalation: clinical approval denied to participant (403)", async () => {
    const reviewAuthoringContent = vi.fn();
    const response = await handleAuthoringReview(
      request({
        version: 1,
        scopeId: SCOPE,
        decision: "APROVAR_CLINICAMENTE",
        rationale: "Revisão sintética.",
      }),
      CONTENT_ID,
      "request-1",
      participant,
      baseDependencies({ reviewAuthoringContent }),
    );
    expect(response.status).toBe(403);
    expect(reviewAuthoringContent).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: review with invalid body (422)", async () => {
    const reviewAuthoringContent = vi.fn();
    const response = await handleAuthoringReview(
      request({ version: 1 }),
      CONTENT_ID,
      "request-1",
      author,
      baseDependencies({ reviewAuthoringContent }),
    );
    expect(response.status).toBe(422);
    expect(reviewAuthoringContent).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: review queue with invalid scope (422)", async () => {
    const getContentReviewQueue = vi.fn();
    const response = await handleContentReviewQueue(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: "not-a-uuid" },
        body: undefined,
      },
      "request-1",
      author,
      baseDependencies({ getContentReviewQueue }),
    );
    expect(response.status).toBe(422);
    expect(getContentReviewQueue).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: authoring record with version 0 (422)", async () => {
    const getInternalAuthoringRecord = vi.fn();
    const response = await handleInternalAuthoringRecord(
      {
        method: "GET",
        path: "/x",
        query: { scopeId: SCOPE },
        body: undefined,
      },
      CONTENT_ID,
      "0",
      "request-1",
      author,
      baseDependencies({ getInternalAuthoringRecord }),
    );
    expect(response.status).toBe(422);
    expect(getInternalAuthoringRecord).not.toHaveBeenCalled();
  });

  it("branch=dependency-missing/risk=unwired-port: valid draft without port (500)", async () => {
    const response = await handleCreateAuthoringDraft(
      request({
        idempotencyKey: "idempotency-key-draft-01",
        scopeId: SCOPE,
        moduleId: "M02",
        sessionId: "S1",
        objectiveId: "O1",
        ordinal: 1,
        title: "Titulo sintetico.",
        prompt: "Prompt sintetico.",
        responseMode: "TEXT",
        feedback: "Feedback sintetico.",
        critical: false,
        remediationTargetObjectiveId: "O1",
        sourceRefs: [{ code: "F-01", locator: "p. 1", updateRequired: false }],
      }),
      "request-1",
      author,
      baseDependencies(),
    );
    expect(response.status).toBe(500);
  });
});
