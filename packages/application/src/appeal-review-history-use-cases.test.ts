import { describe, expect, it, vi } from "vitest";

import { getAppealReviewHistory } from "./appeal-review-history-use-cases.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

function event(version: number) {
  return {
    historyId: `${version}333333-3333-4333-8333-333333333333`.replace(
      `${version}333333`,
      `${version}`.padStart(8, "0"),
    ),
    appealId,
    appealVersion: version,
    eventType:
      version === 1 ? ("ATRIBUIR_REVISOR" as const) : ("DECIDIR" as const),
    fromStatus: version === 1 ? ("ABERTA" as const) : ("EM_REVISAO" as const),
    toStatus: version === 1 ? ("EM_REVISAO" as const) : ("DECIDIDA" as const),
    ...(version === 2
      ? {
          reviewerId: "44444444-4444-4444-8444-444444444444",
          decision: "MANTER_RESULTADO" as const,
          decisionRationale: "Rationale interno sintético.",
        }
      : {}),
    createdAt: `2026-08-24T12:00:0${version}.000Z`,
  };
}

describe("appeal review history", () => {
  it("returns an authorized, deterministically ordered timeline", async () => {
    const getAppealReviewHistoryPort = vi.fn(async () => ({
      appealExists: true,
      scopeId,
      events: [event(2), event(1)],
    }));

    const result = await getAppealReviewHistory(
      {
        principalId: "55555555-5555-4555-8555-555555555555",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: [scopeId],
        appealId,
      },
      { getAppealReviewHistory: getAppealReviewHistoryPort },
    );

    expect(result?.events.map((item) => item.appealVersion)).toEqual([1, 2]);
    expect(getAppealReviewHistoryPort).toHaveBeenCalledWith(
      appealId,
      [scopeId],
      100,
    );
  });

  it("returns null for a non-existent or cross-scope appeal", async () => {
    const result = await getAppealReviewHistory(
      {
        principalId: "55555555-5555-4555-8555-555555555555",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: [scopeId],
        appealId,
        limit: 25,
      },
      {
        getAppealReviewHistory: async () => ({
          appealExists: false,
          scopeId,
          events: [],
        }),
      },
    );

    expect(result).toBeNull();
  });

  it("rejects a participant and invalid port data", async () => {
    await expect(
      getAppealReviewHistory(
        {
          principalId: "55555555-5555-4555-8555-555555555555",
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          appealId,
        },
        {
          getAppealReviewHistory: async () => ({
            appealExists: false,
            scopeId,
            events: [],
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      getAppealReviewHistory(
        {
          principalId: "55555555-5555-4555-8555-555555555555",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          appealId,
        },
        {
          getAppealReviewHistory: async () => ({
            appealExists: true,
            scopeId: "66666666-6666-4666-8666-666666666666",
            events: [],
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "internal_error" });

    await expect(
      getAppealReviewHistory(
        {
          principalId: "55555555-5555-4555-8555-555555555555",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          appealId,
        },
        {
          getAppealReviewHistory: async () => ({
            appealExists: true,
            scopeId,
            events: [{ ...event(1), eventType: "UNSAFE" as never }],
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});
