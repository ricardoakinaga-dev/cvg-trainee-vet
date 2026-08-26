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

  it("provisions distinct migration, application, and fixture roles", async () => {
    const contract = await readCiContract();

    expect(contract.workflow).toMatch(
      /CVG_MIGRATION_DATABASE_URL: postgresql:\/\/cvg:/u,
    );
    expect(contract.workflow).toMatch(/DATABASE_URL: postgresql:\/\/cvg_app:/u);
    expect(contract.workflow).toMatch(
      /CVG_TEST_ADMIN_DATABASE_URL: postgresql:\/\/cvg_test_admin:/u,
    );
    expect(contract.workflow).toMatch(
      /run: node scripts\/provision-ci-postgres\.mjs/u,
    );
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("declares every database URL used by the CI provision and live flows", async () => {
    const contract = await readCiContract();

    expect(contract.envExample).toContain("CVG_MIGRATION_DATABASE_URL=");
    expect(contract.envExample).toContain("CVG_TEST_ADMIN_DATABASE_URL=");
    expect(contract.envExample).toContain("CVG_REAL_E2E_DATABASE_URL=");
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("rejects documented database URLs that collapse migration and application roles", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      envExample: contract.envExample.replace(
        "CVG_TEST_DATABASE_URL=postgresql://cvg_app:cvg_app@localhost:5432/cvg",
        "CVG_TEST_DATABASE_URL=postgresql://cvg:cvg@localhost:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /distinct .* roles/i,
    );
  });
});
