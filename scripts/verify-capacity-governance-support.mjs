const REQUIRED_GAPS = 4;

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateLoadRun(run, label, errors) {
  if (!isRecord(run)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["id", "target", "command", "status"]) {
    if (!isNonEmptyString(run[field]))
      errors.push(`${label} requires ${field}`);
  }
  for (const field of [
    "requestCount",
    "concurrency",
    "successCount",
    "successRatePercent",
    "throughputRequestsPerSecond",
    "p95Milliseconds",
  ]) {
    if (typeof run[field] !== "number" || run[field] < 0)
      errors.push(`${label} ${field} must be a non-negative number`);
  }
  if (run.requestCount !== run.successCount)
    errors.push(`${label} successCount must equal requestCount`);
  if (run.successRatePercent !== 100)
    errors.push(`${label} successRatePercent must be 100`);
  if (run.status !== "PASS") errors.push(`${label} status must be PASS`);
}

export function validateCapacityMetadata(snapshot) {
  const errors = [];
  if (snapshot.version !== 1)
    errors.push("capacity governance version must be 1");
  if (snapshot.taskId !== "ENT95-04-C")
    errors.push("capacity governance taskId is invalid");
  if (snapshot.status !== "PASS_WITH_GAPS")
    errors.push("capacity governance must remain PASS_WITH_GAPS");
  if (snapshot.releaseDisposition !== "PILOT_BLOCKED")
    errors.push("capacity governance must remain PILOT_BLOCKED");
  if (snapshot.environment !== "local-ha-synthetic")
    errors.push("capacity environment must be local-ha-synthetic");
  return Object.freeze(errors);
}

export function validateCapacitySmokeEvidence(snapshot) {
  const errors = [];
  const smoke = snapshot.smokeEvidence;
  if (!isRecord(smoke)) {
    errors.push("smokeEvidence must be an object");
  } else {
    for (const field of ["id", "target", "command", "artifactId"]) {
      if (!isNonEmptyString(smoke[field]))
        errors.push(`smokeEvidence requires ${field}`);
    }
    for (const field of [
      "requestCount",
      "concurrency",
      "successCount",
      "httpStatus",
      "throughputRequestsPerSecond",
      "p95Milliseconds",
    ]) {
      if (typeof smoke[field] !== "number" || smoke[field] < 0) {
        errors.push(`smokeEvidence ${field} must be a non-negative number`);
      }
    }
    if (smoke.requestCount !== 200)
      errors.push("smokeEvidence requestCount must be 200");
    if (smoke.concurrency !== 20)
      errors.push("smokeEvidence concurrency must be 20");
    if (smoke.successCount !== smoke.requestCount) {
      errors.push("smokeEvidence successCount must equal requestCount");
    }
    if (smoke.httpStatus !== 200)
      errors.push("smokeEvidence httpStatus must be 200");
    if (smoke.status !== "PASS")
      errors.push("smokeEvidence status must be PASS");
    if (smoke.syntheticData !== true)
      errors.push("smokeEvidence must use synthetic data");
    if (smoke.teardownVerified !== true)
      errors.push("smokeEvidence teardown must be verified");
  }
  return Object.freeze(errors);
}

export function validateCapacityExplorationEvidence(snapshot) {
  const errors = [];
  const exploration = snapshot.explorationEvidence;
  if (!isRecord(exploration)) {
    errors.push("explorationEvidence must be an object");
  } else {
    if (exploration.syntheticData !== true)
      errors.push("explorationEvidence must use synthetic data");
    if (exploration.teardownVerified !== true)
      errors.push("explorationEvidence teardown must be verified");
    if (!Array.isArray(exploration.loadRuns)) {
      errors.push("explorationEvidence loadRuns must be an array");
    } else {
      if (exploration.loadRuns.length < 3)
        errors.push("explorationEvidence requires at least 3 load runs");
      exploration.loadRuns.forEach((run, index) =>
        validateLoadRun(run, `explorationEvidence loadRun[${index}]`, errors),
      );
    }
    const failover = exploration.failover;
    if (!isRecord(failover)) {
      errors.push("explorationEvidence failover must be an object");
    } else {
      validateLoadRun(failover, "explorationEvidence failover", errors);
      if (!isNonEmptyString(failover.stoppedReplica))
        errors.push("explorationEvidence failover requires stoppedReplica");
      if (failover.restoredHealthy !== true)
        errors.push(
          "explorationEvidence failover restoredHealthy must be true",
        );
    }
    const soak = exploration.soak;
    if (!isRecord(soak)) {
      errors.push("explorationEvidence soak must be an object");
    } else {
      if (soak.status !== "NOT_EXECUTED")
        errors.push("explorationEvidence soak must remain NOT_EXECUTED");
      for (const field of ["reason", "nextAction"]) {
        if (!isNonEmptyString(soak[field]))
          errors.push(`explorationEvidence soak requires ${field}`);
      }
    }
  }
  return Object.freeze(errors);
}

export function validateCapacityGaps(snapshot) {
  const errors = [];
  if (!Array.isArray(snapshot.gaps)) {
    errors.push("capacity gaps must be an array");
  } else {
    if (snapshot.gaps.length < REQUIRED_GAPS) {
      errors.push(
        `capacity gaps must declare at least ${REQUIRED_GAPS} records`,
      );
    }
    const ids = new Set();
    for (const gap of snapshot.gaps) {
      if (!isRecord(gap)) {
        errors.push("capacity gap entry must be an object");
        continue;
      }
      for (const field of [
        "id",
        "criterion",
        "owner",
        "reason",
        "nextAction",
      ]) {
        if (!isNonEmptyString(gap[field]))
          errors.push(
            `capacity gap ${gap.id ?? "<unknown>"} requires ${field}`,
          );
      }
      if (gap.status !== "GAP")
        errors.push(`capacity gap ${gap.id ?? "<unknown>"} must remain GAP`);
      if (ids.has(gap.id))
        errors.push(`capacity gaps have duplicate id ${gap.id}`);
      ids.add(gap.id);
    }
  }
  return Object.freeze(errors);
}
