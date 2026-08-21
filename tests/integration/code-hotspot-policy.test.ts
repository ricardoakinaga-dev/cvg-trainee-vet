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
    expect(snapshot.hotspots.every((hotspot) => hotspot.owner.length > 0)).toBe(
      true,
    );
    expect(
      snapshot.hotspots.every(
        (hotspot) => hotspot.characterizationTests.length > 0,
      ),
    ).toBe(true);
    expect(
      snapshot.availableFiles.some((path) => path.startsWith(".git/")),
    ).toBe(false);
  }, 30_000);

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

  it("rejects production function debt that regresses the ratchet", () => {
    const snapshot: CodeHotspotSnapshot = {
      maxProductionLines: 800,
      maxProductionFunctionLines: 50,
      maxLongFunctions: 1,
      maxLongestFunctionLines: 80,
      functionStats: {
        functionCount: 4,
        longFunctionCount: 2,
        longestFunctionLines: 90,
      },
      sourceFiles: [],
      availableFiles: [],
      hotspots: [],
    };

    expect(validateCodeHotspotSnapshot(snapshot)).toEqual([
      "long production function count 2 exceeds ratchet 1",
      "longest production function 90 lines exceeds ratchet 80",
    ]);
  });

  it("keeps critical attempt commands below the function-size bar", async () => {
    const { loadCodeHotspotSnapshot } =
      await import("../../scripts/verify-code-hotspots.mjs");
    const snapshot = await loadCodeHotspotSnapshot();
    const criticalCommands = snapshot.sourceFiles
      .flatMap((file) => file.functions ?? [])
      .filter(
        (fn) =>
          fn.path === "packages/application/src/attempt-use-cases.ts" &&
          ["startAttempt", "submitAttempt"].includes(fn.name),
      );

    expect(criticalCommands).toHaveLength(2);
    expect(criticalCommands.filter((fn) => fn.lineCount > 50)).toEqual([]);
  });

  it("keeps dependency diagnostics orchestration below the function-size bar", async () => {
    const { loadCodeHotspotSnapshot } =
      await import("../../scripts/verify-code-hotspots.mjs");
    const snapshot = await loadCodeHotspotSnapshot();
    const dependencyResponse = snapshot.sourceFiles
      .flatMap((file) => file.functions ?? [])
      .find(
        (fn) =>
          fn.path === "apps/api/src/http-route-health.ts" &&
          fn.name === "dependencyResponse",
      );

    expect(dependencyResponse).toBeDefined();
    expect(dependencyResponse?.lineCount).toBeLessThanOrEqual(50);
  });

  it("keeps every production function at or below the B99-305 closure bar", async () => {
    const { loadCodeHotspotSnapshot } =
      await import("../../scripts/verify-code-hotspots.mjs");
    const snapshot = await loadCodeHotspotSnapshot();
    const overBudget = snapshot.sourceFiles
      .flatMap((file) => file.functions ?? [])
      .filter((fn) => fn.lineCount > 100);

    expect(snapshot.maxLongestFunctionLines).toBe(100);
    expect(overBudget).toEqual([]);
  });
});
