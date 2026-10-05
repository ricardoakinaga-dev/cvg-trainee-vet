import { describe, expect, it } from "vitest";
import ts from "typescript";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { validateArtifactDigests } from "../../scripts/release-evidence.mjs";
import { createStagingOwnedLifecycle } from "../../scripts/staging-owned-lifecycle.mjs";
import { authenticatedArtifactProof } from "../../scripts/ci-proof-contract.mjs";
import { makeClaimArchiveFixture } from "./ci-proof-fixtures.js";

const root = process.cwd();
async function declaration(path: string, name: string) {
  const text = await readFile(join(root, path), "utf8");
  const file = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const node = file.statements.find(
    (entry) => ts.isFunctionDeclaration(entry) && entry.name?.text === name,
  );
  if (!node || !ts.isFunctionDeclaration(node) || !node.body)
    throw new Error("source function missing");
  return { text, file, node };
}

describe("CI declared inputs and numeric admission (non-certifying source controls)", () => {
  it.each(["matching", "audit", "review", "register"])(
    "R22 candidate authenticated claim bytes: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r22-claims-"));
      try {
        const { paths, fetchImpl } = await makeClaimArchiveFixture(
          dir,
          "a".repeat(40),
        );
        const { node, file } = await declaration(
          "scripts/verify-aaa-candidate.mjs",
          "main",
        );
        let call: ts.CallExpression | undefined;
        const visit = (entry: ts.Node) => {
          if (
            ts.isCallExpression(entry) &&
            entry.expression.getText(file) === "validateBundle"
          )
            call = entry;
          ts.forEachChild(entry, visit);
        };
        visit(node);
        if (!call) throw new Error("candidate bundle call absent");
        if (scenario !== "matching")
          await writeFile(
            paths[["audit", "review", "register"].indexOf(scenario)]!,
            "counterfeit local bytes",
          );
        const consume = async (
          _directory: string,
          options: { trustedClaims?: { path: string; archivePath: string }[] },
        ) => {
          return authenticatedArtifactProof({
            token: "SYNTHETIC-NONCREDENTIAL",
            files: options.trustedClaims ?? [],
            sha: "a".repeat(40),
            runId: 123,
            runAttempt: 2,
            fetchImpl,
          });
        };
        const invoke = new Function(
          "validateBundle",
          "join",
          "basename",
          "root",
          "headStdout",
          "preflight",
          "claimPaths",
          "return " + call.getText(file),
        );
        const action = invoke(
          consume,
          join,
          basename,
          dir,
          "a".repeat(40),
          false,
          paths,
        );
        if (scenario === "matching")
          await expect(action).resolves.toMatchObject({
            trust: "AUTHENTICATED_GITHUB_ARTIFACT",
            runId: 123,
            runAttempt: 2,
          });
        else await expect(action).rejects.toThrow(/local proof differs/);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("R22 candidate passes every declared claim to authenticated byte validation", async () => {
    const { node, file } = await declaration(
      "scripts/verify-aaa-candidate.mjs",
      "main",
    );
    const calls: ts.CallExpression[] = [];
    const visit = (entry: ts.Node) => {
      if (
        ts.isCallExpression(entry) &&
        entry.expression.getText(file) === "validateBundle"
      )
        calls.push(entry);
      ts.forEachChild(entry, visit);
    };
    visit(node);
    expect(calls).toHaveLength(1);
    const claimPaths = [
      "/owned/candidate-audit.json",
      "/owned/candidate-independent-review.json",
      "/owned/candidate-risk-register.json",
    ];
    const invoke = new Function(
      "validateBundle",
      "join",
      "basename",
      "root",
      "headStdout",
      "preflight",
      "claimPaths",
      "return " + calls[0]!.getText(file),
    );
    for (const preflight of [false, true]) {
      let received: unknown;
      await invoke(
        async (_directory: string, options: unknown) => {
          received = options;
          return [];
        },
        join,
        basename,
        "/owned",
        "a".repeat(40),
        preflight,
        claimPaths,
      );
      expect(received).toEqual({
        strict: true,
        head: "a".repeat(40),
        phase: preflight ? "preflight" : "promotion",
        derivedArtifacts: claimPaths,
        trustedClaims: claimPaths.map((path) => ({
          path,
          archivePath: `release-evidence/${basename(path)}`,
        })),
      });
    }
  });
  it("candidate call declares its exact external archive files without waiving strict validation", async () => {
    const { node, file } = await declaration(
      process.env.CVG_R18_CANDIDATE_BASELINE_PATH ??
        "scripts/verify-aaa-candidate.mjs",
      "main",
    );
    const calls: ts.CallExpression[] = [];
    const visit = (entry: ts.Node) => {
      if (
        ts.isCallExpression(entry) &&
        entry.expression.getText(file) === "validateBundle"
      )
        calls.push(entry);
      ts.forEachChild(entry, visit);
    };
    visit(node);
    expect(calls).toHaveLength(1);
    const temporary = await mkdtemp(join(tmpdir(), "cvg-claim-binding-"));
    try {
      const dir = join(temporary, "release-evidence");
      await mkdir(dir);
      const neutral = join(dir, "neutral-declared-input.txt");
      await writeFile(neutral, "NOT AN APPROVAL OR RELEASE PROOF\n");
      const invoke = new Function(
        "validateBundle",
        "join",
        "root",
        "headStdout",
        "preflight",
        "claimPaths",
        "basename",
        "return " + calls[0]!.getText(file),
      );
      const consume = async (
        directory: string,
        options: {
          strict: boolean;
          head: string;
          phase: string;
          derivedArtifacts?: string[];
        },
      ) => {
        expect(options).toMatchObject({
          strict: true,
          head: "a".repeat(40),
          phase: "preflight",
        });
        return validateArtifactDigests(
          directory,
          { artifacts: [] },
          {},
          options.derivedArtifacts ?? [],
        );
      };
      const failures: string[] = await invoke(
        consume,
        join,
        temporary,
        "a".repeat(40),
        true,
        [neutral],
        basename,
      );
      expect(failures.length).toBeGreaterThan(0);
      expect(failures).not.toContain(
        "unlisted artifact: neutral-declared-input.txt",
      );
      const undeclared = await validateArtifactDigests(
        dir,
        { artifacts: [] },
        {},
      );
      expect(undeclared).toContain(
        "unlisted artifact: neutral-declared-input.txt",
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
  it.each([JSON.parse("1e400") as number, -1, 101, NaN, "97", null])(
    "rejects invalid decision-bearing domain score %s",
    async (score) => {
      const { node, file } = await declaration(
        "scripts/verify-triple-aaa.mjs",
        "scoreDomains",
      );
      const invoke = new Function("return (" + node.getText(file) + ")")();
      expect(invoke({ testing: score }, ["testing"])).toBeNull();
    },
  );
  it.each([0, 96.99, 97, 100])(
    "preserves finite raw domain score %s",
    async (score) => {
      const { node, file } = await declaration(
        "scripts/verify-triple-aaa.mjs",
        "scoreDomains",
      );
      const invoke = new Function("return (" + node.getText(file) + ")")();
      expect(invoke({ testing: score }, ["testing"])).toBe(score);
    },
  );
  it.each([JSON.parse("1e400"), -1, 101, NaN, "97", null])(
    "rejects invalid stated score %s",
    async (stated) => {
      const { node, file } = await declaration(
        "scripts/verify-triple-aaa.mjs",
        "main",
      );
      const loops: ts.ForOfStatement[] = [];
      const visit = (entry: ts.Node) => {
        if (
          ts.isForOfStatement(entry) &&
          entry.getText(file).includes("audit?.aaa_engineering")
        )
          loops.push(entry);
        ts.forEachChild(entry, visit);
      };
      visit(node);
      expect(loops).toHaveLength(1);
      const failures: string[] = [];
      new Function("audit", "scores", "fail", loops[0]!.getText(file))(
        { aaa_engineering: stated },
        { engineering: 97, security: 97, operations: 97 },
        (name: string) => failures.push(name),
      );
      expect(failures).toEqual(["scores consistent with audit"]);
    },
  );
});

describe("actual staging bootstrap body with IO doubles (no services)", () => {
  async function startupFailure(phase: "migration" | "redis") {
    const { node, text } = await declaration("scripts/run-staging.mjs", "main");
    const body = text.slice(node.body!.getStart() + 1, node.body!.end - 1);
    const AsyncFunction = Object.getPrototypeOf(
      async () => undefined,
    ).constructor;
    const parameters = [
      "process",
      "root",
      "startEvidenceMeasurement",
      "randomUUID",
      "requireVacantPort",
      "mkdir",
      "join",
      "rm",
      "required",
      "startEmbeddedPostgres",
      "ephemeralPort",
      "sqlExec",
      "APP_ROLE",
      "APP_PASSWORD",
      "DATABASE",
      "execFileAsync",
      "log",
      "findRedisServer",
      "createStagingOwnedLifecycle",
    ];
    const invoke = new AsyncFunction(...parameters, body);
    let stops = 0;
    const pg = {
      directory: "/memory-only/pg",
      maintenanceUrl: "postgresql://operator@127.0.0.1:5432/owned",
      dbUrl: () => "postgresql://operator@127.0.0.1:5432/owned",
      stop: async () => {
        stops++;
      },
    };
    const processDouble = {
      argv: ["node", "runner", "verify", "--record-test-summary"],
      env: { CVG_OTEL_COLLECTOR_BIN: "/memory-only/otel" },
      on: () => undefined,
      off: () => undefined,
      once: () => undefined,
    };
    await expect(
      invoke(
        processDouble,
        "/memory-only",
        async () => ({
          before: true,
          head: "a".repeat(40),
          startedAt: new Date().toISOString(),
        }),
        () => "11111111-1111-4111-8111-111111111111",
        async () => undefined,
        async () => undefined,
        join,
        async () => undefined,
        () => "http://127.0.0.1:6333",
        async () => pg,
        () => 5432,
        async () => undefined,
        "owned-app",
        "synthetic",
        "owned",
        async () => {
          if (phase === "migration")
            throw new Error("explicit migration IO failure");
          return {};
        },
        () => undefined,
        async () => null,
        createStagingOwnedLifecycle,
      ),
    ).rejects.toThrow(
      phase === "migration" ? /migration IO/ : /redis-server binary/,
    );
    return stops;
  }
  it.each(["migration", "redis"] as const)(
    "stops owned PG exactly once on %s bootstrap failure",
    async (phase) => {
      expect(await startupFailure(phase)).toBe(1);
    },
  );
  it.each([false, true])(
    "does not enumerate or kill foreign collectors in measurement=%s",
    async (recordTestSummary) => {
      const { node, file } = await declaration(
        "scripts/run-staging.mjs",
        "main",
      );
      const reapers = node.body!.statements.filter(
        (entry) =>
          ts.isIfStatement(entry) && entry.getText(file).includes("pgrep -af"),
      );
      const queries: unknown[] = [];
      const kills: unknown[] = [];
      const AsyncFunction = Object.getPrototypeOf(
        async () => undefined,
      ).constructor;
      for (const reaper of reapers)
        await new AsyncFunction(
          "recordTestSummary",
          "execFileAsync",
          "process",
          reaper.getText(file),
        )(
          recordTestSummary,
          async (...args: unknown[]) => {
            queries.push(args);
            return {
              stdout:
                "818181 otelcol-contrib --config /foreign/otelcol-staging.yaml\n",
            };
          },
          { kill: (...args: unknown[]) => kills.push(args) },
        );
      expect(queries).toEqual([]);
      expect(kills).toEqual([]);
    },
  );
});
