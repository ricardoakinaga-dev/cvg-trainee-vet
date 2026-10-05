import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { composeRlsExecutionEvidence } from "../../scripts/rls-execution-evidence.mjs";
import { digest, RLS_SUITE } from "../../scripts/ci-proof-contract.mjs";
import { runMeasuredRlsExecution } from "../../scripts/run-rls-live.mjs";

// Independent selection double uses original RLS titles, not reporter-derived
// names. All inputs in this file are synthetic; no PG or Actions run is claimed.
const selectedTitles = [
  "denies participant A any read of participant B rows",
  "denies participant writes outside their own identity",
  "isolates staff reads by scope membership",
  "confines the content-indexer service identity to its contract",
  "denies anonymous access to protected rows",
  "never leaks pooled RLS context across ten alternating checkouts on one pooled connection",
  "audits owner, grants, RLS enforcement and least privilege live",
];
const ancestor = "full live RLS scope matrix on real PostgreSQL";
const sha = "a".repeat(40);
const root = "/explicitly-synthetic-checkout";
const repository = "ricardoakinaga-dev/cvg-trainee-vet";
type Assertion = {
  ancestorTitles: string[];
  title: string;
  fullName: string;
  status: string;
};
function fixture() {
  const start = Date.now() - 10000;
  const iso = (delta: number) => new Date(start + delta).toISOString();
  const ci = {
    run_id: 13,
    run_attempt: 2,
    repository,
    workflow_ref: `${repository}/.github/workflows/candidate.yml@refs/heads/main`,
    ref: "refs/heads/main",
    executing_head: sha,
  };
  const assertions: Assertion[] = selectedTitles.map((title) => ({
    ancestorTitles: [ancestor],
    title,
    fullName: `${ancestor} ${title}`,
    status: "passed",
  }));
  const report = {
    success: true,
    startTime: start + 3000,
    numTotalTests: 7,
    numPassedTests: 7,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: `${root}/${RLS_SUITE}`,
        status: "passed",
        startTime: start + 3100,
        endTime: start + 4000,
        assertionResults: assertions,
      },
    ],
  };
  const input = {
    evidenceKind: "ci" as "ci" | "local",
    syntheticFixture: true,
    rawReportBytes: Buffer.from(`${JSON.stringify(report, null, 2)}\n`),
    selection: {
      files: [RLS_SUITE],
      assertions: selectedTitles.map((title) => ({
        file: RLS_SUITE,
        name: `${ancestor} > ${title}`,
        ancestorTitles: [ancestor],
        title,
      })),
      sha,
      checkoutRoot: root,
      startedAt: iso(1000),
      collectedAt: iso(2000),
      ci,
    },
    execution: {
      status: "EXECUTED",
      exitCode: 0,
      startedAt: iso(3000),
      completedAt: iso(5000),
      checkoutRoot: root,
      ci,
    },
    checkout: {
      before: { sha, checkedAt: iso(500), clean: true },
      after: { sha, checkedAt: iso(6000), clean: true },
    },
    runWindow: { startedAt: iso(0), observedAt: iso(7000) },
    environment: {
      GITHUB_ACTIONS: "true",
      GITHUB_RUN_ID: "13",
      GITHUB_RUN_ATTEMPT: "2",
      GITHUB_REPOSITORY: repository,
      GITHUB_WORKFLOW_REF: ci.workflow_ref,
      GITHUB_REF: ci.ref,
      GITHUB_SHA: sha,
    },
  };
  return { input, report, iso };
}

describe("pure RLS execution evidence composer — synthetic doubles only", () => {
  it("binds fixture selection titles to the readonly seven-test source inventory", async () => {
    const source = await readFile(
      new URL("./rls-full-matrix.test.ts", import.meta.url),
      "utf8",
    );
    expect(
      [...source.matchAll(/\bit\("([^"]+)", async/gu)].map((match) => match[1]),
    ).toEqual(selectedTitles);
    expect(source).toContain(`"${ancestor}"`);
  });
  it("preserves exact original bytes and derives the complete seven-assertion structural contract", () => {
    const { input } = fixture();
    const result = composeRlsExecutionEvidence(input);
    expect(result.files["rls-results.raw.json"]).toEqual(input.rawReportBytes);
    expect(result.summary).toMatchObject({
      status: "SYNTHETIC_MEASURED",
      synthetic: true,
      certification: "NOT_VERIFIED",
      sha,
      suite: RLS_SUITE,
      executionStatus: "EXECUTED",
      executedTests: 7,
      tests: { files: 1, passed: 7, failed: 0, skipped: 0 },
      staff_scope_isolated: true,
    });
    expect(result.summary.generatedAt).toBe(input.execution.completedAt);
    expect(result.summary.execution.ci).toEqual(input.execution.ci);
    expect(result.summary.execution.checkout).toEqual({
      before: true,
      after: true,
    });
    expect(result.summary.rawReport.sha256).toBe(digest(input.rawReportBytes));
    expect(result.summary.inventory.sha256).toBe(
      digest(result.files["rls-inventory.json"]),
    );
    const inventory = JSON.parse(result.files["rls-inventory.json"].toString());
    expect(inventory.files).toEqual([RLS_SUITE]);
    expect(inventory.assertions).toHaveLength(7);
    expect(
      new Set(
        inventory.assertions.map((entry: { title: string }) => entry.title),
      ),
    ).toEqual(new Set(selectedTitles));
    expect(
      JSON.parse(result.files["rls-live-summary.json"].toString()),
    ).toEqual(result.summary);
  });
  it("detaches raw bytes from later caller mutation", () => {
    const { input } = fixture();
    const result = composeRlsExecutionEvidence(input);
    const before = Buffer.from(result.files["rls-results.raw.json"]);
    input.rawReportBytes.fill(0);
    expect(result.files["rls-results.raw.json"]).toEqual(before);
  });
  it("distinguishes local measured execution without inventing an Actions identity", () => {
    const { input } = fixture();
    input.evidenceKind = "local";
    input.syntheticFixture = false;
    // Removing these captured metadata fields is part of the explicit local double.
    Reflect.deleteProperty(input.execution, "ci");
    Reflect.deleteProperty(input.selection, "ci");
    const result = composeRlsExecutionEvidence(input);
    expect(result.summary.status).toBe("LOCAL_MEASURED");
    expect(result.summary.certification).toBe("NOT_VERIFIED");
    expect(result.summary.execution.ci).toBeUndefined();
    expect(result.summary.status).not.toBe("PASS");
  });
  it("does not grant PASS to synthetic CI metadata even when every hash is consistent", () => {
    const { input } = fixture();
    expect(composeRlsExecutionEvidence(input).summary.status).not.toBe("PASS");
  });
  it.each(["synthetic", "fixture", "mocked"])(
    "never emits PASS for an explicitly %s raw report",
    (marker) => {
      const { input, report } = fixture();
      input.syntheticFixture = false;
      Reflect.set(report, marker, true);
      input.rawReportBytes = Buffer.from(JSON.stringify(report));
      expect(composeRlsExecutionEvidence(input).summary).toMatchObject({
        status: "SYNTHETIC_MEASURED",
        synthetic: true,
        certification: "NOT_VERIFIED",
      });
    },
  );
  it("detaches the original measurement metadata from later caller mutations", () => {
    const { input } = fixture();
    const result = composeRlsExecutionEvidence(input);
    const original = JSON.parse(
      result.files["rls-live-summary.json"].toString(),
    );
    input.checkout.after.sha = "b".repeat(40);
    input.runWindow.observedAt = "2100-01-01T00:00:00Z";
    expect(result.summary).toEqual(original);
  });
  it("accepts identical independently collected records regardless of JSON key ordering", () => {
    const { input } = fixture();
    input.selection.assertions = input.selection.assertions.map((entry) => ({
      title: entry.title,
      ancestorTitles: entry.ancestorTitles,
      name: entry.name,
      file: entry.file,
    }));
    expect(composeRlsExecutionEvidence(input).summary.executedTests).toBe(7);
  });
  it("rejects a different tree with an identical flattened literal delimiter label", () => {
    const { input, report } = fixture();
    const title = "literal > ancestor";
    for (const assertion of report.testResults[0]!.assertionResults) {
      assertion.ancestorTitles = [title];
      assertion.fullName = `${title} ${assertion.title}`;
    }
    for (const entry of input.selection.assertions) {
      entry.ancestorTitles = [title];
      entry.name = `${title} > ${entry.title}`;
    }
    input.selection.assertions[0]!.ancestorTitles = ["literal", "ancestor"];
    input.rawReportBytes = Buffer.from(JSON.stringify(report));
    expect(() => composeRlsExecutionEvidence(input)).toThrow(
      /full selected assertion inventory differs/,
    );
  });
  it("preserves literal delimiters in structural suite names", () => {
    const { input, report } = fixture();
    const suiteTitle = "literal > ancestor";
    for (const assertion of report.testResults[0]!.assertionResults) {
      assertion.ancestorTitles = [suiteTitle];
      assertion.fullName = `${suiteTitle} ${assertion.title}`;
    }
    for (const entry of input.selection.assertions) {
      entry.ancestorTitles = [suiteTitle];
      entry.name = `${suiteTitle} > ${entry.title}`;
    }
    input.rawReportBytes = Buffer.from(JSON.stringify(report));
    const inventory = JSON.parse(
      composeRlsExecutionEvidence(input).files["rls-inventory.json"].toString(),
    );
    expect(inventory.assertions[0].ancestorTitles).toEqual([suiteTitle]);
    expect(inventory.assertions[0].name).toContain("literal > ancestor > ");
  });
  it.each([
    "malformed JSON",
    "empty bytes",
    "empty suite",
    "wrong suite",
    "duplicate suite",
    "failed report",
    "failed assertion",
    "skipped assertion",
    "invented count",
    "missing staff",
    "duplicate title",
    "substring title",
    "missing structure",
    "wrong fullName",
    "empty selection",
    "wrong selected suite",
    "partial selection",
    "extra selection",
    "forged flattened collision",
    "wrong selection SHA",
    "wrong selection root",
    "stale selection",
    "selection after execution",
    "reversed selection",
    "reversed execution",
    "suite before execution",
    "suite after execution",
    "report before execution",
    "future measurement",
    "dirty checkout",
    "different checkout SHA",
    "checkout before selection missing",
    "checkout after execution missing",
    "nonzero exit",
    "not executed",
    "missing CI environment",
    "wrong CI SHA",
    "wrong CI attempt",
    "wrong CI repo",
    "wrong CI workflow",
    "wrong captured identity",
    "wrong selected identity",
  ])("rejects %s without producing any summary", (scenario) => {
    const { input, report, iso } = fixture();
    const suite = report.testResults[0]!;
    if (scenario === "empty suite") suite.assertionResults = [];
    if (scenario === "wrong suite") suite.name = `${root}/unrelated.test.ts`;
    if (scenario === "duplicate suite") report.testResults.push(suite);
    if (scenario === "failed report") report.success = false;
    if (scenario === "failed assertion")
      suite.assertionResults[0]!.status = "failed";
    if (scenario === "skipped assertion")
      suite.assertionResults[0]!.status = "pending";
    if (scenario === "invented count") report.numTotalTests = 999;
    if (scenario === "missing staff") {
      suite.assertionResults.splice(2, 1);
      report.numTotalTests = report.numPassedTests = 6;
      input.selection.assertions.splice(2, 1);
    }
    if (scenario === "duplicate title") {
      suite.assertionResults[2] = structuredClone(suite.assertionResults[0]!);
      input.selection.assertions[2] = structuredClone(
        input.selection.assertions[0]!,
      );
    }
    if (scenario === "substring title") {
      suite.assertionResults[2]!.title = `documentation ${selectedTitles[2]}`;
      suite.assertionResults[2]!.fullName = `${ancestor} ${suite.assertionResults[2]!.title}`;
      input.selection.assertions[2]!.title = suite.assertionResults[2]!.title;
      input.selection.assertions[2]!.name = `${ancestor} > ${suite.assertionResults[2]!.title}`;
    }
    if (scenario === "missing structure")
      Reflect.deleteProperty(suite.assertionResults[0]!, "ancestorTitles");
    if (scenario === "wrong fullName")
      suite.assertionResults[0]!.fullName = "unrelated";
    if (scenario === "empty selection") input.selection.assertions = [];
    if (scenario === "wrong selected suite")
      input.selection.files = ["unrelated.test.ts"];
    if (scenario === "partial selection") input.selection.assertions.pop();
    if (scenario === "extra selection")
      input.selection.assertions.push(
        structuredClone(input.selection.assertions[0]!),
      );
    if (scenario === "forged flattened collision") {
      input.selection.assertions[0]!.ancestorTitles = [
        "full live RLS",
        "scope matrix on real PostgreSQL",
      ];
    }
    if (scenario === "wrong selection SHA")
      input.selection.sha = "b".repeat(40);
    if (scenario === "wrong selection root")
      input.selection.checkoutRoot = "/other-checkout";
    if (scenario === "stale selection")
      input.selection.startedAt = input.selection.collectedAt = iso(-1000);
    if (scenario === "selection after execution")
      input.selection.collectedAt = iso(4000);
    if (scenario === "reversed selection")
      input.selection.startedAt = iso(2500);
    if (scenario === "reversed execution")
      input.execution.completedAt = iso(2000);
    if (scenario === "suite before execution") suite.startTime -= 2000;
    if (scenario === "suite after execution") suite.endTime += 5000;
    if (scenario === "report before execution") report.startTime -= 2000;
    if (scenario === "future measurement")
      input.runWindow.observedAt = "2100-01-01T00:00:00Z";
    if (scenario === "dirty checkout") input.checkout.after.clean = false;
    if (scenario === "different checkout SHA")
      input.checkout.after.sha = "b".repeat(40);
    if (scenario === "checkout before selection missing")
      input.checkout.before.checkedAt = iso(1500);
    if (scenario === "checkout after execution missing")
      input.checkout.after.checkedAt = iso(4000);
    if (scenario === "nonzero exit") input.execution.exitCode = 1;
    if (scenario === "not executed") input.execution.status = "NOT_EXECUTED";
    if (scenario === "missing CI environment")
      input.environment.GITHUB_ACTIONS = "false";
    if (scenario === "wrong CI SHA")
      input.environment.GITHUB_SHA = "b".repeat(40);
    if (scenario === "wrong CI attempt")
      input.environment.GITHUB_RUN_ATTEMPT = "3";
    if (scenario === "wrong CI repo")
      input.environment.GITHUB_REPOSITORY = "other/repo";
    if (scenario === "wrong CI workflow")
      input.environment.GITHUB_WORKFLOW_REF = `${repository}/.github/workflows/security.yml@refs/heads/main`;
    if (scenario === "wrong captured identity")
      input.execution.ci = { ...input.execution.ci, run_id: 99 };
    if (scenario === "wrong selected identity")
      input.selection.ci = { ...input.selection.ci, run_attempt: 9 };
    input.rawReportBytes = Buffer.from(JSON.stringify(report));
    if (scenario === "malformed JSON")
      input.rawReportBytes = Buffer.from("{bad");
    if (scenario === "empty bytes") input.rawReportBytes = Buffer.alloc(0);
    expect(() => composeRlsExecutionEvidence(input)).toThrow(
      /RLS evidence invalid:/,
    );
  });
});

describe("R9 assembled RLS producer with explicit IO doubles, no PG", () => {
  function ioDouble(failPath = "", runFails = false) {
    const { input, iso } = fixture();
    const writes = new Map<string, Uint8Array>();
    let index = 0;
    const ticks = [0, 500, 1000, 2000, 3000, 5000, 6000, 7000];
    const events: string[] = [];
    const dependencies = {
      clock: () => iso(ticks[index++]!),
      head: async () => sha,
      fresh: async () => ({
        fresh: true,
        detail: "explicit synthetic checkout observation",
      }),
      collect: async () => structuredClone(input.selection.assertions),
      temp: async () => "/synthetic/report",
      mkdir: async () => undefined,
      remove: async (path: string) => {
        events.push(`remove:${path}`);
      },
      run: async () => {
        events.push("run");
        if (runFails) throw new Error("explicit failed execution double");
      },
      read: async () => input.rawReportBytes,
      write: async (path: string, bytes: Uint8Array) => {
        events.push(`write:${path}`);
        if (path.endsWith(failPath) && failPath)
          throw new Error("explicit IO failure double");
        writes.set(path, bytes);
      },
    };
    const options = {
      checkoutRoot: root,
      environment: input.environment,
      syntheticFixture: true,
      evidenceDirectory: "/synthetic/evidence",
    };
    return { options, dependencies, writes, events, input };
  }
  it("R9 persists original raw report, structural inventory and measured summary mandatorily", async () => {
    const { options, dependencies, writes, input } = ioDouble();
    const summary = await runMeasuredRlsExecution(options, dependencies);
    expect(summary).toMatchObject({
      status: "SYNTHETIC_MEASURED",
      certification: "NOT_VERIFIED",
      executedTests: 7,
    });
    expect(writes.get("/synthetic/evidence/rls-results.raw.json")).toEqual(
      input.rawReportBytes,
    );
    expect(writes.has("/synthetic/evidence/rls-inventory.json")).toBe(true);
    expect(writes.has("/synthetic/evidence/rls-live-summary.json")).toBe(true);
  });
  it.each([
    "rls-results.raw.json",
    "rls-inventory.json",
    "rls-live-summary.json",
  ])("R9 fails the run if mandatory persistence of %s fails", async (path) => {
    const { options, dependencies } = ioDouble(path);
    await expect(
      runMeasuredRlsExecution(options, dependencies),
    ).rejects.toThrow(/IO failure double/);
  });
  it("R9 retains failure raw bytes and clears a stale summary without emitting PASS", async () => {
    const { options, dependencies, writes, events, input } = ioDouble("", true);
    await expect(
      runMeasuredRlsExecution(options, dependencies),
    ).rejects.toThrow();
    expect(writes.get("/synthetic/evidence/rls-results.raw.json")).toEqual(
      input.rawReportBytes,
    );
    expect(events).toContain(
      "remove:/synthetic/evidence/rls-live-summary.json",
    );
    expect(writes.has("/synthetic/evidence/rls-live-summary.json")).toBe(false);
  });
});
