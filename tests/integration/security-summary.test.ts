import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  querySecurityWorkflow,
  createSecuritySummary,
} from "../../scripts/write-security-summary.mjs";

const sha = "a".repeat(40);
function response(payload: unknown, ok = true) {
  return { ok, json: async () => payload };
}
function remote(
  run = {},
  job = {},
  dependencyJobs: object[] = [],
  namedJobs: Record<string, object> = {},
) {
  const startedAt = "2026-01-01T00:00:00Z";
  const completedAt = "2026-01-01T00:01:00Z";
  const metadata = {
    run_id: 12,
    run_attempt: 2,
    head_sha: sha,
    started_at: startedAt,
    completed_at: completedAt,
  };
  return vi
    .fn()
    .mockResolvedValueOnce(
      response({
        workflow_runs: [
          {
            id: 12,
            run_attempt: 2,
            repository: { full_name: "ricardoakinaga-dev/cvg-trainee-vet" },
            head_branch: "main",
            run_started_at: startedAt,
            updated_at: completedAt,
            head_sha: sha,
            status: "completed",
            conclusion: "success",
            event: "push",
            path: ".github/workflows/security.yml",
            ...run,
          },
        ],
      }),
    )
    .mockResolvedValueOnce(
      response({
        total_count: 3 + dependencyJobs.length,
        jobs: [
          ...[
            "CodeQL javascript-typescript",
            "OSV scan",
            "Audit, secrets and SBOM",
          ].map((name, index) => ({
            ...metadata,
            id: index + 1,
            name,
            status: "completed",
            conclusion: "success",
            ...job,
            ...namedJobs[name],
          })),
          ...dependencyJobs.map((entry, index) => ({
            ...metadata,
            id: index + 4,
            ...entry,
          })),
        ],
      }),
    );
}
describe("authenticated scanner evidence", () => {
  it("R8 refuses documentation jobs containing scanner labels", async () => {
    const result = await querySecurityWorkflow(sha, {
      token: "test-token",
      fetchImpl: remote(
        {},
        { name: "CodeQL documentation upload OSV documentation upload" },
      ),
    });
    expect(result.codeql).toBe("unknown");
    expect(result.osv).toBe("unknown");
  });
  it("R8 refuses a reversed scanner job chronology", async () => {
    const result = await querySecurityWorkflow(sha, {
      token: "test-token",
      fetchImpl: remote(
        {},
        {
          started_at: "2026-01-01T00:01:00Z",
          completed_at: "2026-01-01T00:00:59Z",
        },
      ),
    });
    expect(result.codeql).toBe("unknown");
    expect(result.osv).toBe("unknown");
  });
  it.each([
    ["CodeQL javascript-typescript", "CodeQL documentation upload"],
    ["OSV scan", "OSV documentation upload"],
    ["CodeQL javascript-typescript", "CodeQL javascript-typescript (python)"],
    ["OSV scan", "OSV scan / documentation upload"],
    ["Audit, secrets and SBOM", "Audit, secrets and SBOM documentation upload"],
  ])(
    "R8 refuses replacing required job %s with %s",
    async (required, unrelated) => {
      expect(
        await querySecurityWorkflow(sha, {
          token: "test-token",
          fetchImpl: remote({}, {}, [], { [required]: { name: unrelated } }),
        }),
      ).toMatchObject({ codeql: "unknown", osv: "unknown" });
    },
  );
  it("R8 accepts the pinned reusable OSV job label", async () => {
    expect(
      await querySecurityWorkflow(sha, {
        token: "test-token",
        fetchImpl: remote({}, {}, [], {
          "OSV scan": { name: "OSV scan / osv-scan" },
        }),
      }),
    ).toMatchObject({ codeql: "PASS", osv: "PASS" });
  });
  it.each([
    [{ run_started_at: "2026-01-01T00:02:00Z" }, {}],
    [{ updated_at: "2100-01-01T00:00:00Z" }, {}],
    [{}, { started_at: "2025-12-31T23:59:59Z" }],
    [{}, { completed_at: "2026-01-01T00:01:01Z" }],
    [{}, { started_at: "not-a-time" }],
    [{}, { id: 1 }],
  ])(
    "R8 refuses malformed run/job windows and duplicate job IDs",
    async (run, job) => {
      expect(
        await querySecurityWorkflow(sha, {
          token: "test-token",
          fetchImpl: remote(run, job),
        }),
      ).toMatchObject({ codeql: "unknown", osv: "unknown" });
    },
  );
  it("R8 pins required job names to the current security workflow without implicit matrix variants", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/security.yml", import.meta.url),
      "utf8",
    );
    expect(
      [...workflow.matchAll(/^ {4}name: (.+)$/gm)]
        .map((match) => match[1])
        .sort(),
    ).toEqual([
      "Audit, secrets and SBOM",
      "CodeQL javascript-typescript",
      "Dependency review",
      "OSV scan",
    ]);
    expect(workflow).not.toMatch(/^\s+matrix:/m);
    expect(workflow).toContain(
      "google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@6e4298ebc4db23e847df9b2e2de2939d6f066c67",
    );
  });
  it("fails closed when local audit parsing fails or required dependency review is unknown", () => {
    const input = {
      sha,
      audit: { advisories: {} },
      fullAudit: { advisories: {} },
      secretsClean: true,
      remote: {
        codeql: "PASS",
        osv: "PASS",
        dependencyReview: "not-applicable",
      },
    };
    expect(createSecuritySummary(input).status).toBe("PASS");
    expect(createSecuritySummary({ ...input, audit: null }).status).toBe(
      "FAIL",
    );
    expect(createSecuritySummary({ ...input, audit: {} }).status).toBe("FAIL");
    expect(createSecuritySummary({ ...input, fullAudit: null }).status).toBe(
      "FAIL",
    );
    expect(
      createSecuritySummary({
        ...input,
        remote: { ...input.remote, dependencyReview: "unknown" },
      }).status,
    ).toBe("FAIL");
    expect(
      createSecuritySummary({
        ...input,
        audit: { advisories: { bad: { severity: "high" } } },
      }).status,
    ).toBe("FAIL");
  });
  it("does not query or pass without a token", async () => {
    const fetchImpl = remote();
    expect(
      await querySecurityWorkflow(sha, { token: "", fetchImpl }),
    ).toMatchObject({ codeql: "unknown", osv: "unknown" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("queries authenticated completed scanners for the measured SHA", async () => {
    const fetchImpl = remote();
    expect(
      await querySecurityWorkflow(sha, { token: "test-token", fetchImpl }),
    ).toMatchObject({
      codeql: "PASS",
      osv: "PASS",
      dependencyReview: "not-applicable",
    });
    const call = fetchImpl.mock.calls[0];
    if (call === undefined) throw new Error("authenticated request absent");
    expect(call[0]).toContain(`head_sha=${sha}`);
    expect(call[1].headers.Authorization).toBe("Bearer test-token");
  });
  it.each([
    [{ status: "in_progress", conclusion: null }, {}, "unknown"],
    [{ head_sha: "b".repeat(40) }, {}, "unknown"],
    [{}, { status: "in_progress", conclusion: "success" }, "unknown"],
    [{}, { conclusion: "failure" }, "FAIL"],
    [{ conclusion: "failure" }, {}, "FAIL"],
    [{ event: "pull_request" }, {}, "PASS"],
  ])(
    "refuses pending, mismatched, or negative evidence",
    async (run, job, expected) => {
      const result = await querySecurityWorkflow(sha, {
        token: "test-token",
        fetchImpl: remote(run, job),
      });
      expect(result.codeql).toBe(expected);
      if ("event" in run && run.event === "pull_request")
        expect(result.dependencyReview).toBe("unknown");
    },
  );
  it("injects scanner auth and separates preflight from completed-run promotion in workflow", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/candidate.yml", import.meta.url),
      "utf8",
    );
    expect(workflow).toMatch(
      /name: Record test and security summaries\s+env:\s+GITHUB_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}/,
    );
    expect(workflow).toContain("--preflight");
    expect(workflow).toContain("options: [preflight, promotion]");
    expect(workflow).not.toContain("workflow_run:");
    expect(workflow).toContain("--candidate-run-id");
  });
  it.each(["push", "schedule"])(
    "accepts a completed/skipped Dependency review only for legitimate %s security workflow",
    async (event) => {
      const fetchImpl = remote({ event }, {}, [
        {
          name: "Dependency review",
          status: "completed",
          conclusion: "skipped",
        },
      ]);
      const result = await querySecurityWorkflow(sha, {
        token: "test-token",
        fetchImpl,
      });
      expect(result).toMatchObject({
        codeql: "PASS",
        osv: "PASS",
        dependencyReview: "not-applicable",
      });
      expect(
        createSecuritySummary({
          sha,
          audit: { advisories: {} },
          fullAudit: { advisories: {} },
          secretsClean: true,
          remote: result,
        }).status,
      ).toBe("PASS");
      const call = fetchImpl.mock.calls[0];
      if (call === undefined) throw new Error("authenticated request absent");
      expect(call[0]).toContain(
        "/actions/workflows/security.yml/runs?head_sha=" + sha,
      );
      expect(call[1].headers.Authorization).toBe("Bearer test-token");
    },
  );
  it.each([
    [
      { event: "pull_request" },
      {},
      { status: "completed", conclusion: "skipped" },
    ],
    [
      { event: "workflow_dispatch" },
      {},
      { status: "completed", conclusion: "skipped" },
    ],
    [
      { event: "pull_request_target" },
      {},
      { status: "completed", conclusion: "skipped" },
    ],
    [{ event: undefined }, {}, { status: "completed", conclusion: "skipped" }],
    [
      { event: "push", path: ".github/workflows/quality.yml" },
      {},
      { status: "completed", conclusion: "skipped" },
    ],
    [
      { event: "push" },
      { conclusion: "skipped" },
      { status: "completed", conclusion: "skipped" },
    ],
    [{ event: "push" }, {}, { status: "in_progress", conclusion: null }],
    [{ event: "push" }, {}, { status: "completed", conclusion: "failure" }],
  ])(
    "never treats required, generic, pending, or negative skipped evidence as a PASS",
    async (run, job, dependency) => {
      const result = await querySecurityWorkflow(sha, {
        token: "test-token",
        fetchImpl: remote(run, job, [
          { name: "Dependency review", ...dependency },
        ]),
      });
      expect(
        createSecuritySummary({
          sha,
          audit: { advisories: {} },
          fullAudit: { advisories: {} },
          secretsClean: true,
          remote: result,
        }).status,
      ).toBe("FAIL");
    },
  );
  it("accepts successful required PR review and rejects required PR absence", async () => {
    const reviewed = await querySecurityWorkflow(sha, {
      token: "test-token",
      fetchImpl: remote({ event: "pull_request" }, {}, [
        {
          name: "Dependency review",
          status: "completed",
          conclusion: "success",
        },
      ]),
    });
    expect(reviewed).toMatchObject({
      codeql: "PASS",
      osv: "PASS",
      dependencyReview: "PASS",
    });
    expect(
      (
        await querySecurityWorkflow(sha, {
          token: "test-token",
          fetchImpl: remote({ event: "pull_request" }),
        })
      ).dependencyReview,
    ).toBe("unknown");
  });
});
