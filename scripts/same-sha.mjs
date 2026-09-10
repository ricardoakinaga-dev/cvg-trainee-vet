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
 * @property {readonly WorkflowArtifact[]} [artifacts]
 * @property {boolean} [selfRun]
 */

/**
 * @typedef {object} SameShaEvaluation
 * @property {boolean} ok
 * @property {string} [reason]
 * @property {readonly WorkflowRun[]} runs
 */

const BASE_WORKFLOWS = Object.freeze(["quality", "security"]);

/**
 * Same-SHA promotion contract (AAA-CERT-002 §§16–18).
 *
 * - `runs` must contain one completed/success run per required workflow,
 *   all pinned to `headSha`.
 * - `candidate` is required only when `options.requireCandidate` is true
 *   (final promotion). A candidate run executing the current job itself is
 *   accepted via `options.selfCandidateRunId`: the run must target the same
 *   SHA and must not be failed/cancelled — reaching this gate inside the
 *   run proves every prior step passed.
 * - pending/cancelled/failed/mismatched runs fail closed, never waiting
 *   unless the caller explicitly polls with bounded retries (see
 *   `verify-same-sha.mjs --wait`).
 *
 * @param {string} headSha
 * @param {readonly WorkflowRun[]} runs
 * @param {{ requireCandidate?: boolean, selfCandidateRunId?: number | null }} [options]
 * @returns {SameShaEvaluation}
 */
export function evaluateSameSha(headSha, runs, options = {}) {
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
    if (
      workflow === "candidate" &&
      options.selfCandidateRunId !== undefined &&
      options.selfCandidateRunId !== null &&
      run.selfRun === true
    ) {
      if (run.status === "completed" && run.conclusion !== "success") {
        return Object.freeze({
          ok: false,
          reason: `candidate self-run is completed/${run.conclusion ?? "unknown"}`,
          runs,
        });
      }
      if (
        !["in_progress", "queued", "waiting", "completed"].includes(run.status)
      ) {
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
  return Object.freeze({ ok: true, runs });
}
