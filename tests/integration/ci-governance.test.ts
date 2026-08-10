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
});
