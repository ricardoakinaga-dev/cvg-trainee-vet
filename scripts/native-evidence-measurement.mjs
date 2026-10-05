import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

import { isEvidenceFresh } from "./evidence-freshness.mjs";

const execute = promisify(execFile);

async function checkoutHead(root) {
  return execute("git", ["rev-parse", "HEAD"], { cwd: root })
    .then(({ stdout }) => stdout.trim())
    .catch(() => null);
}

/** @param {string} root */
export async function startEvidenceMeasurement(root) {
  const startedAt = new Date().toISOString();
  const head = await checkoutHead(root);
  const before = await isEvidenceFresh(root, head, head);
  return Object.freeze({ root, head, startedAt, before: before.fresh });
}

/**
 * @param {Awaited<ReturnType<typeof startEvidenceMeasurement>>} measurement
 * @param {string} format
 * @param {string | Uint8Array} [raw]
 */
export async function finishEvidenceMeasurement(measurement, format, raw) {
  const head = await checkoutHead(measurement.root);
  const after = await isEvidenceFresh(measurement.root, measurement.head, head);
  const verified =
    measurement.before && after.fresh && measurement.head === head;
  const completedAt = new Date().toISOString();
  return {
    format,
    sha: verified ? measurement.head : null,
    measured_head: measurement.head,
    generatedAt: completedAt,
    measurement: {
      status: verified ? "VERIFIED" : "NOT_VERIFIED",
      startedAt: measurement.startedAt,
      completedAt,
      checkout: { before: measurement.before, after: after.fresh },
    },
    ...(raw === undefined
      ? {}
      : { raw_sha256: createHash("sha256").update(raw).digest("hex") }),
  };
}
