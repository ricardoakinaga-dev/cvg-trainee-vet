import { ApplicationError } from "./errors.js";
import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";

function canonicalValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalValue(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function selectCurrentJourneyRuntimes(
  participantId: string,
  runtimes: readonly CurriculumRuntimeState[],
): readonly CurriculumRuntimeState[] {
  const latest = new Map<string, CurriculumRuntimeState>();
  for (const runtime of runtimes) {
    if (runtime.participantId !== participantId)
      throw new ApplicationError(
        "forbidden",
        "Runtime belongs to another participant",
      );
    const timestamp = Date.parse(runtime.updatedAt);
    if (
      !Number.isSafeInteger(runtime.version) ||
      runtime.version < 1 ||
      !Number.isFinite(timestamp) ||
      runtime.scopeId.trim().length === 0
    )
      throw new ApplicationError(
        "state_conflict",
        "Runtime revision metadata is invalid",
      );
    const key = JSON.stringify([runtime.scopeId, runtime.evaluation.moduleId]);
    const previous = latest.get(key);
    if (
      previous === undefined ||
      runtime.version > previous.version ||
      (runtime.version === previous.version &&
        timestamp > Date.parse(previous.updatedAt))
    ) {
      latest.set(key, runtime);
    }
  }
  for (const runtime of runtimes) {
    const previous = latest.get(
      JSON.stringify([runtime.scopeId, runtime.evaluation.moduleId]),
    );
    if (
      previous !== undefined &&
      runtime.version === previous.version &&
      Date.parse(runtime.updatedAt) === Date.parse(previous.updatedAt) &&
      canonicalValue(runtime) !== canonicalValue(previous)
    ) {
      throw new ApplicationError(
        "state_conflict",
        "Conflicting runtime evidence for the same revision",
      );
    }
  }
  return Object.freeze(
    [...latest.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, runtime]) => runtime),
  );
}
