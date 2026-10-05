import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const safeRunId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;

export function mutationReportPath(scope) {
  if (!/^[a-z][a-z0-9-]{0,39}$/u.test(scope)) {
    throw new Error("mutation report scope is invalid");
  }
  const candidateRunId =
    process.env.CVG_MUTATION_CANDIDATE_ID ?? `local-${process.pid}`;
  if (!safeRunId.test(candidateRunId)) {
    throw new Error("CVG_MUTATION_CANDIDATE_ID is invalid");
  }
  const path = `reports/mutation-runs/${candidateRunId}/${scope}/mutation.json`;
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
