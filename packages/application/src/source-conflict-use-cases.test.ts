import { describe, expect, it, vi } from "vitest";

import {
  recordSourceConflictDecision,
  type RecordSourceConflictDecisionCommand,
} from "./source-conflict-use-cases.js";

const command: RecordSourceConflictDecisionCommand = {
  principalId: "reviewer-1",
  accountStatus: "ACTIVE",
  roles: ["CLINICAL_APPROVER"],
  scopes: ["scope-1"],
  approvedClinicalApproverId: "reviewer-1",
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

describe("source conflict decision use case", () => {
  it("requires an approved clinical identity and persists the decision", async () => {
    const save = vi.fn(async (state) => state);
    const result = await recordSourceConflictDecision(command, { save });

    expect(result).toMatchObject({
      conflictId: "conflict-1",
      decidedBy: "reviewer-1",
      humanReviewRequired: true,
    });
    expect(save).toHaveBeenCalledWith(result);
  });

  it("denies a moderator and a cross-scope decision", async () => {
    const withoutApproval = {
      conflictId: command.conflictId,
      contentId: command.contentId,
      contentVersion: command.contentVersion,
      scopeId: command.scopeId,
      sourceCodes: command.sourceCodes,
      description: command.description,
      decision: command.decision,
      rationale: command.rationale,
      decidedAt: command.decidedAt,
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: ["MODERATOR"] as const,
      scopes: command.scopes,
    } as const;
    await expect(
      recordSourceConflictDecision(withoutApproval, { save: vi.fn() }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      recordSourceConflictDecision(
        { ...command, scopeId: "scope-2" },
        { save: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
