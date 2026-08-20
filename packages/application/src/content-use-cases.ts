import {
  ContentDomainError,
  transitionContent,
  type ContentEvent,
  type ContentState,
  type ContentWithdrawalReasonCode,
} from "@cvg/domain";

import {
  canAccess,
  type AccountStatus,
  type Capability,
  type Role,
} from "./authorization.js";
import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError, toApplicationError } from "./errors.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";

export type ContentRecord = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly status: ContentState["status"];
  readonly withdrawalReasonCode?: ContentWithdrawalReasonCode;
  readonly withdrawnAt?: string;
  readonly affectedParticipantCount?: number;
  readonly validUntil?: string;
  readonly nextReviewAt?: string;
  readonly publicationReady?: boolean;
  readonly publicationBlockReasons?: readonly string[];
}>;

export type AdvanceContentCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly event: ContentEvent["type"];
  readonly withdrawalReasonCode?: ContentWithdrawalReasonCode;
  readonly correlationId: string;
  readonly approvedClinicalApproverId?: string;
  readonly approvedClinicalReviewerId?: string;
}>;

export interface ContentRepositoryPort {
  readonly find: (
    contentId: string,
    version: number,
  ) => Promise<ContentRecord | null>;
  readonly save: (current: ContentRecord, next: ContentRecord) => Promise<void>;
  readonly listPublishedDueForExpiry?: (
    now: string,
    scopeIds: readonly string[],
    limit: number,
  ) => Promise<readonly ContentRecord[]>;
  readonly listAffectedParticipantIds?: (
    contentId: string,
    version: number,
    scopeId: string,
  ) => Promise<readonly string[]>;
  readonly recordWithdrawalAffected?: (
    participantIds: readonly string[],
    metadata: Readonly<{
      readonly contentId: string;
      readonly version: number;
      readonly scopeId: string;
      readonly withdrawnAt: string;
      readonly correlationId: string;
    }>,
  ) => Promise<number>;
}

export type ExpireContentCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly now: string;
  readonly limit?: number;
  readonly correlationId: string;
}>;

export type ExpireContentResult = Readonly<{
  readonly requested: number;
  readonly expiredCount: number;
  readonly skipped: number;
  readonly expired: readonly ContentRecord[];
}>;

export type ContentExpiryUseCaseDependencies = ContentUseCaseDependencies & {
  readonly expiryRepository: Pick<
    ContentRepositoryPort,
    "listPublishedDueForExpiry"
  >;
};

export type ContentWorkflowEvent = Readonly<{
  readonly eventId: string;
  readonly eventType:
    | "content.published.v1"
    | "content.withdrawn.v1"
    | "content.workflow.changed.v1";
  readonly aggregateType: "content_version";
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly schemaVersion: 1;
  readonly correlationId: string;
  readonly payload: Readonly<{
    readonly content_id: string;
    readonly version: string;
    readonly status: ContentState["status"];
    readonly reason_code?: ContentWithdrawalReasonCode;
    readonly affected_count?: number;
  }>;
}>;

export interface ContentEventPublisherPort {
  readonly publish: (event: ContentWorkflowEvent) => Promise<void>;
}

export interface ClinicalReviewPort {
  readonly hasApproved: (
    contentId: string,
    version: number,
    reviewerId: string,
  ) => Promise<boolean>;
}

export interface ContentTransactionalOperations {
  readonly content: ContentRepositoryPort;
  readonly eventPublisher: ContentEventPublisherPort;
  readonly audit: AuditPort;
  readonly clinicalReview: ClinicalReviewPort;
  readonly approver: ClinicalApproverPort;
}

export interface ContentTransactionPort {
  readonly run: <Result>(
    work: (operations: ContentTransactionalOperations) => Promise<Result>,
  ) => Promise<Result>;
}

export interface ContentUseCaseDependencies {
  readonly idFactory: () => string;
  readonly transaction: ContentTransactionPort;
}

const capabilityByEvent: Readonly<Record<ContentEvent["type"], Capability>> = {
  AUTOVERIFICAR: "AUTHOR_CONTENT",
  VERIFICAR_PROJECAO: "AUTHOR_CONTENT",
  ENVIAR_PARA_REVISAO_CLINICA: "MODERATE_CONTENT",
  REABRIR_REVISAO_CLINICA: "APPROVE_CLINICAL_CONTENT",
  SOLICITAR_AJUSTES: "MODERATE_CONTENT",
  APROVAR_CLINICAMENTE: "APPROVE_CLINICAL_CONTENT",
  AUTORIZAR_PUBLICACAO: "PUBLISH_CONTENT",
  PUBLICAR: "PUBLISH_CONTENT",
  PUBLICAR_AUTOMATICAMENTE: "PUBLISH_CONTENT",
  RETIRAR: "APPROVE_CLINICAL_CONTENT",
  VENCER: "PUBLISH_CONTENT",
};

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function eventTypeForStatus(
  status: ContentState["status"],
): ContentWorkflowEvent["eventType"] {
  if (status === "PUBLICADO") return "content.published.v1";
  if (status === "RETIRADO" || status === "VENCIDO") {
    return "content.withdrawn.v1";
  }
  return "content.workflow.changed.v1";
}

function normalizeContentError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof ContentDomainError) {
    return new ApplicationError("state_conflict", "Content state conflict");
  }
  return toApplicationError(error);
}

function isPublicationEvent(event: ContentEvent["type"]): boolean {
  return (
    event === "AUTORIZAR_PUBLICACAO" ||
    event === "PUBLICAR" ||
    event === "PUBLICAR_AUTOMATICAMENTE"
  );
}

function validateContentIdentifiers(command: AdvanceContentCommand): void {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.contentId, "contentId"],
    [command.scopeId, "scopeId"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(command.version) || command.version < 1) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
}

function validateWithdrawalMetadata(command: AdvanceContentCommand): void {
  if (
    command.event === "RETIRAR" &&
    command.withdrawalReasonCode === undefined
  ) {
    throw new ApplicationError(
      "validation_error",
      "withdrawalReasonCode is required when withdrawing content",
    );
  }
  if (
    command.event !== "RETIRAR" &&
    command.withdrawalReasonCode !== undefined
  ) {
    throw new ApplicationError(
      "validation_error",
      "withdrawalReasonCode is only valid when withdrawing content",
    );
  }
}

function validatePublicationContext(command: AdvanceContentCommand): void {
  if (
    isPublicationEvent(command.event) &&
    (command.approvedClinicalReviewerId === undefined ||
      command.approvedClinicalReviewerId.trim().length === 0)
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Clinical approval context is required before publication",
    );
  }
}

function validateContentAuthorization(command: AdvanceContentCommand): void {
  const authorized = canAccess({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    capability: capabilityByEvent[command.event],
    resource: { scopeId: command.scopeId },
    scopes: command.scopes,
    approvedClinicalApproverId: command.principalId,
  });
  if (!authorized) {
    throw new ApplicationError(
      "forbidden",
      "Content operation is outside the current authorization scope",
    );
  }
}

async function assertCurrentClinicalApprover(
  command: AdvanceContentCommand,
  operations: ContentTransactionalOperations,
): Promise<void> {
  if (command.event !== "RETIRAR") return;
  const current = await operations.approver.findById(command.principalId);
  if (
    current === null ||
    current.accountStatus !== "ACTIVE" ||
    !current.roles.includes("CLINICAL_APPROVER") ||
    !current.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "forbidden",
      "Current clinical approver is not active in the requested scope",
    );
  }
}

function validateAdvanceContentCommand(command: AdvanceContentCommand): void {
  validateContentIdentifiers(command);
  validateWithdrawalMetadata(command);
  validatePublicationContext(command);
  validateContentAuthorization(command);
}

async function loadCurrentContent(
  operations: ContentTransactionalOperations,
  command: AdvanceContentCommand,
): Promise<ContentRecord> {
  const current = await operations.content.find(
    command.contentId,
    command.version,
  );
  if (current === null) {
    throw new ApplicationError("not_found", "Content version was not found");
  }
  if (current.scopeId !== command.scopeId) {
    throw new ApplicationError(
      "forbidden",
      "Content is outside the current scope",
    );
  }
  return current;
}

async function assertPublicationReady(
  operations: ContentTransactionalOperations,
  command: AdvanceContentCommand,
  current: ContentRecord,
): Promise<void> {
  if (!isPublicationEvent(command.event)) return;
  if (current.publicationReady !== true) {
    throw new ApplicationError(
      "state_conflict",
      "Content publication gate is incomplete",
    );
  }

  const reviewerId = command.approvedClinicalReviewerId;
  if (
    reviewerId === undefined ||
    !(await operations.clinicalReview.hasApproved(
      command.contentId,
      command.version,
      reviewerId,
    ))
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Persisted clinical approval is required before publication",
    );
  }
}

async function loadAffectedParticipantIds(
  operations: ContentTransactionalOperations,
  command: AdvanceContentCommand,
): Promise<readonly string[]> {
  if (command.event !== "RETIRAR") return Object.freeze([] as string[]);
  const listAffectedParticipantIds =
    operations.content.listAffectedParticipantIds;
  if (listAffectedParticipantIds === undefined) {
    throw new ApplicationError(
      "internal_error",
      "Content withdrawal repository is not configured",
    );
  }
  return Object.freeze([
    ...new Set(
      await listAffectedParticipantIds(
        command.contentId,
        command.version,
        command.scopeId,
      ),
    ),
  ]);
}

function buildNextContent(
  current: ContentRecord,
  command: AdvanceContentCommand,
  affectedParticipantIds: readonly string[],
  withdrawnAt: string | undefined,
): ContentRecord {
  const nextState = transitionContent(
    {
      contentId: current.contentId,
      version: current.version,
      status: current.status,
      ...(current.withdrawalReasonCode === undefined
        ? {}
        : { withdrawalReasonCode: current.withdrawalReasonCode }),
      ...(current.withdrawnAt === undefined
        ? {}
        : { withdrawnAt: current.withdrawnAt }),
      ...(current.affectedParticipantCount === undefined
        ? {}
        : { affectedParticipantCount: current.affectedParticipantCount }),
    },
    {
      type: command.event,
      ...(command.withdrawalReasonCode === undefined
        ? {}
        : { withdrawalReasonCode: command.withdrawalReasonCode }),
    },
  );
  return Object.freeze({
    ...current,
    status: nextState.status,
    ...(command.withdrawalReasonCode === undefined
      ? {}
      : { withdrawalReasonCode: command.withdrawalReasonCode }),
    ...(withdrawnAt === undefined ? {} : { withdrawnAt }),
    ...(command.event === "RETIRAR"
      ? { affectedParticipantCount: affectedParticipantIds.length }
      : {}),
  });
}

async function persistWithdrawalAffected(
  operations: ContentTransactionalOperations,
  command: AdvanceContentCommand,
  affectedParticipantIds: readonly string[],
  withdrawnAt: string | undefined,
): Promise<void> {
  if (command.event !== "RETIRAR") return;
  const recordWithdrawalAffected = operations.content.recordWithdrawalAffected;
  if (recordWithdrawalAffected === undefined || withdrawnAt === undefined) {
    throw new ApplicationError(
      "internal_error",
      "Content withdrawal audit repository is not configured",
    );
  }
  const recordedCount = await recordWithdrawalAffected(affectedParticipantIds, {
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    withdrawnAt,
    correlationId: command.correlationId,
  });
  if (recordedCount !== affectedParticipantIds.length) {
    throw new ApplicationError(
      "internal_error",
      "Content withdrawal affected participant count is inconsistent",
    );
  }
}

async function publishContentTransition(
  operations: ContentTransactionalOperations,
  idFactory: ContentUseCaseDependencies["idFactory"],
  command: AdvanceContentCommand,
  next: ContentRecord,
  affectedParticipantIds: readonly string[],
): Promise<void> {
  const occurredAt = new Date().toISOString();
  await operations.eventPublisher.publish({
    eventId: idFactory(),
    eventType: eventTypeForStatus(next.status),
    aggregateType: "content_version",
    aggregateId: next.contentId,
    occurredAt,
    schemaVersion: 1,
    correlationId: command.correlationId,
    payload: {
      content_id: next.contentId,
      version: String(next.version),
      status: next.status,
      ...(command.withdrawalReasonCode === undefined
        ? {}
        : { reason_code: command.withdrawalReasonCode }),
      ...(command.event === "RETIRAR"
        ? { affected_count: affectedParticipantIds.length }
        : {}),
    },
  });
  await operations.audit.append(
    createAuditEntry({
      auditId: idFactory(),
      principalId: command.principalId,
      action: `CONTENT_${command.event}`,
      resourceType: "content_version",
      resourceId: next.contentId,
      scopeId: next.scopeId,
      outcome: "SUCCESS",
      reasonCode:
        command.event === "RETIRAR"
          ? "emergency_withdrawal"
          : "content_workflow_transition",
      requestId: command.correlationId,
      correlationId: command.correlationId,
      occurredAt,
    }),
  );
}

async function executeContentTransitionWithinTransaction(
  command: AdvanceContentCommand,
  operations: ContentTransactionalOperations,
  idFactory: ContentUseCaseDependencies["idFactory"],
): Promise<ContentRecord> {
  const current = await loadCurrentContent(operations, command);
  await assertCurrentClinicalApprover(command, operations);
  await assertPublicationReady(operations, command, current);
  const affectedParticipantIds = await loadAffectedParticipantIds(
    operations,
    command,
  );
  const withdrawnAt =
    command.event === "RETIRAR" ? new Date().toISOString() : undefined;
  const next = buildNextContent(
    current,
    command,
    affectedParticipantIds,
    withdrawnAt,
  );
  await operations.content.save(current, next);
  await persistWithdrawalAffected(
    operations,
    command,
    affectedParticipantIds,
    withdrawnAt,
  );
  await publishContentTransition(
    operations,
    idFactory,
    command,
    next,
    affectedParticipantIds,
  );
  return next;
}

export async function advanceContentWithinTransaction(
  command: AdvanceContentCommand,
  operations: ContentTransactionalOperations,
  idFactory: ContentUseCaseDependencies["idFactory"],
): Promise<ContentRecord> {
  validateAdvanceContentCommand(command);
  try {
    return await executeContentTransitionWithinTransaction(
      command,
      operations,
      idFactory,
    );
  } catch (error) {
    throw normalizeContentError(error);
  }
}

export async function advanceContent(
  command: AdvanceContentCommand,
  dependencies: ContentUseCaseDependencies,
): Promise<ContentRecord> {
  validateAdvanceContentCommand(command);
  try {
    return await dependencies.transaction.run((operations) =>
      executeContentTransitionWithinTransaction(
        command,
        operations,
        dependencies.idFactory,
      ),
    );
  } catch (error) {
    throw normalizeContentError(error);
  }
}

function parseIsoTimestamp(value: string, field: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
  return parsed.toISOString();
}

function normalizedScopeIds(scopes: readonly string[]): readonly string[] {
  return Object.freeze([
    ...new Set(
      scopes.map((scopeId) => scopeId.trim()).filter((scopeId) => scopeId),
    ),
  ]);
}

type ExpiryRequest = Readonly<{
  readonly now: string;
  readonly limit: number;
  readonly scopeIds: readonly string[];
}>;

function validateExpiryRequest(command: ExpireContentCommand): ExpiryRequest {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.correlationId, "correlationId");

  const now = parseIsoTimestamp(command.now, "now");
  const limit = command.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError(
      "validation_error",
      "limit must be an integer between 1 and 100",
    );
  }

  const scopeIds = normalizedScopeIds(command.scopes);
  const unauthorized = scopeIds.some(
    (scopeId) =>
      !canAccess({
        principalId: command.principalId,
        accountStatus: command.accountStatus,
        roles: command.roles,
        capability: "PUBLISH_CONTENT",
        resource: { scopeId },
        scopes: scopeIds,
      }),
  );
  if (scopeIds.length === 0 || unauthorized) {
    throw new ApplicationError(
      "forbidden",
      "Content expiry is outside the current authorization scope",
    );
  }
  return Object.freeze({ now, limit, scopeIds });
}

function isDueForExpiry(candidate: ContentRecord, nowMs: number): boolean {
  if (candidate.status !== "PUBLICADO" || candidate.validUntil === undefined) {
    return false;
  }
  const validUntilMs = new Date(candidate.validUntil).getTime();
  return !Number.isNaN(validUntilMs) && validUntilMs <= nowMs;
}

async function expireCandidate(
  command: ExpireContentCommand,
  dependencies: ContentExpiryUseCaseDependencies,
  scopeIds: readonly string[],
  candidate: ContentRecord,
): Promise<ContentRecord | null> {
  try {
    return await advanceContent(
      {
        principalId: command.principalId,
        accountStatus: command.accountStatus,
        roles: command.roles,
        scopes: scopeIds,
        contentId: candidate.contentId,
        version: candidate.version,
        scopeId: candidate.scopeId,
        event: "VENCER",
        correlationId: command.correlationId,
      },
      dependencies,
    );
  } catch (error) {
    const normalized = toApplicationError(error);
    if (
      normalized.code === "state_conflict" ||
      normalized.code === "not_found"
    ) {
      return null;
    }
    throw normalized;
  }
}

export async function expireDueContent(
  command: ExpireContentCommand,
  dependencies: ContentExpiryUseCaseDependencies,
): Promise<ExpireContentResult> {
  const request = validateExpiryRequest(command);

  const listDue = dependencies.expiryRepository.listPublishedDueForExpiry;
  if (listDue === undefined) {
    throw new ApplicationError(
      "internal_error",
      "Content expiry repository is not configured",
    );
  }

  const candidates = await listDue(
    request.now,
    request.scopeIds,
    request.limit,
  );
  let expired: readonly ContentRecord[] = [];
  const nowMs = new Date(request.now).getTime();

  for (const candidate of candidates) {
    if (!isDueForExpiry(candidate, nowMs)) continue;
    const next = await expireCandidate(
      command,
      dependencies,
      request.scopeIds,
      candidate,
    );
    if (next !== null) expired = [...expired, next];
  }

  return Object.freeze({
    requested: candidates.length,
    expiredCount: expired.length,
    skipped: candidates.length - expired.length,
    expired: Object.freeze([...expired]),
  });
}
