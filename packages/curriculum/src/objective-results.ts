import type {
  ModuleAnswer,
  ModuleEvaluationCatalog,
  ObjectiveRuntimeResult,
} from "./module-evaluation-contracts.js";

export function sameChoiceSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

export function buildObjectiveResults(
  items: ModuleEvaluationCatalog["items"],
  answers: ReadonlyMap<string, ModuleAnswer>,
): readonly ObjectiveRuntimeResult[] {
  const results = new Map<string, ObjectiveRuntimeResult>();
  for (const item of items) {
    const previous = results.get(item.objectiveId);
    const isChoice = item.responseMode === "CHOICE";
    const selected = answers.get(item.id)?.selectedChoiceIds;
    const earned =
      isChoice &&
      selected !== undefined &&
      sameChoiceSet(selected, item.correctChoiceIds ?? [])
        ? 1
        : 0;
    const possiblePoints = (previous?.possiblePoints ?? 0) + (isChoice ? 1 : 0);
    const earnedPoints = (previous?.earnedPoints ?? 0) + earned;
    const critical = (previous?.critical ?? false) || item.critical;
    results.set(
      item.objectiveId,
      Object.freeze({
        objectiveId: item.objectiveId,
        earnedPoints,
        possiblePoints,
        percent:
          possiblePoints === 0
            ? 0
            : Math.round((earnedPoints / possiblePoints) * 100),
        critical,
        requiredPercent: critical ? 80 : 70,
      }),
    );
  }
  return Object.freeze(
    [...results.values()].sort((left, right) =>
      left.objectiveId.localeCompare(right.objectiveId),
    ),
  );
}
