import { and, desc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ContentReviewQueueItem,
  ContentReviewQueueReadPort,
  ContentReviewQueueState,
  ContentReviewQueueStatus,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const queueStatuses: readonly ContentReviewQueueStatus[] = [
  "EM_REVISAO_CLINICA",
  "AJUSTES_SOLICITADOS",
];

type QueueBaseRow = Readonly<{
  readonly editorialRecordId: string;
  readonly contentId: string;
  readonly contentVersionId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly authorId: string;
  readonly status: string;
  readonly preflight: unknown;
  readonly updatedAt: Date | string;
}>;

type ReviewRow = Readonly<{
  readonly id?: string;
  readonly decision: string;
  readonly reviewedAt: Date | string;
  readonly createdAt?: Date | string;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function toIso(value: Date | string, field: string): string {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PersistenceMappingError(`${field} must be a valid timestamp`);
  }
  return date.toISOString();
}

function parseStatus(value: string): ContentReviewQueueStatus {
  if (!queueStatuses.includes(value as ContentReviewQueueStatus)) {
    throw new PersistenceMappingError("content queue status is invalid");
  }
  return value as ContentReviewQueueStatus;
}

function parsePreflight(value: unknown): ContentReviewQueueItem["preflight"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceMappingError("content queue preflight is invalid");
  }
  const candidate = value as {
    readonly technicalChecksPassed?: unknown;
    readonly checkedAt?: unknown;
  };
  if (
    typeof candidate.technicalChecksPassed !== "boolean" ||
    typeof candidate.checkedAt !== "string"
  ) {
    throw new PersistenceMappingError("content queue preflight is invalid");
  }
  return Object.freeze({
    technicalChecksPassed: candidate.technicalChecksPassed,
    checkedAt: toIso(candidate.checkedAt, "preflight.checkedAt"),
  });
}

function parseReview(
  row: ReviewRow | undefined,
): NonNullable<ContentReviewQueueItem["latestReview"]> {
  if (row === undefined) {
    throw new PersistenceMappingError("content queue review is missing");
  }
  if (
    row.decision !== "APROVAR_CLINICAMENTE" &&
    row.decision !== "SOLICITAR_AJUSTES"
  ) {
    throw new PersistenceMappingError("content queue review is invalid");
  }
  return Object.freeze({
    decision: row.decision,
    reviewedAt: toIso(row.reviewedAt, "reviewedAt"),
  });
}

export function contentReviewQueueRowToItem(
  row: QueueBaseRow,
  latestReview?: ReviewRow,
): ContentReviewQueueItem {
  for (const [value, field] of [
    [row.editorialRecordId, "editorialRecordId"],
    [row.contentId, "contentId"],
    [row.contentVersionId, "contentVersionId"],
    [row.scopeId, "scopeId"],
    [row.moduleId, "moduleId"],
    [row.sessionId, "sessionId"],
    [row.title, "title"],
    [row.authorId, "authorId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(row.version) || row.version < 1) {
    throw new PersistenceMappingError("content queue version is invalid");
  }
  const status = parseStatus(row.status);
  const preflight = parsePreflight(row.preflight);
  return Object.freeze({
    contentId: row.contentId,
    version: row.version,
    scopeId: row.scopeId,
    moduleId: row.moduleId,
    sessionId: row.sessionId,
    title: row.title,
    authorId: row.authorId,
    status,
    preflight,
    ...(latestReview === undefined
      ? {}
      : { latestReview: parseReview(latestReview) }),
    canOpenAuthoring: false,
    updatedAt: toIso(row.updatedAt, "updatedAt"),
    nextAction:
      status === "EM_REVISAO_CLINICA"
        ? "REVISAR_CLINICAMENTE"
        : "AGUARDAR_REENVIO_AUTOR",
  });
}

export function createContentReviewQueueRepository(
  db: DatabaseExecutor,
  options: Readonly<{ readonly now?: () => Date }> = {},
): ContentReviewQueueReadPort {
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    findContentReviewQueue: async (
      query: Parameters<
        ContentReviewQueueReadPort["findContentReviewQueue"]
      >[0],
    ) => {
      assertNonEmpty(query.scopeId, "scopeId");
      const statuses =
        query.status === undefined ? queueStatuses : [query.status];
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: query.scopeId });
        const rows = await executor
          .select({
            editorialRecordId: contentEditorialRecords.id,
            contentId: contentEditorialRecords.contentId,
            contentVersionId: contentEditorialRecords.contentVersionId,
            scopeId: contentEditorialRecords.scopeId,
            version: contentEditorialRecords.version,
            moduleId: contentEditorialRecords.moduleId,
            sessionId: contentEditorialRecords.sessionId,
            title: contentVersions.title,
            authorId: contentEditorialRecords.authorId,
            status: contentVersions.status,
            preflight: contentEditorialRecords.preflight,
            updatedAt: contentEditorialRecords.updatedAt,
          })
          .from(contentEditorialRecords)
          .innerJoin(
            contentVersions,
            eq(contentEditorialRecords.contentVersionId, contentVersions.id),
          )
          .where(
            and(
              eq(contentEditorialRecords.scopeId, query.scopeId),
              eq(contentVersions.scopeId, query.scopeId),
              inArray(contentVersions.status, statuses),
              ...(query.authorId === undefined
                ? []
                : [eq(contentEditorialRecords.authorId, query.authorId)]),
            ),
          )
          .orderBy(
            desc(contentEditorialRecords.updatedAt),
            desc(contentEditorialRecords.contentId),
            desc(contentEditorialRecords.version),
          )
          .limit(query.limit);

        const visibleRows = rows as readonly QueueBaseRow[];
        const items: ContentReviewQueueItem[] = [];
        for (const row of visibleRows) {
          const reviews = await executor
            .select({
              id: contentReviewDecisions.id,
              decision: contentReviewDecisions.decision,
              reviewedAt: contentReviewDecisions.reviewedAt,
              createdAt: contentReviewDecisions.createdAt,
            })
            .from(contentReviewDecisions)
            .where(
              and(
                eq(
                  contentReviewDecisions.contentEditorialRecordId,
                  row.editorialRecordId,
                ),
                eq(contentReviewDecisions.scopeId, query.scopeId),
              ),
            )
            .orderBy(
              desc(contentReviewDecisions.reviewedAt),
              desc(contentReviewDecisions.createdAt),
              desc(contentReviewDecisions.id),
            )
            .limit(1);
          items.push(contentReviewQueueRowToItem(row, reviews[0]));
        }

        const generatedAt = now();
        if (Number.isNaN(generatedAt.getTime())) {
          throw new PersistenceMappingError("queue generatedAt is invalid");
        }
        return Object.freeze({
          kind: "content_review_queue" as const,
          scopeId: query.scopeId,
          generatedAt: generatedAt.toISOString(),
          filters: Object.freeze({
            scopeId: query.scopeId,
            ...(query.status === undefined ? {} : { status: query.status }),
            limit: query.limit,
          }),
          items: Object.freeze(items),
        } satisfies ContentReviewQueueState);
      });
    },
  });
}
