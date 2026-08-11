import {
  ContentDomainError,
  transitionContent,
  type ContentEvent,
  type ContentState,
} from "@cvg/domain";

import {
  canAccess,
  type AccountStatus,
  type Capability,
  type Role,
} from "./authorization.js";
import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError, toApplicationError } from "./errors.js";

export type ContentRecord = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly status: ContentState["status"];
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
  readonly correlationId: string;
  readonly approvedClinicalApproverId?: string;
}>;

export interface ContentRepositoryPort {
  readonly find: (
    contentId: string,
    version: number,
  ) => Promise<ContentRecord | null>;
  readonly save: (current: ContentRecord, next: ContentRecord) => Promise<void>;
}

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
  }>;
}>;

export interface ContentEventPublisherPort {
  readonly publish: (event: ContentWorkflowEvent) => Promise<void>;
}

export interface ContentTransactionalOperations {
  readonly content: ContentRepositoryPort;
  readonly eventPublisher: ContentEventPublisherPort;
  readonly audit: AuditPort;
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
  SOLICITAR_AJUSTES: "MODERATE_CONTENT",
  APROVAR_CLINICAMENTE: "APPROVE_CLINICAL_CONTENT",
  AUTORIZAR_PUBLICACAO: "PUBLISH_CONTENT",
  PUBLICAR: "PUBLISH_CONTENT",
  PUBLICAR_AUTOMATICAMENTE: "PUBLISH_CONTENT",
  RETIRAR: "PUBLISH_CONTENT",
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

export async function advanceContent(
  command: AdvanceContentCommand,
  dependencies: ContentUseCaseDependencies,
): Promise<ContentRecord> {
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

  const capability = capabilityByEvent[command.event];
  const authorized = canAccess({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    capability,
    resource: { scopeId: command.scopeId },
    scopes: command.scopes,
    ...(command.approvedClinicalApproverId === undefined
      ? {}
      : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
  });
  if (!authorized) {
    throw new ApplicationError(
      "forbidden",
      "Content operation is outside the current authorization scope",
    );
  }

  try {
    return await dependencies.transaction.run(async (operations) => {
      const current = await operations.content.find(
        command.contentId,
        command.version,
      );
      if (current === null) {
        throw new ApplicationError(
          "not_found",
          "Content version was not found",
        );
      }
      if (current.scopeId !== command.scopeId) {
        throw new ApplicationError(
          "forbidden",
          "Content is outside the current scope",
        );
      }

      if (
        (command.event === "AUTORIZAR_PUBLICACAO" ||
          command.event === "PUBLICAR" ||
          command.event === "PUBLICAR_AUTOMATICAMENTE") &&
        current.publicationReady !== true
      ) {
        throw new ApplicationError(
          "state_conflict",
          "Content publication gate is incomplete",
        );
      }

      const nextState = transitionContent(
        {
          contentId: current.contentId,
          version: current.version,
          status: current.status,
        },
        { type: command.event },
      );
      const next = Object.freeze({
        ...current,
        status: nextState.status,
      });
      await operations.content.save(current, next);

      const occurredAt = new Date().toISOString();
      await operations.eventPublisher.publish({
        eventId: dependencies.idFactory(),
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
        },
      });
      await operations.audit.append(
        createAuditEntry({
          auditId: dependencies.idFactory(),
          principalId: command.principalId,
          action: `CONTENT_${command.event}`,
          resourceType: "content_version",
          resourceId: next.contentId,
          scopeId: next.scopeId,
          outcome: "SUCCESS",
          reasonCode: "content_workflow_transition",
          requestId: command.correlationId,
          correlationId: command.correlationId,
          occurredAt,
        }),
      );

      return next;
    });
  } catch (error) {
    throw normalizeContentError(error);
  }
}
