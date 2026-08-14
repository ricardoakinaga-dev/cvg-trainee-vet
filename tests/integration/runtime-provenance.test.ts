import { describe, expect, it } from "vitest";

import {
  assertRuntimeSourceSha,
  validateRuntimeProvenanceRecords,
} from "../../scripts/verify-runtime-provenance.mjs";

const sourceSha = "a".repeat(40);
const commonDigest = `sha256:${"b".repeat(64)}`;

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    Name: "/cvg-trainee-vet-ha-api-a-1",
    Config: {
      Image: `cvg-trainee-vet@${commonDigest}`,
      Env: [`CVG_SOURCE_SHA=${sourceSha}`],
      Labels: { "org.opencontainers.image.revision": sourceSha },
    },
    Image: commonDigest,
    State: { Status: "running", Health: { Status: "healthy" } },
    ...overrides,
  };
}

describe("runtime provenance verifier", () => {
  it("requires a concrete git source SHA", () => {
    expect(() => assertRuntimeSourceSha(undefined)).toThrow(
      "runtime provenance requires a 40-character git SHA",
    );
    expect(() => assertRuntimeSourceSha("unknown")).toThrow(
      "runtime provenance requires a 40-character git SHA",
    );
    expect(assertRuntimeSourceSha(sourceSha)).toBe(sourceSha);
  });

  it("accepts aligned running containers on one immutable digest", () => {
    const result = validateRuntimeProvenanceRecords(
      [
        buildRecord(),
        buildRecord({ Name: "/cvg-trainee-vet-ha-api-b-1" }),
        buildRecord({ Name: "/cvg-trainee-vet-ha-worker-a-1" }),
        buildRecord({ Name: "/cvg-trainee-vet-ha-worker-b-1" }),
      ],
      sourceSha,
    );

    expect(result).toMatchObject({
      status: "PASS",
      expectedSourceSha: sourceSha,
      commonDigest,
      containerCount: 4,
    });
  });

  it.each([
    [
      "source label mismatch",
      {
        Config: {
          Labels: { "org.opencontainers.image.revision": "c".repeat(40) },
        },
      },
    ],
    ["mutable image reference", { Config: { Image: "cvg-trainee-vet:local" } }],
    ["digest mismatch", { Image: `sha256:${"c".repeat(64)}` }],
    ["not running", { State: { Status: "exited" } }],
  ])("rejects %s", (_reason, override) => {
    expect(() =>
      validateRuntimeProvenanceRecords([buildRecord(override)], sourceSha),
    ).toThrow("runtime provenance");
  });
});
