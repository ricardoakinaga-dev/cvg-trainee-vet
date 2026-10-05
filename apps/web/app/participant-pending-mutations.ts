import { isRecord } from "./participant-contracts";

export type PendingParticipantMutation = Readonly<{
  operation: string;
  key: string;
  body: string;
  ambiguous: boolean;
}>;

/** One immutable wire snapshot per outstanding operation, never per edited draft. */
export class ParticipantPendingMutations {
  private readonly pending = new Map<string, PendingParticipantMutation>();
  prepare(
    operation: string,
    payload: Readonly<Record<string, unknown>>,
    createKey: () => string,
  ): PendingParticipantMutation {
    const existing = this.pending.get(operation);
    if (existing !== undefined) return existing;
    if (operation.trim().length === 0)
      throw new Error("Mutation operation required");
    const key = createKey();
    if (key.trim().length === 0) throw new Error("Mutation key required");
    const snapshot = Object.freeze({
      operation,
      key,
      body: JSON.stringify({ ...payload, idempotencyKey: key }),
      ambiguous: false,
    });
    this.pending.set(operation, snapshot);
    return snapshot;
  }
  get(operation: string): PendingParticipantMutation | undefined {
    return this.pending.get(operation);
  }
  private matches(snapshot: PendingParticipantMutation): boolean {
    const current = this.pending.get(snapshot.operation);
    return (
      current !== undefined &&
      current.key === snapshot.key &&
      current.body === snapshot.body
    );
  }
  markAmbiguous(snapshot: PendingParticipantMutation): void {
    if (this.matches(snapshot))
      this.pending.set(
        snapshot.operation,
        Object.freeze({ ...snapshot, ambiguous: true }),
      );
  }
  complete(snapshot: PendingParticipantMutation): void {
    if (this.matches(snapshot)) this.pending.delete(snapshot.operation);
  }
  rejectValidation(
    snapshot: PendingParticipantMutation,
    status: number | undefined,
    payload: unknown,
  ): boolean {
    if (
      status !== 422 ||
      !isRecord(payload) ||
      payload.success !== false ||
      !isRecord(payload.error) ||
      payload.error.code !== "validation_error" ||
      typeof payload.error.message !== "string" ||
      payload.error.message.trim().length === 0 ||
      !this.matches(snapshot)
    )
      return false;
    this.complete(snapshot);
    return true;
  }
}
