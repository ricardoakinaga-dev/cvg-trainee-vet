import { describe, expect, it } from "vitest";

import {
  appealDecisionImpactPathSchema,
  appealDecisionImpactProjectionSchema,
  appealDecisionImpactQuerySchema,
} from "./appeal-decision-impact.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";

const projection = {
  kind: "appeal_decision_impact_preview" as const,
  appealId,
  decision: "ANULAR_ITEM" as const,
  appeal: {
    status: "EM_REVISAO" as const,
    version: 1,
  },
  target: {
    attemptId,
    itemId,
    attemptStatus: "CORRIGIDA_AUTOMATICAMENTE" as const,
    attemptVersion: 3,
  },
  latestResult: {
    availability: "AVAILABLE" as const,
    version: 1,
  },
  impact: {
    scoreImpact: "NOT_COMPUTED" as const,
    recalculation: "NOT_AVAILABLE_IN_THIS_SLICE" as const,
    automaticMutation: "NONE" as const,
    publication: "NOT_PERFORMED" as const,
  },
};

describe("appeal decision impact contracts", () => {
  it("accepts the bounded ANULAR_ITEM read-only preview", () => {
    expect(appealDecisionImpactPathSchema.parse({ appealId })).toEqual({
      appealId,
    });
    expect(
      appealDecisionImpactQuerySchema.parse({ decision: "ANULAR_ITEM" }),
    ).toEqual({ decision: "ANULAR_ITEM" });
    expect(appealDecisionImpactProjectionSchema.parse(projection)).toEqual(
      projection,
    );
  });

  it("rejects alternate decisions and fields that could imply a score mutation", () => {
    expect(() =>
      appealDecisionImpactQuerySchema.parse({ decision: "MANTER_RESULTADO" }),
    ).toThrow();
    expect(() =>
      appealDecisionImpactProjectionSchema.parse({
        ...projection,
        score: 80,
      }),
    ).toThrow();
    expect(() =>
      appealDecisionImpactProjectionSchema.parse({
        ...projection,
        latestResult: { availability: "NOT_AVAILABLE", version: 1 },
      }),
    ).toThrow();
    expect(() =>
      appealDecisionImpactProjectionSchema.parse({
        ...projection,
        latestResult: { availability: "AVAILABLE" },
      }),
    ).toThrow();
  });
});
