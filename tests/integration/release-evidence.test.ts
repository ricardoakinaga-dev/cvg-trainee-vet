import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  flagValue,
  validateBundle,
  validateSbom,
} from "../../scripts/release-evidence.mjs";

const COMMIT = "a".repeat(40);

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

const SBOM = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  metadata: { component: { name: "cvg-trainee-vet", version: "0.1.0" } },
  components: [{ name: "next", version: "16.3.4", hashes: [] }],
};

async function writeBundle(mutate) {
  const directory = await mkdtemp(join(tmpdir(), "cvg-evidence-"));
  const files = {
    "git-sha.txt": `${COMMIT}\n`,
    "provenance.json": JSON.stringify({ commit: COMMIT }),
    "migration-head.txt": "0054_aaa_content_indexer_service\n",
    "coverage-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "test-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "security-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "rls-live-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "multi-instance-summary.json": JSON.stringify({
      status: "missing-blocked",
    }),
    "load-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "otel-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "mutation-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "redis-candidate-summary.json": JSON.stringify({
      status: "missing-blocked",
    }),
    "staging-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "restore-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "remote-ci-summary.json": JSON.stringify({ status: "missing-blocked" }),
    "ci-runs.json": JSON.stringify({ status: "missing-blocked" }),
    "sbom.cyclonedx.json": JSON.stringify(SBOM),
  };
  const artifacts = [];
  const digests = {};
  for (const [name, content] of Object.entries(files)) {
    if (name === "sbom.cyclonedx.json") continue;
    await writeFile(join(directory, name), content);
    artifacts.push({ path: name, sha256: sha256Hex(content) });
    digests[name] = sha256Hex(content);
  }
  const sbomContent = files["sbom.cyclonedx.json"] as string;
  await writeFile(join(directory, "sbom.cyclonedx.json"), sbomContent);
  artifacts.push({ path: "sbom.cyclonedx.json", status: "present" });
  digests["sbom.cyclonedx.json"] = sha256Hex(sbomContent);
  await writeFile(
    join(directory, "artifact-digests.json"),
    JSON.stringify(digests),
  );
  artifacts.push({
    path: "artifact-digests.json",
    sha256: sha256Hex(JSON.stringify(digests)),
  });
  await writeFile(
    join(directory, "manifest.json"),
    JSON.stringify({
      format: "cvg-release-evidence/v1",
      commit: COMMIT,
      artifacts,
    }),
  );
  await writeFile(
    join(directory, "artifact-digests.json"),
    JSON.stringify(digests),
  );
  if (mutate !== undefined) await mutate(directory);
  return directory;
}

describe("release evidence bundle", () => {
  it("parses CLI flags in --flag value and --flag=value forms", () => {
    const argv = process.argv;
    try {
      process.argv = ["node", "release-evidence.mjs", "--check", "some-dir"];
      expect(flagValue("--check")).toBe("some-dir");
      process.argv = ["node", "release-evidence.mjs", "--check=other-dir"];
      expect(flagValue("--check")).toBe("other-dir");
      process.argv = ["node", "release-evidence.mjs", "--self-test"];
      expect(flagValue("--check")).toBeNull();
    } finally {
      process.argv = argv;
    }
  });

  it("validates a complete bundle with a real SBOM", async () => {
    expect(validateSbom(SBOM)).toEqual([]);
    await expect(validateBundle(await writeBundle())).resolves.toEqual([]);
  });

  it("detects tampering, sha mismatch, and invalid SBOMs", async () => {
    const tampered = await writeBundle(async (directory) => {
      await writeFile(
        join(directory, "provenance.json"),
        JSON.stringify({ commit: "evil" }),
      );
    });
    await expect(validateBundle(tampered)).resolves.toContainEqual(
      expect.stringContaining("digest mismatch: provenance.json"),
    );

    const badSha = await writeBundle(async (directory) => {
      await writeFile(join(directory, "git-sha.txt"), "not-a-sha\n");
    });
    await expect(validateBundle(badSha)).resolves.toContainEqual(
      expect.stringContaining("not a full commit SHA"),
    );

    expect(validateSbom({ bomFormat: "SPDX", components: [] })).toEqual(
      expect.arrayContaining([
        expect.stringContaining("CycloneDX"),
        expect.stringContaining("no components"),
      ]),
    );
  });

  it("accepts an explicitly blocked SBOM without faking one", async () => {
    const directory = await writeBundle(async (dir) => {
      const manifest = JSON.parse(
        await readFile(join(dir, "manifest.json"), "utf8"),
      );
      manifest.artifacts = manifest.artifacts.filter(
        (entry) => entry.path !== "sbom.cyclonedx.json",
      );
      manifest.artifacts.push({
        path: "sbom.cyclonedx.json",
        status: "missing-blocked",
      });
      await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest));
    });
    await expect(validateBundle(directory)).resolves.toEqual([]);
  });
});
