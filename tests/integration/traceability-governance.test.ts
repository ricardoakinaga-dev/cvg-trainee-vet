import { expect, it } from "vitest";

import {
  validateReleaseTraceability,
  validateTraceabilityManifest,
} from "../../scripts/verify-traceability.mjs";

const currentArtifactIds = ["CURRENT-001"];
const commit = "a".repeat(40);

function manifestFor(overrides = "") {
  return `version: "1"
project: "cvg-trainee-vet"
artifacts:
  - id: "CURRENT-001"
    requirements: ["REQ-001"]
    documents: ["SPEC-001.md"]
    code: ["packages/example/src/example.ts"]
    tests: ["packages/example/src/example.test.ts"]
    commit: "${commit}"
    artifacts: ["coverage/"]
    verification: ["pnpm verify"]
    status: "verified-with-gaps"
${overrides}`;
}

it("accepts a complete artifact in local worktree mode", () => {
  expect(
    validateTraceabilityManifest(manifestFor(), { currentArtifactIds }),
  ).toEqual([]);
});

it("rejects an incomplete current artifact instead of accepting markers only", () => {
  const errors = validateTraceabilityManifest(
    manifestFor('  - id: "BROKEN-002"\n    requirements: ["REQ-002"]\n'),
    { currentArtifactIds: ["BROKEN-002"] },
  );

  expect(errors).toContain("artifact BROKEN-002 has no documents");
  expect(errors).toContain("artifact BROKEN-002 has no tests");
  expect(errors).toContain("artifact BROKEN-002 has no commit");
  expect(errors).toContain("artifact BROKEN-002 has no artifacts");
  expect(errors).toContain("artifact BROKEN-002 has no verification");
});

it("requires a clean reachable commit and tracked code in release mode", () => {
  const errors = validateReleaseTraceability(manifestFor(), {
    currentArtifactIds,
    headSha: "b".repeat(40),
    worktreeStatus: " M apps/api/src/http.ts",
    reachableCommits: new Set(["b".repeat(40)]),
    trackedPaths: new Set(),
  });

  expect(errors).toContain("release traceability requires a clean worktree");
  expect(errors).toContain(
    `artifact CURRENT-001 commit ${commit} is not reachable from HEAD`,
  );
  expect(errors).toContain(
    "artifact CURRENT-001 code path is not tracked: packages/example/src/example.ts",
  );
  expect(errors).toContain(
    "artifact CURRENT-001 test path is not tracked: packages/example/src/example.test.ts",
  );
});
