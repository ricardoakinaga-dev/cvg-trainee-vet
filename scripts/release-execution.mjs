const RELEASE_PULL_MODES = new Set(["required", "skip"]);

export function resolveReleasePullMode(environment = process.env) {
  const mode = environment.CVG_RELEASE_PULL ?? "required";
  if (!RELEASE_PULL_MODES.has(mode)) {
    throw new Error("CVG_RELEASE_PULL must be required or skip");
  }
  if (mode === "skip" && environment.CVG_RELEASE_LOCAL_REHEARSAL !== "true") {
    throw new Error(
      "CVG_RELEASE_PULL=skip requires CVG_RELEASE_LOCAL_REHEARSAL=true",
    );
  }
  return mode;
}

export function pullStepResult(mode) {
  if (mode === "required") return null;
  return Object.freeze({
    status: "LOCAL_REHEARSAL",
    pull: "skipped",
    reason: "immutable image is already present in the local daemon",
  });
}
