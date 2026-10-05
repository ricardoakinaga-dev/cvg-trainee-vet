import { basename, dirname, resolve } from "node:path";

import { readContainedMutationFile } from "../../../scripts/mutation-safe-files.mjs";
import { runBoundedClosure } from "../../../scripts/verify-mutation-closure.mjs";

const manifestPath = process.argv[2];
if (typeof manifestPath !== "string") {
  throw new Error("mutation test runner requires a manifest path");
}

const absoluteManifestPath = resolve(manifestPath);
const { bytes } = await readContainedMutationFile(
  dirname(absoluteManifestPath),
  basename(absoluteManifestPath),
);
const manifest = JSON.parse(bytes.toString("utf8"));
const result = await runBoundedClosure(manifest, {
  expectedRunId: process.env.CVG_MUTATION_CANDIDATE_ID,
  testOnlyAllowMissingProvenance: true,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = result.exitCode;
