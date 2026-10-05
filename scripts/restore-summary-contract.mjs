const RESTORE_SUMMARY_V2 = "cvg-restore-summary/v2";
const SHA_RE = /^[0-9a-f]{40}$/u;

export function createRestoreSummary({ result, sha, generatedAt }) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("restore verification result is invalid");
  }
  if (typeof sha !== "string" || !SHA_RE.test(sha)) {
    throw new Error("restore summary SHA is invalid");
  }
  const verificationDurationMs = result.verificationDurationMs;
  if (
    !Number.isSafeInteger(verificationDurationMs) ||
    verificationDurationMs < 0
  ) {
    throw new Error("restore verification duration is invalid");
  }

  const markerVerified = result.markerVerified === true;
  const targetIsolated = result.targetIsolated === true;
  const integrityVerified = markerVerified && targetIsolated;
  return {
    format: RESTORE_SUMMARY_V2,
    sha,
    generatedAt,
    status: result.status === "PASS" && integrityVerified ? "PASS" : "FAIL",
    markerVerified,
    targetIsolated,
    integrity_verified: integrityVerified,
    verificationDurationMs,
  };
}

export function isRestoreSummaryV2(summary) {
  return (
    summary !== null &&
    typeof summary === "object" &&
    !Array.isArray(summary) &&
    summary.format === RESTORE_SUMMARY_V2 &&
    typeof summary.sha === "string" &&
    SHA_RE.test(summary.sha) &&
    summary.markerVerified === true &&
    summary.targetIsolated === true &&
    summary.integrity_verified === true &&
    Number.isSafeInteger(summary.verificationDurationMs) &&
    summary.verificationDurationMs >= 0 &&
    !Object.hasOwn(summary, "rtoMs")
  );
}
