/**
 * @typedef {object} WorkflowArtifact
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {object} WorkflowRun
 * @property {string} workflow
 * @property {string} headSha
 * @property {string} status
 * @property {string | null} conclusion
 * @property {string} [htmlUrl]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 * @property {string} [runStartedAt]
 * @property {string} [repository]
 * @property {string | null} [workflowRef]
 * @property {string | null} [ref]
 * @property {readonly WorkflowArtifact[]} [artifacts]
 * @property {boolean} [selfRun]
 * @property {number} [id]
 * @property {number} [runAttempt]
 * @property {string} [workflowPath]
 */

/**
 * @typedef {object} SameShaEvaluation
 * @property {boolean} ok
 * @property {string} [reason]
 * @property {readonly WorkflowRun[]} runs
 */

const BASE_WORKFLOWS = Object.freeze(["quality", "security"]);

/** @param {string} headSha @param {Record<string, string | undefined>} [environment] @param {string} [phase] */
export function executingCandidateIdentity(
  headSha,
  environment = process.env,
  phase = "preflight",
) {
  const repository = "ricardoakinaga-dev/cvg-trainee-vet";
  const workflowPath = ".github/workflows/candidate.yml";
  const runId = Number(environment.GITHUB_RUN_ID);
  const runAttempt = Number(environment.GITHUB_RUN_ATTEMPT);
  if (
    environment.GITHUB_ACTIONS !== "true" ||
    environment.GITHUB_REPOSITORY !== repository ||
    !environment.GITHUB_WORKFLOW_REF?.startsWith(
      `${repository}/${workflowPath}@refs/`,
    ) ||
    !/^[a-f0-9]{40}$/u.test(environment.GITHUB_SHA ?? "") ||
    (phase === "preflight"
      ? environment.GITHUB_SHA !== headSha
      : phase !== "promotion" || environment.EXPECTED_SHA !== headSha) ||
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(runAttempt) ||
    runAttempt <= 0
  )
    throw new Error(
      "preflight requires the actual executing candidate run/workflow/attempt identity",
    );
  return {
    runId,
    runAttempt,
    workflowPath,
    headSha,
    workflowSha: environment.GITHUB_SHA,
  };
}

/**
 * Same-SHA promotion contract (AAA-CERT-002 §§16–18).
 *
 * - `runs` must contain one completed/success run per required workflow,
 *   all pinned to `headSha`.
 * - Final promotion requires completed/success, including the candidate.
 * - Preflight may accept the exact in_progress self-run, with no conclusion;
 *   this is preparation only and never proof of completed promotion.
 * - pending/cancelled/failed/mismatched runs fail closed, never waiting
 *   unless the caller explicitly polls with bounded retries (see
 *   `verify-same-sha.mjs --wait`).
 *
 * @param {string} headSha
 * @param {readonly WorkflowRun[]} runs
 * @param {{ requireCandidate?: boolean, selfCandidateRunId?: number | null, phase?: string, executingRun?: {runId: number, runAttempt: number, workflowPath: string, headSha: string} | null }} [options]
 * @returns {SameShaEvaluation}
 */
export function evaluateSameSha(headSha, runs, options = {}) {
  if (
    !Array.isArray(runs) ||
    runs.some((run) => !run || typeof run.workflow !== "string") ||
    new Set(runs.map((run) => run.workflow)).size !== runs.length
  ) {
    return Object.freeze({
      ok: false,
      reason: "workflow run inventory is malformed or duplicated",
      runs,
    });
  }
  if (!/^[0-9a-f]{40}$/u.test(headSha)) {
    return Object.freeze({
      ok: false,
      reason: "HEAD_SHA is not a full commit SHA",
      runs,
    });
  }
  const required = [...BASE_WORKFLOWS];
  if (options.requireCandidate === true) required.push("candidate");
  const byWorkflow = new Map(runs.map((run) => [run.workflow, run]));
  for (const workflow of required) {
    const run = byWorkflow.get(workflow);
    if (run === undefined) {
      return Object.freeze({
        ok: false,
        reason: `no ${workflow} run recorded for ${headSha}`,
        runs,
      });
    }
    if (run.headSha !== headSha) {
      return Object.freeze({
        ok: false,
        reason: `${workflow} run targets ${run.headSha}, expected ${headSha}`,
        runs,
      });
    }
    if (workflow === "candidate" && options.phase === "preflight") {
      if (
        run.id !== options.selfCandidateRunId ||
        !Number.isSafeInteger(run.id) ||
        run.id <= 0 ||
        run.selfRun !== true ||
        options.executingRun?.runId !== run.id ||
        options.executingRun?.runAttempt !== run.runAttempt ||
        !Number.isSafeInteger(run.runAttempt) ||
        run.runAttempt <= 0 ||
        options.executingRun?.workflowPath !==
          ".github/workflows/candidate.yml" ||
        run.workflowPath !== options.executingRun.workflowPath ||
        options.executingRun.headSha !== headSha
      ) {
        return Object.freeze({
          ok: false,
          reason: "candidate self-run id differs from the executing run",
          runs,
        });
      }
      if (run.status !== "in_progress" || run.conclusion !== null) {
        return Object.freeze({
          ok: false,
          reason: `candidate self-run is ${run.status}/${run.conclusion ?? "unknown"}`,
          runs,
        });
      }
      continue;
    }
    if (run.status !== "completed" || run.conclusion !== "success") {
      return Object.freeze({
        ok: false,
        reason: `${workflow} run is ${run.status}/${run.conclusion ?? "unknown"}`,
        runs,
      });
    }
  }
  return Object.freeze({
    ok: true,
    runs,
    phase: options.phase === "preflight" ? "preflight" : "promotion",
  });
}
