export type AssessmentCorrectionKind = "HUMANA" | "AUTOMATICA";

export type AssessmentOutcome = "APROVADO" | "REFORCO";

export interface AssessmentResultIdentity {
  readonly resultId: string;
  readonly attemptId: string;
  readonly version: number;
}

export interface AssessmentResultInput extends AssessmentResultIdentity {
  readonly kind: AssessmentCorrectionKind;
  readonly score: number;
  readonly outcome: AssessmentOutcome;
  readonly feedback: string;
  readonly ruleVersion: string;
  readonly correctedBy: string;
  readonly correctedAt: string;
}

export type AssessmentResultState = AssessmentResultInput;

import { isValidIsoTimestamp } from "./timestamp.js";

export class AssessmentDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AssessmentDomainError";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AssessmentDomainError(`${field} must not be empty`);
  }
}

function assertPlainText(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (value.length > 10_000 || /<[^>]*>/u.test(value)) {
    throw new AssessmentDomainError(`${field} must be plain text`);
  }
}

export function createAssessmentResult(
  input: AssessmentResultInput,
): AssessmentResultState {
  assertNonEmpty(input.resultId, "resultId");
  assertNonEmpty(input.attemptId, "attemptId");
  assertNonEmpty(input.ruleVersion, "ruleVersion");
  assertNonEmpty(input.correctedBy, "correctedBy");
  assertPlainText(input.feedback, "feedback");
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new AssessmentDomainError("result version must be positive");
  }
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 100) {
    throw new AssessmentDomainError("score must be an integer from 0 to 100");
  }
  if (!(input.kind === "HUMANA" || input.kind === "AUTOMATICA")) {
    throw new AssessmentDomainError("correction kind is not supported");
  }
  if (!(input.outcome === "APROVADO" || input.outcome === "REFORCO")) {
    throw new AssessmentDomainError("assessment outcome is not supported");
  }
  if (!isValidIsoTimestamp(input.correctedAt)) {
    throw new AssessmentDomainError("correctedAt must be a valid timestamp");
  }

  return Object.freeze({ ...input });
}
