import { describe, expect, it, vi } from "vitest";

import {
  type AuthoringRecord,
  type CreateAuthoringDraftCommand,
} from "@cvg/application";

import { handleApiRequest } from "../http.js";
import {
  activity,
  authoringDraftRequest,
  authoringRecord,
  contentReviewQueue,
  dependencies,
} from "./fixtures.js";

describe("API HTTP boundary — content boundary", () => {
  it("keeps internal authoring metadata behind staff authorization", async () => {
    const getInternalAuthoringRecord = vi.fn(async () => authoringRecord);
    const staffResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/versions/1/authoring`,
        query: { scopeId: authoringRecord.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: authoringRecord.authorId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [authoringRecord.scopeId],
        }),
        getInternalAuthoringRecord,
      }),
    );

    expect(staffResponse.status).toBe(200);
    expect(staffResponse.body).toMatchObject({
      success: true,
      data: {
        item: { correctChoiceIds: ["a"] },
        preflight: { technicalChecksPassed: true },
      },
    });

    const participantResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/versions/1/authoring`,
        query: { scopeId: authoringRecord.scopeId },
        body: undefined,
      },
      dependencies({ getInternalAuthoringRecord }),
    );
    expect(participantResponse.status).toBe(403);
    expect(getInternalAuthoringRecord).toHaveBeenCalledTimes(1);
  });
  it("creates a scoped authoring draft with server-derived identity and blocked actions", async () => {
    const createdDraft: AuthoringRecord = {
      ...authoringRecord,
      contentStatus: "RASCUNHO",
    };
    const createAuthoringDraft = vi.fn(
      async (command: CreateAuthoringDraftCommand) => {
        expect(command.principalId).toBe(authoringRecord.authorId);
        expect(command.scopeId).toBe(authoringRecord.scopeId);
        return createdDraft;
      },
    );
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: authoringDraftRequest,
      },
      dependencies({
        authenticate: async () => ({
          principalId: authoringRecord.authorId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [authoringRecord.scopeId],
        }),
        createAuthoringDraft,
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        contentStatus: "RASCUNHO",
        item: {
          correctChoiceIds: ["a"],
          participant: { kind: "QUESTAO" },
        },
        availableActions: {
          requestAdjustments: false,
          approveClinically: false,
        },
      },
    });
    expect(createAuthoringDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        principalId: authoringRecord.authorId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [authoringRecord.scopeId],
        idempotencyKey: authoringDraftRequest.idempotencyKey,
      }),
    );
    expect(createAuthoringDraft.mock.calls[0]?.[0]).not.toHaveProperty(
      "contentId",
    );
  });
  it("rejects unauthenticated, out-of-scope, and client-owned authoring draft requests", async () => {
    const createAuthoringDraft = vi.fn(async () => authoringRecord);
    const unauthenticated = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: authoringDraftRequest,
      },
      dependencies({
        authenticate: async () => null,
        createAuthoringDraft,
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const outOfScope = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: authoringDraftRequest,
      },
      dependencies({
        authenticate: async () => ({
          principalId: authoringRecord.authorId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: ["33333333-3333-4333-8333-333333333333"],
        }),
        createAuthoringDraft,
      }),
    );
    expect(outOfScope.status).toBe(403);

    const clientOwnedField = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/content/drafts",
        body: {
          ...authoringDraftRequest,
          contentId: authoringRecord.contentId,
          status: "PUBLICADO",
          participant: authoringRecord.participant,
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: authoringRecord.authorId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [authoringRecord.scopeId],
        }),
        createAuthoringDraft,
      }),
    );
    expect(clientOwnedField.status).toBe(422);
    expect(createAuthoringDraft).not.toHaveBeenCalled();
  });
  it("accepts a scoped clinical review without exposing it to the participant route", async () => {
    const reviewAuthoringContent = vi.fn(async () => ({
      record: {
        ...authoringRecord,
        contentStatus: "APROVADO_CLINICAMENTE" as const,
      },
      review: {
        reviewerId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        decision: "APROVAR_CLINICAMENTE" as const,
        rationale: "Revisão sintética.",
        reviewedAt: "2026-08-10T05:00:00.000Z",
        correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      },
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/content/${authoringRecord.contentId}/review`,
        body: {
          version: 1,
          scopeId: authoringRecord.scopeId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Revisão sintética.",
        },
      },
      dependencies({
        approvedClinicalApproverId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        authenticate: async () => ({
          principalId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [authoringRecord.scopeId],
        }),
        reviewAuthoringContent,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { contentStatus: "APROVADO_CLINICAMENTE" },
    });
    expect(reviewAuthoringContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: authoringRecord.contentId,
        decision: "APROVAR_CLINICAMENTE",
      }),
    );
  });
  it("returns the scoped content review queue and rejects invalid scope input", async () => {
    const getContentReviewQueue = vi.fn(async () => contentReviewQueue);
    const dependenciesValue = dependencies({
      authenticate: async () => ({
        principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: ["11111111-1111-4111-8111-111111111111"],
      }),
      getContentReviewQueue,
    });
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          status: "EM_REVISAO_CLINICA",
          limit: "25",
        },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(response.status).toBe(200);
    expect(getContentReviewQueue).toHaveBeenCalledWith({
      principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountStatus: "ACTIVE",
      roles: ["AUTHOR"],
      scopes: ["11111111-1111-4111-8111-111111111111"],
      query: {
        scopeId: "11111111-1111-4111-8111-111111111111",
        status: "EM_REVISAO_CLINICA",
        limit: 25,
      },
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "content_review_queue",
        items: [{ nextAction: "REVISAR_CLINICAMENTE" }],
      },
    });

    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: "not-a-uuid" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(invalid.status).toBe(422);
    expect(getContentReviewQueue).toHaveBeenCalledTimes(1);

    const clinicalDenied = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: contentReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [contentReviewQueue.scopeId],
        }),
        getContentReviewQueue,
      }),
    );
    expect(clinicalDenied.status).toBe(403);

    const clinicalAllowed = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: { scopeId: contentReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        approvedClinicalApproverId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        authenticate: async () => ({
          principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [contentReviewQueue.scopeId],
        }),
        getContentReviewQueue,
      }),
    );
    expect(clinicalAllowed.status).toBe(200);
    expect(getContentReviewQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        approvedClinicalApproverId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    );
  });
  it("fails closed when the content review queue dependency is unavailable", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/content/review-queue",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
      }),
    );
    expect(response.status).toBe(500);
  });
  it("routes internal content transitions without returning authored text", async () => {
    const internalScopeId = "22222222-2222-4222-8222-222222222222";
    const advanceContent = vi.fn(async (command) => ({
      contentId: command.contentId,
      version: command.version,
      scopeId: command.scopeId,
      status: "PUBLICADO" as const,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/content/${activity.activityId}/transition`,
        body: {
          version: 1,
          scopeId: internalScopeId,
          event: "PUBLICAR",
        },
      },
      dependencies({
        approvedClinicalApproverId: "ricardo-account",
        authenticate: async () => ({
          principalId: "ricardo-account",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [internalScopeId],
        }),
        advanceContent,
      }),
    );

    expect(response.status).toBe(200);
    expect(advanceContent).toHaveBeenCalledWith({
      principalId: "ricardo-account",
      accountStatus: "ACTIVE",
      roles: ["CLINICAL_APPROVER"],
      scopes: [internalScopeId],
      approvedClinicalApproverId: "ricardo-account",
      contentId: activity.activityId,
      version: 1,
      scopeId: internalScopeId,
      event: "PUBLICAR",
      correlationId: "request-123",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        contentId: activity.activityId,
        version: 1,
        status: "PUBLICADO",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("participantText");
  });
});
