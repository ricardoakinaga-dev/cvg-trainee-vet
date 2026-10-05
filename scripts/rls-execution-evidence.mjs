import { Buffer } from "node:buffer";
import { isAbsolute } from "node:path";
import {
  deriveTestCounts,
  digest,
  executionIdentity,
  reportedAssertionInventory,
  RLS_ASSERTIONS,
  RLS_SUITE,
} from "./ci-proof-contract.mjs";

/** @typedef {import('./ci-proof-contract.mjs').AssertionIdentity} AssertionIdentity */
/** @typedef {ReturnType<typeof executionIdentity>} CiIdentity */
/** @typedef {{sha: string, checkedAt: string, clean: boolean}} CheckoutObservation */
/**
 * @typedef {object} RlsMeasurementInput
 * @property {'ci'|'local'} evidenceKind
 * @property {boolean} [syntheticFixture]
 * @property {string|Uint8Array} rawReportBytes Original JSON reporter bytes.
 * @property {{files: string[], assertions: AssertionIdentity[], sha: string, checkoutRoot: string, startedAt: string, collectedAt: string, ci?: CiIdentity}} selection Independently collected tree before execution; never derived from this reporter.
 * @property {{status: string, exitCode: number, startedAt: string, completedAt: string, checkoutRoot: string, ci?: CiIdentity}} execution Original execution observations.
 * @property {{before: CheckoutObservation, after: CheckoutObservation}} checkout Actual clean-checkout observations; the composer does not perform Git checks.
 * @property {{startedAt: string, observedAt: string}} runWindow Original enclosing run, including collection and checkout checks.
 * @property {Record<string,string|undefined>} [environment] Original Actions environment. Test doubles must be explicitly synthetic.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** @param {AssertionIdentity[]} entries */
const orderedAssertions = (entries) =>
  entries
    .map((entry) => ({
      file: entry.file,
      name: entry.name,
      ancestorTitles: [...entry.ancestorTitles],
      title: entry.title,
    }))
    .sort((a, b) =>
      JSON.stringify([a.file, a.name, a.ancestorTitles, a.title]).localeCompare(
        JSON.stringify([b.file, b.name, b.ancestorTitles, b.title]),
      ),
    );
const requireValid = (condition, message) => {
  if (!condition) throw new Error(message);
};

/**
 * Compose bytes for later persistence without filesystem, PG, CLI or provider
 * calls. Receipts and Actions environment describe measurement, not an
 * authenticated transport root. Certification is always NOT_VERIFIED here.
 * @param {RlsMeasurementInput} input
 */
export function composeRlsExecutionEvidence(input) {
  try {
    return compose(input);
  } catch (error) {
    throw new Error(`RLS evidence invalid: ${error.message}`, { cause: error });
  }
}

/** @param {RlsMeasurementInput} input */
function compose(input) {
  requireValid(
    input?.evidenceKind === "local" || input?.evidenceKind === "ci",
    "measurement kind missing",
  );
  requireValid(
    input.syntheticFixture === undefined ||
      typeof input.syntheticFixture === "boolean",
    "fixture scope invalid",
  );
  const { selection, execution, checkout, runWindow } = input;
  const sha = checkout?.before?.sha;
  requireValid(
    /^[a-f0-9]{40}$/u.test(sha ?? "") &&
      checkout.after?.sha === sha &&
      checkout.before.clean === true &&
      checkout.after.clean === true,
    "clean same-SHA checkout observations missing",
  );
  requireValid(
    typeof execution?.checkoutRoot === "string" &&
      isAbsolute(execution.checkoutRoot) &&
      selection?.checkoutRoot === execution.checkoutRoot &&
      selection.sha === sha,
    "selection checkout identity differs",
  );
  requireValid(
    execution.status === "EXECUTED" && execution.exitCode === 0,
    "successful measured execution missing",
  );

  // A single window binds before-check, collection, execution and after-check.
  // Stale observations cannot be restamped with the current generation time.
  const times = [
    runWindow?.startedAt,
    checkout.before.checkedAt,
    selection.startedAt,
    selection.collectedAt,
    execution.startedAt,
    execution.completedAt,
    checkout.after.checkedAt,
    runWindow?.observedAt,
  ].map((time) => Date.parse(time));
  requireValid(
    times.every(Number.isFinite) &&
      times.every((time, index) => index === 0 || times[index - 1] <= time) &&
      times[times.length - 1] <= Date.now(),
    "measurement chronology invalid",
  );

  let ci;
  if (input.evidenceKind === "ci") {
    // Never manufacture GITHUB_ACTIONS or a CI identity for a local run.
    ci = executionIdentity(input.environment ?? process.env);
    requireValid(
      ci.executing_head === sha &&
        same(execution.ci, ci) &&
        same(selection.ci, ci),
      "original CI/selection identity differs",
    );
  } else {
    requireValid(
      execution.ci === undefined && selection.ci === undefined,
      "local execution cannot claim a CI identity",
    );
  }
  requireValid(
    Array.isArray(selection.files) &&
      same(selection.files, [RLS_SUITE]) &&
      Array.isArray(selection.assertions) &&
      selection.assertions.length > 0,
    "RLS selection inventory invalid",
  );
  for (const entry of selection.assertions) {
    requireValid(
      entry.file === RLS_SUITE &&
        Array.isArray(entry.ancestorTitles) &&
        entry.ancestorTitles.every((title) => typeof title === "string") &&
        typeof entry.title === "string" &&
        entry.name === [...entry.ancestorTitles, entry.title].join(" > "),
      "RLS selected structural identity invalid",
    );
  }
  requireValid(
    typeof input.rawReportBytes === "string" ||
      input.rawReportBytes instanceof Uint8Array,
    "original report bytes missing",
  );
  // Copy before parsing/hashing so later caller buffer mutation cannot restamp it.
  const rawBytes = Buffer.from(input.rawReportBytes);
  requireValid(rawBytes.length > 0, "original report bytes empty");
  const report = JSON.parse(rawBytes.toString("utf8"));
  // Explicit fixture markers in raw input survive composition even if a caller
  // forgets the fixture option. Syntactic CI metadata cannot erase that scope.
  const synthetic =
    input.syntheticFixture === true ||
    [report, selection, execution].some((value) =>
      ["synthetic", "fixture", "mocked"].some((key) => value?.[key] === true),
    );
  const start = Date.parse(execution.startedAt),
    end = Date.parse(execution.completedAt);
  requireValid(
    Number.isFinite(report?.startTime) &&
      start <= report.startTime &&
      report.startTime <= end,
    "raw reporter chronology invalid",
  );
  const counts = deriveTestCounts(
    report,
    selection.files,
    execution.checkoutRoot,
    start,
    end,
  );
  requireValid(
    report.testResults.every((suite) => report.startTime <= suite.startTime),
    "raw reporter/suite chronology invalid",
  );
  const measured = reportedAssertionInventory(report, execution.checkoutRoot);
  const selected = orderedAssertions(selection.assertions);
  requireValid(
    same(measured, selected),
    "RLS full selected assertion inventory differs from execution",
  );
  const requiredTitles = [
    ...new Set(Object.values(RLS_ASSERTIONS)),
    "isolates staff reads by scope membership",
  ];
  const measuredTitles = measured.map((assertion) => assertion.title);
  requireValid(
    measuredTitles.length === requiredTitles.length &&
      new Set(measuredTitles).size === requiredTitles.length &&
      requiredTitles.every((title) => measuredTitles.includes(title)),
    "RLS exact seven assertion titles including staff absent",
  );

  const inventoryBytes = Buffer.from(
    `${JSON.stringify(
      {
        files: selection.files,
        assertions: selected,
        collection: {
          sha,
          checkoutRoot: selection.checkoutRoot,
          startedAt: selection.startedAt,
          collectedAt: selection.collectedAt,
          ...(ci ? { ci } : {}),
        },
      },
      null,
      2,
    )}\n`,
  );
  const invariants = Object.fromEntries(
    Object.entries(RLS_ASSERTIONS).map(([key, title]) => [
      key,
      measuredTitles.includes(title),
    ]),
  );
  const summary = {
    format: "cvg-rls-live-summary/v1",
    status: synthetic
      ? "SYNTHETIC_MEASURED"
      : input.evidenceKind === "local"
        ? "LOCAL_MEASURED"
        : "PASS",
    proof_scope: synthetic
      ? "synthetic-fixture"
      : input.evidenceKind === "local"
        ? "local-measurement"
        : "ci-measurement",
    certification: "NOT_VERIFIED",
    ...(synthetic ? { synthetic: true } : {}),
    sha,
    suite: RLS_SUITE,
    generatedAt: execution.completedAt,
    failed: counts.failed,
    ...invariants,
    staff_scope_isolated: true,
    executionStatus: "EXECUTED",
    executedTests: counts.passed,
    tests: { ...counts, source: "original Vitest integration JSON reporter" },
    execution: {
      status: execution.status,
      exitCode: execution.exitCode,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      checkoutRoot: execution.checkoutRoot,
      ...(ci ? { ci } : {}),
      checkout: { before: true, after: true },
      checkoutObservations: {
        before: {
          sha: checkout.before.sha,
          checkedAt: checkout.before.checkedAt,
          clean: checkout.before.clean,
        },
        after: {
          sha: checkout.after.sha,
          checkedAt: checkout.after.checkedAt,
          clean: checkout.after.clean,
        },
      },
      runWindow: {
        startedAt: runWindow.startedAt,
        observedAt: runWindow.observedAt,
      },
    },
    rawReport: { path: "rls-results.raw.json", sha256: digest(rawBytes) },
    inventory: { path: "rls-inventory.json", sha256: digest(inventoryBytes) },
  };
  return {
    summary,
    files: {
      "rls-results.raw.json": rawBytes,
      "rls-inventory.json": inventoryBytes,
      "rls-live-summary.json": Buffer.from(
        `${JSON.stringify(summary, null, 2)}\n`,
      ),
    },
  };
}
