import { and, eq } from "drizzle-orm";
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
  contentVersions,
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
      const gate = publicationGate(editorial.preflight);
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
      ): Promise<Result> =>
        db.transaction(async (transaction) =>
          work(createOperations(transaction as unknown as DatabaseExecutor)),
        ),
    },
  });
}
