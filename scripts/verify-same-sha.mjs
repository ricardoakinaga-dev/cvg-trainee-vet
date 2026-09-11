import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global AbortController, clearTimeout, fetch, setTimeout */

import { evaluateSameSha } from "./same-sha.mjs";

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

async function latestRunFor(workflowFile, sha, selfRunId) {
  const workflowId = await workflowIdFor(workflowFile).catch(() => null);
  if (workflowId === null) return null;
  const runs = await apiJson(
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
  return {
    id: run.id,
    workflow: workflowFile.replace(/\.ya?ml$/, ""),
    headSha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    selfRun: selfRunId !== null && run.id === selfRunId,
    artifacts: await runArtifacts(run.id),
  };
}

function flagValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function collectRuns(sha, { requireCandidate, selfRunId }) {
  const files = ["quality.yml", "security.yml"];
  if (requireCandidate) files.push("candidate.yml");
  const runs = [];
  for (const workflowFile of files) {
    const run = await latestRunFor(workflowFile, sha, selfRunId).catch(
      () => null,
    );
    if (run !== null) runs.push(run);
  }
  return runs;
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex === -1 ? null : process.argv[outIndex + 1];
  const summaryPath = flagValue("--summary-out");
  const requireAuth = process.argv.includes("--require-auth");
  const requireCandidate = process.argv.includes("--require-candidate");
  const wait = process.argv.includes("--wait");
  const selfRunRaw = flagValue("--self-candidate-run-id");
  const selfRunId =
    selfRunRaw === null || selfRunRaw === "" ? null : Number(selfRunRaw);

  // §17: promoção exige consulta autenticada; anônimo só para diagnóstico local.
  const authenticated = authToken().length > 0;
  if (requireAuth && !authenticated) {
    console.error(
      "same-sha verifier failed: --require-auth without GH_TOKEN/GITHUB_TOKEN",
    );
    process.exitCode = 1;
    return;
  }

  const sha = await headSha();
  let runs = await collectRuns(sha, { requireCandidate, selfRunId });
  let evaluation = evaluateSameSha(sha, runs, {
    requireCandidate,
    selfCandidateRunId: selfRunId,
  });

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
      runs = await collectRuns(sha, { requireCandidate, selfRunId });
      evaluation = evaluateSameSha(sha, runs, {
        requireCandidate,
        selfCandidateRunId: selfRunId,
      });
    }
  }

  if (outPath !== null) {
    await writeFile(
      outPath,
      `${JSON.stringify({ headSha: sha, runs, evaluation }, null, 2)}\n`,
    );
    console.log(`same-sha evidence written to ${outPath}`);
  }
  if (summaryPath !== null) {
    const byName = new Map(runs.map((run) => [run.workflow, run]));
    // §125.27/§125.5 normalized schema: per-workflow status/sha/run_id plus
    // the all_same_sha invariant. Only conclusion "success" maps to PASS;
    // missing/pending/cancelled/failure never do.
    const normalize = (name) => {
      const run = byName.get(name) ?? null;
      if (run === null) {
        return { status: "missing", sha: null, run_id: 0 };
      }
      return {
        status:
          run.conclusion === "success"
            ? "PASS"
            : String(run.conclusion ?? "pending"),
        sha: run.headSha ?? null,
        run_id: run.id ?? 0,
      };
    };
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
