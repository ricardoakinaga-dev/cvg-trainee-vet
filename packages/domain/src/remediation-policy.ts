export type RemediationPlanInput = Readonly<{
  readonly attemptCount: number;
  readonly objectiveIds: readonly string[];
  readonly criticalError: boolean;
}>;

export type RemediationPlan = Readonly<{
  readonly kind: "REFORCO_DIGITAL" | "PLANO_INDIVIDUAL_MENTOR";
  readonly attemptCount: number;
  readonly objectiveIds: readonly string[];
  readonly mentorRequired: boolean;
  readonly punitive: false;
}>;

export class RemediationPolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RemediationPolicyError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertUniqueObjectiveIds(objectiveIds: readonly string[]): void {
  if (objectiveIds.length === 0) {
    throw new RemediationPolicyError("objectiveIds must not be empty");
  }
  const seen = new Set<string>();
  for (const objectiveId of objectiveIds) {
    if (typeof objectiveId !== "string" || objectiveId.trim().length === 0) {
      throw new RemediationPolicyError("objectiveIds must contain text");
    }
    if (seen.has(objectiveId)) {
      throw new RemediationPolicyError("objectiveIds must be unique");
    }
    seen.add(objectiveId);
  }
}

export function createRemediationPlan(
  input: RemediationPlanInput,
): RemediationPlan {
  if (!Number.isInteger(input.attemptCount) || input.attemptCount < 1) {
    throw new RemediationPolicyError("attemptCount must be a positive integer");
  }
  if (typeof input.criticalError !== "boolean") {
    throw new RemediationPolicyError("criticalError must be boolean");
  }
  assertUniqueObjectiveIds(input.objectiveIds);

  const mentorRequired = input.attemptCount >= 2;
  return freeze({
    kind: mentorRequired ? "PLANO_INDIVIDUAL_MENTOR" : "REFORCO_DIGITAL",
    attemptCount: input.attemptCount,
    objectiveIds: freeze([...input.objectiveIds]),
    mentorRequired,
    punitive: false,
  });
}
