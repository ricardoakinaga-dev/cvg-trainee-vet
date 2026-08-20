import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ContentRecord,
  ContentTransactionalOperations,
  ContentExpiryUseCaseDependencies,
  ContentUseCaseDependencies,
  ContentRepositoryPort,
  ContentWorkflowEvent,
} from "@cvg/application";
import type { ContentStatus, ContentWithdrawalReasonCode } from "@cvg/domain";

import {
  createOutboxInsert,
  PersistenceConflictError,
} from "./attempt-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import {
  contentEditorialRecords,
  contentReviewDecisions,
  contentWithdrawalAffected,
  contentVersions,
  activityAssignments,
  learningActivityItems,
  outboxEvents,
} from "./schema.js";
import type * as schema from "./schema.js";

export class ContentMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ContentMappingError";
  }
}

export type ContentRowShape = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly status: string;
  readonly withdrawalReasonCode?: string | null;
  readonly withdrawnAt?: Date | string | null;
  readonly validUntil?: Date | string | null;
  readonly nextReviewAt?: Date | string | null;
  readonly publicationReady?: boolean;
  readonly publicationBlockReasons?: readonly string[];
}>;

export type IndexableContentRecord = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly text: string;
}>;

export type ContentIndexSourcePort = Readonly<{
  readonly findPublishedIndexable: (
    contentId: string,
    version: number,
  ) => Promise<IndexableContentRecord | null>;
  readonly listPublishedIndexable: () => Promise<
    readonly IndexableContentRecord[]
  >;
}>;

const maxReconciliationRecords = 10_000;

const contentStatuses: readonly ContentStatus[] = [
  "RASCUNHO",
  "AUTOVERIFICADO",
  "EM_REVISAO_CLINICA",
  "AJUSTES_SOLICITADOS",
  "APROVADO_CLINICAMENTE",
  "PROJECAO_VERIFICADA",
  "AUTORIZADO_PARA_PUBLICACAO",
  "PUBLICADO",
  "RETIRADO",
  "VENCIDO",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ContentMappingError(`${field} must not be empty`);
  }
}

function assertStatus(value: string): ContentStatus {
  if (!contentStatuses.includes(value as ContentStatus)) {
    throw new ContentMappingError("content status is not supported");
  }
  return value as ContentStatus;
}

function optionalWithdrawalReason(
  value: string | null | undefined,
): ContentWithdrawalReasonCode | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    value !== "ERRO_CLINICO" &&
    value !== "ERRO_CONTEUDO" &&
    value !== "RISCO_SEGURANCA"
  ) {
    throw new ContentMappingError("withdrawalReasonCode is not supported");
  }
  return value;
}

function optionalTimestamp(
  value: Date | string | null | undefined,
  field: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const timestamp =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new ContentMappingError(`${field} must be a valid timestamp`);
  }
  return timestamp.toISOString();
}

export function contentRowToRecord(row: ContentRowShape): ContentRecord {
  assertNonEmpty(row.contentId, "contentId");
  assertNonEmpty(row.scopeId, "scopeId");
  if (!Number.isInteger(row.version) || row.version < 1) {
    throw new ContentMappingError("content version must be positive");
  }

  const validUntil = optionalTimestamp(row.validUntil, "validUntil");
  const nextReviewAt = optionalTimestamp(row.nextReviewAt, "nextReviewAt");
  const withdrawnAt = optionalTimestamp(row.withdrawnAt, "withdrawnAt");
  const withdrawalReasonCode = optionalWithdrawalReason(
    row.withdrawalReasonCode,
  );

  return Object.freeze({
    contentId: row.contentId,
    version: row.version,
    scopeId: row.scopeId,
    status: assertStatus(row.status),
    ...(withdrawalReasonCode === undefined ? {} : { withdrawalReasonCode }),
    ...(withdrawnAt === undefined ? {} : { withdrawnAt }),
    ...(validUntil === undefined ? {} : { validUntil }),
    ...(nextReviewAt === undefined ? {} : { nextReviewAt }),
    ...(row.publicationReady === undefined
      ? {}
      : { publicationReady: row.publicationReady }),
    ...(row.publicationBlockReasons === undefined
      ? {}
      : {
          publicationBlockReasons: Object.freeze([
            ...row.publicationBlockReasons,
          ]),
        }),
  });
}

function publicationGate(
  preflight: unknown,
): Readonly<{ readonly ready: boolean; readonly reasons: readonly string[] }> {
  const reasons: string[] = [];
  if (
    preflight === null ||
    typeof preflight !== "object" ||
    Array.isArray(preflight) ||
    (preflight as { technicalChecksPassed?: unknown }).technicalChecksPassed !==
      true
  ) {
    reasons.push("TECHNICAL_PREFLIGHT_INCOMPLETE");
  }
  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

type ContentRepositoryMethods = Required<
  Pick<
    ContentRepositoryPort,
    | "find"
    | "save"
    | "listPublishedDueForExpiry"
    | "listAffectedParticipantIds"
    | "recordWithdrawalAffected"
  >
>;

type WithdrawalAffectedMetadata = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly withdrawnAt: string;
  readonly correlationId: string;
}>;

function contentVersionSelection() {
  return {
    contentId: contentVersions.contentId,
    version: contentVersions.version,
    scopeId: contentVersions.scopeId,
    status: contentVersions.status,
    withdrawalReasonCode: contentVersions.withdrawalReasonCode,
    withdrawnAt: contentVersions.withdrawnAt,
    validUntil: contentVersions.validUntil,
    nextReviewAt: contentVersions.nextReviewAt,
  };
}

async function loadContentVersion(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
) {
  const rows = await db
    .select(contentVersionSelection())
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.contentId, contentId),
        eq(contentVersions.version, version),
      ),
    )
    .limit(1);
  return rows[0];
}

async function loadPublicationGate(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
) {
  const rows = await db
    .select({ preflight: contentEditorialRecords.preflight })
    .from(contentEditorialRecords)
    .where(
      and(
        eq(contentEditorialRecords.contentId, contentId),
        eq(contentEditorialRecords.version, version),
      ),
    )
    .limit(1);
  const editorial = rows[0];
  return editorial === undefined
    ? Object.freeze({
        ready: false,
        reasons: Object.freeze(["AUTHORING_RECORD_MISSING"]),
      })
    : publicationGate(editorial.preflight);
}

async function hasLatestClinicalApproval(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
): Promise<boolean> {
  const rows = await db
    .select({ decision: contentReviewDecisions.decision })
    .from(contentReviewDecisions)
    .where(
      and(
        eq(contentReviewDecisions.contentId, contentId),
        eq(contentReviewDecisions.version, version),
      ),
    )
    .orderBy(desc(contentReviewDecisions.reviewedAt))
    .limit(1);
  return rows[0]?.decision === "APROVAR_CLINICAMENTE";
}

async function findContent(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
): Promise<ContentRecord | null> {
  const row = await loadContentVersion(db, contentId, version);
  if (row === undefined) return null;
  const gate = await loadPublicationGate(db, contentId, version);
  const clinicallyApproved = await hasLatestClinicalApproval(
    db,
    contentId,
    version,
  );
  const publicationBlockReasons = [
    ...gate.reasons,
    ...(clinicallyApproved ? [] : ["CLINICAL_REVIEW_MISSING"]),
  ];
  return contentRowToRecord({
    ...row,
    publicationReady: gate.ready && clinicallyApproved,
    publicationBlockReasons,
  });
}

function validateExpiryInput(
  now: string,
  scopeIds: readonly string[],
  limit: number,
): Readonly<{ readonly nowDate: Date; readonly scopeIds: readonly string[] }> {
  const nowDate = new Date(now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new ContentMappingError("now must be a valid timestamp");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ContentMappingError("limit must be between 1 and 100");
  }
  return Object.freeze({
    nowDate,
    scopeIds: Object.freeze([
      ...new Set(scopeIds.map((scopeId) => scopeId.trim()).filter(Boolean)),
    ]),
  });
}

async function listPublishedDueForExpiry(
  db: DatabaseExecutor,
  now: string,
  scopeIds: readonly string[],
  limit: number,
): Promise<readonly ContentRecord[]> {
  const input = validateExpiryInput(now, scopeIds, limit);
  if (input.scopeIds.length === 0) return Object.freeze([]);
  const rows = await db
    .select(contentVersionSelection())
    .from(contentVersions)
    .where(
      and(
        inArray(contentVersions.scopeId, input.scopeIds),
        eq(contentVersions.status, "PUBLICADO"),
        lte(contentVersions.validUntil, input.nowDate),
      ),
    )
    .orderBy(asc(contentVersions.validUntil), asc(contentVersions.contentId))
    .limit(limit);
  return Object.freeze(rows.map((row) => contentRowToRecord(row)));
}

async function listAffectedParticipantIds(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
  scopeId: string,
): Promise<readonly string[]> {
  const rows = await db
    .select({ participantId: activityAssignments.participantId })
    .from(activityAssignments)
    .innerJoin(
      learningActivityItems,
      eq(activityAssignments.activityId, learningActivityItems.activityId),
    )
    .innerJoin(
      contentVersions,
      eq(learningActivityItems.contentVersionId, contentVersions.id),
    )
    .where(
      and(
        eq(contentVersions.contentId, contentId),
        eq(contentVersions.version, version),
        eq(contentVersions.scopeId, scopeId),
      ),
    );
  return Object.freeze([...new Set(rows.map((row) => row.participantId))]);
}

async function loadContentVersionIdForWithdrawal(
  db: DatabaseExecutor,
  metadata: WithdrawalAffectedMetadata,
) {
  const rows = await db
    .select({ id: contentVersions.id })
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.contentId, metadata.contentId),
        eq(contentVersions.version, metadata.version),
        eq(contentVersions.scopeId, metadata.scopeId),
      ),
    )
    .limit(1);
  return rows[0];
}

async function recordWithdrawalAffected(
  db: DatabaseExecutor,
  participantIds: readonly string[],
  metadata: WithdrawalAffectedMetadata,
): Promise<number> {
  const contentVersion = await loadContentVersionIdForWithdrawal(db, metadata);
  if (contentVersion === undefined) {
    throw new ContentMappingError(
      "content version was not found for withdrawal audit",
    );
  }
  if (participantIds.length === 0) return 0;
  const rows = await db
    .insert(contentWithdrawalAffected)
    .values(
      participantIds.map((participantId) => ({
        contentVersionId: contentVersion.id,
        contentId: metadata.contentId,
        version: metadata.version,
        scopeId: metadata.scopeId,
        participantId,
        withdrawnAt: new Date(metadata.withdrawnAt),
        correlationId: metadata.correlationId,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: contentWithdrawalAffected.id });
  return rows.length;
}

function assertContentIdentity(
  current: ContentRecord,
  next: ContentRecord,
): void {
  if (
    current.contentId !== next.contentId ||
    current.version !== next.version ||
    current.scopeId !== next.scopeId
  ) {
    throw new ContentMappingError(
      "content identity cannot change during a transition",
    );
  }
}

async function saveContent(
  db: DatabaseExecutor,
  current: ContentRecord,
  next: ContentRecord,
): Promise<void> {
  assertContentIdentity(current, next);
  const rows = await db
    .update(contentVersions)
    .set({
      status: next.status,
      withdrawalReasonCode: next.withdrawalReasonCode ?? null,
      withdrawnAt:
        next.withdrawnAt === undefined ? null : new Date(next.withdrawnAt),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentVersions.contentId, current.contentId),
        eq(contentVersions.version, current.version),
        eq(contentVersions.status, current.status),
      ),
    )
    .returning({ id: contentVersions.id });
  if (rows.length === 0) {
    throw new PersistenceConflictError("content version changed concurrently");
  }
}

export function createContentRepositoryMethods(
  db: DatabaseExecutor,
): ContentRepositoryMethods {
  return Object.freeze({
    find: (contentId, version) => findContent(db, contentId, version),
    listPublishedDueForExpiry: (now, scopeIds, limit) =>
      listPublishedDueForExpiry(db, now, scopeIds, limit),
    listAffectedParticipantIds: (contentId, version, scopeId) =>
      listAffectedParticipantIds(db, contentId, version, scopeId),
    recordWithdrawalAffected: (participantIds, metadata) =>
      recordWithdrawalAffected(db, participantIds, metadata),
    save: (current, next) => saveContent(db, current, next),
  });
}

export function createContentRepository(
  db: DatabaseExecutor,
): ContentRepositoryPort {
  return createContentRepositoryMethods(db);
}

export function createContentIndexSourceRepository(
  db: DatabaseExecutor,
): ContentIndexSourcePort {
  const toIndexableRecord = (row: {
    readonly contentId: string;
    readonly version: number;
    readonly scopeId: string;
    readonly participantText: string;
  }): IndexableContentRecord => {
    assertNonEmpty(row.participantText, "participantText");
    return Object.freeze({
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      text: row.participantText,
    });
  };
  const source: ContentIndexSourcePort = {
    findPublishedIndexable: async (
      contentId: string,
      version: number,
    ): Promise<IndexableContentRecord | null> => {
      const rows = await db
        .select({
          contentId: contentVersions.contentId,
          version: contentVersions.version,
          scopeId: contentVersions.scopeId,
          participantText: contentVersions.participantText,
        })
        .from(contentVersions)
        .where(
          and(
            eq(contentVersions.contentId, contentId),
            eq(contentVersions.version, version),
            eq(contentVersions.status, "PUBLICADO"),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      return toIndexableRecord(row);
    },
    listPublishedIndexable: async (): Promise<
      readonly IndexableContentRecord[]
    > => {
      const rows = await db
        .select({
          contentId: contentVersions.contentId,
          version: contentVersions.version,
          scopeId: contentVersions.scopeId,
          participantText: contentVersions.participantText,
        })
        .from(contentVersions)
        .where(eq(contentVersions.status, "PUBLICADO"))
        .limit(maxReconciliationRecords + 1);
      if (rows.length > maxReconciliationRecords) {
        throw new ContentMappingError(
          "published content exceeds reconciliation batch limit",
        );
      }
      return Object.freeze(rows.map(toIndexableRecord));
    },
  };
  return Object.freeze(source);
}

export function createContentTransactionalOperations(
  db: DatabaseExecutor,
): ContentTransactionalOperations {
  return Object.freeze({
    content: createContentRepository(db),
    eventPublisher: {
      publish: async (event: ContentWorkflowEvent): Promise<void> => {
        await db.insert(outboxEvents).values(createOutboxInsert(event));
      },
    },
    audit: createAuditRepository(db),
    clinicalReview: {
      hasApproved: async (
        contentId: string,
        version: number,
        reviewerId: string,
      ): Promise<boolean> => {
        const rows = await db
          .select({ id: contentReviewDecisions.id })
          .from(contentReviewDecisions)
          .where(
            and(
              eq(contentReviewDecisions.contentId, contentId),
              eq(contentReviewDecisions.version, version),
              eq(contentReviewDecisions.reviewerId, reviewerId),
              eq(contentReviewDecisions.decision, "APROVAR_CLINICAMENTE"),
            ),
          )
          .limit(1);
        return rows.length === 1;
      },
    },
  });
}

export function createContentUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): ContentUseCaseDependencies {
  return Object.freeze({
    idFactory,
    transaction: {
      run: async <Result>(
        work: (operations: ContentTransactionalOperations) => Promise<Result>,
      ): Promise<Result> =>
        db.transaction(async (transaction) =>
          work(createContentTransactionalOperations(transaction)),
        ),
    },
  });
}

export function createContentExpiryUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): ContentExpiryUseCaseDependencies {
  return Object.freeze({
    ...createContentUseCaseDependencies(db, idFactory),
    expiryRepository: createContentRepository(db),
  });
}
