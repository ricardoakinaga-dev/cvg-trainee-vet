import {
  isAttempt,
  canonicalParticipantResponse,
  type AttemptProjection,
} from "./participant-contracts";

export type ParticipantMutationReceiptExpectation =
  | Readonly<{ operation: "start"; activityId: string }>
  | Readonly<{
      operation: "submit";
      activityId: string;
      attemptId: string;
      version: number;
    }>
  | Readonly<{
      operation: "answer";
      activityId: string;
      attemptId: string;
      version: number;
      itemId: string;
      response: string;
    }>;

export class ParticipantMutationReceiptAnchors {
  public blocksReplacement(
    next: Readonly<{
      activityId: string;
      attemptId?: string | null;
      status?: string;
    }>,
    isUnresolved: (operation: string, key: string) => boolean,
  ): boolean {
    return [...this.anchors].some(([operation, anchor]) => {
      if (!isUnresolved(operation, anchor.key)) return false;
      const original = anchor.expected;
      if (next.activityId !== original.activityId) return true;
      if (next.attemptId === undefined) return false;
      if (original.operation === "start") return next.attemptId !== null;
      return (
        next.attemptId !== original.attemptId ||
        (next.status !== undefined &&
          !["CRIADA", "EM_ANDAMENTO", "SALVA"].includes(next.status))
      );
    });
  }
  public hasUnresolved(
    isUnresolved: (operation: string, key: string) => boolean,
  ): boolean {
    return [...this.anchors].some(([operation, anchor]) =>
      isUnresolved(operation, anchor.key),
    );
  }
  private readonly anchors = new Map<
    string,
    Readonly<{
      key: string;
      expected: ParticipantMutationReceiptExpectation;
    }>
  >();
  public capture(
    operation: string,
    key: string,
    expected: ParticipantMutationReceiptExpectation,
  ): ParticipantMutationReceiptExpectation {
    const existing = this.anchors.get(operation);
    if (existing?.key === key) return existing.expected;
    const captured = Object.freeze({ ...expected });
    this.anchors.set(operation, { key, expected: captured });
    return captured;
  }
  public complete(operation: string, key: string): void {
    if (this.anchors.get(operation)?.key === key)
      this.anchors.delete(operation);
  }
}

export function isParticipantMutationReceipt(
  value: unknown,
  expected: ParticipantMutationReceiptExpectation,
): value is AttemptProjection {
  if (
    !isAttempt(value) ||
    value.attemptId.trim().length === 0 ||
    value.activityId.trim().length === 0 ||
    value.activityId !== expected.activityId ||
    !Number.isSafeInteger(value.version) ||
    value.version < 0
  )
    return false;
  if (expected.operation === "start")
    return value.status === "CRIADA" || value.status === "EM_ANDAMENTO";
  // Submit carries no version on the wire. Compare against the original local
  // anchor, never a later GET: do not require an invented exact +1 receipt.
  const matchesOriginal =
    Number.isSafeInteger(expected.version) &&
    expected.version >= 0 &&
    value.attemptId === expected.attemptId &&
    value.version > expected.version;
  if (!matchesOriginal) return false;
  if (expected.operation === "answer")
    return (
      value.status === "SALVA" &&
      value.answers.some(
        (answer) =>
          answer.itemId === expected.itemId &&
          canonicalParticipantResponse(expected.response) !== null &&
          canonicalParticipantResponse(answer.response) ===
            canonicalParticipantResponse(expected.response),
      )
    );
  return [
    "SUBMETIDA",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "CORRIGIDA_HUMANAMENTE",
  ].includes(value.status);
}
