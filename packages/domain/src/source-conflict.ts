import { isValidIsoTimestamp } from "./timestamp.js";

export const sourceConflictDecisions = [
  "ACCEPT_SOURCE_A",
  "ACCEPT_SOURCE_B",
  "ESCALATE_CLINICAL_REVIEW",
  "DEFER_PUBLICATION",
] as const;

export type SourceConflictDecision = (typeof sourceConflictDecisions)[number];

export type SourceConflictDecisionInput = Readonly<{
  readonly conflictId: string;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly scopeId: string;
  readonly sourceCodes: readonly string[];
  readonly description: string;
  readonly decision: SourceConflictDecision;
  readonly rationale: string;
  readonly decidedBy: string;
  readonly decidedAt: string;
}>;

export type SourceConflictDecisionState = Readonly<
  SourceConflictDecisionInput & {
    readonly humanReviewRequired: boolean;
  }
>;

export class SourceConflictDomainError extends Error {
  public override readonly name = "SourceConflictDomainError";

  public constructor(message: string) {
    super(message);
  }
}

function assertNonEmpty(
  value: unknown,
  field: string,
  maxLength = 256,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength ||
    /<[^>]*>/u.test(value)
  ) {
    throw new SourceConflictDomainError(`${field} is invalid`);
  }
}

export function buildSourceConflictDecision(
  input: SourceConflictDecisionInput,
): SourceConflictDecisionState {
  assertNonEmpty(input.conflictId, "conflictId");
  assertNonEmpty(input.contentId, "contentId");
  assertNonEmpty(input.scopeId, "scopeId");
  assertNonEmpty(input.description, "description", 4_000);
  assertNonEmpty(input.rationale, "rationale", 4_000);
  assertNonEmpty(input.decidedBy, "decidedBy");
  if (!Number.isInteger(input.contentVersion) || input.contentVersion < 1) {
    throw new SourceConflictDomainError("contentVersion is invalid");
  }
  if (!isValidIsoTimestamp(input.decidedAt)) {
    throw new SourceConflictDomainError("decidedAt is invalid");
  }
  if (
    !Array.isArray(input.sourceCodes) ||
    input.sourceCodes.length < 2 ||
    input.sourceCodes.length > 32
  ) {
    throw new SourceConflictDomainError(
      "sourceCodes requires at least two sources",
    );
  }
  const sourceCodes = input.sourceCodes.map((sourceCode) => {
    assertNonEmpty(sourceCode, "sourceCode");
    return sourceCode;
  });
  if (new Set(sourceCodes).size !== sourceCodes.length) {
    throw new SourceConflictDomainError("sourceCodes must be unique");
  }
  if (!sourceConflictDecisions.includes(input.decision)) {
    throw new SourceConflictDomainError("decision is invalid");
  }

  return Object.freeze({
    conflictId: input.conflictId,
    contentId: input.contentId,
    contentVersion: input.contentVersion,
    scopeId: input.scopeId,
    sourceCodes: Object.freeze(sourceCodes),
    description: input.description,
    decision: input.decision,
    rationale: input.rationale,
    decidedBy: input.decidedBy,
    decidedAt: input.decidedAt,
    humanReviewRequired:
      input.decision === "ESCALATE_CLINICAL_REVIEW" ||
      input.decision === "DEFER_PUBLICATION",
  });
}
