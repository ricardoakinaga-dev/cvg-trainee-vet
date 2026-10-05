import { describe, expect, it } from "vitest";
import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";
import {
  hasCoherentModuleCompletion,
  type ModuleAuthorityFacts,
  type ModuleCompletionReceiptFact,
} from "./journey-module-authority.js";

const participantId = "synthetic-participant";
const scopeId = "synthetic-scope";
const assignmentId = "synthetic-assignment";
const moduleId = "M02";
const completedAt = "2026-09-30T12:00:00.000Z";

type Assignment = ModuleAuthorityFacts["assignments"][number];
type Activity = ModuleAuthorityFacts["activities"][number];

function assignment(
  status: LearningAssignmentStatus,
  overrides: Partial<Assignment["state"]> = {},
): Assignment {
  return {
    scopeId,
    state: {
      participantId,
      assignmentId,
      moduleId,
      status,
      version: 4,
      availableAt: "2026-09-01T00:00:00.000Z",
      ...overrides,
    },
  };
}

function activity(
  overrides: Partial<Activity> & Readonly<{ activityId: string }>,
): Activity {
  return {
    scopeId,
    moduleId,
    learningAssignmentId: assignmentId,
    status: "CONCLUIDO",
    nextAction: "REVISAR_PROXIMO_CONTEUDO",
    attemptStatus: "CORRIGIDA_HUMANAMENTE",
    attemptId: `${overrides.activityId}-attempt`,
    ...overrides,
  };
}

function receipt(
  overrides: Partial<ModuleCompletionReceiptFact> = {},
): ModuleCompletionReceiptFact {
  return {
    participantId,
    scopeId,
    moduleId,
    assignmentId,
    completedAt,
    completedAssignmentVersion: 4,
    ...overrides,
  };
}

function facts(
  overrides: Partial<ModuleAuthorityFacts> = {},
): ModuleAuthorityFacts {
  return {
    participantId,
    assignments: [assignment("CONCLUIDO")],
    activities: [activity({ activityId: "terminal" })],
    ...overrides,
  };
}

describe("receipt-backed module completion authority", () => {
  it("keeps the status authority for a module without a bound obligation inventory", () => {
    const unbound = facts({ boundAssignmentIds: [] });

    expect(hasCoherentModuleCompletion(unbound, scopeId, moduleId)).toBe(true);
    expect(hasCoherentModuleCompletion(facts(), scopeId, moduleId)).toBe(true);
  });

  it("denies a bound assignment without a stored receipt even when the status is CONCLUIDO", () => {
    const bound = facts({ boundAssignmentIds: [assignmentId] });
    const proven = facts({
      boundAssignmentIds: [assignmentId],
      completionReceipts: [receipt()],
    });

    expect(hasCoherentModuleCompletion(bound, scopeId, moduleId)).toBe(false);
    expect(hasCoherentModuleCompletion(proven, scopeId, moduleId)).toBe(true);
  });

  it("ignores a binding recorded for another assignment", () => {
    const foreign = facts({ boundAssignmentIds: ["other-assignment"] });

    expect(hasCoherentModuleCompletion(foreign, scopeId, moduleId)).toBe(true);
  });

  it("denies a synchronized CONCLUIDO status without a stored receipt", () => {
    const synced = facts({ boundAssignmentIds: [assignmentId] });

    expect(hasCoherentModuleCompletion(synced, scopeId, moduleId)).toBe(false);
  });

  it("denies an empty or partial inventory: a terminal activity without any attempt proves nothing", () => {
    const empty = facts({
      boundAssignmentIds: [assignmentId],
      activities: [
        {
          scopeId,
          moduleId,
          learningAssignmentId: assignmentId,
          status: "CONCLUIDO",
          nextAction: "REVISAR_PROXIMO_CONTEUDO",
        },
      ],
    });

    expect(hasCoherentModuleCompletion(empty, scopeId, moduleId)).toBe(false);
  });

  it("denies two identical EM_REFORCO histories unless one of them carries a receipt", () => {
    const history = {
      assignments: [assignment("EM_REFORCO")],
      activities: [
        activity({ activityId: "retention", status: "EM_REFORCO" }),
        activity({
          activityId: "corrected",
          nextAction: "CONSULTAR_PROXIMO_PASSO",
        }),
      ],
    };
    const without = facts(history);
    const proven = facts({ ...history, completionReceipts: [receipt()] });

    expect({ ...without, completionReceipts: [receipt()] }).toEqual(proven);
    expect(hasCoherentModuleCompletion(without, scopeId, moduleId)).toBe(false);
    expect(hasCoherentModuleCompletion(proven, scopeId, moduleId)).toBe(true);
  });

  it("keeps the receipt decisive when a new pending attempt starts after completion (RN-032)", () => {
    const value = facts({
      completionReceipts: [receipt()],
      activities: [
        activity({ activityId: "terminal" }),
        activity({
          activityId: "retake",
          status: "EM_ANDAMENTO",
          attemptStatus: "SALVA" as AttemptStatus,
          nextAction: "RETOMAR_ATIVIDADE",
        }),
      ],
    });

    expect(hasCoherentModuleCompletion(value, scopeId, moduleId)).toBe(true);
  });

  it("denies a receipt recorded for an earlier version of the assignment", () => {
    const reopened = facts({
      assignments: [assignment("EM_REFORCO", { version: 6 })],
      completionReceipts: [receipt({ completedAssignmentVersion: 4 })],
    });
    const reissued = facts({
      assignments: [assignment("EM_REFORCO", { version: 6 })],
      completionReceipts: [receipt({ completedAssignmentVersion: 6 })],
    });

    expect(hasCoherentModuleCompletion(reopened, scopeId, moduleId)).toBe(
      false,
    );
    expect(hasCoherentModuleCompletion(reissued, scopeId, moduleId)).toBe(true);
  });

  it("rejects a receipt issued for a foreign participant, scope or assignment", () => {
    const terminal = facts({
      boundAssignmentIds: [assignmentId],
      completionReceipts: [receipt()],
    });

    expect(
      hasCoherentModuleCompletion(
        {
          ...terminal,
          completionReceipts: [
            receipt({ participantId: "foreign-participant" }),
          ],
        },
        scopeId,
        moduleId,
      ),
    ).toBe(false);
    expect(
      hasCoherentModuleCompletion(
        { ...terminal, completionReceipts: [receipt({ scopeId: "foreign" })] },
        scopeId,
        moduleId,
      ),
    ).toBe(false);
    expect(
      hasCoherentModuleCompletion(
        {
          ...terminal,
          completionReceipts: [receipt({ assignmentId: "foreign" })],
        },
        scopeId,
        moduleId,
      ),
    ).toBe(false);
    expect(
      hasCoherentModuleCompletion(
        {
          ...terminal,
          completionReceipts: [receipt({ moduleId: "M03" })],
        },
        scopeId,
        moduleId,
      ),
    ).toBe(false);
    expect(
      hasCoherentModuleCompletion(
        {
          ...terminal,
          completionReceipts: [receipt({ completedAt: "not-a-timestamp" })],
        },
        scopeId,
        moduleId,
      ),
    ).toBe(false);
  });

  it("never lets a receipt from another scope satisfy the queried scope", () => {
    const value = facts({
      boundAssignmentIds: [assignmentId],
      completionReceipts: [receipt({ scopeId: "foreign-scope" })],
    });

    expect(hasCoherentModuleCompletion(value, scopeId, moduleId)).toBe(false);
    expect(hasCoherentModuleCompletion(value, "foreign-scope", moduleId)).toBe(
      false,
    );
  });

  it("keeps a module without assignments denied even with a matching receipt", () => {
    const value = facts({ assignments: [], completionReceipts: [receipt()] });

    expect(hasCoherentModuleCompletion(value, scopeId, moduleId)).toBe(false);
  });
});
