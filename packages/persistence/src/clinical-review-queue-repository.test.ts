import { describe, expect, it } from "vitest";

import {
  clinicalReviewQueueRowToItem,
  createClinicalReviewQueueRepository,
} from "./clinical-review-queue-repository.js";

const ids = {
  contentId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  authorId: "33333333-3333-4333-8333-333333333333",
};

const row = {
  contentId: ids.contentId,
  version: 1,
  scopeId: ids.scopeId,
  moduleId: "M01",
  sessionId: "M01-S1",
  objectiveId: "M01-OBJ-01",
  authorId: ids.authorId,
  contentStatus: "PROJECAO_VERIFICADA",
  reviewStatus: "PENDING",
  technicalChecksPassed: "true",
  latestDecision: null,
  latestReviewedAt: null,
};

function fakeDatabase(
  queueRows: readonly unknown[],
  total: unknown,
): Parameters<typeof createClinicalReviewQueueRepository>[0] {
  let call = 0;
  return {
    execute: async () => {
      call += 1;
      return (call === 1 ? queueRows : [{ total }]) as never;
    },
  } as never;
}

describe("clinical review queue persistence", () => {
  it("maps a pending row and executes the paginated pending query", async () => {
    const repository = createClinicalReviewQueueRepository(
      fakeDatabase([row], "1"),
    );
    const page = await repository.listClinicalReviewQueue(ids.scopeId, {
      page: 1,
      perPage: 20,
      status: "PENDING",
    });

    expect(page).toMatchObject({
      page: 1,
      perPage: 20,
      total: 1,
      items: [{ contentId: ids.contentId, reviewStatus: "PENDING" }],
    });
    expect(page.items[0]?.latestReview).toBeNull();
  });

  it("maps the latest review and supports the all-status query", async () => {
    const repository = createClinicalReviewQueueRepository(
      fakeDatabase(
        [
          {
            ...row,
            version: "2",
            contentStatus: "PUBLICADO",
            reviewStatus: "APPROVED",
            technicalChecksPassed: false,
            latestDecision: "APROVAR_CLINICAMENTE",
            latestReviewedAt: new Date("2026-08-11T12:00:00.000Z"),
          },
        ],
        1,
      ),
    );
    const page = await repository.listClinicalReviewQueue(ids.scopeId, {
      page: 2,
      perPage: 1,
      status: "ALL",
    });

    expect(page).toMatchObject({
      page: 2,
      perPage: 1,
      total: 1,
      items: [
        {
          version: 2,
          contentStatus: "PUBLICADO",
          technicalChecksPassed: false,
          latestReview: {
            decision: "APROVAR_CLINICAMENTE",
            reviewedAt: "2026-08-11T12:00:00.000Z",
          },
        },
      ],
    });
  });

  it("rejects malformed persistence rows at the boundary", () => {
    const invalidRows = [
      { ...row, contentId: "" },
      { ...row, version: 0 },
      { ...row, technicalChecksPassed: "unknown" },
      { ...row, contentStatus: "UNKNOWN" },
      { ...row, latestDecision: "UNKNOWN" },
      {
        ...row,
        latestDecision: "APROVAR_CLINICAMENTE",
        latestReviewedAt: null,
      },
      { ...row, latestDecision: null, latestReviewedAt: "not-a-date" },
      { ...row, reviewStatus: "UNKNOWN" },
    ];

    for (const invalidRow of invalidRows) {
      expect(() => clinicalReviewQueueRowToItem(invalidRow)).toThrow();
    }
  });
});
