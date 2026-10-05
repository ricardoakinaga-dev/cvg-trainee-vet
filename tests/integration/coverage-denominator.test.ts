import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import config from "../../vitest.config.js";
import {
  COVERAGE_EXCLUDE,
  COVERAGE_FLOOR,
  COVERAGE_INCLUDE,
  collectProductionCoverageInventory,
  findMissingCoverageFiles,
  validateCoveragePolicy,
} from "../../scripts/verify-coverage-floor.mjs";

function coverageConfiguration() {
  const coverage = config.test?.coverage;
  if (
    coverage === undefined ||
    coverage.include === undefined ||
    coverage.exclude === undefined
  ) {
    throw new Error(
      "production coverage configuration and glob inventory required",
    );
  }
  return { ...coverage, include: coverage.include, exclude: coverage.exclude };
}

describe("production coverage denominator", () => {
  it("includes unimported web app TSX sources in the production inventory", async () => {
    const root = resolve(".");
    const inventory = await collectProductionCoverageInventory(root);

    expect(coverageConfiguration().include).toEqual(COVERAGE_INCLUDE);
    expect(inventory.included).toContain("apps/web/app/page.tsx");
    expect(inventory.included).toContain("apps/web/app/authoring/page.tsx");
    expect(inventory.included).toContain("apps/web/proxy.ts");

    const reportWithoutPage = {
      [resolve(root, "apps/web/app/page.tsx")]: {},
    };
    expect(
      findMissingCoverageFiles(inventory, reportWithoutPage, root),
    ).toContain("apps/web/app/authoring/page.tsx");

    const reportWithInventory = Object.fromEntries(
      inventory.included.map((path) => [resolve(root, path), {}]),
    );
    expect(
      findMissingCoverageFiles(inventory, reportWithInventory, root),
    ).toEqual([]);
  });

  it("rejects a generic TSX exclusion while preserving the frozen floors", () => {
    const coverage = coverageConfiguration();
    expect(coverage.include).toEqual(COVERAGE_INCLUDE);
    expect(coverage.exclude).toEqual(COVERAGE_EXCLUDE);
    expect(coverage.thresholds).toEqual({
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    });
    expect(COVERAGE_FLOOR).toEqual({
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    });
    expect(validateCoveragePolicy(coverage)).toEqual([]);

    const issues = validateCoveragePolicy({
      ...coverage,
      exclude: [...coverage.exclude, "**/*.tsx"],
    });
    expect(issues).toContain("generic TSX exclusion is forbidden: **/*.tsx");

    const exactIssues = validateCoveragePolicy({
      ...coverage,
      exclude: [...coverage.exclude, "apps/web/app/page.tsx"],
    });
    expect(exactIssues).toContain(
      "unapproved coverage exclusion: apps/web/app/page.tsx",
    );
  });

  it("records justified declarations and build configuration exclusions", async () => {
    const inventory = await collectProductionCoverageInventory(resolve("."));
    expect(inventory.excluded).toContainEqual({
      path: "apps/web/next-env.d.ts",
      reason: "TypeScript declaration file",
    });
    expect(inventory.excluded).toContainEqual({
      path: "apps/web/next.config.ts",
      reason: "Next.js build configuration, not application runtime code",
    });
    expect(inventory.unmapped).toEqual([]);
  });
});
