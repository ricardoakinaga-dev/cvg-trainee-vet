import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import { canAccess, CAPABILITIES, type Capability } from "./authorization.js";

const capabilityArb = fc.constantFrom(
  ...(Object.freeze([...CAPABILITIES]) as Capability[]),
);
const scopeArb = fc.uuid();
const idArb = fc.uuid();

describe("authorization property tests (AAA-FINAL-002 §17)", () => {
  it("property=suspended-deny/risk=privilege-escalation: SUSPENDED never grants any capability", () => {
    fc.assert(
      fc.property(capabilityArb, scopeArb, idArb, (capability, scopeId, id) => {
        expect(
          canAccess({
            principalId: id,
            accountStatus: "SUSPENDED",
            roles: ["ADMIN"],
            capability,
            resource: { ownerId: id, scopeId },
            scopes: [scopeId],
          }),
        ).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("property=empty-identity-deny/risk=anonymous-escalation: blank principal never grants", () => {
    fc.assert(
      fc.property(capabilityArb, (capability) => {
        expect(
          canAccess({
            principalId: "   ",
            accountStatus: "ACTIVE",
            roles: ["ADMIN"],
            capability,
            resource: { scopeId: "scope-1" },
            scopes: ["scope-1"],
          }),
        ).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("property=out-of-scope-deny/risk=cross-scope: scoped capabilities require scope membership", () => {
    const scoped: Capability[] = [
      "VIEW_OWN_ACTIVITY",
      "MANAGE_LEARNING_ASSIGNMENTS",
      "VIEW_FEEDBACK_QUEUE",
      "REVIEW_APPEAL",
      "MODERATE_CONTENT",
      "AUTHOR_CONTENT",
      "VIEW_PROGRAM_METRICS",
      "MANAGE_ACCOUNT_LIFECYCLE",
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...scoped),
        scopeArb,
        scopeArb,
        (capability, scopeId, otherScope) => {
          fc.pre(scopeId !== otherScope);
          const base = {
            principalId: "principal-1",
            accountStatus: "ACTIVE" as const,
            roles: ["ADMIN", "AUTHOR", "MODERATOR", "PARTICIPANT"] as const,
            capability,
            resource: { ownerId: "principal-1", scopeId },
            scopes: [otherScope],
          };
          expect(canAccess(base)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
