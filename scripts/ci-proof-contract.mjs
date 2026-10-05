import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve, isAbsolute } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { isRuntimePath } from "./evidence-freshness.mjs";

/* global Buffer, fetch, AbortSignal */
const execute = promisify(execFile);
export const CI_REPOSITORY = "ricardoakinaga-dev/cvg-trainee-vet";
export const RLS_SUITE = "tests/integration/rls-full-matrix.test.ts";
export const RLS_DESCRIBE = "full live RLS scope matrix on real PostgreSQL";
export const RLS_ASSERTIONS = Object.freeze({
  cross_scope_read_denied:
    "denies participant A any read of participant B rows",
  cross_scope_write_denied:
    "denies participant writes outside their own identity",
  anonymous_denied: "denies anonymous access to protected rows",
  service_identity_constrained:
    "confines the content-indexer service identity to its contract",
  pool_context_isolated:
    "never leaks pooled RLS context across ten alternating checkouts on one pooled connection",
  force_rls_verified:
    "audits owner, grants, RLS enforcement and least privilege live",
  bypassrls_absent:
    "audits owner, grants, RLS enforcement and least privilege live",
  superuser_absent:
    "audits owner, grants, RLS enforcement and least privilege live",
});
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Independent, fixed test doubles for explicit synthetic verifier mode only.
// Real validation always collects the current source tree through Vitest.
export function syntheticSelectedAssertions(files) {
  const rls = same(files, [RLS_SUITE]);
  const titles = rls
    ? [
        ...new Set(Object.values(RLS_ASSERTIONS)),
        "isolates staff reads by scope membership",
      ]
    : ["case1", "case2", "case3", "case4"];
  const ancestorTitles = rls ? [RLS_DESCRIBE] : [];
  return sortAssertions(
    files.flatMap((file) =>
      titles.map((title) => ({
        file,
        name: [...ancestorTitles, title].join(" > "),
        ancestorTitles: [...ancestorTitles],
        title,
      })),
    ),
  );
}

/** @typedef {{file: string, name: string, ancestorTitles: string[], title: string}} AssertionIdentity */
/** @param {AssertionIdentity[]} entries */
const sortAssertions = (entries) =>
  entries.sort((a, b) =>
    JSON.stringify([a.file, a.name, a.ancestorTitles, a.title]).localeCompare(
      JSON.stringify([b.file, b.name, b.ancestorTitles, b.title]),
    ),
  );

// Keep the tree as identity. Both Vitest display formats can collide, and a
// literal " > " in a suite or title is never a structural delimiter.
export function reportedAssertionInventory(report, root) {
  return sortAssertions(
    report.testResults.flatMap((suite) =>
      suite.assertionResults.map((test) => {
        if (
          !Array.isArray(test.ancestorTitles) ||
          test.ancestorTitles.some((title) => typeof title !== "string") ||
          typeof test.title !== "string" ||
          !test.title.trim() ||
          test.fullName !== [...test.ancestorTitles, test.title].join(" ")
        )
          throw new Error("raw structural assertion identity invalid");
        return {
          file: relative(root, resolve(root, suite.name)),
          name: [...test.ancestorTitles, test.title].join(" > "),
          ancestorTitles: test.ancestorTitles,
          title: test.title,
        };
      }),
    ),
  );
}

// security.yml has no scanner matrix. The pinned OSV reusable workflow has
// exactly one job (osv-scan), so its qualified API label is explicitly allowed.
export function securityJobGroups(jobs) {
  const allowed = {
    codeql: ["CodeQL javascript-typescript"],
    osv: ["OSV scan", "OSV scan / osv-scan"],
    supplyChain: ["Audit, secrets and SBOM"],
    dependencyReview: ["Dependency review"],
  };
  const groups = Object.fromEntries(
    Object.entries(allowed).map(([key, names]) => [
      key,
      jobs.filter((job) => names.includes(job.name)),
    ]),
  );
  if (
    ["codeql", "osv", "supplyChain"].some((key) => groups[key].length !== 1) ||
    groups.dependencyReview.length > 1 ||
    Object.values(groups).flat().length !== jobs.length
  )
    throw new Error("required security workflow job inventory differs");
  return groups;
}

export function securityChronologyValid(run, jobs, collectedAt) {
  const start = Date.parse(run?.run_started_at);
  const end = Date.parse(run?.updated_at);
  const collected = Date.parse(collectedAt);
  if (
    ![start, end, collected].every(Number.isFinite) ||
    start > end ||
    end > collected ||
    collected > Date.now() ||
    !Array.isArray(jobs) ||
    !jobs.length
  )
    return false;
  const ids = new Set();
  return jobs.every((job) => {
    const jobStart = Date.parse(job.started_at);
    const jobEnd = Date.parse(job.completed_at);
    const valid =
      Number.isSafeInteger(job.id) &&
      job.id > 0 &&
      !ids.has(job.id) &&
      job.run_id === run.id &&
      job.run_attempt === run.run_attempt &&
      job.head_sha === run.head_sha &&
      [jobStart, jobEnd].every(Number.isFinite) &&
      start <= jobStart &&
      jobStart <= jobEnd &&
      jobEnd <= end;
    ids.add(job.id);
    return valid;
  });
}

export function coverageDenominatorsValid(total) {
  return ["statements", "branches", "functions", "lines"].every((key) => {
    const metric = total?.[key];
    return (
      Number.isSafeInteger(metric?.total) &&
      metric.total > 0 &&
      Number.isSafeInteger(metric.covered) &&
      metric.covered >= 0 &&
      metric.covered <= metric.total &&
      Number.isSafeInteger(metric.skipped) &&
      metric.skipped >= 0 &&
      metric.skipped <= metric.total &&
      Number.isFinite(metric.pct) &&
      metric.pct >= 0 &&
      metric.pct <= 100 &&
      Math.abs(
        metric.pct - Math.floor((10000 * metric.covered) / metric.total) / 100,
      ) <= 0.01
    );
  });
}

export function deriveTestCounts(report, inventory, checkoutRoot, start, end) {
  if (
    !Array.isArray(inventory) ||
    inventory.length === 0 ||
    new Set(inventory).size !== inventory.length ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    report?.success !== true ||
    !Array.isArray(report.testResults)
  )
    throw new Error("raw test execution/inventory missing");
  const testCounters = [
    "numTotalTests",
    "numPassedTests",
    "numFailedTests",
    "numPendingTests",
    "numTodoTests",
  ];
  const suiteCounters = [
    "numTotalTestSuites",
    "numPassedTestSuites",
    "numFailedTestSuites",
    "numPendingTestSuites",
  ];
  const suppliedSuites = suiteCounters.some((key) =>
    Object.hasOwn(report, key),
  );
  for (const key of [...testCounters, ...suiteCounters]) {
    if (
      Object.hasOwn(report, key) &&
      (!Number.isSafeInteger(report[key]) || report[key] < 0)
    )
      throw new Error("raw reporter counter invalid");
  }
  if (
    suppliedSuites &&
    suiteCounters.some((key) => !Object.hasOwn(report, key))
  )
    throw new Error("raw suite counters incomplete");
  const counts = { files: 0, passed: 0, failed: 0, skipped: 0 };
  const found = [];
  const suiteIdentities = new Set();
  for (const suite of report.testResults) {
    if (typeof suite?.name !== "string")
      throw new Error("raw suite path missing");
    const path = relative(checkoutRoot, resolve(checkoutRoot, suite.name));
    const assertions = suite.assertionResults;
    if (
      !inventory.includes(path) ||
      found.includes(path) ||
      suite.status !== "passed" ||
      !Number.isFinite(suite.startTime) ||
      !Number.isFinite(suite.endTime) ||
      suite.startTime < start ||
      suite.endTime > end ||
      suite.startTime > suite.endTime ||
      !Array.isArray(assertions) ||
      assertions.length === 0
    )
      throw new Error("raw suite/inventory/chronology inconsistent");
    found.push(path);
    suiteIdentities.add(JSON.stringify([path]));
    for (const assertion of assertions) {
      if (typeof assertion.fullName !== "string" || !assertion.fullName.trim())
        throw new Error("raw assertion identity missing");
      if (Array.isArray(assertion.ancestorTitles)) {
        for (
          let length = 1;
          length <= assertion.ancestorTitles.length;
          length += 1
        )
          suiteIdentities.add(
            JSON.stringify([
              path,
              ...assertion.ancestorTitles.slice(0, length),
            ]),
          );
      }
      if (assertion.status === "passed") counts.passed += 1;
      else if (assertion.status === "failed") counts.failed += 1;
      else if (
        ["pending", "todo", "skipped", "disabled"].includes(assertion.status)
      )
        counts.skipped += 1;
      else throw new Error("raw assertion execution status unknown");
    }
    counts.files += 1;
  }
  if (
    found.length !== inventory.length ||
    counts.passed <= 0 ||
    counts.failed !== 0 ||
    counts.skipped !== 0 ||
    report.numTotalTests !== counts.passed + counts.failed + counts.skipped ||
    report.numPassedTests !== counts.passed ||
    report.numFailedTests !== counts.failed ||
    (report.numPendingTests ?? 0) + (report.numTodoTests ?? 0) !==
      counts.skipped
  )
    throw new Error("raw assertion counts/execution disagree");
  // Vitest counts files AND nested describes. Repeated suite names and empty
  // suites are not fully represented by assertion paths: those paths give a
  // lower bound, not an invented exact suite count. Reconcile supplied totals
  // and reject any failed/pending suite despite a claimed successful report.
  if (
    suppliedSuites &&
    (report.numTotalTestSuites < suiteIdentities.size ||
      report.numFailedTestSuites !== 0 ||
      report.numPendingTestSuites !== 0 ||
      !Number.isSafeInteger(
        report.numPassedTestSuites +
          report.numFailedTestSuites +
          report.numPendingTestSuites,
      ) ||
      report.numTotalTestSuites !==
        report.numPassedTestSuites +
          report.numFailedTestSuites +
          report.numPendingTestSuites)
  )
    throw new Error("raw suite counts/execution disagree");
  return counts;
}

export async function sourceInventory(root) {
  const { stdout } = await execute("git", ["ls-files", "-z"], { cwd: root });
  const paths = stdout.split("\0").filter(isRuntimePath).sort();
  if (paths.length === 0)
    throw new Error("authoritative runtime inventory empty");
  const files = {};
  for (const path of paths) {
    const info = await lstat(join(root, path));
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("runtime inventory requires regular source files");
    files[path] = digest(await readFile(join(root, path)));
  }
  const workspaceManifests = Object.fromEntries(
    Object.entries(files).filter(
      ([path]) => path === "package.json" || path.endsWith("/package.json"),
    ),
  );
  const migrationInventory = Object.fromEntries(
    Object.entries(files).filter(([path]) =>
      /^packages\/persistence\/drizzle\/[^/]+\.sql$/u.test(path),
    ),
  );
  const journal = JSON.parse(
    await readFile(
      join(root, "packages/persistence/drizzle/meta/_journal.json"),
      "utf8",
    ),
  );
  const tags = journal.entries?.map((entry) => entry.tag);
  if (
    !Array.isArray(tags) ||
    !tags.length ||
    new Set(tags).size !== tags.length ||
    !same(
      Object.keys(migrationInventory).sort(),
      tags.map((tag) => `packages/persistence/drizzle/${tag}.sql`).sort(),
    )
  )
    throw new Error("migration journal/inventory disagree");
  return {
    lockfileSha256: files["pnpm-lock.yaml"],
    treeDigest: digest(JSON.stringify(files)),
    workspaceManifests,
    migrationInventory,
    migrationHead: tags.at(-1),
    migrationFiles: tags.length,
  };
}

export function ordinaryTestEnvironment(environment) {
  const flags = [
    "CVG_RUN_LIVE_DB_TESTS",
    "CVG_RUN_LIVE_QDRANT_TESTS",
    "CVG_RUN_LIVE_REDIS_TESTS",
    "CVG_RUN_LIVE_RESTORE_TESTS",
    "CVG_RUN_RESTORE_MIGRATION_DRILL",
    "CVG_OWNED_DISPOSABLE_BINDING_DATABASE",
  ];
  const values = [
    "CVG_TEST_DATABASE_URL",
    "CVG_TEST_ADMIN_DATABASE_URL",
    "CVG_MIGRATION_DATABASE_URL",
    "CVG_TEST_QDRANT_URL",
    "CVG_TEST_REDIS_URL",
    "CVG_REDIS_SERVER_BIN",
    "CVG_STAGING_API_A_URL",
    "CVG_STAGING_API_B_URL",
    "CVG_STAGING_TLS_URL",
    "CVG_STAGING_EVIDENCE_DIR",
    "CVG_STAGING_OTEL_SPANS_FILE",
    "CVG_STAGING_REDIS_URL",
  ];
  if (
    flags.some((flag) => environment?.[flag] !== "true") ||
    values.some(
      (key) =>
        typeof environment?.[key] !== "string" || !environment[key].trim(),
    ) ||
    environment.CVG_TEST_DATABASE_URL ===
      environment.CVG_TEST_ADMIN_DATABASE_URL
  )
    throw new Error(
      "ordinary test profile requires every selected live gate and original runtime input",
    );
  return environment;
}

export function findingsCounterFailures(audit) {
  return ["p0", "p1", "p2"].flatMap((field) =>
    Number.isSafeInteger(audit?.[field]) && audit[field] >= 0
      ? []
      : [`audit ${field} must be a finite nonnegative safe integer`],
  );
}

export function riskRegisterFailures(audit, register, candidateSha) {
  const failures = findingsCounterFailures(audit);
  if (
    register?.format !== "cvg-risk-register/v1" ||
    !Array.isArray(register.entries)
  )
    return [...failures, "risk register schema/entries array missing"];
  if (
    register.candidate_sha !== undefined &&
    register.candidate_sha !== candidateSha
  )
    failures.push("risk register candidate identity differs");
  const ids = new Set();
  const textFields = [
    "id",
    "finding",
    "impact",
    "owner",
    "mitigation",
    "validation",
  ];
  for (const entry of register.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      failures.push("risk register entry must be an object");
      continue;
    }
    if (
      !textFields.every(
        (field) =>
          typeof entry[field] === "string" && entry[field].trim().length > 0,
      ) ||
      !["P2", "P3"].includes(entry.severity) ||
      typeof entry.accepted_risk !== "boolean" ||
      typeof entry.material !== "boolean"
    )
      failures.push(
        "risk register entry has invalid identity/mitigation/classification",
      );
    if (ids.has(entry.id))
      failures.push("risk register duplicate finding identity");
    ids.add(entry.id);
    if (entry.material === true && entry.accepted_risk !== true)
      failures.push("risk register material residual is unaccepted");
  }
  const entries = register.entries.filter(
    (entry) => entry && typeof entry === "object",
  );
  if (entries.filter((entry) => entry.severity === "P2").length !== audit?.p2)
    failures.push("risk register P2 count differs from audit");
  if (
    audit?.p3 !== undefined &&
    (!Number.isSafeInteger(audit.p3) ||
      audit.p3 < 0 ||
      entries.filter((entry) => entry.severity === "P3").length !== audit.p3)
  )
    failures.push("risk register P3 count differs from audit");
  if (audit?.findings !== undefined) {
    if (!Array.isArray(audit.findings))
      failures.push("audit findings source must be an array");
    else {
      const findingIds = new Set();
      for (const finding of audit.findings) {
        if (
          !finding ||
          typeof finding.id !== "string" ||
          !finding.id.trim() ||
          !["P0", "P1", "P2", "P3"].includes(finding.severity) ||
          findingIds.has(finding.id)
        )
          failures.push("audit findings source identity invalid");
        findingIds.add(finding?.id);
      }
      for (const [severity, field] of [
        ["P0", "p0"],
        ["P1", "p1"],
        ["P2", "p2"],
        ["P3", "p3"],
      ])
        if (
          audit[field] !== undefined &&
          audit.findings.filter((entry) => entry?.severity === severity)
            .length !== audit[field]
        )
          failures.push(`audit findings source ${severity} count differs`);
      for (const severity of ["P2", "P3"]) {
        const sourceIds = audit.findings
          .filter((entry) => entry?.severity === severity)
          .map((entry) => entry.id)
          .sort();
        const registerIds = entries
          .filter((entry) => entry.severity === severity)
          .map((entry) => entry.id)
          .sort();
        if (!same(sourceIds, registerIds))
          failures.push("risk register identities differ from audit findings");
      }
    }
  }
  return failures;
}

export function executionIdentity(environment = process.env) {
  const ci = {
    run_id: Number(environment.GITHUB_RUN_ID),
    run_attempt: Number(environment.GITHUB_RUN_ATTEMPT),
    repository: environment.GITHUB_REPOSITORY,
    workflow_ref: environment.GITHUB_WORKFLOW_REF,
    ref: environment.GITHUB_REF,
    executing_head: environment.GITHUB_SHA,
  };
  if (
    environment.GITHUB_ACTIONS !== "true" ||
    ci.repository !== CI_REPOSITORY ||
    !Number.isSafeInteger(ci.run_id) ||
    ci.run_id <= 0 ||
    !Number.isSafeInteger(ci.run_attempt) ||
    ci.run_attempt <= 0 ||
    !/^refs\/(heads|tags|pull)\/.+/u.test(ci.ref ?? "") ||
    ci.workflow_ref !==
      `${CI_REPOSITORY}/.github/workflows/candidate.yml@${ci.ref}` ||
    !/^[a-f0-9]{40}$/u.test(ci.executing_head ?? "")
  )
    throw new Error("measured producer CI identity absent");
  return ci;
}

export function measurementMatches(summary, run, collectedAt) {
  const proof = summary?.execution;
  const ci = proof?.ci;
  const start = Date.parse(proof?.startedAt),
    end = Date.parse(proof?.completedAt);
  const upper = Date.parse(
    run?.status === "completed" ? run.updatedAt : collectedAt,
  );
  return (
    proof?.status === "EXECUTED" &&
    proof.exitCode === 0 &&
    proof.checkout?.before === true &&
    proof.checkout?.after === true &&
    summary.sha === run?.headSha &&
    ci?.executing_head === summary.sha &&
    summary.generatedAt === proof.completedAt &&
    ci?.repository === run?.repository &&
    ci?.run_id === run?.id &&
    ci?.run_attempt === run?.runAttempt &&
    ci?.workflow_ref === run?.workflowRef &&
    ci?.ref === run?.ref &&
    [start, end, upper, Date.parse(run?.runStartedAt)].every(Number.isFinite) &&
    Date.parse(run.runStartedAt) <= start &&
    start <= end &&
    end <= upper &&
    upper <= Date.now()
  );
}

export async function rawJson(directory, descriptor) {
  if (
    !descriptor ||
    typeof descriptor.path !== "string" ||
    !/^[a-z0-9][a-z0-9.-]*\.json$/u.test(descriptor.path) ||
    !/^[a-f0-9]{64}$/u.test(descriptor.sha256 ?? "")
  )
    throw new Error("raw report descriptor missing/unsafe");
  const path = join(directory, descriptor.path);
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error("raw report must be a regular bundled file");
  const bytes = await readFile(path);
  if (digest(bytes) !== descriptor.sha256)
    throw new Error("raw report digest mismatch");
  return JSON.parse(bytes.toString("utf8"));
}

/** @param {{file: string, name: string, ancestorTitles: string[], title: string}[] | null} authoritativeAssertions */
export async function testExecutionFailures(
  directory,
  summary,
  run,
  collectedAt,
  authoritativeInventory,
  authoritativeAssertions = null,
) {
  try {
    if (
      !measurementMatches(summary, run, collectedAt) ||
      summary.executionStatus !== "EXECUTED"
    )
      throw new Error("test measured identity/execution invalid");
    if (
      !Array.isArray(authoritativeAssertions) ||
      !authoritativeAssertions.length
    )
      throw new Error(
        "authoritative full structural assertion inventory missing",
      );
    const inventory = await rawJson(directory, summary.inventory);
    if (!same(inventory.files, authoritativeInventory))
      throw new Error(
        "test inventory differs from authoritative selected suite",
      );
    const report = await rawJson(directory, summary.rawReport);
    const counts = deriveTestCounts(
      report,
      inventory.files,
      summary.execution.checkoutRoot,
      Date.parse(summary.execution.startedAt),
      Date.parse(summary.execution.completedAt),
    );
    const measuredAssertions = reportedAssertionInventory(
      report,
      summary.execution.checkoutRoot,
    );
    if (
      !Array.isArray(inventory.assertions) ||
      !same(measuredAssertions, inventory.assertions) ||
      !same(authoritativeAssertions, inventory.assertions)
    )
      throw new Error("raw full assertion inventory differs");
    if (
      !Object.entries(counts).every(
        ([key, value]) => summary.tests?.[key] === value,
      ) ||
      summary.executedTests !== counts.passed
    )
      throw new Error("summary counts disagree with raw inventory");
    if (
      authoritativeInventory.length === 1 &&
      authoritativeInventory[0] === RLS_SUITE
    ) {
      if (summary.suite !== RLS_SUITE) throw new Error("RLS suite differs");
      const assertions = report.testResults.flatMap(
        (suite) => suite.assertionResults,
      );
      const names = [
        ...new Set(Object.values(RLS_ASSERTIONS)),
        "isolates staff reads by scope membership",
      ];
      if (
        assertions.length !== names.length ||
        !names.every(
          (name) =>
            assertions.filter(
              (test) => test.status === "passed" && test.title === name,
            ).length === 1,
        ) ||
        !Object.entries(RLS_ASSERTIONS).every(
          ([field]) => summary[field] === true,
        )
      )
        throw new Error("RLS raw full invariant inventory absent");
    }
    return [];
  } catch (error) {
    return [`test raw execution invalid: ${error.message}`];
  }
}

/** @param {{environment?:Record<string,string|undefined>}} options */
export async function selectedTestInventory(root, options = {}) {
  const { stdout } = await execute(
    "pnpm",
    [
      "exec",
      "vitest",
      "list",
      "--configLoader=runner",
      "--filesOnly",
      "--project",
      "unit",
      "--project",
      "integration",
      "--json",
    ],
    {
      cwd: root,
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
      env: options.environment ?? process.env,
    },
  );
  const entries = JSON.parse(stdout);
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.some(
      (entry) =>
        !["unit", "integration"].includes(entry.projectName) ||
        !isAbsolute(entry.file),
    )
  )
    throw new Error("authoritative suite selection invalid");
  return entries.map((entry) => relative(root, entry.file)).sort();
}

/** @param {{configFile?: string, filters?: string[], environment?: Record<string,string|undefined>}} options */
export async function selectedAssertionInventory(root, options = {}) {
  // CLI list's JSON contains only a flattened label. Collect the same Vitest
  // project specifications via its public API to retain the original tree.
  const vitestNode = pathToFileURL(
    createRequire(join(root, "package.json")).resolve("vitest/node"),
  ).href;
  const { stdout } = await execute(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
      import { createVitest } from ${JSON.stringify(vitestNode)};
      const ctx = await createVitest('test', {
        configLoader: 'runner',
        root: ${JSON.stringify(root)}, project: ['unit', 'integration'],
        watch: false, reporters: [], coverage: { enabled: false },
        config: ${JSON.stringify(options.configFile)},
      });
      try {
        const result = await ctx.collectTests(await ctx.globTestSpecifications(${JSON.stringify(options.filters ?? [])}));
        if (result.unhandledErrors.length || result.testModules.some(file => !file.ok()))
          throw new Error('authoritative test collection failed');
        const entries = result.testModules.flatMap(file =>
          [...file.children.allTests()].map(test => {
            const ancestorTitles = [];
            for (let parent = test.parent; parent.type !== 'module'; parent = parent.parent)
              ancestorTitles.unshift(parent.name);
            return { file: file.moduleId, projectName: test.project.name,
              name: test.fullName, ancestorTitles, title: test.name };
          }));
        console.log(JSON.stringify(entries));
      } finally { await ctx.close(); }
    `,
    ],
    {
      cwd: root,
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
      env: options.environment ?? process.env,
    },
  );
  const entries = JSON.parse(stdout);
  if (
    !Array.isArray(entries) ||
    !entries.length ||
    entries.some(
      (entry) =>
        !["unit", "integration"].includes(entry.projectName) ||
        !isAbsolute(entry.file) ||
        typeof entry.name !== "string" ||
        !Array.isArray(entry.ancestorTitles) ||
        entry.name !== [...entry.ancestorTitles, entry.title].join(" > "),
    )
  )
    throw new Error("authoritative assertion selection invalid");
  return sortAssertions(
    entries.map((entry) => ({
      file: relative(root, entry.file),
      name: entry.name,
      ancestorTitles: entry.ancestorTitles,
      title: entry.title,
    })),
  );
}

export async function securityExecutionFailures(
  directory,
  summary,
  candidate,
  security,
  collectedAt,
) {
  try {
    if (!measurementMatches(summary, candidate, collectedAt))
      throw new Error("security local execution identity/window invalid");
    const raw = await rawJson(directory, summary.rawReport);
    if (
      raw.secretScan?.command !== "pnpm verify:secrets" ||
      raw.secretScan.exitCode !== 0 ||
      typeof raw.secretScan.stdout !== "string"
    )
      throw new Error("raw secret scan execution missing");
    const counts = (audit) => {
      const entries = audit?.advisories ?? audit?.vulnerabilities;
      if (!entries || typeof entries !== "object" || Array.isArray(entries))
        throw new Error("raw audit missing");
      const result = { low: 0, moderate: 0, high: 0, critical: 0 };
      for (const entry of Object.values(entries)) {
        if (
          !Object.hasOwn(result, entry?.severity) &&
          entry?.severity !== "info"
        )
          throw new Error("raw audit severity invalid");
        if (entry.severity !== "info") result[entry.severity] += 1;
      }
      return result;
    };
    if (
      !same(counts(raw.fullAudit), summary.residual) ||
      counts(raw.audit).high !== 0 ||
      counts(raw.audit).critical !== 0
    )
      throw new Error("raw audit decisions disagree");
    const proof = raw.remoteProof;
    const run = proof?.run;
    const jobs = proof?.jobs;
    if (
      !security ||
      !same(summary.scannerRun, {
        run_id: security.id,
        run_attempt: security.runAttempt,
        sha: security.headSha,
        repository: security.repository,
        workflow_path: security.workflowPath,
        ref: security.ref,
        workflow_ref: security.workflowRef,
      }) ||
      run?.id !== security.id ||
      run.run_attempt !== security.runAttempt ||
      run.head_sha !== summary.sha ||
      run.repository?.full_name !== CI_REPOSITORY ||
      run.path !== security.workflowPath ||
      `refs/heads/${run.head_branch}` !== security.ref ||
      run.status !== "completed" ||
      run.conclusion !== "success" ||
      run.run_started_at !== security.runStartedAt ||
      run.updated_at !== security.updatedAt ||
      !Array.isArray(jobs) ||
      jobs.length === 0 ||
      proof.totalCount !== jobs.length ||
      !Number.isFinite(Date.parse(proof.collectedAt)) ||
      Date.parse(proof.collectedAt) < Date.parse(run.updated_at) ||
      Date.parse(proof.collectedAt) > Date.now()
    )
      throw new Error("raw scanner identity/window invalid");
    if (!securityChronologyValid(run, jobs, proof.collectedAt))
      throw new Error("scanner job identity/window invalid");
    const groups = securityJobGroups(jobs);
    for (const name of ["codeql", "osv", "supplyChain"]) {
      const selected = groups[name];
      if (
        !selected.length ||
        selected.some(
          (job) => job.status !== "completed" || job.conclusion !== "success",
        )
      )
        throw new Error("raw scanner execution missing/negative");
    }
    const dependency = groups.dependencyReview;
    const optional = ["push", "schedule"].includes(run.event);
    const verdict =
      optional &&
      (!dependency.length ||
        dependency.every(
          (job) => job.status === "completed" && job.conclusion === "skipped",
        ))
        ? "not-applicable"
        : dependency.length &&
            dependency.every(
              (job) =>
                job.status === "completed" && job.conclusion === "success",
            )
          ? "PASS"
          : "FAIL";
    if (
      summary.dependency_review !== verdict ||
      !["PASS", "not-applicable"].includes(verdict)
    )
      throw new Error("raw dependency review disagrees");
    return [];
  } catch (error) {
    return [`security raw execution invalid: ${error.message}`];
  }
}

// The token and authenticated GitHub download are the trust boundary. No field
// named authenticated, digest, signature, or runner in supplied JSON substitutes
// for it. This verifies artifact origin/bytes, not a scientific execution count.
export async function authenticatedArtifactProof({
  token = process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    "",
  files,
  sha,
  runId,
  runAttempt,
  runs = [],
  fetchImpl = fetch,
}) {
  if (
    !token ||
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(runAttempt) ||
    runAttempt <= 0 ||
    !/^[a-f0-9]{40}$/u.test(sha)
  )
    throw new Error("authenticated remote artifact root unavailable");
  if (
    !Array.isArray(files) ||
    !files.length ||
    new Set(files.map((file) => file.archivePath)).size !== files.length ||
    files.some(
      (file) =>
        typeof file.path !== "string" ||
        !/^release-evidence\/[a-z0-9][a-z0-9.-]*$/u.test(file.archivePath),
    )
  )
    throw new Error("authenticated proof inventory empty/unsafe/duplicate");
  const api = `https://api.github.com/repos/${CI_REPOSITORY}`;
  const request = async (path) => {
    const response = await fetchImpl(`${api}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("authenticated artifact request failed");
    return response;
  };
  const run = await (
    await request(`/actions/runs/${runId}/attempts/${runAttempt}`)
  ).json();
  if (
    run.id !== runId ||
    run.run_attempt !== runAttempt ||
    run.head_sha !== sha ||
    run.repository?.full_name !== CI_REPOSITORY ||
    run.path !== ".github/workflows/candidate.yml" ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    ![run.created_at, run.run_started_at, run.updated_at].every((time) =>
      Number.isFinite(Date.parse(time)),
    ) ||
    Date.parse(run.created_at) > Date.parse(run.run_started_at) ||
    Date.parse(run.run_started_at) > Date.parse(run.updated_at) ||
    Date.parse(run.updated_at) > Date.now()
  )
    throw new Error("authenticated artifact producer identity invalid");
  for (const original of runs) {
    const actual =
      original.workflow === "candidate"
        ? run
        : await (
            await request(
              `/actions/runs/${original.id}/attempts/${original.runAttempt}`,
            )
          ).json();
    if (
      actual.id !== original.id ||
      actual.run_attempt !== original.runAttempt ||
      actual.head_sha !== sha ||
      actual.path !== original.workflowPath ||
      actual.repository?.full_name !== original.repository ||
      actual.status !== original.status ||
      actual.conclusion !== original.conclusion ||
      actual.created_at !== original.createdAt ||
      actual.run_started_at !== original.runStartedAt ||
      actual.updated_at !== original.updatedAt ||
      original.ref?.split("/").slice(2).join("/") !== actual.head_branch ||
      original.workflowRef !== `${CI_REPOSITORY}/${actual.path}@${original.ref}`
    )
      throw new Error(
        "supplied run differs from authenticated GitHub identity",
      );
  }
  const listing = await (
    await request(`/actions/runs/${runId}/artifacts?per_page=100`)
  ).json();
  if (listing.total_count !== listing.artifacts?.length)
    throw new Error("authenticated artifact inventory incomplete");
  const artifacts = listing.artifacts.filter(
    (artifact) =>
      artifact.name === `candidate-artifacts-${sha}` &&
      artifact.expired === false &&
      artifact.workflow_run?.id === runId &&
      artifact.workflow_run?.head_sha === sha,
  );
  if (artifacts.length !== 1)
    throw new Error("authenticated candidate artifact absent/ambiguous");
  const artifact = artifacts[0];
  const artifactApi = `${api}/actions/artifacts/${artifact.id}`;
  if (
    !Number.isSafeInteger(artifact.id) ||
    artifact.id <= 0 ||
    artifact.url !== artifactApi ||
    artifact.archive_download_url !== `${artifactApi}/zip` ||
    ![artifact.created_at, artifact.updated_at].every((time) =>
      Number.isFinite(Date.parse(time)),
    ) ||
    Date.parse(artifact.created_at) < Date.parse(run.run_started_at) ||
    Date.parse(artifact.created_at) > Date.parse(artifact.updated_at) ||
    Date.parse(artifact.updated_at) > Date.parse(run.updated_at) ||
    (artifact.workflow_run.run_attempt !== undefined &&
      artifact.workflow_run.run_attempt !== runAttempt)
  )
    throw new Error("authenticated artifact origin/attempt chronology invalid");
  const archive = Buffer.from(
    await (
      await request(`/actions/artifacts/${artifacts[0].id}/zip`)
    ).arrayBuffer(),
  );
  if (artifacts[0].digest !== `sha256:${digest(archive)}`)
    throw new Error("authenticated archive digest mismatch");
  const temp = await mkdtemp(join(tmpdir(), "cvg-authenticated-artifact-"));
  try {
    const zip = join(temp, "artifact.zip");
    await writeFile(zip, archive);
    const { stdout: inventory } = await execute("unzip", ["-Z1", zip]);
    const paths = inventory.trim().split("\n");
    if (
      new Set(paths).size !== paths.length ||
      paths.some((path) => isAbsolute(path) || path.split("/").includes(".."))
    )
      throw new Error("authenticated archive paths unsafe/duplicate");
    for (const file of files) {
      if (
        !paths.includes(file.archivePath) ||
        paths.filter((path) => path === file.archivePath).length !== 1
      )
        throw new Error("authenticated proof bytes absent");
      const { stdout } = await execute("unzip", ["-p", zip, file.archivePath], {
        encoding: "buffer",
        maxBuffer: 64 * 1024 * 1024,
      });
      if (digest(stdout) !== digest(await readFile(file.path)))
        throw new Error(
          "local proof differs from authenticated artifact bytes",
        );
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  return { trust: "AUTHENTICATED_GITHUB_ARTIFACT", runId, runAttempt, sha };
}
