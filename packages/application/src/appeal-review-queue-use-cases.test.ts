import { describe, expect, it, vi } from "vitest";

import {
  getAppealReviewQueue,
  type AppealReviewQueueReadPort,
} from "./appeal-review-queue-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const otherScopeId = "99999999-9999-4999-8999-999999999999";
const participantId = "22222222-2222-4222-8222-222222222222";
const appealId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";

const appeal = {
  scopeId,
  state: {
    appealId,
    participantId,
    attemptId,
    itemId,
    justification: "Solicito revisão do resultado sintético.",
    createdAt: "2026-08-23T20:00:00.000Z",
    dueAt: "2026-09-02T20:00:00.000Z",
    version: 0,
    status: "ABERTA" as const,
  },
};

const command = {
  principalId: "66666666-6666-4666-8666-666666666666",
  accountStatus: "ACTIVE" as const,
  roles: ["MODERATOR"] as const,
  scopes: [scopeId] as const,
  query: { scopeId },
};

describe("appeal review queue use case", () => {
  it("authorizes one scope and returns a frozen allowlisted queue", async () => {
    const listAppeals = vi.fn(async () => [appeal]);
    const port: AppealReviewQueueReadPort = { listAppeals };

    const result = await getAppealReviewQueue(command, port, {
      now: () => new Date("2026-08-23T20:01:00.000Z"),
    });

    expect(result).toMatchObject({
      kind: "appeal_review_queue",
      scopeId,
      filters: { scopeId, limit: 50 },
      items: [
        {
          appealId,
          participantId,
          justification: appeal.state.justification,
          status: "ABERTA",
        },
      ],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
    expect(listAppeals).toHaveBeenCalledWith({ scopeId, limit: 50 });
  });

  it("rejects participant or cross-scope access before returning data", async () => {
    const listAppeals = vi.fn(async () => [appeal]);
    const port: AppealReviewQueueReadPort = { listAppeals };

    await expect(
      getAppealReviewQueue(
        {
          ...command,
          roles: ["PARTICIPANT"],
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(listAppeals).not.toHaveBeenCalled();

    await expect(
      getAppealReviewQueue(
        {
          ...command,
          query: { scopeId: otherScopeId },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(listAppeals).not.toHaveBeenCalled();
  });

  it("fails closed when persistence returns a different scope", async () => {
    const port: AppealReviewQueueReadPort = {
      listAppeals: async () => [{ ...appeal, scopeId: otherScopeId }],
    };

    await expect(getAppealReviewQueue(command, port)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("covers explicit review metadata and rejects malformed commands", async () => {
    const reviewerId = "77777777-7777-4777-8777-777777777777";
    const listAppeals = vi.fn(async () => [
      {
        scopeId,
        state: {
          ...appeal.state,
          status: "DECIDIDA" as const,
          reviewerId,
          decision: "MANTER_RESULTADO" as const,
          decisionRationale: "A decisão sintética mantém o resultado.",
          decisionAt: "2026-08-23T20:00:30.000Z",
          decisionCorrelationId: "88888888-8888-4888-8888-888888888888",
        },
      },
    ]);
    const port: AppealReviewQueueReadPort = { listAppeals };
    const result = await getAppealReviewQueue(
      {
        ...command,
        roles: ["CLINICAL_APPROVER"],
        approvedClinicalApproverId: command.principalId,
        query: { scopeId, status: "DECIDIDA", limit: 1 },
      },
      port,
    );

    expect(result.filters).toMatchObject({
      scopeId,
      status: "DECIDIDA",
      limit: 1,
    });
    expect(result.items[0]).toMatchObject({
      reviewerId,
      decision: "MANTER_RESULTADO",
      decisionRationale: "A decisão sintética mantém o resultado.",
      decisionAt: "2026-08-23T20:00:30.000Z",
      decisionCorrelationId: "88888888-8888-4888-8888-888888888888",
    });

    await expect(
      getAppealReviewQueue({ ...command, principalId: " " }, port),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealReviewQueue({ ...command, query: { scopeId: "invalid" } }, port),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealReviewQueue(
        { ...command, query: { scopeId, status: "UNKNOWN" as never } },
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealReviewQueue({ ...command, query: { scopeId, limit: 0 } }, port),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealReviewQueue(
        { ...command, query: { scopeId, limit: 1 } },
        { listAppeals: async () => [appeal, appeal] },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getAppealReviewQueue(
        { ...command, query: { scopeId, limit: 2 } },
        { listAppeals: async () => [{ ...appeal }, { ...appeal }] },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getAppealReviewQueue(
        { ...command, query: { scopeId, limit: 1 } },
        { listAppeals: async () => [] },
        { now: () => new Date("invalid") },
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});
