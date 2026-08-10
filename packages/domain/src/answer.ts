export type AnswerIdentity = Readonly<{
  readonly answerId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly savedAt: string;
}>;

export type AnswerState = AnswerIdentity &
  Readonly<{
    readonly response: string;
  }>;

import { isValidIsoTimestamp } from "./timestamp.js";

export class AnswerDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnswerDomainError";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AnswerDomainError(`${field} must not be empty`);
  }
}

function assertTimestamp(value: string): void {
  if (!isValidIsoTimestamp(value)) {
    throw new AnswerDomainError("savedAt must be a valid timestamp");
  }
}

function assertPlainText(value: string | undefined): string {
  if (typeof value !== "string") {
    throw new AnswerDomainError("response must be a string");
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new AnswerDomainError("response must not be empty");
  }
  if (normalized.length > 10_000) {
    throw new AnswerDomainError("response exceeds the maximum size");
  }
  if (/<[^>]*>/u.test(normalized)) {
    throw new AnswerDomainError("response must be plain text");
  }
  return normalized;
}

export function createAnswer(
  input: AnswerIdentity & Readonly<{ readonly response?: string }>,
): AnswerState {
  assertNonEmpty(input.answerId, "answerId");
  assertNonEmpty(input.attemptId, "attemptId");
  assertNonEmpty(input.itemId, "itemId");
  assertTimestamp(input.savedAt);

  return Object.freeze({
    answerId: input.answerId,
    attemptId: input.attemptId,
    itemId: input.itemId,
    response: assertPlainText(input.response),
    savedAt: input.savedAt,
  });
}
