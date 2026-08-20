import { describe, expect, it } from "vitest";

import {
  createRemediationPlan,
  type RemediationPlanInput,
} from "./remediation-policy.js";

const base: RemediationPlanInput = {
  attemptCount: 1,
  objectiveIds: ["OBJ-01", "OBJ-02"],
  criticalError: true,
};

describe("remediation policy", () => {
  it("keeps the first remediation digital and limited to affected objectives", () => {
    const plan = createRemediationPlan(base);

    expect(plan).toEqual({
      kind: "REFORCO_DIGITAL",
      attemptCount: 1,
      objectiveIds: ["OBJ-01", "OBJ-02"],
      mentorRequired: false,
      punitive: false,
    });
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("routes the second or later failure to an individual mentor plan", () => {
    expect(createRemediationPlan({ ...base, attemptCount: 2 })).toMatchObject({
      kind: "PLANO_INDIVIDUAL_MENTOR",
      mentorRequired: true,
      punitive: false,
    });
  });

  it("preserves the remediation invariant across the attempt-count domain", () => {
    for (let attemptCount = 1; attemptCount <= 8; attemptCount += 1) {
      const plan = createRemediationPlan({ ...base, attemptCount });
      expect(plan.objectiveIds).toEqual(base.objectiveIds);
      expect(plan.punitive).toBe(false);
      expect(plan.mentorRequired).toBe(attemptCount >= 2);
      expect(plan.kind).toBe(
        attemptCount >= 2 ? "PLANO_INDIVIDUAL_MENTOR" : "REFORCO_DIGITAL",
      );
    }
  });

  it("rejects an empty or duplicated remediation scope", () => {
    expect(() => createRemediationPlan({ ...base, objectiveIds: [] })).toThrow(
      "objectiveIds",
    );
    expect(() =>
      createRemediationPlan({ ...base, objectiveIds: ["OBJ-01", "OBJ-01"] }),
    ).toThrow("unique");
  });

  it("rejects malformed attempt counts, critical flags and objective identifiers", () => {
    expect(() => createRemediationPlan({ ...base, attemptCount: 0 })).toThrow(
      "attemptCount",
    );
    expect(() =>
      createRemediationPlan({ ...base, criticalError: "yes" as never }),
    ).toThrow("criticalError");
    expect(() =>
      createRemediationPlan({ ...base, objectiveIds: [" "] }),
    ).toThrow("text");
  });
});
