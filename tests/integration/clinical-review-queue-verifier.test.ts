import { describe, expect, it } from "vitest";

import {
  buildClinicalReviewQueueSnapshot,
  summarizeClinicalReviewQueueSnapshot,
  type ClinicalReviewQueueSnapshot,
} from "../../scripts/verify-clinical-review-queue.mjs";

const pendingSnapshot: ClinicalReviewQueueSnapshot = {
  total: 796,
  pending: 763,
  approved: 33,
  adjustmentsRequested: 0,
  unreviewed: 763,
  technicalFailures: 0,
  pendingByModule: { M01: 32, M02: 31, M24: 32 },
};

describe("clinical review queue verifier", () => {
  it("normalizes SQL rows into an immutable queue snapshot", () => {
    const snapshot = buildClinicalReviewQueueSnapshot(
      {
        total: "2",
        pending: "1",
        approved: "1",
        adjustments_requested: "0",
        unreviewed: "1",
        technical_failures: "0",
      },
      [{ moduleId: "M01", count: "1" }],
    );

    expect(snapshot).toEqual({
      total: 2,
      pending: 1,
      approved: 1,
      adjustmentsRequested: 0,
      unreviewed: 1,
      technicalFailures: 0,
      pendingByModule: { M01: 1 },
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.pendingByModule)).toBe(true);
  });

  it("reports the honest gap and fails in strict completion mode", () => {
    expect(summarizeClinicalReviewQueueSnapshot(pendingSnapshot)).toMatchObject(
      {
        status: "PASS_WITH_GAPS",
        pending: 763,
        unreviewed: 763,
        errors: [],
      },
    );
    expect(
      summarizeClinicalReviewQueueSnapshot(pendingSnapshot, {
        requireComplete: true,
      }),
    ).toMatchObject({
      status: "FAIL",
      errors: ["clinical review queue is incomplete: 763 pending items"],
    });
  });

  it("passes only when the queue is complete and technically preflighted", () => {
    expect(
      summarizeClinicalReviewQueueSnapshot(
        {
          total: 2,
          pending: 0,
          approved: 2,
          adjustmentsRequested: 0,
          unreviewed: 0,
          technicalFailures: 0,
          pendingByModule: {},
        },
        { requireComplete: true, requireTechnicalPreflight: true },
      ),
    ).toMatchObject({ status: "PASS", errors: [] });
  });

  it("fails when a pending item bypasses technical preflight", () => {
    expect(
      summarizeClinicalReviewQueueSnapshot({
        ...pendingSnapshot,
        technicalFailures: 1,
      }),
    ).toMatchObject({
      status: "FAIL",
      errors: ["pending items have failed technical preflight: 1"],
    });
  });
});
