import { describe, expect, it, vi } from "vitest";

import {
  recalculateAffectedAssessments,
  registerAssessmentRecalculationCandidates,
  type AssessmentRecalculationRepository,
  type RecalculateAffectedAssessmentsCommand,
} from "./assessment-recalculation-use-cases.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";

const activeApprover: ClinicalApproverPort = {
  findById: async (accountId) => ({
    accountId,
    accountStatus: "ACTIVE",
    roles: ["CLINICAL_APPROVER"],
    scopes: ["scope-1"],
  }),
};

const command: RecalculateAffectedAssessmentsCommand = {
  principalId: "reviewer-1",
  accountStatus: "ACTIVE",
  roles: ["CLINICAL_APPROVER"],
  scopes: ["scope-1"],
  approvedClinicalApproverId: "reviewer-1",
  scopeId: "scope-1",
  itemId: "item-1",
  reason: "ITEM_ANNULLED",
  passingScore: 70,
  recalculatedAt: "2026-08-14T12:00:00.000Z",
};

const candidate = {
  candidateId: "candidate-1",
  participantId: "participant-1",
  scopeId: "scope-1",
  attemptId: "attempt-1",
  itemId: "item-1",
  previousVersion: 2,
  previousScore: 50,
  previousOutcome: "REFORCO" as const,
  correctCount: 8,
  eligibleItemCount: 10,
};

function repository(
  overrides: Readonly<{
    readonly approver?: ClinicalApproverPort;
    readonly listAffected?: AssessmentRecalculationRepository["listAffected"];
    readonly register?: AssessmentRecalculationRepository["register"];
    readonly save?: AssessmentRecalculationRepository["save"];
    readonly notify?: AssessmentRecalculationRepository["notify"];
  }> = {},
): AssessmentRecalculationRepository {
  const operations = {
    listAffected: overrides.listAffected ?? (async () => [candidate]),
    register: overrides.register ?? (async () => undefined),
    save: overrides.save ?? (async () => undefined),
    notify: overrides.notify ?? (async () => undefined),
    approver: overrides.approver ?? activeApprover,
  };
  return {
    ...operations,
    transaction: {
      run: async (work) => work(operations),
    },
  };
}

describe("affected assessment recalculation", () => {
  it("registers only scope-matched snapshots through approved clinical access", async () => {
    const register = vi.fn(async () => undefined);
    const result = await registerAssessmentRecalculationCandidates(
      { ...command, candidates: [candidate] },
      repository({ register }),
    );

    expect(result).toEqual({ registeredCount: 1 });
    expect(register).toHaveBeenCalledWith(candidate, "ITEM_ANNULLED");
  });

  it("recalculates every affected attempt and queues a scoped notification", async () => {
    const save = vi.fn(async () => undefined);
    const notify = vi.fn(async () => undefined);
    const result = await recalculateAffectedAssessments(
      command,
      repository({
        listAffected: async () => [candidate],
        save,
        notify,
      }),
    );

    expect(result).toMatchObject({
      processedCount: 1,
      notificationsQueued: 1,
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        recalculatedVersion: 3,
        recalculatedScore: 80,
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId: "participant-1",
        notificationType: "ASSESSMENT_RECALCULATED",
        candidateId: "candidate-1",
      }),
    );
  });

  it("denies an unapproved operator before listing affected attempts", async () => {
    const withoutApproval = {
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: ["MODERATOR"] as const,
      scopes: command.scopes,
      scopeId: command.scopeId,
      itemId: command.itemId,
      reason: command.reason,
      passingScore: command.passingScore,
      recalculatedAt: command.recalculatedAt,
    } as const;
    const listAffected = vi.fn();
    await expect(
      recalculateAffectedAssessments(
        withoutApproval,
        repository({
          listAffected,
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(listAffected).not.toHaveBeenCalled();
  });

  it("revalidates the current clinical approver before persisting recalculation", async () => {
    const suspendedApprover: ClinicalApproverPort = {
      findById: async (accountId) => ({
        accountId,
        accountStatus: "SUSPENDED",
        roles: ["CLINICAL_APPROVER"],
        scopes: ["scope-1"],
      }),
    };
    const listAffected = vi.fn(async () => [candidate]);
    await expect(
      recalculateAffectedAssessments(
        command,
        repository({
          listAffected,
          approver: suspendedApprover,
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(listAffected).not.toHaveBeenCalled();

    const roleRemovedApprover: ClinicalApproverPort = {
      findById: async (accountId) => ({
        accountId,
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: ["scope-1"],
      }),
    };
    await expect(
      recalculateAffectedAssessments(
        command,
        repository({
          listAffected,
          approver: roleRemovedApprover,
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(listAffected).not.toHaveBeenCalled();
  });
});
