import { describe, expect, it } from "vitest";
import {
  readCiContract,
  validateCiContract,
} from "../../scripts/verify-ci-contract.mjs";

describe("CI reproducibility contract", () => {
  it("accepts the repository's pinned environment and quality workflow", async () => {
    const contract = await readCiContract();

    expect(validateCiContract(contract)).toMatchObject({
      status: "PASS",
      nodeVersion: "22.22.0",
      pnpmVersion: "10.33.0",
      requiredWorkflowChecks: expect.any(Number),
    });
  });

  it("rejects a workflow that drops the live Qdrant service", async () => {
    const contract = await readCiContract();
    const withoutQdrant = {
      ...contract,
      workflow: contract.workflow.replace(
        "qdrant/qdrant:v1.15.5",
        "postgres:16",
      ),
    };

    expect(() => validateCiContract(withoutQdrant)).toThrow(/Qdrant service/i);
  });

  it("activates pnpm before setup-node resolves the pnpm cache", async () => {
    const contract = await readCiContract();
    const setupNodeStep = contract.workflow.indexOf(
      "      - name: Setup Node.js",
    );
    const enablePnpmStep = contract.workflow.indexOf(
      "      - name: Enable pnpm",
    );

    expect(enablePnpmStep).toBeGreaterThanOrEqual(0);
    expect(setupNodeStep).toBeGreaterThanOrEqual(0);
    expect(enablePnpmStep).toBeLessThan(setupNodeStep);
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("starts the real API web server outside test bootstrap mode", async () => {
    const contract = await readCiContract();

    expect(contract.playwrightConfig).toMatch(
      /NODE_ENV=development API_HOST=127\.0\.0\.1 API_PORT=3101/u,
    );
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("pins the build-time web proxy target in CI", async () => {
    const contract = await readCiContract();

    expect(contract.workflow).toMatch(
      /run:\s*CVG_API_INTERNAL_URL=http:\/\/127\.0\.0\.1:3000 pnpm build/u,
    );
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("documents the external licensed clinical source bundle boundary", async () => {
    const contract = await readCiContract();

    expect(contract.envExample).toMatch(/^CVG_CLINICAL_SOURCES_DIRECTORY=/mu);
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });
});
