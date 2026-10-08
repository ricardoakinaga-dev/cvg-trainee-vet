import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { evaluateSameSha } from "../../scripts/same-sha.mjs";
import { normalizeWorkflowRun } from "../../scripts/verify-same-sha.mjs";

const HEAD = "a".repeat(40);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

function run(
  workflow: string,
  overrides: Partial<{
    headSha: string;
    status: string;
    conclusion: string | null;
    id: number;
    selfRun: boolean;
    runAttempt: number;
    workflowPath: string;
  }> = {},
) {
  return {
    workflow,
    headSha: HEAD,
    status: "completed",
    conclusion: "success",
    ...overrides,
  };
}

describe("same-sha contract", () => {
  it("R7 rejects duplicate workflow identities rather than selecting the last supplied run", () => {
    expect(
      evaluateSameSha(HEAD, [
        run("quality", { status: "in_progress", conclusion: null }),
        run("quality"),
        run("security"),
      ]).ok,
    ).toBe(false);
  });
  it("R5 normalization retains original authenticated run chronology and ref", () => {
    const original = {
      ...run("candidate"),
      repository: "ricardoakinaga-dev/cvg-trainee-vet",
      workflowRef:
        "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/tags/candidate-test",
      ref: "refs/tags/candidate-test",
      createdAt: "2026-10-03T10:00:00Z",
      runStartedAt: "2026-10-03T10:01:00Z",
      updatedAt: "2026-10-03T10:02:00Z",
    };
    expect(normalizeWorkflowRun(original)).toMatchObject({
      repository: original.repository,
      workflow_ref: original.workflowRef,
      ref: original.ref,
      created_at: original.createdAt,
      run_started_at: original.runStartedAt,
      updated_at: original.updatedAt,
    });
  });
  it.each([
    "valid",
    "other run",
    "other attempt",
    "other workflow",
    "no Actions context",
    "no auth",
  ])(
    "R4 real CLI binds preflight to the executing GitHub identity: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-run-"));
      const exec = promisify(execFile);
      try {
        for (const args of [
          ["init", "--quiet"],
          ["config", "user.name", "Synthetic"],
          ["config", "user.email", "synthetic@example.invalid"],
          ["commit", "--quiet", "--allow-empty", "-m", "synthetic"],
        ])
          await exec("git", args, { cwd: dir });
        const sha = (
          await exec("git", ["rev-parse", "HEAD"], { cwd: dir })
        ).stdout.trim();
        const transport = join(dir, "transport.mjs");
        await writeFile(
          transport,
          `import assert from 'node:assert/strict'; const sha=${JSON.stringify(sha)}; globalThis.fetch=async(url, options)=>{ assert.equal(options.headers.Authorization, 'Bearer test-token'); const path=new URL(url).pathname; let value; if(path.endsWith('/workflows')) value={workflows:['quality','security','candidate'].map((name,i)=>({id:i+1,path:'.github/workflows/'+name+'.yml'}))}; else if(path.endsWith('/artifacts')) value={artifacts:[]}; else { const workflowId=path.includes('/workflows/1/')?1:path.includes('/workflows/2/')?2:3; const name=['quality','security','candidate'][workflowId-1]; const run={id:workflowId+10,workflow_id:workflowId,path:'.github/workflows/'+name+'.yml',run_attempt:2,head_sha:sha,repository:{full_name:'ricardoakinaga-dev/cvg-trainee-vet'},status:workflowId===3?'in_progress':'completed',conclusion:workflowId===3?null:'success'}; value=path.match(/\\/runs\\/13$/)?run:{workflow_runs:[run]}; } return {ok:true,json:async()=>value}; };`,
        );
        const summary = join(dir, "summary.json");
        const result = await exec(
          process.execPath,
          [
            "--import",
            transport,
            join(repositoryRoot, "scripts/verify-same-sha.mjs"),
            "--require-auth",
            "--require-candidate",
            "--preflight",
            "--self-candidate-run-id",
            "13",
            "--summary-out",
            summary,
          ],
          {
            cwd: dir,
            env: {
              ...process.env,
              GH_TOKEN: "",
              GITHUB_TOKEN: scenario === "no auth" ? "" : "test-token",
              GITHUB_ACTIONS: scenario === "no Actions context" ? "" : "true",
              GITHUB_REPOSITORY: "ricardoakinaga-dev/cvg-trainee-vet",
              GITHUB_RUN_ID: scenario === "other run" ? "99" : "13",
              GITHUB_RUN_ATTEMPT: scenario === "other attempt" ? "3" : "2",
              GITHUB_WORKFLOW_REF: `ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/${scenario === "other workflow" ? "quality" : "candidate"}.yml@refs/heads/main`,
              GITHUB_SHA: sha,
            },
          },
        )
          .then((result) => ({ ...result, code: 0 }))
          .catch((error: unknown) => {
            if (
              error === null ||
              typeof error !== "object" ||
              !("code" in error) ||
              typeof error.code !== "number"
            )
              throw error;
            return { code: error.code };
          });
        expect(result.code).toBe(scenario === "valid" ? 0 : 1);
        if (scenario === "valid") {
          const evidence = JSON.parse(await readFile(summary, "utf8"));
          expect(evidence).toMatchObject({
            phase: "preflight",
            authenticated: true,
            promotion_verified: false,
            candidate: {
              run_id: 13,
              execution_status: "in_progress",
              conclusion: null,
            },
          });
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it.each(["independent producer", "completed self", "wrong producer attempt"])(
    "R4 public promotion CLI requires completed independent candidate: %s",
    async (scenario) => {
      const dir = await mkdtemp(join(tmpdir(), "cvg-r4-promotion-"));
      const exec = promisify(execFile);
      try {
        for (const args of [
          ["init", "--quiet"],
          ["config", "user.name", "Synthetic"],
          ["config", "user.email", "synthetic@example.invalid"],
          ["commit", "--quiet", "--allow-empty", "-m", "synthetic"],
        ])
          await exec("git", args, { cwd: dir });
        const sha = (
          await exec("git", ["rev-parse", "HEAD"], { cwd: dir })
        ).stdout.trim();
        const transport = join(dir, "transport.mjs");
        await writeFile(
          transport,
          `import assert from 'node:assert/strict'; const sha=${JSON.stringify(sha)}; globalThis.fetch=async(url, options)=>{ assert.equal(options.headers.Authorization,'Bearer test-token'); const path=new URL(url).pathname; let value; if(path.endsWith('/workflows')) value={workflows:['quality','security','candidate'].map((name,i)=>({id:i+1,path:'.github/workflows/'+name+'.yml'}))}; else if(path.endsWith('/artifacts')) value={artifacts:[]}; else {const workflowId=path.includes('/workflows/1/')?1:path.includes('/workflows/2/')?2:3; const name=['quality','security','candidate'][workflowId-1]; const run={id:workflowId+10,workflow_id:workflowId,path:'.github/workflows/'+name+'.yml',run_attempt:2,head_sha:sha,repository:{full_name:'ricardoakinaga-dev/cvg-trainee-vet'},status:'completed',conclusion:'success'}; value=path.endsWith('/runs/13')?run:{workflow_runs:[run]};} return {ok:true,json:async()=>value};};`,
        );
        const summary = join(dir, "summary.json");
        const result = await exec(
          process.execPath,
          [
            "--import",
            transport,
            join(repositoryRoot, "scripts/verify-same-sha.mjs"),
            "--require-auth",
            "--require-candidate",
            "--candidate-run-id",
            "13",
            "--candidate-run-attempt",
            scenario === "wrong producer attempt" ? "3" : "2",
            "--summary-out",
            summary,
          ],
          {
            cwd: dir,
            env: {
              ...process.env,
              GH_TOKEN: "",
              GITHUB_TOKEN: "test-token",
              GITHUB_ACTIONS: "true",
              GITHUB_RUN_ID: scenario === "completed self" ? "13" : "99",
              GITHUB_RUN_ATTEMPT: "1",
              GITHUB_REPOSITORY: "ricardoakinaga-dev/cvg-trainee-vet",
              GITHUB_WORKFLOW_REF:
                "ricardoakinaga-dev/cvg-trainee-vet/.github/workflows/candidate.yml@refs/heads/main",
              GITHUB_SHA: "b".repeat(40),
              EXPECTED_SHA: sha,
            },
          },
        )
          .then((result) => ({ ...result, code: 0 }))
          .catch((error: unknown) => {
            if (
              error === null ||
              typeof error !== "object" ||
              !("code" in error) ||
              typeof error.code !== "number"
            )
              throw error;
            return { code: error.code };
          });
        expect(result.code).toBe(scenario === "independent producer" ? 0 : 1);
        const evidence = JSON.parse(await readFile(summary, "utf8"));
        expect(evidence.promotion_verified).toBe(
          scenario === "independent producer",
        );
        expect(evidence.candidate).toMatchObject({
          execution_status: "completed",
          conclusion: "success",
          run_id: 13,
          run_attempt: 2,
        });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("preserves pending execution and completed conclusions in serialized evidence", () => {
    expect(
      normalizeWorkflowRun(
        run("candidate", { id: 123, status: "in_progress", conclusion: null }),
      ),
    ).toMatchObject({
      status: "pending",
      execution_status: "in_progress",
      conclusion: null,
      run_id: 123,
    });
    expect(normalizeWorkflowRun(run("candidate", { id: 123 }))).toMatchObject({
      status: "PASS",
      execution_status: "completed",
      conclusion: "success",
    });
    expect(
      normalizeWorkflowRun(
        run("candidate", { status: "in_progress", conclusion: "success" }),
      ).status,
    ).not.toBe("PASS");
  });
  it("accepts green quality+security runs on the exact HEAD", () => {
    const evaluation = evaluateSameSha(HEAD, [run("quality"), run("security")]);
    expect(evaluation).toMatchObject({ ok: true });
  });

  it("rejects missing, mismatched, or non-green runs fail-closed", () => {
    expect(evaluateSameSha(HEAD, [run("quality")]).ok).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { headSha: "b".repeat(40) }),
      ]).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { status: "in_progress", conclusion: null }),
      ]).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { conclusion: "failure" }),
      ]).ok,
    ).toBe(false);
    expect(evaluateSameSha("short", []).ok).toBe(false);
  });

  it("requires the candidate run for promotion but not for fast gates", () => {
    expect(
      evaluateSameSha(HEAD, [run("quality"), run("security")], {
        requireCandidate: true,
      }).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(
        HEAD,
        [run("quality"), run("security"), run("candidate")],
        { requireCandidate: true },
      ).ok,
    ).toBe(true);
  });

  it.each(["in_progress", "queued", "waiting", "completed"])(
    "rejects external security %s without a success conclusion",
    (status) => {
      expect(
        evaluateSameSha(
          HEAD,
          [
            run("quality"),
            run("security", { status, conclusion: null }),
            run("candidate"),
          ],
          {
            requireCandidate: true,
            phase: "preflight",
            selfCandidateRunId: 123,
          },
        ).ok,
      ).toBe(false);
    },
  );

  it("allows the exact executing self-run only in preflight, never final promotion", () => {
    const self = () =>
      run("candidate", {
        status: "in_progress",
        conclusion: null,
        selfRun: true,
        id: 123,
        runAttempt: 2,
        workflowPath: ".github/workflows/candidate.yml",
      });
    expect(
      evaluateSameSha(HEAD, [run("quality"), run("security"), self()], {
        requireCandidate: true,
        selfCandidateRunId: 123,
        phase: "preflight",
        executingRun: {
          runId: 123,
          runAttempt: 2,
          workflowPath: ".github/workflows/candidate.yml",
          headSha: HEAD,
        },
      }).ok,
    ).toBe(true);
    expect(
      evaluateSameSha(HEAD, [run("quality"), run("security"), self()], {
        requireCandidate: true,
        selfCandidateRunId: 123,
      }).ok,
    ).toBe(false);
    for (const overrides of [
      { id: 124 },
      { status: "queued" },
      { conclusion: "success" },
    ]) {
      expect(
        evaluateSameSha(
          HEAD,
          [run("quality"), run("security"), { ...self(), ...overrides }],
          {
            requireCandidate: true,
            selfCandidateRunId: 123,
            phase: "preflight",
          },
        ).ok,
      ).toBe(false);
    }
    expect(
      evaluateSameSha(
        HEAD,
        [
          run("quality"),
          run("security"),
          { ...self(), status: "completed", conclusion: "failure" },
        ],
        { requireCandidate: true, selfCandidateRunId: 123 },
      ).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(
        HEAD,
        [
          run("quality"),
          run("security"),
          { ...self(), headSha: "b".repeat(40) },
        ],
        { requireCandidate: true, selfCandidateRunId: 123 },
      ).ok,
    ).toBe(false);
  });
});
