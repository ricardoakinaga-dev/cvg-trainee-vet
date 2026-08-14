import { describe, expect, it } from "vitest";

import { validateCodeHotspotSnapshot } from "../../scripts/verify-code-hotspots.mjs";

type CodeHotspotSnapshot = Parameters<typeof validateCodeHotspotSnapshot>[0];

describe("code hotspot policy", () => {
  it("classifies every production hotspot with owner, plan and characterization evidence", async () => {
    const snapshot =
      await import("../../scripts/verify-code-hotspots.mjs").then(
        ({ loadCodeHotspotSnapshot }) => loadCodeHotspotSnapshot(),
      );

    expect(validateCodeHotspotSnapshot(snapshot)).toEqual([]);
    expect(snapshot.hotspots.length).toBeGreaterThan(0);
    expect(snapshot.hotspots.every((hotspot) => hotspot.owner.length > 0)).toBe(
      true,
    );
    expect(
      snapshot.hotspots.every(
        (hotspot) => hotspot.characterizationTests.length > 0,
      ),
    ).toBe(true);
  });

  it("rejects an unplanned hotspot and a missing characterization test", () => {
    const snapshot: CodeHotspotSnapshot = {
      sourceFiles: [{ path: "apps/api/src/http.ts", lineCount: 900 }],
      availableFiles: [],
      hotspots: [
        {
          path: "apps/api/src/http.ts",
          lineCount: 900,
          owner: "",
          severity: "critical",
          plan: "",
          targetLineBudget: 800,
          characterizationTests: ["tests/missing.test.ts"],
        },
      ],
    };

    expect(validateCodeHotspotSnapshot(snapshot)).toEqual([
      "hotspot apps/api/src/http.ts has no owner",
      "hotspot apps/api/src/http.ts has no decomposition plan",
      "hotspot apps/api/src/http.ts characterization test is missing: tests/missing.test.ts",
    ]);
  });
});
