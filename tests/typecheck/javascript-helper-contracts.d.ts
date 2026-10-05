import type { EventEmitter } from "node:events";
import type { SpawnOptions } from "node:child_process";
import type { CoverageOptions } from "vitest/node";

// These signatures describe the exercised JavaScript injection boundaries.
// Only the EventEmitter lifecycle is used by the provisioning helper.
declare module "../../scripts/provision-ci-postgres.mjs" {
  export function provisionCiPostgres(
    environment: Record<string, string | undefined>,
    spawnProcess: (
      command: string,
      args: readonly string[],
      options: SpawnOptions,
    ) => EventEmitter,
  ): Promise<EventEmitter>;
}

// JavaScript defaults [] infer never[]; the public contract accepts glob strings.
declare module "../../scripts/verify-coverage-floor.mjs" {
  export function validateCoveragePolicy(options: {
    include?: readonly string[];
    exclude?: readonly string[];
    thresholds?: CoverageOptions["thresholds"];
  }): string[];
}

declare module "../../scripts/mutation-summary-contract.mjs" {
  export function validateCurrentMutationSummary(
    summary: unknown,
    options: {
      repositoryRoot?: string;
      expectedRunId?: string;
      expectedSha?: string;
      requireExpectedRunId?: boolean;
    },
  ): Promise<{
    candidateSha: string;
    candidateRunId: string;
    total: number;
  }>;
}
