import { describe, expect, it } from "vitest";
import {
  createCycloneDxSbom,
  createSha256Manifest,
  findRedactionFindings,
} from "../../scripts/ci-artifact-governance.mjs";
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

  it("requires checkout provenance to match the workflow SHA before install", async () => {
    const contract = await readCiContract();
    const withoutShaVerification = {
      ...contract,
      workflow: contract.workflow.replace(
        /\n\x20{6}- name: Verify checkout SHA\r?\n[\s\S]*?(?=\n\x20{6}- name: |\n?$)/u,
        "\n",
      ),
    };

    expect(() => validateCiContract(withoutShaVerification)).toThrow(
      /same-SHA checkout verification/i,
    );
  });

  it("checks out full history so the release gate can resolve reachable commits", async () => {
    const contract = await readCiContract();
    const checkoutStep = contract.workflow.match(
      /\n {6}- name: Checkout\r?\n[\s\S]*?(?=\n {6}- name: |\n?$)/u,
    );

    expect(checkoutStep?.[0]).toMatch(/uses: actions\/checkout@v4/u);
    expect(checkoutStep?.[0]).toMatch(/fetch-depth: 0/u);
    expect(validateCiContract(contract)).toMatchObject({ status: "PASS" });
  });

  it("requires deterministic SBOM, hash manifest, and redaction governance before upload", async () => {
    const contract = await readCiContract();
    const withoutArtifactGovernance = {
      ...contract,
      workflow: contract.workflow.replace(
        /\n\x20{6}- name: Generate and verify release artifacts\r?\n[\s\S]*?(?=\n\x20{6}- name: |\n?$)/u,
        "\n",
      ),
    };

    expect(() => validateCiContract(withoutArtifactGovernance)).toThrow(
      /artifact governance/i,
    );
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
      envExample: contract.envExample
        .replace(
          "DATABASE_URL=postgresql://cvg_app:cvg_app@localhost:5432/cvg",
          "DATABASE_URL=postgresql://cvg:cvg@localhost:5432/cvg",
        )
        .replace(
          "CVG_TEST_DATABASE_URL=postgresql://cvg_app:cvg_app@localhost:5432/cvg",
          "CVG_TEST_DATABASE_URL=postgresql://cvg:cvg@localhost:5432/cvg",
        ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /distinct .* roles/i,
    );
  });

  it("rejects a runtime DATABASE_URL that uses the migration role", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      envExample: contract.envExample.replace(
        /DATABASE_URL=postgresql:\/\/[^\r\n]+/u,
        "DATABASE_URL=postgresql://cvg_migration:cvg_migration@localhost:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /DATABASE_URL.*application role/i,
    );
  });

  it("rejects a runtime DATABASE_URL that targets another database", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      envExample: contract.envExample.replace(
        /DATABASE_URL=postgresql:\/\/[^\r\n]+/u,
        "DATABASE_URL=postgresql://cvg_app:cvg_app@localhost:5432/other",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /database URLs must target the same database/i,
    );
  });

  it("rejects an empty documented database URL", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      envExample: contract.envExample.replace(
        /CVG_TEST_DATABASE_URL=[^\r\n]*/u,
        "CVG_TEST_DATABASE_URL=",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /database URL contract is incomplete/i,
    );
  });

  it("rejects a documented real E2E fixture URL that uses the application role", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      envExample: contract.envExample.replace(
        /CVG_REAL_E2E_DATABASE_URL=postgresql:\/\/[^\r\n]+/u,
        "CVG_REAL_E2E_DATABASE_URL=postgresql://cvg_app:cvg_app@localhost:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(/REAL_E2E.*admin/i);
  });

  it("rejects a workflow runtime DATABASE_URL that uses the migration role", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      workflow: contract.workflow.replace(
        /^\s{6}DATABASE_URL: postgresql:\/\/cvg_app:[^\r\n]+/mu,
        "      DATABASE_URL: postgresql://cvg:cvg_test_password@127.0.0.1:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /workflow.*DATABASE_URL.*application role/i,
    );
  });

  it("rejects a workflow with an empty application database URL", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      workflow: contract.workflow.replace(
        /^\s{6}CVG_TEST_DATABASE_URL: [^\r\n]+/mu,
        "      CVG_TEST_DATABASE_URL:",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /workflow database URL contract is incomplete/i,
    );
  });

  it("rejects a workflow real E2E fixture URL that uses the application role", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      workflow: contract.workflow.replace(
        /^ {6}CVG_REAL_E2E_DATABASE_URL: [^\r\n]+/mu,
        "      CVG_REAL_E2E_DATABASE_URL: postgresql://cvg_app:cvg_app_test_password@127.0.0.1:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /workflow.*REAL_E2E.*admin/i,
    );
  });

  it("rejects a workflow migration override that uses the application role", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      workflow: contract.workflow.replace(
        /^\s{10}DATABASE_URL: postgresql:\/\/cvg:[^\r\n]+/mu,
        "          DATABASE_URL: postgresql://cvg_app:cvg_app_test_password@127.0.0.1:5432/cvg",
      ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /workflow migration DATABASE_URL override.*CVG_MIGRATION_DATABASE_URL/i,
    );
  });

  it("requires the migration DATABASE_URL override inside Apply migrations", async () => {
    const contract = await readCiContract();
    const inconsistent = {
      ...contract,
      workflow: contract.workflow
        .replace(/^ {10}DATABASE_URL: [^\r\n]+\r?\n/mu, "")
        .replace(
          "      - name: Provision least-privilege test roles",
          "      - name: Provision least-privilege test roles\n        env:\n          DATABASE_URL: postgresql://cvg:cvg_test_password@127.0.0.1:5432/cvg",
        ),
    };

    expect(() => validateCiContract(inconsistent)).toThrow(
      /workflow migration DATABASE_URL override.*incomplete/i,
    );
  });
});

describe("CI artifact governance", () => {
  it("creates a deterministic CycloneDX SBOM without workspace links", () => {
    const dependencyTree = [
      {
        dependencies: {
          zod: {
            version: "4.4.3",
            dependencies: { tslib: { version: "2.8.1" } },
          },
          "@cvg/domain": { version: "link:../../packages/domain" },
        },
      },
    ];
    const input = {
      dependencyTree,
      packageName: "cvg-trainee-vet",
      packageVersion: "0.1.0",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
    };

    const first = createCycloneDxSbom(input);
    const second = createCycloneDxSbom(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      components: [
        expect.objectContaining({ name: "tslib", version: "2.8.1" }),
        expect.objectContaining({ name: "zod", version: "4.4.3" }),
      ],
    });
    expect(first.components).toHaveLength(2);
  });

  it("reports redaction classes without exposing the matched value", () => {
    const findings = findRedactionFindings(
      "playwright-report/result.json",
      "authorization: Bearer abcdefghijklmnopqrstuvwxyz1234",
    );

    expect(findings).toEqual([
      { path: "playwright-report/result.json", rule: "bearer-token" },
    ]);
    expect(JSON.stringify(findings)).not.toContain(
      "abcdefghijklmnopqrstuvwxyz1234",
    );
  });

  it("creates a stable, sorted SHA-256 manifest", () => {
    const manifest = createSha256Manifest([
      { path: "z-report.txt", content: Buffer.from("z") },
      { path: "a-report.txt", content: Buffer.from("a") },
    ]);

    expect(manifest).toMatch(
      /^ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb\x20{2}a-report\.txt\n/u,
    );
    expect(manifest).toMatch(
      /\n594e519ae499312b29433b7dd8a97ff068defcba9755b6d5d00e84c524d67b06\x20{2}z-report\.txt\n$/u,
    );
  });
});
