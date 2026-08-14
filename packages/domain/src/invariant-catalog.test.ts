import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  criticalInvariantCatalog,
  validateInvariantCatalog,
} from "./invariant-catalog.js";

describe("critical invariant catalog", () => {
  it("covers the implemented P0/P1 decisions with executable evidence", () => {
    expect(validateInvariantCatalog(criticalInvariantCatalog)).toEqual([]);
    expect(criticalInvariantCatalog.length).toBeGreaterThanOrEqual(31);
    expect(
      new Set(criticalInvariantCatalog.map((invariant) => invariant.id)).size,
    ).toBe(criticalInvariantCatalog.length);

    for (const invariant of criticalInvariantCatalog) {
      expect(invariant.requirementIds.length).toBeGreaterThan(0);
      expect(invariant.codePaths.length).toBeGreaterThan(0);
      expect(invariant.contractPaths.length).toBeGreaterThan(0);
      expect(invariant.testPaths.length).toBeGreaterThan(0);
      for (const path of [
        ...invariant.codePaths,
        ...invariant.contractPaths,
        ...invariant.testPaths,
      ]) {
        expect(existsSync(path), `${invariant.id}: ${path}`).toBe(true);
      }
    }
  });

  it("rejects duplicate, untestable, or gap-shaped invariant records", () => {
    const first = criticalInvariantCatalog[0];
    if (first === undefined) throw new Error("invariant catalog is empty");

    const duplicate = [...criticalInvariantCatalog, first];
    expect(validateInvariantCatalog(duplicate)).toContain(
      `duplicate invariant id ${first.id}`,
    );

    const incomplete = [
      Object.freeze({
        ...first,
        id: "INV-TEST-INCOMPLETE",
        testPaths: [],
      }),
    ];
    expect(validateInvariantCatalog(incomplete)).toContain(
      "INV-TEST-INCOMPLETE has no executable test evidence",
    );
  });
});
