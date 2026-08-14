import { isValidIsoTimestamp } from "./timestamp.js";

export type AssessmentRecalculationReason =
  "ITEM_ANNULLED" | "ANSWER_KEY_CHANGED";

export type AssessmentRecalculationInput = Readonly<{
  readonly candidateId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly previousVersion: number;
  readonly previousScore: number;
  readonly previousOutcome: "APROVADO" | "REFORCO";
  readonly correctCount: number;
  readonly eligibleItemCount: number;
  readonly passingScore: number;
  readonly reason: AssessmentRecalculationReason;
  readonly recalculatedAt: string;
}>;

export type AssessmentRecalculationState = Readonly<
  AssessmentRecalculationInput & {
    readonly recalculatedVersion: number;
    readonly recalculatedScore: number;
    readonly recalculatedOutcome: "APROVADO" | "REFORCO";
    readonly notificationRequired: true;
    readonly automaticDecision: "NONE";
  }
>;

export class AssessmentRecalculationDomainError extends Error {
  public override readonly name = "AssessmentRecalculationDomainError";

  public constructor(message: string) {
    super(message);
  }
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 256 ||
    /<[^>]*>/u.test(value)
  ) {
    throw new AssessmentRecalculationDomainError(`${field} is invalid`);
  }
}

function assertScore(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new AssessmentRecalculationDomainError(`${field} is invalid`);
  }
}

export function recalculateAssessment(
  input: AssessmentRecalculationInput,
): AssessmentRecalculationState {
  for (const [value, field] of [
    [input.candidateId, "candidateId"],
    [input.participantId, "participantId"],
    [input.scopeId, "scopeId"],
    [input.attemptId, "attemptId"],
    [input.itemId, "itemId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(input.previousVersion) || input.previousVersion < 1) {
    throw new AssessmentRecalculationDomainError(
      "previousVersion must be positive",
    );
  }
  assertScore(input.previousScore, "previousScore");
  if (
    input.previousOutcome !== "APROVADO" &&
    input.previousOutcome !== "REFORCO"
  ) {
    throw new AssessmentRecalculationDomainError("previousOutcome is invalid");
  }
  if (
    !Number.isInteger(input.eligibleItemCount) ||
    input.eligibleItemCount < 1
  ) {
    throw new AssessmentRecalculationDomainError(
      "eligibleItemCount must be positive",
    );
  }
  if (
    !Number.isInteger(input.correctCount) ||
    input.correctCount < 0 ||
    input.correctCount > input.eligibleItemCount
  ) {
    throw new AssessmentRecalculationDomainError("correctCount is invalid");
  }
  assertScore(input.passingScore, "passingScore");
  if (
    input.reason !== "ITEM_ANNULLED" &&
    input.reason !== "ANSWER_KEY_CHANGED"
  ) {
    throw new AssessmentRecalculationDomainError("reason is invalid");
  }
  if (!isValidIsoTimestamp(input.recalculatedAt)) {
    throw new AssessmentRecalculationDomainError("recalculatedAt is invalid");
  }

  const recalculatedScore = Math.round(
    (input.correctCount / input.eligibleItemCount) * 100,
  );
  return Object.freeze({
    ...input,
    recalculatedVersion: input.previousVersion + 1,
    recalculatedScore,
    recalculatedOutcome:
      recalculatedScore >= input.passingScore
        ? ("APROVADO" as const)
        : ("REFORCO" as const),
    notificationRequired: true as const,
    automaticDecision: "NONE" as const,
  });
}
