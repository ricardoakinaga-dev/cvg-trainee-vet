import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ordinaryTestEnvironment } from "../../scripts/ci-proof-contract.mjs";
import { prepareOrdinaryExecutionProfile } from "../../scripts/ordinary-execution-profile.mjs";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { isEvidenceFresh } from "../../scripts/evidence-freshness.mjs";
import {
  flagValue,
  k6ThresholdsPassed,
  validateBundle,
  validateSbom,
  validateArtifactDigests,
} from "../../scripts/release-evidence.mjs";

const COMMIT = "a".repeat(40);

describe("R9 candidate producer integration contract", () => {
  it("R10 source runner block propagates observed ownership and fails closed through explicit IO doubles", async () => {
    const source = await readFile(
      new URL("../../scripts/run-staging.mjs", import.meta.url),
      "utf8",
    );
    const marker =
      "// Optional complete ordinary measurement stays inside the managed stack lifetime.";
    expect(source).toContain(marker);
    const body = source.split(marker)[1]?.split("  await stopAll();")[0];
    if (!body) throw new Error("R10 measurement block missing");
    const AsyncFunction = Object.getPrototypeOf(async () => undefined)
      .constructor as new (
      ...args: string[]
    ) => (...args: unknown[]) => Promise<void>;
    const invoke = new AsyncFunction(
      "recordTestSummary",
      "ownedPg",
      "initialRedisObservation",
      "roleOwned",
      "redisOwned",
      "redis",
      "redisBin",
      "redisUrl",
      "invocationId",
      "measurement",
      "prepareOrdinaryExecutionProfile",
      "qdrantUrl",
      "stagingEnv",
      "process",
      "root",
      "join",
      "execOwned",
      "fail",
      body,
    );
    const stagingEnv = {
      CVG_STAGING_API_A_URL: "http://127.0.0.1:3101",
      CVG_STAGING_API_B_URL: "http://127.0.0.1:3112",
      CVG_STAGING_TLS_URL: "https://127.0.0.1:3443",
      CVG_STAGING_REDIS_URL: "redis://127.0.0.1:6391",
      CVG_STAGING_EVIDENCE_DIR: "/synthetic/evidence",
      CVG_STAGING_OTEL_SPANS_FILE: "/synthetic/evidence/spans.json",
    };
    for (const scenario of [
      "complete",
      "external PG",
      "admin SUPER",
      "foreign Redis PID",
      "writer failure",
      "disabled",
    ]) {
      const calls: {
        command: string;
        args: string[];
        environment: Record<string, string>;
      }[] = [];
      const failures: unknown[] = [];
      const invocationId = "11111111-1111-4111-8111-111111111111";
      const env = {
        GITHUB_SHA: "a".repeat(40),
        GITHUB_RUN_ID: "explicit-synthetic-IO-double",
        CVG_OWNED_DISPOSABLE_BINDING_DATABASE: "true",
      };
      const role = (name: string, bypassRls: boolean) => ({
        name,
        bypassRls,
        superuser: scenario === "admin SUPER" && bypassRls,
        createDatabase: false,
        createRole: false,
        replication: false,
      });
      const pg = {
        kind: scenario === "external PG" ? "external" : "owned-embedded",
        invocationId,
        directory: "/synthetic/owned-pg",
        applicationUrl: "postgresql://app@127.0.0.1:5432/owned",
        adminUrl: "postgresql://admin@127.0.0.1:5432/owned",
        operatorUrl: "postgresql://operator@127.0.0.1:5432/owned",
      };
      await invoke(
        scenario !== "disabled",
        pg,
        { runId: "b".repeat(40) },
        async (url: string) =>
          role(
            url.includes("//app@") ? "app" : "admin",
            !url.includes("//app@"),
          ),
        async () => ({
          serverPid: scenario === "foreign Redis PID" ? 999 : 1234,
          runId: "b".repeat(40),
          observedAt: new Date().toISOString(),
        }),
        { child: { pid: 1234, exitCode: null, signalCode: null } },
        "/synthetic/redis-server",
        "redis://127.0.0.1:6391",
        invocationId,
        {
          head: env.GITHUB_SHA,
          startedAt: new Date(Date.now() - 1000).toISOString(),
        },
        prepareOrdinaryExecutionProfile,
        "http://127.0.0.1:6333",
        stagingEnv,
        {
          env,
          execPath: "/synthetic/node",
          stdout: { write: () => undefined },
          stderr: { write: () => undefined },
        },
        "/synthetic/checkout",
        join,
        async (
          command: string,
          args: string[],
          options: { env: Record<string, string> },
        ) => {
          calls.push({ command, args, environment: options.env });
          ordinaryTestEnvironment(options.env);
          if (scenario === "writer failure")
            throw new Error("explicit synthetic writer IO failure");
          return { stdout: "explicit synthetic IO double only" };
        },
        async (error: unknown) => {
          failures.push(error);
        },
      );
      expect(calls).toHaveLength(
        ["complete", "writer failure"].includes(scenario) ? 1 : 0,
      );
      expect(failures).toHaveLength(
        [
          "external PG",
          "admin SUPER",
          "foreign Redis PID",
          "writer failure",
        ].includes(scenario)
          ? 1
          : 0,
      );
      if (scenario === "complete") {
        expect(calls[0]!.environment.GITHUB_SHA).toBe(env.GITHUB_SHA);
        expect(calls[0]!.environment.CVG_TEST_ADMIN_DATABASE_URL).toBe(
          pg.adminUrl,
        );
        expect(calls[0]!.args).toEqual([
          "/synthetic/checkout/scripts/write-test-summary.mjs",
        ]);
      }
    }
  });
  it("R10 ordinary producer is measured while selected staging gates are alive", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/candidate.yml", import.meta.url),
      "utf8",
    );
    const stagingStep =
      workflow
        .split("- name: Verify staging-like stack")[1]
        ?.split("- name:")[0] ?? "";
    expect(stagingStep).toContain("--record-test-summary");
    expect(stagingStep).not.toContain(
      'CVG_OWNED_DISPOSABLE_BINDING_DATABASE: "true"',
    );
    const earlySummary =
      workflow
        .split("- name: Record test and security summaries")[1]
        ?.split("- name:")[0] ?? "";
    expect(earlySummary).not.toContain("scripts/write-test-summary.mjs");
  });
  it("R10 routes the same archived audit to both candidate gates before preflight", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/candidate.yml", import.meta.url),
      "utf8",
    );
    const commands = [
      ...workflow.matchAll(
        /run:\s*(?:>\s*)?(pnpm verify:aaa-candidate[^\n]*(?:\n {10}--[^\n]*)*)/gu,
      ),
    ].map((match) => match[1]!);
    expect(commands).toHaveLength(2);
    for (const command of commands)
      for (const flag of [
        "--audit release-evidence/candidate-audit.json",
        "--review release-evidence/candidate-independent-review.json",
        "--register release-evidence/candidate-risk-register.json",
      ])
        expect(command).toContain(flag);
    expect(workflow.indexOf("Archive declared current audit")).toBeLessThan(
      workflow.indexOf("Run AAA candidate preflight gate"),
    );
  });
  it.each([
    "empty declaration",
    "missing file",
    "empty file",
    "declared original bytes",
  ])(
    "R9 workflow archive preserves bytes and fails closed for %s",
    async (scenario) => {
      const workflow = await readFile(
        new URL("../../.github/workflows/candidate.yml", import.meta.url),
        "utf8",
      );
      const block = workflow
        .split(
          "- name: Archive declared current audit, independent review and risk inputs",
        )[1]
        ?.split("\n      - name:")[0];
      const script = block
        ?.split("        run: |\n")[1]
        ?.split("\n")
        .map((line) => line.replace(/^ {10}/u, ""))
        .join("\n");
      if (!script) throw new Error("archive step missing");
      const dir = await mkdtemp(join(tmpdir(), "cvg-r9-archive-"));
      try {
        await mkdir(join(dir, "release-evidence"));
        const bytes =
          '{"scope":"synthetic IO fixture only","approved":false}\n';
        const input = join(dir, "declared original input.json");
        await writeFile(input, scenario === "empty file" ? "" : bytes);
        const path =
          scenario === "empty declaration"
            ? ""
            : scenario === "missing file"
              ? join(dir, "absent.json")
              : input;
        const result = await promisify(execFile)("bash", ["-c", script], {
          cwd: dir,
          env: {
            ...process.env,
            CVG_AAA_AUDIT_INPUT: path,
            CVG_AAA_REVIEW_INPUT: input,
            CVG_AAA_RISK_INPUT: input,
          },
        }).then(
          () => 0,
          () => 1,
        );
        expect(result).toBe(scenario === "declared original bytes" ? 0 : 1);
        if (result === 0) {
          for (const name of [
            "candidate-audit.json",
            "candidate-independent-review.json",
            "candidate-risk-register.json",
          ])
            expect(
              await readFile(join(dir, "release-evidence", name), "utf8"),
            ).toBe(bytes);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("preserves original producer provenance and archives explicit audit/review/risk inputs for both verifiers", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/candidate.yml", import.meta.url),
      "utf8",
    );
    expect(workflow).toContain(
      "--producer-provenance .agent/candidate-producer/release-evidence/provenance.json",
    );
    for (const flag of [
      "--audit release-evidence/candidate-audit.json",
      "--review release-evidence/candidate-independent-review.json",
      "--register release-evidence/candidate-risk-register.json",
    ]) {
      expect(workflow.split(flag).length - 1).toBe(4);
    }
    expect(workflow).toContain('test -s "$CVG_AAA_AUDIT_INPUT"');
    expect(workflow).toContain('test -s "$CVG_AAA_REVIEW_INPUT"');
    expect(workflow).toContain('test -s "$CVG_AAA_RISK_INPUT"');
    expect(workflow).toContain(
      'cp -- "$CVG_AAA_AUDIT_INPUT" release-evidence/candidate-audit.json',
    );
  });
});

function sha256Hex(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

const SBOM = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  metadata: { component: { name: "cvg-trainee-vet", version: "0.1.0" } },
  components: [{ name: "next", version: "16.3.4", hashes: [] }],
};

async function writeBundle(mutate?: (directory: string) => Promise<void>) {
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
  const digests: Record<string, string> = {};
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
  it.each([
    "exact inventory",
    "undeclared claim",
    "extra artifact",
    "sibling declaration",
    "directory input",
    "symlink input",
  ])(
    "R22 derived claims preserve exact digest inventory: %s",
    async (scenario) => {
      const directory = await writeBundle();
      try {
        const digests = JSON.parse(
          await readFile(join(directory, "artifact-digests.json"), "utf8"),
        ) as Record<string, string>;
        for (const name of [
          "k6-summary.json",
          "otel-spans.json",
          "ratelimit-live-results.json",
        ]) {
          const bytes = JSON.stringify({
            classification: "neutral digest control",
            name,
          });
          await writeFile(join(directory, name), bytes);
          digests[name] = sha256Hex(bytes);
        }
        const index = JSON.stringify(digests);
        await writeFile(join(directory, "artifact-digests.json"), index);
        const manifest = {
          artifacts: [
            ...Object.entries(digests).map(([path, sha256]) => ({
              path,
              sha256,
            })),
            { path: "artifact-digests.json", sha256: sha256Hex(index) },
          ],
        };
        const paths = [
          "candidate-audit.json",
          "candidate-independent-review.json",
          "candidate-risk-register.json",
        ].map((name) => join(directory, name));
        for (const path of paths)
          await writeFile(path, "synthetic declared input, no approval\n");
        let derived = paths;
        if (scenario === "undeclared claim") derived = paths.slice(0, 2);
        if (scenario === "extra artifact")
          await writeFile(
            join(directory, "undeclared.json"),
            "neutral unexpected bytes",
          );
        if (scenario === "sibling declaration")
          derived = paths.map((path) =>
            join(directory, "..", "sibling", path.split("/").at(-1)!),
          );
        if (scenario === "directory input") {
          await rm(paths[0]!);
          await mkdir(paths[0]!);
        }
        if (scenario === "symlink input") {
          await rm(paths[0]!);
          await symlink(paths[1]!, paths[0]!);
        }
        const failures = await validateArtifactDigests(
          directory,
          manifest,
          digests,
          derived,
        );
        if (scenario === "exact inventory") expect(failures).toEqual([]);
        else
          expect(
            failures.some((failure) =>
              failure.startsWith("unlisted artifact:"),
            ),
          ).toBe(true);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
  it.each([
    [
      "legacy failure false",
      { metric: { thresholds: { limit: false } } },
      true,
    ],
    ["legacy failure true", { metric: { thresholds: { limit: true } } }, false],
    [
      "object ok true",
      { metric: { thresholds: { limit: { ok: true } } } },
      true,
    ],
    [
      "object ok false",
      { metric: { thresholds: { limit: { ok: false } } } },
      false,
    ],
    ["mixed failure", { metric: { thresholds: { a: false, b: true } } }, false],
    ["unknown string", { metric: { thresholds: { limit: "false" } } }, false],
    ["unknown number", { metric: { thresholds: { limit: 0 } } }, false],
    ["unknown null", { metric: { thresholds: { limit: null } } }, false],
    ["unknown array", { metric: { thresholds: { limit: [] } } }, false],
    ["unknown object", { metric: { thresholds: { limit: {} } } }, false],
    [
      "unknown ok type",
      { metric: { thresholds: { limit: { ok: "true" } } } },
      false,
    ],
    ["null container", { metric: { thresholds: null } }, false],
    ["array container", { metric: { thresholds: [false] } }, false],
    ["string container", { metric: { thresholds: "false" } }, false],
    ["null metric", { metric: null }, false],
    ["null metrics", null, false],
    ["missing thresholds", { metric: { count: 1 } }, false],
    ["empty thresholds", { metric: { thresholds: {} } }, false],
  ] as const)(
    "R6 canonical k6 threshold decoder: %s",
    (_label, metrics, passed) => {
      const complete =
        metrics &&
        typeof metrics === "object" &&
        !["missing thresholds", "empty thresholds"].includes(_label)
          ? {
              errors: { thresholds: { "rate<0.05": false } },
              read_latency_ms: { thresholds: { "p(95)<800": false } },
              auth_rejected_latency_ms: { thresholds: { "p(95)<800": false } },
              ...metrics,
            }
          : metrics;
      expect(k6ThresholdsPassed(complete)).toBe(passed);
    },
  );

  it.each([false, true])(
    "R4 public strict flag cannot fall back to diagnostics: strict=%s",
    async (strict) => {
      const directory = await writeBundle();
      try {
        const args = [
          "/home/ricardo/cvg-trainee-vet/scripts/release-evidence.mjs",
          "--check",
          directory,
        ];
        if (strict) args.push("--strict");
        const result = await promisify(execFile)(process.execPath, args)
          .then((result) => ({ ...result, code: 0 }))
          .catch((error: unknown) => {
            if (
              error === null ||
              typeof error !== "object" ||
              !("code" in error) ||
              typeof error.code !== "number" ||
              !("stderr" in error) ||
              typeof error.stderr !== "string"
            )
              throw error;
            return { code: error.code, stderr: error.stderr };
          });
        expect(result.code).toBe(strict ? 1 : 0);
        if (strict)
          expect(result.stderr).toContain(
            "strict validation requires a full HEAD sha",
          );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
  it.each([
    "raw diagnostic positive",
    "raw measured",
    "existing measured",
    "docs ancestor",
    "stale runtime envelope",
    "conflicting nested identity",
    "raw without proof",
    "raw wrong digest",
    "raw dirty measurement",
    "raw nonCI measurement",
  ])(
    "R4 F01 actual generation CLI preserves measured coverage: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-coverage-"));
      const exec = promisify(execFile);
      try {
        await cp(
          "/home/ricardo/cvg-trainee-vet/scripts",
          join(dir, "scripts"),
          { recursive: true },
        );
        await cp("/home/ricardo/cvg-trainee-vet/config", join(dir, "config"), {
          recursive: true,
        });
        await mkdir(join(dir, "apps"));
        await mkdir(join(dir, "packages/persistence/drizzle/meta"), {
          recursive: true,
        });
        await writeFile(
          join(dir, "apps/runtime.ts"),
          "export const value = 1;\n",
        );
        await writeFile(
          join(dir, "package.json"),
          '{"type":"module","devDependencies":{}}\n',
        );
        await writeFile(
          join(dir, "packages/persistence/drizzle/meta/_journal.json"),
          '{"entries":[{"tag":"0054_synthetic"}]}\n',
        );
        await writeFile(
          join(dir, "packages/persistence/drizzle/0054_synthetic.sql"),
          "select 1;\n",
        );
        await writeFile(
          join(dir, ".gitignore"),
          "coverage/\nrelease-evidence/\n",
        );
        for (const args of [
          ["init", "--quiet"],
          ["config", "user.name", "Synthetic"],
          ["config", "user.email", "synthetic@example.invalid"],
          ["add", "."],
          ["commit", "--quiet", "-m", "measured runtime"],
        ])
          await exec("git", args, { cwd: dir });
        const sha = (
          await exec("git", ["rev-parse", "HEAD"], { cwd: dir })
        ).stdout.trim();
        const generatedAt = new Date(Date.now() - 2000).toISOString();
        const report = {
          total: {
            statements: { pct: 99, total: 100, covered: 99, skipped: 0 },
            branches: { pct: 99, total: 100, covered: 99, skipped: 0 },
            functions: { pct: 99, total: 100, covered: 99, skipped: 0 },
            lines: { pct: 99, total: 100, covered: 99, skipped: 0 },
          },
        };
        const raw = `${JSON.stringify(report, null, 2)}\n`;
        const proof = {
          format: "cvg-coverage-provenance/v1",
          status: "PASS",
          sha,
          measured_head: sha,
          runner: "github-actions",
          checkout: { before: true, after: true },
          generatedAt,
          raw_sha256: sha256Hex(raw),
          report_sha256: sha256Hex(JSON.stringify(report)),
          measurement: {
            command: "vitest run --coverage",
            startedAt: new Date(Date.now() - 3000).toISOString(),
            completedAt: generatedAt,
            exitCode: 0,
          },
          ci: {
            run_id: 13,
            run_attempt: 2,
            repository: "ricardoakinaga-dev/cvg-trainee-vet",
            executing_head: sha,
            ref: "refs/heads/main",
            workflow_ref:
              "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
          },
        };
        const envelope = {
          format: "cvg-coverage-summary/v1",
          status: "PASS",
          sha,
          generatedAt,
          total: report.total,
          report,
          raw_report: raw,
          measurement_provenance: proof,
        };
        if (scenario === "conflicting nested identity")
          Object.assign(report, { sha: "b".repeat(40) });
        if (scenario === "raw wrong digest") proof.raw_sha256 = "f".repeat(64);
        if (scenario === "raw dirty measurement") proof.checkout.after = false;
        if (scenario === "raw nonCI measurement") proof.runner = "local";
        if (scenario === "docs ancestor") {
          await mkdir(join(dir, "docs"));
          await writeFile(join(dir, "docs/note.md"), "Only docs.\n");
          await exec("git", ["add", "docs"], { cwd: dir });
          await exec("git", ["commit", "--quiet", "-m", "docs"], { cwd: dir });
        }
        if (scenario === "stale runtime envelope") {
          await writeFile(
            join(dir, "apps/runtime.ts"),
            "export const value = 2;\n",
          );
          await exec("git", ["add", "apps"], { cwd: dir });
          await exec("git", ["commit", "--quiet", "-m", "new runtime"], {
            cwd: dir,
          });
        }
        await mkdir(join(dir, "coverage"));
        const rawInput = scenario.startsWith("raw");
        await writeFile(
          join(dir, "coverage/coverage-summary.json"),
          rawInput ? raw : JSON.stringify(envelope),
        );
        await writeFile(
          join(dir, "coverage/coverage-provenance.json"),
          JSON.stringify(proof),
        );
        const args = [
          join(dir, "scripts/release-evidence.mjs"),
          "--out-dir",
          "release-evidence",
          "--coverage-summary",
          "coverage/coverage-summary.json",
        ];
        if (scenario !== "raw without proof")
          args.push(
            "--coverage-provenance",
            "coverage/coverage-provenance.json",
          );
        const result = await exec(process.execPath, args, { cwd: dir })
          .then((result) => ({ ...result, code: 0 }))
          .catch((error: unknown) => {
            if (
              error === null ||
              typeof error !== "object" ||
              !("code" in error) ||
              typeof error.code !== "number" ||
              !("stderr" in error) ||
              typeof error.stderr !== "string"
            )
              throw error;
            return { code: error.code, stderr: error.stderr };
          });
        const valid = [
          "raw diagnostic positive",
          "raw measured",
          "existing measured",
          "docs ancestor",
        ].includes(scenario);
        expect(result.code).toBe(valid ? 0 : 1);
        if (valid) {
          const measured = JSON.parse(
            await readFile(
              join(dir, "release-evidence/coverage-summary.json"),
              "utf8",
            ),
          );
          expect(measured.total).toEqual(report.total);
          expect(measured.report).toEqual(report);
          if (scenario === "raw diagnostic positive") return;
          expect(measured.sha).toBe(sha);
          expect(measured.generatedAt).toBe(generatedAt);
          expect(measured.measurement_provenance).toEqual(proof);
          expect(sha256Hex(measured.raw_report)).toBe(proof.raw_sha256);
        } else expect(result.stderr).toMatch(/coverage/u);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    120000,
  );
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
      const manifest: {
        artifacts: { path: string; status?: string; sha256?: string }[];
      } = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
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

  it("requires a workflow run id and current mutation chain in strict mode", async () => {
    const directory = await writeBundle();
    const originalRunId = process.env.CVG_MUTATION_CANDIDATE_ID;
    try {
      delete process.env.CVG_MUTATION_CANDIDATE_ID;
      const missingRunId = await validateBundle(directory, {
        strict: true,
        head: COMMIT,
      });
      expect(missingRunId).toContain(
        "strict validation requires the current mutation run id",
      );

      process.env.CVG_MUTATION_CANDIDATE_ID = "current-candidate-run";
      const failures = await validateBundle(directory, {
        strict: true,
        head: COMMIT,
      });
      expect(failures).toContain(
        "mutation candidate run id differs from this workflow run",
      );
      expect(
        failures.some((failure) =>
          failure.startsWith("current mutation provenance invalid:"),
        ),
      ).toBe(true);
    } finally {
      if (originalRunId === undefined) {
        delete process.env.CVG_MUTATION_CANDIDATE_ID;
      } else {
        process.env.CVG_MUTATION_CANDIDATE_ID = originalRunId;
      }
    }
  });
});

describe("evidence freshness rule", () => {
  const execFileAsync = promisify(execFile);
  let repoRoot: string;
  let measured: string;
  beforeAll(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "cvg-release-freshness-"));
    await execFileAsync("git", ["init", "--quiet"], { cwd: repoRoot });
    await execFileAsync(
      "git",
      ["config", "user.email", "fixture@example.invalid"],
      { cwd: repoRoot },
    );
    await execFileAsync("git", ["config", "user.name", "Fixture"], {
      cwd: repoRoot,
    });
    await mkdir(join(repoRoot, "apps"));
    await writeFile(
      join(repoRoot, "apps/runtime.ts"),
      "export const value = 1;\n",
    );
    await execFileAsync("git", ["add", "."], { cwd: repoRoot });
    await execFileAsync("git", ["commit", "--quiet", "-m", "runtime"], {
      cwd: repoRoot,
    });
    measured = await head();
  });
  afterAll(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });
  async function head() {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
    });
    return stdout.trim();
  }

  it("accepts the identical SHA", async () => {
    const current = await head();
    const result = await isEvidenceFresh(repoRoot, current, current);
    expect(result.fresh).toBe(true);
  });

  it("rejects malformed SHAs without touching git", async () => {
    const result = await isEvidenceFresh(repoRoot, "not-a-sha", "also-bad");
    expect(result.fresh).toBe(false);
  });

  it("accepts an ancestor with docs-only diff", async () => {
    await mkdir(join(repoRoot, "docs"), { recursive: true });
    await writeFile(join(repoRoot, "docs/fixture.md"), "Documentation only.\n");
    await execFileAsync("git", ["add", "docs"], { cwd: repoRoot });
    await execFileAsync("git", ["commit", "--quiet", "-m", "docs"], {
      cwd: repoRoot,
    });
    const current = await head();
    expect(current).not.toBe(measured);
    const result = await isEvidenceFresh(repoRoot, measured, current);
    expect(result).toMatchObject({ fresh: true });
  });
});
