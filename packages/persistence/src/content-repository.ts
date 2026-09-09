import { createHash } from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ContentRecord,
  ContentTransactionalOperations,
  ContentUseCaseDependencies,
  ContentRepositoryPort,
  ContentWorkflowEvent,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import {
  createOutboxInsert,
  PersistenceConflictError,
} from "./attempt-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import {
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
  learningActivities,
  learningActivityItems,
  outboxEvents,
} from "./schema.js";
import type * as schema from "./schema.js";
import {
  setDatabaseSecurityContext,
  setDatabaseServiceContext,
} from "./security-context.js";

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

export function contentRowToRecord(row: ContentRowShape): ContentRecord {
  assertNonEmpty(row.contentId, "contentId");
  assertNonEmpty(row.scopeId, "scopeId");
  if (!Number.isInteger(row.version) || row.version < 1) {
    throw new ContentMappingError("content version must be positive");
  }

  return Object.freeze({
    contentId: row.contentId,
    version: row.version,
    scopeId: row.scopeId,
    status: assertStatus(row.status),
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
  latestReviewDecision: string | undefined,
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
  if (latestReviewDecision !== "APROVAR_CLINICAMENTE") {
    reasons.push("CLINICAL_APPROVAL_MISSING");
  }
  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const moduleIdPattern = /^M(0[1-9]|1[0-9]|2[0-4])$/u;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function authoringActivityOrdinal(item: unknown): number {
  if (!isRecord(item) || !isRecord(item.participant)) {
    throw new ContentMappingError("published authoring participant is invalid");
  }
  const ordinal = item.participant.ordinal;
  if (
    typeof ordinal !== "number" ||
    !Number.isInteger(ordinal) ||
    ordinal < 1 ||
    ordinal > 100
  ) {
    throw new ContentMappingError(
      "published authoring participant ordinal is invalid",
    );
  }
  return ordinal;
}

function authoringActivitySlug(
  scopeId: string,
  moduleId: string,
  sessionId: string,
): string {
  const key = createHash("sha256")
    .update(`${scopeId}:${moduleId}:${sessionId}`)
    .digest("hex")
    .slice(0, 32);
  return `authoring-${key}`;
}

async function materializePublishedAuthoringActivity(
  db: DatabaseExecutor,
  contentVersionId: string,
  contentId: string,
  version: number,
  scopeId: string,
): Promise<void> {
  const editorialRows = await db
    .select({
      moduleId: contentEditorialRecords.moduleId,
      sessionId: contentEditorialRecords.sessionId,
      editorialContentId: contentEditorialRecords.contentId,
      editorialVersion: contentEditorialRecords.version,
      versionContentId: contentVersions.contentId,
      versionNumber: contentVersions.version,
      versionScopeId: contentVersions.scopeId,
    })
    .from(contentEditorialRecords)
    .innerJoin(
      contentVersions,
      eq(contentEditorialRecords.contentVersionId, contentVersions.id),
    )
    .where(
      and(
        eq(contentEditorialRecords.contentVersionId, contentVersionId),
        eq(contentEditorialRecords.scopeId, scopeId),
      ),
    )
    .limit(1);
  const editorial = editorialRows[0];
  if (editorial === undefined) {
    throw new ContentMappingError(
      "published content requires an authoring record",
    );
  }
  if (
    editorial.editorialContentId !== contentId ||
    editorial.editorialVersion !== version ||
    editorial.versionContentId !== contentId ||
    editorial.versionNumber !== version ||
    editorial.versionScopeId !== scopeId
  ) {
    throw new ContentMappingError(
      "published authoring identity does not match content version",
    );
  }
  if (!moduleIdPattern.test(editorial.moduleId)) {
    throw new ContentMappingError("published authoring moduleId is invalid");
  }
  assertNonEmpty(editorial.sessionId, "authoring sessionId");
  if (
    !new RegExp(`^${editorial.moduleId}-S[1-4]$`, "u").test(editorial.sessionId)
  ) {
    throw new ContentMappingError(
      "published authoring sessionId does not match moduleId",
    );
  }

  const publishedRows = await db
    .select({
      contentVersionId: contentEditorialRecords.contentVersionId,
      editorialContentId: contentEditorialRecords.contentId,
      editorialVersion: contentEditorialRecords.version,
      versionContentId: contentVersions.contentId,
      versionNumber: contentVersions.version,
      title: contentVersions.title,
      item: contentEditorialRecords.item,
    })
    .from(contentEditorialRecords)
    .innerJoin(
      contentVersions,
      eq(contentEditorialRecords.contentVersionId, contentVersions.id),
    )
    .where(
      and(
        eq(contentEditorialRecords.scopeId, scopeId),
        eq(contentEditorialRecords.moduleId, editorial.moduleId),
        eq(contentEditorialRecords.sessionId, editorial.sessionId),
        eq(contentVersions.scopeId, scopeId),
        eq(contentVersions.status, "PUBLICADO"),
      ),
    )
    .orderBy(
      asc(contentEditorialRecords.createdAt),
      asc(contentEditorialRecords.id),
    );
  if (
    publishedRows.length === 0 ||
    !publishedRows.some((row) => row.contentVersionId === contentVersionId)
  ) {
    throw new ContentMappingError(
      "published authoring record is outside its content scope",
    );
  }

  const activityRows = publishedRows
    .map((row) => {
      if (
        row.editorialContentId !== row.versionContentId ||
        row.editorialVersion !== row.versionNumber
      ) {
        throw new ContentMappingError(
          "published authoring row does not match content version",
        );
      }
      return {
        contentVersionId: row.contentVersionId,
        title: row.title,
        ordinal: authoringActivityOrdinal(row.item),
      };
    })
    .sort(
      (left, right) =>
        left.ordinal - right.ordinal ||
        left.contentVersionId.localeCompare(right.contentVersionId),
    );
  for (let index = 1; index < activityRows.length; index += 1) {
    if (activityRows[index - 1]?.ordinal === activityRows[index]?.ordinal) {
      throw new ContentMappingError(
        "published authoring session has duplicate ordinals",
      );
    }
  }
  const title = activityRows[0]?.title;
  if (title === undefined) {
    throw new ContentMappingError(
      "published authoring activity title is missing",
    );
  }
  assertNonEmpty(title, "content title");

  const slug = authoringActivitySlug(
    scopeId,
    editorial.moduleId,
    editorial.sessionId,
  );
  await db
    .insert(learningActivities)
    .values({
      scopeId,
      slug,
      moduleId: editorial.moduleId,
      sessionId: editorial.sessionId,
      title,
      status: "PUBLISHED",
    })
    .onConflictDoNothing({
      target: [
        learningActivities.scopeId,
        learningActivities.moduleId,
        learningActivities.sessionId,
      ],
    });

  const activities = await db
    .select({
      id: learningActivities.id,
      scopeId: learningActivities.scopeId,
      moduleId: learningActivities.moduleId,
      sessionId: learningActivities.sessionId,
      status: learningActivities.status,
    })
    .from(learningActivities)
    .where(
      and(
        eq(learningActivities.scopeId, scopeId),
        eq(learningActivities.moduleId, editorial.moduleId),
        eq(learningActivities.sessionId, editorial.sessionId),
      ),
    )
    .limit(1);
  const activity = activities[0];
  if (
    activity === undefined ||
    activity.scopeId !== scopeId ||
    activity.moduleId !== editorial.moduleId ||
    activity.sessionId !== editorial.sessionId ||
    activity.status !== "PUBLISHED"
  ) {
    throw new ContentMappingError(
      "published authoring activity identity is inconsistent",
    );
  }

  const existingItems = await db
    .select({
      activityId: learningActivityItems.activityId,
      contentVersionId: learningActivityItems.contentVersionId,
    })
    .from(learningActivityItems)
    .where(
      inArray(
        learningActivityItems.contentVersionId,
        activityRows.map((row) => row.contentVersionId),
      ),
    );
  if (existingItems.some((item) => item.activityId !== activity.id)) {
    throw new ContentMappingError(
      "published content is already mapped to another activity",
    );
  }

  await db
    .insert(learningActivityItems)
    .values(
      activityRows.map((row) => ({
        activityId: activity.id,
        contentVersionId: row.contentVersionId,
        ordinal: row.ordinal,
      })),
    )
    .onConflictDoNothing({
      target: [
        learningActivityItems.activityId,
        learningActivityItems.contentVersionId,
      ],
    });

  const persistedItems = await db
    .select({
      contentVersionId: learningActivityItems.contentVersionId,
      ordinal: learningActivityItems.ordinal,
    })
    .from(learningActivityItems)
    .where(eq(learningActivityItems.activityId, activity.id));
  const persistedByContentVersion = new Map(
    persistedItems.map((item) => [item.contentVersionId, item.ordinal]),
  );
  if (
    persistedItems.length !== activityRows.length ||
    persistedItems.some(
      (item) =>
        !activityRows.some(
          (row) => row.contentVersionId === item.contentVersionId,
        ),
    ) ||
    activityRows.some(
      (row) =>
        persistedByContentVersion.get(row.contentVersionId) !== row.ordinal,
    )
  ) {
    throw new ContentMappingError(
      "published authoring activity items are incomplete or unexpected",
    );
  }
}

export function createContentRepository(
  db: DatabaseExecutor,
): ContentRepositoryPort {
  const repository: ContentRepositoryPort = {
    find: async (
      contentId: string,
      version: number,
    ): Promise<ContentRecord | null> => {
      const rows = await db
        .select({
          contentId: contentVersions.contentId,
          version: contentVersions.version,
          scopeId: contentVersions.scopeId,
          status: contentVersions.status,
        })
        .from(contentVersions)
        .where(
          and(
            eq(contentVersions.contentId, contentId),
            eq(contentVersions.version, version),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const editorialRows = await db
        .select({
          preflight: contentEditorialRecords.preflight,
          editorialRecordId: contentEditorialRecords.id,
        })
        .from(contentEditorialRecords)
        .where(
          and(
            eq(contentEditorialRecords.contentId, contentId),
            eq(contentEditorialRecords.version, version),
          ),
        )
        .limit(1);
      const editorial = editorialRows[0];
      if (editorial === undefined) {
        return contentRowToRecord({
          ...row,
          publicationReady: false,
          publicationBlockReasons: ["AUTHORING_RECORD_MISSING"],
        });
      }
      const reviewRows = await db
        .select({ decision: contentReviewDecisions.decision })
        .from(contentReviewDecisions)
        .where(
          eq(
            contentReviewDecisions.contentEditorialRecordId,
            editorial.editorialRecordId,
          ),
        )
        .orderBy(
          desc(contentReviewDecisions.reviewedAt),
          desc(contentReviewDecisions.createdAt),
          desc(contentReviewDecisions.id),
        )
        .limit(1);
      const gate = publicationGate(
        editorial.preflight,
        reviewRows[0]?.decision,
      );
      return contentRowToRecord({
        ...row,
        publicationReady: gate.ready,
        publicationBlockReasons: gate.reasons,
      });
    },
    save: async (
      current: ContentRecord,
      next: ContentRecord,
    ): Promise<void> => {
      if (
        current.contentId !== next.contentId ||
        current.version !== next.version ||
        current.scopeId !== next.scopeId
      ) {
        throw new ContentMappingError(
          "content identity cannot change during a transition",
        );
      }

      const rows = await db
        .update(contentVersions)
        .set({ status: next.status, updatedAt: new Date() })
        .where(
          and(
            eq(contentVersions.contentId, current.contentId),
            eq(contentVersions.version, current.version),
            eq(contentVersions.status, current.status),
          ),
        )
        .returning({ id: contentVersions.id });
      if (rows.length === 0) {
        throw new PersistenceConflictError(
          "content version changed concurrently",
        );
      }
      if (next.status === "PUBLICADO") {
        const contentVersionId = rows[0]?.id;
        if (contentVersionId === undefined) {
          throw new ContentMappingError(
            "published content version identity is missing",
          );
        }
        await materializePublishedAuthoringActivity(
          db,
          contentVersionId,
          next.contentId,
          next.version,
          next.scopeId,
        );
      }
    },
  };
  return Object.freeze(repository);
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
      // The indexer carries no participant or staff scope, so it reads under
      // the named service identity (migration 0054), which exposes at most
      // published content. Participant and staff flows keep their own
      // contexts and never inherit this identity.
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseServiceContext(executor, {
          serviceRole: "content-indexer",
        });
        const rows = await executor
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
      });
    },
    listPublishedIndexable: async (): Promise<
      readonly IndexableContentRecord[]
    > => {
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseServiceContext(executor, {
          serviceRole: "content-indexer",
        });
        const rows = await executor
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
      });
    },
  };
  return Object.freeze(source);
}

function createOperations(
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
        securityContext?: Readonly<{
          readonly participantId?: string;
          readonly scopeId?: string;
        }>,
      ): Promise<Result> =>
        db.transaction(async (transaction) => {
          const executor = transaction as unknown as DatabaseExecutor;
          if (securityContext !== undefined) {
            await setDatabaseSecurityContext(executor, securityContext);
          }
          return work(createOperations(executor));
        }),
    },
  });
}
