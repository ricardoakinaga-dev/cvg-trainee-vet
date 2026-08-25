import { describe, expect, it, vi } from "vitest";

import { getAppealDecisionImpactPreview } from "./appeal-decision-impact-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const otherScopeId = "99999999-9999-4999-8999-999999999999";
const principalId = "22222222-2222-4222-8222-222222222222";
const appealId = "33333333-3333-4333-8333-333333333333";
const participantId = "44444444-4444-4444-8444-444444444444";
const attemptId = "55555555-5555-4555-8555-555555555555";
const itemId = "66666666-6666-4666-8666-666666666666";

const appeal = {
  appealId,
  participantId,
  attemptId,
  itemId,
  justification: "Justificativa sintética de revisão.",
  createdAt: "2026-08-24T12:00:00.000Z",
  dueAt: "2026-08-30T12:00:00.000Z",
  version: 1,
  status: "EM_REVISAO" as const,
  reviewerId: principalId,
};

const attempt = {
  attemptId,
  participantId,
  activityId: "77777777-7777-4777-8777-777777777777",
  status: "CORRIGIDA_AUTOMATICAMENTE" as const,
  version: 3,
  submittedAt: "2026-08-24T11:00:00.000Z",
};

const result = {
  resultId: "88888888-8888-4888-8888-888888888888",
  attemptId,
  version: 2,
  kind: "AUTOMATICA" as const,
  score: 80,
  outcome: "APROVADO" as const,
  feedback: "Feedback interno sintético.",
  ruleVersion: "synthetic-rule-v1",
  correctedBy: principalId,
  correctedAt: "2026-08-24T11:30:00.000Z",
};

function command(overrides: Record<string, unknown> = {}) {
  return {
    principalId,
    accountStatus: "ACTIVE" as const,
    roles: ["MODERATOR"] as const,
    scopes: [scopeId] as const,
    appealId,
    decision: "ANULAR_ITEM" as const,
    ...overrides,
  };
}

function port(overrides: Record<string, unknown> = {}) {
  return {
    getAppealDecisionImpact: vi.fn(async () => ({
      appealExists: true,
      scopeId,
      appeal,
      attempt,
      latestResult: result,
      ...overrides,
    })),
  };
}

describe("appeal decision impact preview", () => {
  it("returns only bounded facts and explicit non-mutation limits", async () => {
    const readPort = port();
    const preview = await getAppealDecisionImpactPreview(command(), readPort);

    expect(preview).toEqual({
      kind: "appeal_decision_impact_preview",
      appealId,
      decision: "ANULAR_ITEM",
      appeal: { status: "EM_REVISAO", version: 1 },
      target: {
        attemptId,
        itemId,
        attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
        attemptVersion: 3,
      },
      latestResult: { availability: "AVAILABLE", version: 2 },
      impact: {
        scoreImpact: "NOT_COMPUTED",
        recalculation: "NOT_AVAILABLE_IN_THIS_SLICE",
        automaticMutation: "NONE",
        publication: "NOT_PERFORMED",
      },
    });
    expect(Object.isFrozen(preview)).toBe(true);
    expect(readPort.getAppealDecisionImpact).toHaveBeenCalledWith(
      appealId,
      [scopeId],
      "ANULAR_ITEM",
    );
    expect(preview).not.toHaveProperty("score");
    expect(preview).not.toHaveProperty("participantId");
  });

  it("represents a missing current result without inventing a score", async () => {
    const preview = await getAppealDecisionImpactPreview(
      command(),
      port({ latestResult: null }),
    );

    expect(preview).not.toBeNull();
    if (preview === null) throw new Error("preview is unexpectedly missing");
    expect(preview.latestResult).toEqual({ availability: "NOT_AVAILABLE" });
    expect(preview.impact.scoreImpact).toBe("NOT_COMPUTED");
  });

  it("does not present a candidate after the appeal has been decided", async () => {
    await expect(
      getAppealDecisionImpactPreview(
        command(),
        port({ appeal: { ...appeal, status: "DECIDIDA" } }),
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
  });

  it("denies participants and never calls the port", async () => {
    const readPort = port();
    await expect(
      getAppealDecisionImpactPreview(
        command({ roles: ["PARTICIPANT"], scopes: [scopeId] }),
        readPort,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(readPort.getAppealDecisionImpact).not.toHaveBeenCalled();
  });

  it("fails closed for a missing appeal, cross-scope data, mismatched target, or malformed result", async () => {
    await expect(
      getAppealDecisionImpactPreview(command(), {
        getAppealDecisionImpact: async () => ({
          appealExists: false,
          scopeId: "",
          appeal: null,
          attempt: null,
          latestResult: null,
        }),
      }),
    ).resolves.toBeNull();

    await expect(
      getAppealDecisionImpactPreview(
        command(),
        port({ scopeId: otherScopeId }),
      ),
    ).rejects.toMatchObject({ code: "internal_error" });

    await expect(
      getAppealDecisionImpactPreview(
        command(),
        port({ attempt: { ...attempt, attemptId: otherScopeId } }),
      ),
    ).rejects.toMatchObject({ code: "internal_error" });

    await expect(
      getAppealDecisionImpactPreview(
        command(),
        port({ latestResult: { ...result, attemptId: otherScopeId } }),
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });

  it("rejects invalid decisions, IDs, scopes, or excessive scope lists", async () => {
    const readPort = port();
    await expect(
      getAppealDecisionImpactPreview(
        command({ decision: "MANTER_RESULTADO" }),
        readPort,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealDecisionImpactPreview(
        command({ appealId: "invalid" }),
        readPort,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealDecisionImpactPreview(
        command({ scopes: ["invalid"] }),
        readPort,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAppealDecisionImpactPreview(
        command({ scopes: Array.from({ length: 101 }, () => scopeId) }),
        readPort,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});
