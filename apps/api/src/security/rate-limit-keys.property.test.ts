import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import {
  buildRateLimitKey,
  RISK_CLASS_LIMITS,
  type RateLimitRiskClass,
} from "./rate-limit-store.js";

const riskArb = fc.constantFrom(
  ...Object.keys(RISK_CLASS_LIMITS),
) as fc.Arbitrary<RateLimitRiskClass>;
const textArb = fc.string({ maxLength: 48 });
const routeArb = fc
  .array(fc.constantFrom("api", "v1", "attempts", "x", ":attemptId"), {
    maxLength: 6,
  })
  .map((parts) => `/${parts.join("/")}`);

describe("rate-limit key property tests (AAA-FINAL-002 §17)", () => {
  it("property=deterministic/risk=cache-poisoning: same input always yields the same key", () => {
    fc.assert(
      fc.property(textArb, textArb, routeArb, riskArb, (a, b, route, risk) => {
        const input = {
          principalId: a,
          clientIp: b,
          route,
          riskClass: risk,
        } as const;
        expect(buildRateLimitKey(input)).toBe(buildRateLimitKey(input));
      }),
      { numRuns: 300 },
    );
  });

  it("property=bounded-safe/risk=cardinality-attack: keys are bounded and carry no raw identity or whitespace", () => {
    fc.assert(
      fc.property(textArb, textArb, routeArb, riskArb, (a, b, route, risk) => {
        const key = buildRateLimitKey({
          principalId: a,
          clientIp: b,
          route,
          riskClass: risk,
        });
        expect(key.length).toBeLessThanOrEqual(640);
        expect(key).not.toMatch(/[\s]/u);
        // Raw identity must never appear as a key segment (short inputs
        // like "-" trivially occur inside fixed labels, so compare segments).
        if (a.trim().length > 0) {
          expect(key.split("|")).not.toContain(a.trim());
        }
      }),
      { numRuns: 300 },
    );
  });

  it("property=risk-isolation/risk=budget-confusion: risk class always partitions the key", () => {
    fc.assert(
      fc.property(textArb, textArb, routeArb, (a, b, route) => {
        const forRisk = (risk: RateLimitRiskClass): string =>
          buildRateLimitKey({
            principalId: a,
            clientIp: b,
            route,
            riskClass: risk,
          });
        const keys = new Set(
          (Object.keys(RISK_CLASS_LIMITS) as RateLimitRiskClass[]).map(forRisk),
        );
        expect(keys.size).toBe(Object.keys(RISK_CLASS_LIMITS).length);
      }),
      { numRuns: 200 },
    );
  });
});
