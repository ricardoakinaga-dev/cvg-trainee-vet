import { describe, expect, it, vi } from "vitest";

import {
  recordSourceConflictDecision,
  type RecordSourceConflictDecisionCommand,
  type SourceConflictDecisionDependencies,
  type SourceConflictDecisionWritePort,
} from "./source-conflict-use-cases.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";
import { ApplicationError } from "./errors.js";

function approver(
  accountStatus: "ACTIVE" | "SUSPENDED",
  roles: readonly ("CLINICAL_APPROVER" | "MODERATOR")[],
): ClinicalApproverPort {
  return {
    findById: vi.fn(async () => ({
      accountId: "reviewer-1",
      accountStatus,
      roles,
      scopes: ["scope-1"],
    })),
  };
}

function dependencies(
  overrides: Readonly<{
    readonly save?: SourceConflictDecisionWritePort["save"];
    readonly approver?: ClinicalApproverPort;
  }> = {},
): SourceConflictDecisionDependencies {
  const save = overrides.save ?? (async (state) => state);
  const currentApprover =
    overrides.approver ?? approver("ACTIVE", ["CLINICAL_APPROVER"]);
  return {
    transaction: {
      run: async (work) => work({ save, approver: currentApprover }),
    },
  };
}

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
    const result = await recordSourceConflictDecision(
      command,
      dependencies({ save }),
    );

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
      recordSourceConflictDecision(withoutApproval, {
        transaction: {
          run: async (work) =>
            work({
              save: vi.fn(),
              approver: approver("ACTIVE", ["CLINICAL_APPROVER"]),
            }),
        },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      recordSourceConflictDecision(
        { ...command, scopeId: "scope-2" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("revalidates the current clinical approver instead of trusting the static id", async () => {
    const save = vi.fn(async (state) => state);
    await expect(
      recordSourceConflictDecision(command, dependencies({ save })),
    ).resolves.toMatchObject({ decidedBy: "reviewer-1" });

    // A static approvedClinicalApproverId on the command must NOT bypass the
    // current-identity revalidation: a suspended approver or one that lost the
    // CLINICAL_APPROVER role is rejected.
    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({
          approver: approver("SUSPENDED", ["CLINICAL_APPROVER"]),
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({ approver: approver("ACTIVE", ["MODERATOR"]) }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(save).toHaveBeenCalledOnce();
  });

  it("maps domain validation failures to a safe application error", async () => {
    await expect(
      recordSourceConflictDecision(
        { ...command, description: "<script>synthetic</script>" },
        dependencies(),
      ),
    ).rejects.toMatchObject({
      code: "validation_error",
      message: "description is invalid",
    });
  });

  it("maps unexpected persistence failures without leaking internals", async () => {
    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({
          save: vi.fn(async () => {
            throw new Error("synthetic database detail");
          }),
        }),
      ),
    ).rejects.toMatchObject({
      code: "internal_error",
      message: "Source conflict decision could not be recorded",
    });
  });

  it("preserves an existing application error from persistence", async () => {
    const persistenceError = new ApplicationError(
      "state_conflict",
      "synthetic persistence conflict",
    );

    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({
          save: vi.fn(async () => {
            throw persistenceError;
          }),
        }),
      ),
    ).rejects.toBe(persistenceError);
  });

  it("fails closed when the current approver is absent or out of scope", async () => {
    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({
          approver: { findById: vi.fn(async () => null) },
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      recordSourceConflictDecision(
        command,
        dependencies({
          approver: {
            findById: vi.fn(async () => ({
              accountId: "reviewer-1",
              accountStatus: "ACTIVE" as const,
              roles: ["CLINICAL_APPROVER"] as const,
              scopes: ["other-scope"],
            })),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
