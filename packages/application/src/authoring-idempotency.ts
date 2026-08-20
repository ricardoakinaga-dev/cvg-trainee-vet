import { createHash } from "node:crypto";

/**
 * Keeps command fingerprints opaque in the replay store while preserving
 * deterministic conflict detection across HTTP retries.
 */
export function hashAuthoringFingerprint(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")}`;
}
