import {
  PublicApiError,
  sameParticipantResponse,
  type AttemptProjection,
  type CorrectionProjection,
  type ParticipantAppealProjection,
} from "./participant-contracts";

export type ParticipantAttemptContext = Pick<
  AttemptProjection,
  "attemptId" | "activityId" | "status" | "version"
>;

export function sameParticipantAttemptContext(
  left: ParticipantAttemptContext | null,
  right: ParticipantAttemptContext,
): boolean {
  return (
    left !== null &&
    sameIdentity(left, right) &&
    left.version === right.version &&
    left.status === right.status
  );
}

function sameIdentity(
  left: ParticipantAttemptContext,
  right: ParticipantAttemptContext,
): boolean {
  return (
    left.attemptId === right.attemptId && left.activityId === right.activityId
  );
}

// Reachable statuses from the server attempt transitions; versions may skip events.
const reachable: Readonly<Record<string, readonly string[]>> = {
  CRIADA: [
    "CRIADA",
    "EM_ANDAMENTO",
    "SALVA",
    "SUBMETIDA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_HUMANAMENTE",
    "ANULADA",
  ],
  EM_ANDAMENTO: [
    "EM_ANDAMENTO",
    "SALVA",
    "SUBMETIDA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_HUMANAMENTE",
    "ANULADA",
  ],
  SALVA: [
    "SALVA",
    "EM_ANDAMENTO",
    "SUBMETIDA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_HUMANAMENTE",
    "ANULADA",
  ],
  SUBMETIDA: [
    "SUBMETIDA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_HUMANAMENTE",
    "ANULADA",
  ],
  AGUARDA_CORRECAO_HUMANA: ["AGUARDA_CORRECAO_HUMANA", "CORRIGIDA_HUMANAMENTE"],
  CORRIGIDA_AUTOMATICAMENTE: ["CORRIGIDA_AUTOMATICAMENTE"],
  CORRIGIDA_HUMANAMENTE: ["CORRIGIDA_HUMANAMENTE"],
  ANULADA: ["ANULADA"],
};
function compatibleStatus(
  previous: ParticipantAttemptContext,
  next: ParticipantAttemptContext,
): boolean {
  return next.version === previous.version
    ? next.status === previous.status
    : reachable[previous.status]?.includes(next.status) === true;
}
function fitsJourney(
  next: ParticipantAttemptContext,
  expected: ParticipantAttemptContext,
): boolean {
  return (
    sameIdentity(next, expected) &&
    next.version >= expected.version &&
    compatibleStatus(expected, next)
  );
}
function incoherentRead(): never {
  throw new PublicApiError(
    "internal_error",
    "incoherent participant attempt read",
  );
}

export class ParticipantProjectionCoherence {
  public current: AttemptProjection | null = null;
  private readFloor = 0;
  public acknowledge(next: AttemptProjection): AttemptProjection {
    const previous = this.current;
    this.readFloor =
      previous !== null && sameIdentity(previous, next)
        ? Math.max(this.readFloor, next.version)
        : next.version;
    // A valid original receipt can precede a refreshed read. It still proves the
    // dispatched operation; do not reopen a newer known terminal workflow.
    if (
      previous !== null &&
      sameIdentity(previous, next) &&
      previous.version > next.version &&
      (previous.status === next.status ||
        ["CRIADA", "EM_ANDAMENTO", "SALVA"].includes(next.status) ||
        !reachable[previous.status]?.includes(next.status))
    )
      return previous;
    this.current = next;
    return next;
  }
  public read(
    next: AttemptProjection,
    expected: ParticipantAttemptContext,
  ): AttemptProjection {
    if (!fitsJourney(next, expected)) return incoherentRead();
    const previous = this.current;
    if (previous !== null && sameIdentity(previous, next)) {
      if (next.version < this.readFloor) {
        if (fitsJourney(previous, expected)) return previous;
        return incoherentRead();
      }
      if (!compatibleStatus(previous, next)) return incoherentRead();
      if (
        next.version === previous.version &&
        (next.answers.length !== previous.answers.length ||
          next.answers.some((answer) => {
            const known = previous.answers.find(
              (item) => item.itemId === answer.itemId,
            );
            return (
              known === undefined ||
              !sameParticipantResponse(known.response, answer.response)
            );
          }))
      )
        return incoherentRead();
    }
    this.readFloor =
      previous !== null && sameIdentity(previous, next)
        ? Math.max(this.readFloor, next.version)
        : next.version;
    this.current = next;
    return next;
  }
  public clear(): void {
    this.current = null;
    this.readFloor = 0;
  }
}

export function isContextualParticipantCorrection(
  value: CorrectionProjection,
  expected: ParticipantAttemptContext,
  current: ParticipantAttemptContext | null,
): boolean {
  return (
    sameParticipantAttemptContext(current, expected) &&
    value.attemptStatus === expected.status &&
    value.attemptVersion === expected.version
  );
}

export function isContextualParticipantAppeal(
  value: ParticipantAppealProjection,
  expected: ParticipantAttemptContext,
  current: ParticipantAttemptContext | null,
  itemIds: readonly string[],
  dispatchedItemId?: string,
): boolean {
  return (
    sameParticipantAttemptContext(current, expected) &&
    value.attemptId === expected.attemptId &&
    itemIds.includes(value.itemId) &&
    (dispatchedItemId === undefined || value.itemId === dispatchedItemId)
  );
}
