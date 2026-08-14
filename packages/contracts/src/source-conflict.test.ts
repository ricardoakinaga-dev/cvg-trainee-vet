import { describe, expect, it } from "vitest";

import {
  parseSourceConflictDecision,
  sourceConflictDecisionRequestSchema,
} from "./source-conflict.js";

const request = {
  conflictId: "conflict-1",
  contentId: "content-1",
  contentVersion: 2,
  scopeId: "scope-1",
  sourceCodes: ["SOURCE_A", "SOURCE_B"],
  description: "As fontes divergem.",
  decision: "ESCALATE_CLINICAL_REVIEW",
  rationale: "Revisão clínica necessária.",
  decidedAt: "2026-08-14T12:00:00.000Z",
};

describe("source conflict decision contract", () => {
  it("accepts a strict internal write and decision projection", () => {
    expect(sourceConflictDecisionRequestSchema.parse(request)).toEqual(request);
    expect(
      parseSourceConflictDecision({
        ...request,
        decidedBy: "reviewer-1",
        humanReviewRequired: true,
      }),
    ).toMatchObject({ conflictId: "conflict-1", decidedBy: "reviewer-1" });
  });

  it("rejects participant identity and unsupported decisions", () => {
    expect(() =>
      sourceConflictDecisionRequestSchema.parse({
        ...request,
        participantId: "participant-1",
      }),
    ).toThrow();
    expect(() =>
      sourceConflictDecisionRequestSchema.parse({
        ...request,
        decision: "AUTOMATIC",
      }),
    ).toThrow();
  });
});
