import type { AuthoringRepositoryPort } from "@cvg/application";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  createOutboxInsert,
  PersistenceConflictError,
  PersistenceMappingError,
} from "../attempt-repository.js";
import { auditEntryToRow } from "../audit-repository.js";
import { enforceClinicalPublicationHold } from "../clinical-publication-hold.js";
import {
  auditEntries,
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
  outboxEvents,
} from "../schema.js";
import type * as schema from "../schema.js";
import { setDatabaseSecurityContext } from "../security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createAuthoringReviewCommitter(
  db: DatabaseExecutor,
): AuthoringRepositoryPort["commitReviewTransition"] {
  return async (record, preflight, review, transition) => {
    if (
      transition.nextStatus !== "AJUSTES_SOLICITADOS" &&
      transition.nextStatus !== "APROVADO_CLINICAMENTE"
    ) {
      throw new PersistenceMappingError(
        "authoring review transition cannot publish content",
      );
    }
    const persistedPreflight = enforceClinicalPublicationHold(preflight);
    await db.transaction(async (transaction) => {
      const executor = transaction as unknown as DatabaseExecutor;
      await setDatabaseSecurityContext(executor, { scopeId: record.scopeId });
      const versionRows = await executor
        .update(contentVersions)
        .set({
          status: transition.nextStatus,
          updatedAt: new Date(review.reviewedAt),
        })
        .where(
          and(
            eq(contentVersions.id, record.contentVersionId),
            eq(contentVersions.contentId, record.contentId),
            eq(contentVersions.version, record.version),
            eq(contentVersions.scopeId, record.scopeId),
            eq(contentVersions.status, record.contentStatus),
          ),
        )
        .returning({ id: contentVersions.id });
      if (versionRows.length === 0) {
        throw new PersistenceConflictError(
          "content version changed before the clinical review committed",
        );
      }
      await executor.insert(contentReviewDecisions).values({
        contentEditorialRecordId: record.editorialRecordId,
        contentVersionId: record.contentVersionId,
        contentId: record.contentId,
        version: record.version,
        scopeId: record.scopeId,
        reviewerId: review.reviewerId,
        decision: review.decision,
        rationale: review.rationale,
        correlationId: review.correlationId,
        reviewedAt: new Date(review.reviewedAt),
      });
      const editorialRows = await executor
        .update(contentEditorialRecords)
        .set({
          preflight: persistedPreflight,
          updatedAt: new Date(review.reviewedAt),
        })
        .where(
          and(
            eq(contentEditorialRecords.id, record.editorialRecordId),
            eq(
              contentEditorialRecords.contentVersionId,
              record.contentVersionId,
            ),
            eq(contentEditorialRecords.contentId, record.contentId),
            eq(contentEditorialRecords.version, record.version),
            eq(contentEditorialRecords.scopeId, record.scopeId),
          ),
        )
        .returning({ id: contentEditorialRecords.id });
      if (editorialRows.length === 0) {
        throw new PersistenceConflictError(
          "authoring record changed before the clinical review committed",
        );
      }
      await executor
        .insert(outboxEvents)
        .values(createOutboxInsert(transition.event));
      await executor.execute(
        sql`select
        set_config('cvg.audit_write', 'on', true),
        set_config('cvg.audit_read', '', true),
        set_config('cvg.audit_scope_id', ${record.scopeId}, true)`,
      );
      await executor
        .insert(auditEntries)
        .values(auditEntryToRow(transition.audit));
    });
    return Object.freeze({
      ...record,
      contentStatus: transition.nextStatus,
      preflight: persistedPreflight,
      latestReview: review,
    });
  };
}
