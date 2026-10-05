import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import {
  MUTATION_REPORT_SCOPES,
  MUTATION_RUNNER_INPUT_FILES,
  MUTATION_TEST_FILES,
  buildBoundedMutationManifest,
  validateCurrentBoundedMutationManifest,
} from "../../scripts/mutation-bounded-contract.mjs";
import {
  buildMutationSummary,
  sha256Bytes,
  validateCurrentMutationSummary,
} from "../../scripts/mutation-summary-contract.mjs";

const execFileAsync = promisify(execFile);

const candidateSha = "a".repeat(40);
const runId = "fixture-run-20261002";
const repositoryRoot = "/workspace/cvg";
const isolatedCandidateRoot = "/tmp/cvg-isolated";
const sourceText = "export const fixture = true;\n";
const sourceDigest = createHash("sha256").update(sourceText).digest("hex");
const runnerInputDigests = Object.fromEntries(
  MUTATION_RUNNER_INPUT_FILES.map((path) => [path, "c".repeat(64)]),
);

type ReportScope = (typeof MUTATION_REPORT_SCOPES)[number];
type MutantStatus = "Killed" | "Survived";

function reportFor(scope: ReportScope, status: MutantStatus = "Survived") {
  return {
    scope: scope.id,
    path: `reports/mutation-runs/${runId}/${scope.id}/mutation.json`,
    evidencePath: scope.evidencePath,
    sha256: "b".repeat(64),
    runId,
    startedAt: 1_790_894_000_000,
    finishedAt: 1_790_894_001_000,
    report: {
      schemaVersion: "1.0",
      projectRoot: isolatedCandidateRoot,
      config: { mutate: [...scope.sources] },
      files: Object.fromEntries(
        scope.sources.map((source) => [
          source,
          {
            language: "typescript",
            source: sourceText,
            mutants: [
              {
                id: "1",
                mutatorName: "BooleanLiteral",
                replacement: "false",
                status,
                location: {
                  start: { line: 1, column: 24 },
                  end: { line: 1, column: 28 },
                },
              },
            ],
          },
        ]),
      ),
    },
  };
}

function build(overrides: Record<string, unknown> = {}) {
  return buildBoundedMutationManifest({
    root: isolatedCandidateRoot,
    vitest: `${isolatedCandidateRoot}/node_modules/vitest/vitest.mjs`,
    config: "vitest.config.ts",
    candidateSha,
    candidateRunId: runId,
    repositoryRoot,
    generatedAt: "2026-10-02T03:10:00.000Z",
    reports: MUTATION_REPORT_SCOPES.map((scope) => reportFor(scope)),
    runnerInputDigests,
    ...overrides,
  });
}

describe("current bounded mutation manifest", () => {
  it("binds pending mutants to current source, reports, run and bounded tests", () => {
    const manifest = build();
    const expectedMutants = MUTATION_REPORT_SCOPES.reduce(
      (total, scope) => total + scope.sources.length,
      0,
    );

    expect(manifest).toMatchObject({
      root: isolatedCandidateRoot,
      candidateSha,
      identities: expect.any(Array),
      tests: [...MUTATION_TEST_FILES],
      provenance: {
        format: "cvg-bounded-mutation-manifest/v1",
        candidateRunId: runId,
        candidateSha,
        totalMutants: expectedMutants,
        rawKilled: 0,
        pendingMutants: expectedMutants,
      },
    });
    expect(Object.keys(manifest.sources).sort()).toEqual(
      MUTATION_REPORT_SCOPES.flatMap((scope) => scope.sources).sort(),
    );
    expect(manifest.identities).toHaveLength(expectedMutants);
    expect(manifest.identities[0]).toMatchObject({
      id: expect.stringMatching(/^[a-z-]+:.+:1$/u),
      scopeId: expect.any(String),
      sourceDigest,
      mutatorName: "BooleanLiteral",
      replacement: "false",
    });
    expect(manifest.provenance.reports).toHaveLength(
      MUTATION_REPORT_SCOPES.length,
    );
  });

  it("rejects missing scopes, mismatched run ids and malformed identities", () => {
    expect(() => build({ reports: [] })).toThrow(/scope/u);

    const staleReports = MUTATION_REPORT_SCOPES.map((scope) =>
      reportFor(scope),
    );
    staleReports[0]!.runId = "previous-run";
    expect(() => build({ reports: staleReports })).toThrow(/run id/u);

    const malformedReports = MUTATION_REPORT_SCOPES.map((scope) =>
      reportFor(scope),
    );
    const firstSource = MUTATION_REPORT_SCOPES[0]!.sources[0]!;
    Reflect.set(
      malformedReports[0]!.report.files[firstSource]!.mutants[0]!,
      "replacement",
      undefined,
    );
    expect(() => build({ reports: malformedReports })).toThrow(/identity/u);
  });

  it("allows zero pending identities only when all current mutants were killed", () => {
    const reports = MUTATION_REPORT_SCOPES.map((scope) =>
      reportFor(scope, "Killed"),
    );
    const manifest = build({ reports });

    expect(manifest.identities).toHaveLength(0);
    expect(manifest.provenance.rawKilled).toBe(
      manifest.provenance.totalMutants,
    );
    expect(manifest.provenance.pendingMutants).toBe(0);
  });

  it("scores only closure results tied to the current candidate manifest", () => {
    const manifest = build();
    const manifestSha256 = "c".repeat(64);
    const closureResults = [
      {
        group: "authorization",
        path: `reports/mutation-bounded/${runId}/authorization-closure.json`,
        sha256: "d".repeat(64),
        result: closureResult(manifest, manifestSha256, ["authorization"]),
      },
      {
        group: "critical-worker",
        path: `reports/mutation-bounded/${runId}/critical-worker-closure.json`,
        sha256: "e".repeat(64),
        result: closureResult(manifest, manifestSha256, ["critical", "worker"]),
      },
    ];
    const reports = manifest.provenance.reports.map((report) => ({
      scope: report.scope,
      path: report.evidencePath,
      sha256: report.sha256,
    }));
    const summary = buildMutationSummary({
      manifest,
      manifestSha256,
      candidateSha,
      candidateRunId: runId,
      reports,
      closureResults,
    });

    expect(summary).toMatchObject({
      status: "PASS",
      failures: [],
      sha: candidateSha,
      candidate_sha: candidateSha,
      candidate_run_id: runId,
      total: manifest.provenance.totalMutants,
      verified_kills: manifest.provenance.pendingMutants,
      critical_real_survivors: 0,
      adjusted_score: 1,
    });

    const survivor = structuredClone(closureResults);
    survivor[0]!.result.results[0]!.outcome = "SURVIVED";
    survivor[0]!.result.status = "SURVIVED";
    const failed = buildMutationSummary({
      manifest,
      manifestSha256,
      candidateSha,
      candidateRunId: runId,
      reports,
      closureResults: survivor,
    });
    expect(failed.status).toBe("FAIL");
    expect(failed.critical_real_survivors).toBe(1);
    expect(failed.adjusted_score).toBeLessThan(1);
  });

  it("validates reports against the checked out commit and isolated candidate marker", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "cvg-current-mutation-"));
    const repositoryRoot = join(workspace, "repository");
    const candidateRoot = join(workspace, "candidate");
    const candidateRunId = "fixture-current-run";
    await mkdir(repositoryRoot);
    await mkdir(candidateRoot);
    try {
      await execFileAsync("git", ["init", "-q"], { cwd: repositoryRoot });
      await execFileAsync(
        "git",
        ["config", "user.email", "fixture@cvg.invalid"],
        {
          cwd: repositoryRoot,
        },
      );
      await execFileAsync("git", ["config", "user.name", "CVG Fixture"], {
        cwd: repositoryRoot,
      });
      for (const sourceName of MUTATION_REPORT_SCOPES.flatMap(
        (scope) => scope.sources,
      )) {
        const sourcePath = join(repositoryRoot, sourceName);
        await mkdir(join(sourcePath, ".."), { recursive: true });
        await writeFile(sourcePath, sourceText);
        const candidatePath = join(candidateRoot, sourceName);
        await mkdir(join(candidatePath, ".."), { recursive: true });
        await writeFile(candidatePath, sourceText);
      }
      for (const inputPath of MUTATION_RUNNER_INPUT_FILES) {
        const repositoryInput = join(repositoryRoot, inputPath);
        const candidateInput = join(candidateRoot, inputPath);
        const contents = `runner input: ${inputPath}\n`;
        await mkdir(join(repositoryInput, ".."), { recursive: true });
        await mkdir(join(candidateInput, ".."), { recursive: true });
        await writeFile(repositoryInput, contents);
        await writeFile(candidateInput, contents);
      }
      const committedPaths = [
        ...new Set([
          ...MUTATION_REPORT_SCOPES.flatMap((scope) => scope.sources),
          ...MUTATION_RUNNER_INPUT_FILES,
        ]),
      ];
      await execFileAsync("git", ["add", ...committedPaths], {
        cwd: repositoryRoot,
      });
      await execFileAsync("git", ["commit", "-qm", "candidate fixture"], {
        cwd: repositoryRoot,
      });
      const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
      });
      const currentSha = stdout.trim();
      const vitest = join(candidateRoot, "node_modules/vitest/vitest.mjs");
      await mkdir(join(candidateRoot, "node_modules/vitest"), {
        recursive: true,
      });
      await writeFile(vitest, "export {};\n");
      await writeFile(
        join(candidateRoot, ".cvg-mutation-candidate.json"),
        JSON.stringify({
          format: "cvg-mutation-candidate/v1",
          root: candidateRoot,
          candidateSha: currentSha,
          candidateRunId,
        }),
      );

      const startedAt = Date.now() - 500;
      const finishedAt = Date.now() + 1_000;
      const currentRunnerInputDigests = Object.fromEntries(
        await Promise.all(
          MUTATION_RUNNER_INPUT_FILES.map(async (path) => [
            path,
            createHash("sha256")
              .update(await readFile(join(candidateRoot, path)))
              .digest("hex"),
          ]),
        ),
      );
      const reports = [];
      for (const scope of MUTATION_REPORT_SCOPES) {
        const report = {
          schemaVersion: "1.0",
          projectRoot: candidateRoot,
          config: { mutate: [...scope.sources] },
          files: Object.fromEntries(
            scope.sources.map((sourceName) => [
              sourceName,
              {
                language: "typescript",
                source: sourceText,
                mutants: [
                  {
                    id: "1",
                    mutatorName: "BooleanLiteral",
                    replacement: "false",
                    status: "Survived",
                    location: {
                      start: { line: 1, column: 24 },
                      end: { line: 1, column: 28 },
                    },
                  },
                ],
              },
            ]),
          ),
        };
        const reportPath = `reports/mutation-runs/${candidateRunId}/${scope.id}/mutation.json`;
        const diskPath = join(repositoryRoot, reportPath);
        await mkdir(join(diskPath, ".."), { recursive: true });
        const bytes = Buffer.from(JSON.stringify(report));
        await writeFile(diskPath, bytes);
        reports.push({
          scope: scope.id,
          path: reportPath,
          evidencePath: scope.evidencePath,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          runId: candidateRunId,
          startedAt,
          finishedAt,
          report,
        });
      }
      const manifest = buildBoundedMutationManifest({
        root: candidateRoot,
        vitest,
        config: "vitest.config.ts",
        candidateSha: currentSha,
        candidateRunId,
        repositoryRoot,
        generatedAt: new Date(finishedAt + 1_000).toISOString(),
        reports,
        runnerInputDigests: currentRunnerInputDigests,
      });

      await expect(
        validateCurrentBoundedMutationManifest(manifest, {
          candidateRoot,
          repositoryRoot,
          expectedRunId: candidateRunId,
        }),
      ).resolves.toMatchObject({ candidateSha: currentSha, candidateRunId });

      const reportPath = join(repositoryRoot, reports[0]!.path);
      const reportBytes = await readFile(reportPath);
      const externalReportPath = join(workspace, "external-report.json");
      await writeFile(externalReportPath, "external report sentinel\n");
      await rm(reportPath);
      await symlink(externalReportPath, reportPath, "file");
      await expect(
        validateCurrentBoundedMutationManifest(manifest, {
          candidateRoot,
          repositoryRoot,
          expectedRunId: candidateRunId,
        }),
      ).rejects.toThrow(/ELOOP|symlink|symbolic link/u);
      expect(await readFile(externalReportPath, "utf8")).toBe(
        "external report sentinel\n",
      );
      await rm(reportPath);
      await writeFile(reportPath, reportBytes);

      const runnerInputPath = MUTATION_RUNNER_INPUT_FILES[0]!;
      const runnerInputFile = join(candidateRoot, runnerInputPath);
      const originalRunnerInput = await readFile(runnerInputFile);
      await writeFile(runnerInputFile, "changed test input\n");
      await expect(
        validateCurrentBoundedMutationManifest(manifest, {
          candidateRoot,
          repositoryRoot,
          expectedRunId: candidateRunId,
        }),
      ).rejects.toThrow(/runner input differs from committed HEAD/u);
      await writeFile(runnerInputFile, originalRunnerInput);

      const boundedDirectory = join(
        repositoryRoot,
        "reports/mutation-bounded",
        candidateRunId,
      );
      await mkdir(boundedDirectory, { recursive: true });
      const manifestBytes = Buffer.from(
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      await writeFile(join(boundedDirectory, "manifest.json"), manifestBytes);
      const currentManifestSha = sha256Bytes(manifestBytes);
      const evidenceReports = [];
      for (const scope of MUTATION_REPORT_SCOPES) {
        const ref = reports.find((report) => report.scope === scope.id)!;
        const bytes = await readFile(join(repositoryRoot, ref.path));
        const evidencePath = join(repositoryRoot, scope.evidencePath);
        await mkdir(join(evidencePath, ".."), { recursive: true });
        await writeFile(evidencePath, bytes);
        evidenceReports.push({
          scope: scope.id,
          path: scope.evidencePath,
          sha256: sha256Bytes(bytes),
        });
      }
      const closureArtifacts = [];
      for (const group of [
        {
          group: "authorization",
          scopes: ["authorization"],
          file: "authorization-closure.json",
        },
        {
          group: "critical-worker",
          scopes: ["critical", "worker"],
          file: "critical-worker-closure.json",
        },
      ]) {
        const result = closureResult(
          manifest,
          currentManifestSha,
          group.scopes,
          candidateRunId,
          currentSha,
        );
        const path = `reports/mutation-bounded/${candidateRunId}/${group.file}`;
        const bytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
        await writeFile(join(repositoryRoot, path), bytes);
        closureArtifacts.push({
          group: group.group,
          path,
          sha256: sha256Bytes(bytes),
          result,
        });
      }
      const summary = buildMutationSummary({
        manifest,
        manifestSha256: currentManifestSha,
        candidateSha: currentSha,
        candidateRunId,
        reports: evidenceReports,
        closureResults: closureArtifacts,
      });
      expect(summary.status).toBe("PASS");
      const summaryOptions: {
        repositoryRoot: string;
        expectedRunId: string;
        expectedSha: string;
        requireExpectedRunId: boolean;
      } = {
        repositoryRoot,
        expectedRunId: candidateRunId,
        expectedSha: currentSha,
        requireExpectedRunId: true,
      };
      await writeFile(
        join(repositoryRoot, "reports/mutation-summary.json"),
        `${JSON.stringify(summary, null, 2)}\n`,
      );
      await expect(
        validateCurrentMutationSummary(summary, summaryOptions),
      ).resolves.toMatchObject({
        candidateSha: currentSha,
        candidateRunId,
        total: manifest.provenance.totalMutants,
      });

      await writeFile(reportPath, (await readFile(reportPath, "utf8")) + " ");
      await expect(
        validateCurrentBoundedMutationManifest(manifest, {
          candidateRoot,
          repositoryRoot,
          expectedRunId: candidateRunId,
        }),
      ).rejects.toThrow(/digest/u);
      await expect(
        validateCurrentMutationSummary(summary, summaryOptions),
      ).rejects.toThrow(/digest/u);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});

function closureResult(
  manifest: ReturnType<typeof build>,
  manifestSha256: string,
  scopes: readonly string[],
  selectedRunId: string = runId,
  selectedSha: string = candidateSha,
) {
  const identities = manifest.identities.filter((identity) =>
    scopes.includes(identity.scopeId),
  );
  return {
    status: "KILLED",
    exitCode: 0,
    candidateRunId: selectedRunId,
    candidateSha: selectedSha,
    manifestSha256,
    scopes: [...scopes],
    mutantCount: identities.length,
    verifiedKills: identities.length,
    realSurvivors: 0,
    results: identities.map((identity) => ({
      id: identity.id,
      scopeId: identity.scopeId,
      outcome: "KILLED",
    })),
  };
}
