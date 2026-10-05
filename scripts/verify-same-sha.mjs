import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global AbortController, clearTimeout, fetch, setTimeout */

import { evaluateSameSha, executingCandidateIdentity } from "./same-sha.mjs";

const execFileAsync = promisify(execFile);

const REPOSITORY = "ricardoakinaga-dev/cvg-trainee-vet";
const API = `https://api.github.com/repos/${REPOSITORY}`;

// AAA-CERT-002 §19: polling/fetch bounded — nunca infinito.
const FETCH_TIMEOUT_MS = 15000;
const FETCH_ATTEMPTS = 3;
const FETCH_BACKOFF_MS = [1000, 2000, 4000];
const WAIT_ATTEMPTS = 12;
const WAIT_INTERVAL_MS = 30000;

function authToken() {
  return process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || "";
}

function apiHeaders() {
  const token = authToken();
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "cvg-same-sha-verifier",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiJson(path) {
  let lastError = null;
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, FETCH_BACKOFF_MS[attempt - 1] ?? 4000),
      );
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(`${API}${path}`, {
          headers: apiHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`GitHub API ${response.status} for ${path}`);
        }
        return await response.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `GitHub API unavailable after ${FETCH_ATTEMPTS} attempts: ${lastError?.message ?? lastError}`,
  );
}

async function headSha() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"]);
  return stdout.trim();
}

async function workflowIdFor(workflowFile) {
  const workflows = await apiJson("/actions/workflows?per_page=100");
  const workflow = workflows.workflows.find((entry) =>
    entry.path.endsWith(`/${workflowFile}`),
  );
  return workflow?.id ?? null;
}

async function runArtifacts(runId) {
  try {
    const payload = await apiJson(
      `/actions/runs/${runId}/artifacts?per_page=100`,
    );
    return (payload.artifacts ?? []).map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
    }));
  } catch {
    return [];
  }
}

async function latestRunFor(workflowFile, sha, selfRunId, candidateRunId) {
  const workflowId = await workflowIdFor(workflowFile).catch(() => null);
  if (workflowId === null) return null;
  const runs =
    candidateRunId !== null && workflowFile === "candidate.yml"
      ? { workflow_runs: [await apiJson(`/actions/runs/${candidateRunId}`)] }
      : await apiJson(
          `/actions/workflows/${workflowId}/runs?head_sha=${sha}&per_page=5`,
        );
  let run = runs.workflow_runs[0];
  if (run === undefined) return null;
  if (
    selfRunId !== null &&
    run.id !== selfRunId &&
    Array.isArray(runs.workflow_runs)
  ) {
    const self = runs.workflow_runs.find((entry) => entry.id === selfRunId);
    if (self !== undefined) run = self;
  }
  if (
    run.workflow_id !== workflowId ||
    run.head_sha !== sha ||
    run.repository?.full_name !== REPOSITORY ||
    run.path !== `.github/workflows/${workflowFile}` ||
    (candidateRunId !== null &&
      workflowFile === "candidate.yml" &&
      run.id !== candidateRunId)
  )
    return null;
  return {
    id: run.id,
    runAttempt: run.run_attempt,
    workflowPath: run.path,
    workflow: workflowFile.replace(/\.ya?ml$/, ""),
    headSha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    runStartedAt: run.run_started_at,
    updatedAt: run.updated_at,
    repository: REPOSITORY,
    ref:
      typeof run.head_branch === "string" && run.head_branch.length > 0
        ? `refs/${workflowFile === "candidate.yml" && run.event === "push" ? "tags" : "heads"}/${run.head_branch}`
        : null,
    workflowRef:
      typeof run.head_branch === "string" && run.head_branch.length > 0
        ? `${REPOSITORY}/${run.path}@refs/${workflowFile === "candidate.yml" && run.event === "push" ? "tags" : "heads"}/${run.head_branch}`
        : null,
    selfRun: selfRunId !== null && run.id === selfRunId,
    artifacts: await runArtifacts(run.id),
  };
}

function flagValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function collectRuns(
  sha,
  { requireCandidate, selfRunId, candidateRunId },
) {
  const files = ["quality.yml", "security.yml"];
  if (requireCandidate) files.push("candidate.yml");
  const runs = [];
  for (const workflowFile of files) {
    const run = await latestRunFor(
      workflowFile,
      sha,
      selfRunId,
      candidateRunId,
    ).catch(() => null);
    if (run !== null) runs.push(run);
  }
  return runs;
}

export function normalizeWorkflowRun(run) {
  if (!run)
    return {
      status: "missing",
      sha: null,
      run_id: 0,
      execution_status: "missing",
      conclusion: null,
    };
  return {
    status:
      run.status === "completed" && run.conclusion === "success"
        ? "PASS"
        : String(run.conclusion ?? "pending"),
    sha: run.headSha ?? null,
    run_id: run.id ?? 0,
    run_attempt: run.runAttempt ?? 0,
    workflow_path: run.workflowPath ?? "",
    execution_status: run.status,
    conclusion: run.conclusion,
    repository: run.repository ?? null,
    workflow_ref: run.workflowRef ?? null,
    ref: run.ref ?? null,
    created_at: run.createdAt ?? null,
    run_started_at: run.runStartedAt ?? null,
    updated_at: run.updatedAt ?? null,
  };
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex === -1 ? null : process.argv[outIndex + 1];
  const summaryPath = flagValue("--summary-out");
  const requireAuth = process.argv.includes("--require-auth");
  const requireCandidate = process.argv.includes("--require-candidate");
  const wait = process.argv.includes("--wait");
  const phase = process.argv.includes("--preflight")
    ? "preflight"
    : "promotion";
  const selfRunRaw = flagValue("--self-candidate-run-id");
  const selfRunId =
    selfRunRaw === null || selfRunRaw === "" ? null : Number(selfRunRaw);
  const candidateRunRaw = flagValue("--candidate-run-id");
  const candidateRunId =
    candidateRunRaw === null ? null : Number(candidateRunRaw);
  const candidateAttemptRaw =
    flagValue("--candidate-run-attempt") ??
    process.env.CANDIDATE_RUN_ATTEMPT ??
    null;
  const candidateRunAttempt =
    candidateAttemptRaw === null ? null : Number(candidateAttemptRaw);
  for (const id of [selfRunId, candidateRunId]) {
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0))
      throw new Error("candidate run id must be a positive integer");
  }
  if (phase === "preflight" && (selfRunId === null || !requireCandidate))
    throw new Error("preflight requires the executing candidate run id");
  if (
    candidateRunId !== null &&
    (!Number.isSafeInteger(candidateRunAttempt) || candidateRunAttempt <= 0)
  )
    throw new Error(
      "candidate promotion requires the measured producer run attempt",
    );

  // §17: promoção exige consulta autenticada; anônimo só para diagnóstico local.
  const authenticated = authToken().length > 0;
  if ((requireAuth || phase === "preflight") && !authenticated) {
    console.error(
      "same-sha verifier failed: --require-auth without GH_TOKEN/GITHUB_TOKEN",
    );
    process.exitCode = 1;
    return;
  }

  const sha = await headSha();
  const executingRun =
    phase === "preflight" || (requireAuth && requireCandidate)
      ? executingCandidateIdentity(sha, process.env, phase)
      : null;
  if (
    phase === "preflight" &&
    executingRun !== null &&
    (executingRun.runId !== selfRunId ||
      (candidateRunId !== null && candidateRunId !== selfRunId))
  )
    throw new Error(
      "candidate self-run id differs from the actual executing run",
    );
  let runs = await collectRuns(sha, {
    requireCandidate,
    selfRunId,
    candidateRunId,
  });
  let evaluation = evaluateSameSha(sha, runs, {
    requireCandidate,
    selfCandidateRunId: selfRunId,
    phase,
    executingRun,
  });
  const checkAttempt = () => {
    const candidate = runs.find((run) => run.workflow === "candidate");
    if (
      candidateRunId !== null &&
      candidate?.runAttempt !== candidateRunAttempt
    )
      evaluation = {
        ok: false,
        reason: "candidate run attempt differs from the measured producer",
        runs,
      };
    if (
      phase === "promotion" &&
      requireCandidate &&
      process.env.GITHUB_ACTIONS === "true" &&
      candidate?.id === Number(process.env.GITHUB_RUN_ID)
    )
      evaluation = {
        ok: false,
        reason:
          "final promotion requires an independent completed producer run",
        runs,
      };
  };
  checkAttempt();

  // §19: espera opcional e bounded (apenas quando o workflow autoriza, ex.
  // dispatch manual acompanhando runs); por padrão falha de imediato.
  if (wait && !evaluation.ok) {
    for (
      let attempt = 0;
      attempt < WAIT_ATTEMPTS && !evaluation.ok;
      attempt += 1
    ) {
      console.log(
        `same-sha: ${evaluation.reason} — rechecking in ${WAIT_INTERVAL_MS / 1000}s (${attempt + 1}/${WAIT_ATTEMPTS})`,
      );
      await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
      runs = await collectRuns(sha, {
        requireCandidate,
        selfRunId,
        candidateRunId,
      });
      evaluation = evaluateSameSha(sha, runs, {
        requireCandidate,
        selfCandidateRunId: selfRunId,
        phase,
        executingRun,
      });
      checkAttempt();
    }
  }

  if (outPath !== null) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(
      outPath,
      `${JSON.stringify({ format: "cvg-ci-runs/v1", authenticated, collectedAt: new Date().toISOString(), headSha: sha, runs, evaluation }, null, 2)}\n`,
    );
    console.log(`same-sha evidence written to ${outPath}`);
  }
  if (summaryPath !== null) {
    const byName = new Map(runs.map((run) => [run.workflow, run]));
    // §125.27/§125.5 normalized schema: per-workflow status/sha/run_id plus
    // the all_same_sha invariant. Only conclusion "success" maps to PASS;
    // missing/pending/cancelled/failure never do.
    const normalize = (name) => normalizeWorkflowRun(byName.get(name));
    const quality = normalize("quality");
    const security = normalize("security");
    const candidate = byName.has("candidate") ? normalize("candidate") : null;
    const shas = [quality, security, candidate]
      .filter((entry) => entry !== null)
      .map((entry) => entry.sha);
    const allSameSha = shas.length > 0 && shas.every((value) => value === sha);
    const summary = {
      format: "cvg-remote-ci-summary/v2",
      sha,
      generatedAt: new Date().toISOString(),
      authenticated,
      phase,
      promotion_verified:
        phase === "promotion" &&
        requireCandidate &&
        authenticated &&
        executingRun !== null &&
        evaluation.ok,
      quality,
      security,
      candidate,
      all_same_sha: allSameSha,
      status: evaluation.ok ? "PASS" : "FAIL",
      reason: evaluation.reason ?? null,
    };
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`remote CI summary written to ${summaryPath}`);
  }
  if (!evaluation.ok) {
    console.error(`same-sha contract NOT met: ${evaluation.reason}`);
    for (const run of runs) {
      console.error(
        `- ${run.workflow}: ${run.status}/${run.conclusion ?? "?"} ${run.htmlUrl ?? ""}`,
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(`same-sha contract met at ${sha}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(`same-sha verifier failed: ${error.message}`);
    process.exitCode = 1;
  });
}
