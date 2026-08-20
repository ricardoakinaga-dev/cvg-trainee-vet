import { describe, expect, it } from "vitest";

import {
  buildSourceConflictDecision,
  type SourceConflictDecisionInput,
} from "./source-conflict.js";

const input: SourceConflictDecisionInput = {
  conflictId: "conflict-1",
  contentId: "content-1",
  contentVersion: 2,
  scopeId: "scope-1",
  sourceCodes: ["SOURCE_A", "SOURCE_B"],
  description: "As fontes divergem sobre a sequência de uma conduta.",
  decision: "ESCALATE_CLINICAL_REVIEW",
  rationale: "A diferença exige parecer clínico antes da publicação.",
  decidedBy: "reviewer-1",
  decidedAt: "2026-08-14T12:00:00.000Z",
};

describe("source conflict decisions", () => {
  it("requires a human decision record with a stable conflict id", () => {
    const decision = buildSourceConflictDecision(input);

    expect(decision).toMatchObject({
      conflictId: "conflict-1",
      decision: "ESCALATE_CLINICAL_REVIEW",
      humanReviewRequired: true,
    });
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.sourceCodes)).toBe(true);
  });

  it("rejects a single source, duplicate source codes, and automatic decisions", () => {
    expect(() =>
      buildSourceConflictDecision({ ...input, sourceCodes: ["SOURCE_A"] }),
    ).toThrow("at least two");
    expect(() =>
      buildSourceConflictDecision({
        ...input,
        sourceCodes: ["SOURCE_A", "SOURCE_A"],
      }),
    ).toThrow("unique");
    expect(() =>
      buildSourceConflictDecision({
        ...input,
        decision: "AUTOMATIC" as never,
      }),
    ).toThrow("decision");
  });

  it("rejects malformed identity, version and timestamp boundaries", () => {
    expect(() =>
      buildSourceConflictDecision({ ...input, conflictId: " " }),
    ).toThrow("conflictId");
    expect(() =>
      buildSourceConflictDecision({ ...input, contentVersion: 0 }),
    ).toThrow("contentVersion");
    expect(() =>
      buildSourceConflictDecision({ ...input, decidedAt: "invalid" }),
    ).toThrow("decidedAt");
  });
});
