import { describe, expect, it, vi } from "vitest";

import { buildSourceConflictDecision } from "@cvg/domain";

import {
  createSourceConflictDecisionRepository,
  sourceConflictDecisionRowToState,
  sourceConflictDecisionStateToRow,
} from "./source-conflict-repository.js";

const state = buildSourceConflictDecision({
  conflictId: "conflict-1",
  contentId: "content-1",
  contentVersion: 2,
  scopeId: "scope-1",
  sourceCodes: ["SOURCE_A", "SOURCE_B"],
  description: "As fontes divergem.",
  decision: "ESCALATE_CLINICAL_REVIEW",
  rationale: "Revisão clínica necessária.",
  decidedBy: "reviewer-1",
  decidedAt: "2026-08-14T12:00:00.000Z",
});

describe("source conflict persistence", () => {
  it("round-trips the human decision and recalculates its review flag", () => {
    const row = sourceConflictDecisionStateToRow(state);

    expect(row).toMatchObject({
      id: "conflict-1",
      scopeId: "scope-1",
      decision: "ESCALATE_CLINICAL_REVIEW",
      humanReviewRequired: true,
    });
    expect(
      sourceConflictDecisionRowToState({ ...row, createdAt: new Date() }),
    ).toEqual(state);
  });

  it("sets the scope context before inserting a decision", async () => {
    const execute = vi.fn(async () => undefined);
    const values = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values }));
    const db = {
      transaction: async (work: (tx: unknown) => Promise<unknown>) =>
        work({ execute, insert }),
    } as never;

    await createSourceConflictDecisionRepository(db).save(state);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ id: "conflict-1", scopeId: "scope-1" }),
    );
  });
});
