import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/* global fetch */

import { evaluateSameSha } from "./same-sha.mjs";

const execFileAsync = promisify(execFile);

const REPOSITORY = "ricardoakinaga-dev/cvg-trainee-vet";
const API = `https://api.github.com/repos/${REPOSITORY}`;

function apiHeaders() {
  const token =
    process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "cvg-same-sha-verifier",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiJson(path) {
  const response = await fetch(`${API}${path}`, { headers: apiHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}`);
  }
  return response.json();
}

async function headSha() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"]);
  return stdout.trim();
}

async function latestRunFor(workflowFile, sha) {
  const workflows = await apiJson("/actions/workflows?per_page=100");
  const workflow = workflows.workflows.find((entry) =>
    entry.path.endsWith(`/${workflowFile}`),
  );
  if (workflow === undefined) return null;
  const runs = await apiJson(
    `/actions/workflows/${workflow.id}/runs?head_sha=${sha}&per_page=5`,
  );
  const run = runs.workflow_runs[0];
  if (run === undefined) return null;
  return {
    workflow: workflowFile.replace(/\.ya?ml$/, ""),
    headSha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
  };
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex === -1 ? null : process.argv[outIndex + 1];
  const sha = await headSha();
  const runs = [];
  for (const workflowFile of ["quality.yml", "security.yml"]) {
    const run = await latestRunFor(workflowFile, sha).catch(() => null);
    if (run !== null) runs.push(run);
  }
  const evaluation = evaluateSameSha(sha, runs);
  if (outPath !== null) {
    await writeFile(
      outPath,
      `${JSON.stringify({ headSha: sha, runs, evaluation }, null, 2)}\n`,
    );
    console.log(`same-sha evidence written to ${outPath}`);
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
