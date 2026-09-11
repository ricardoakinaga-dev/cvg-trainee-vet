import { describe, expect, it } from "vitest";

import { isAllowed } from "./authorization.js";

/**
 * Independent review finding (v6): the configured clinical identity must
 * reach every hasScopedStaffRole arm, not a hard-coded subset. Clinical
 * staff holding only CLINICAL_APPROVER must see staff surfaces in scope;
 * anyone else must stay denied (fail-closed preserved).
 */
const clinical = {
  principalId: "clinico-1",
  accountStatus: "ACTIVE" as const,
  roles: ["CLINICAL_APPROVER"] as const,
  scopes: ["scope-1"] as const,
};

describe("isAllowed clinical identity forwarding", () => {
  it("grants staff surfaces to the configured clinical identity in scope", () => {
    for (const capability of [
      "VIEW_STAFF_DASHBOARD",
      "VIEW_PROGRAM_METRICS",
      "MANAGE_LEARNING_ASSIGNMENTS",
      "CORRECT_ATTEMPT",
    ] as const) {
      expect(
        isAllowed(clinical, capability, { scopeId: "scope-1" }, "clinico-1"),
      ).toBe(true);
    }
  });

  it("denies mismatched identities and out-of-scope access", () => {
    expect(
      isAllowed(
        clinical,
        "VIEW_STAFF_DASHBOARD",
        { scopeId: "scope-1" },
        "other",
      ),
    ).toBe(false);
    expect(
      isAllowed(clinical, "VIEW_STAFF_DASHBOARD", { scopeId: "scope-1" }),
    ).toBe(false);
    expect(
      isAllowed(
        clinical,
        "VIEW_STAFF_DASHBOARD",
        { scopeId: "other-scope" },
        "clinico-1",
      ),
    ).toBe(false);
  });

  it("never grants participant-only capabilities to clinical identities", () => {
    expect(
      isAllowed(
        clinical,
        "VIEW_OWN_ACTIVITY",
        { ownerId: "clinico-1", scopeId: "scope-1" },
        "clinico-1",
      ),
    ).toBe(false);
  });
});
