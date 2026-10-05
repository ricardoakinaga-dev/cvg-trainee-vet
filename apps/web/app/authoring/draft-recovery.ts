import { isRecord, isString, isUuid } from "./authoring-contracts";

const draftRecoveryStorageKey = "cvg-authoring-draft-recovery-v1";

type DraftRecovery = Readonly<{
  readonly principalId: string;
  readonly sessionBinding: string;
  readonly idempotencyKey: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly draftSessionSuffix: string;
  readonly draftObjectiveId: string;
  readonly draftTitle: string;
  readonly draftPrompt: string;
  readonly draftChoiceA: string;
  readonly draftChoiceB: string;
  readonly draftCorrectChoiceId: string;
  readonly draftFeedback: string;
  readonly draftSourceCode: string;
  readonly draftSourceLocator: string;
  readonly draftCritical: boolean;
}>;

export function readDraftRecovery(): DraftRecovery | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(draftRecoveryStorageKey) ?? "null",
    );
    if (
      !isRecord(parsed) ||
      !isUuid(parsed.principalId) ||
      !isUuid(parsed.sessionBinding)
    )
      return null;
    const stringFields = [
      "idempotencyKey",
      "scopeId",
      "moduleId",
      "draftSessionSuffix",
      "draftObjectiveId",
      "draftTitle",
      "draftPrompt",
      "draftChoiceA",
      "draftChoiceB",
      "draftCorrectChoiceId",
      "draftFeedback",
      "draftSourceCode",
      "draftSourceLocator",
    ] as const;
    if (
      !stringFields.every((field) => isString(parsed[field])) ||
      typeof parsed.draftCritical !== "boolean"
    ) {
      return null;
    }
    const stringValue = (field: (typeof stringFields)[number]): string =>
      parsed[field] as string;
    return Object.freeze({
      principalId: parsed.principalId,
      sessionBinding: parsed.sessionBinding,
      idempotencyKey: stringValue("idempotencyKey"),
      scopeId: stringValue("scopeId"),
      moduleId: stringValue("moduleId"),
      draftSessionSuffix: stringValue("draftSessionSuffix"),
      draftObjectiveId: stringValue("draftObjectiveId"),
      draftTitle: stringValue("draftTitle"),
      draftPrompt: stringValue("draftPrompt"),
      draftChoiceA: stringValue("draftChoiceA"),
      draftChoiceB: stringValue("draftChoiceB"),
      draftCorrectChoiceId: stringValue("draftCorrectChoiceId"),
      draftFeedback: stringValue("draftFeedback"),
      draftSourceCode: stringValue("draftSourceCode"),
      draftSourceLocator: stringValue("draftSourceLocator"),
      draftCritical: parsed.draftCritical,
    });
  } catch {
    return null;
  }
}

export function writeDraftRecovery(recovery: DraftRecovery): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      draftRecoveryStorageKey,
      JSON.stringify(recovery),
    );
  } catch {
    // Session storage is an optional recovery aid; the server remains the authority.
  }
}

export function clearDraftRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftRecoveryStorageKey);
  } catch {
    // Ignore storage restrictions; the in-memory retry remains available.
  }
}

export function newDraftIdempotencyKey(): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `authoring-ui-${randomId}`;
}
