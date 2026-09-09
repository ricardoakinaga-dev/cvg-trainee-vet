/**
 * @typedef {object} WorkflowRun
 * @property {string} workflow
 * @property {string} headSha
 * @property {string} status
 * @property {string | null} conclusion
 * @property {string} [htmlUrl]
 */

/**
 * @typedef {object} SameShaEvaluation
 * @property {boolean} ok
 * @property {string} [reason]
 * @property {readonly WorkflowRun[]} runs
 */

const REQUIRED_WORKFLOWS = Object.freeze(["quality", "security"]);

/**
 * @param {string} headSha
 * @param {readonly WorkflowRun[]} runs
 * @returns {SameShaEvaluation}
 */
export function evaluateSameSha(headSha, runs) {
  if (!/^[0-9a-f]{40}$/u.test(headSha)) {
    return Object.freeze({
      ok: false,
      reason: "HEAD_SHA is not a full commit SHA",
      runs,
    });
  }
  const byWorkflow = new Map(runs.map((run) => [run.workflow, run]));
  for (const workflow of REQUIRED_WORKFLOWS) {
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
