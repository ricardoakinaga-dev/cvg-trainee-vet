import { and, desc, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AuthoringRecord,
  AuthoringDraftCreateOptions,
  AuthoringRepositoryPort,
  AuthoringReview,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import {
  PersistenceConflictError,
  PersistenceMappingError,
} from "./attempt-repository.js";
import { auditEntryToRow } from "./audit-repository.js";
import {
  auditEntries,
  authoringDraftIdempotency,
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export type AuthoringRowShape = Readonly<{
  readonly editorialRecordId: string;
  readonly contentVersionId: string;
  readonly contentId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly authorId: string;
  readonly item: unknown;
  readonly preflight: unknown;
  readonly contentStatus: string;
}>;

export type ReviewRowShape = Readonly<{
  readonly reviewerId: string;
  readonly decision: string;
  readonly rationale: string;
  readonly reviewedAt: Date;
  readonly correlationId: string;
}>;

type ParsedAuthoringItem = Readonly<{
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: AuthoringRecord["responseMode"];
  readonly choices?: NonNullable<AuthoringRecord["choices"]>;
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: NonNullable<AuthoringRecord["rubric"]>;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: AuthoringRecord["sourceRefs"];
  readonly participant: AuthoringRecord["participant"];
}>;

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must be a non-empty string`);
  }
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new PersistenceMappingError(`${field} must be boolean`);
  }
  return value;
}

function requiredStringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError(
      `${field} must be a non-empty string array`,
    );
  }
  return Object.freeze(value.map((item) => item as string));
}

function parseItem(value: unknown): ParsedAuthoringItem {
  if (!isRecord(value)) {
    throw new PersistenceMappingError("authoring item must be an object");
  }
  const participant = value.participant;
  if (!isRecord(participant)) {
    throw new PersistenceMappingError("authoring participant item is invalid");
  }
  const responseMode = value.responseMode;
  if (
    responseMode !== "CHOICE" &&
    responseMode !== "TEXT" &&
    responseMode !== "NONE"
  ) {
    throw new PersistenceMappingError("authoring response mode is invalid");
  }
  const participantResponseMode = participant.responseMode;
  if (
    participantResponseMode !== "CHOICE" &&
    participantResponseMode !== "TEXT"
  ) {
    throw new PersistenceMappingError("participant response mode is invalid");
  }
  const sourceRefs = value.sourceRefs;
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    throw new PersistenceMappingError("authoring sourceRefs are required");
  }
  const parsedSourceRefs = Object.freeze(
    sourceRefs.map((source, index) => {
      if (!isRecord(source)) {
        throw new PersistenceMappingError(`sourceRefs[${index}] is invalid`);
      }
      return Object.freeze({
        code: requiredString(source.code, `sourceRefs[${index}].code`),
        locator: requiredString(source.locator, `sourceRefs[${index}].locator`),
        updateRequired: requiredBoolean(
          source.updateRequired,
          `sourceRefs[${index}].updateRequired`,
        ),
      });
    }),
  );
  return {
    title: requiredString(value.title, "item.title"),
    prompt: requiredString(value.prompt, "item.prompt"),
    responseMode,
    ...(value.choices === undefined
      ? {}
      : {
          choices: value.choices as NonNullable<AuthoringRecord["choices"]>,
        }),
    ...(value.correctChoiceIds === undefined
      ? {}
      : {
          correctChoiceIds: requiredStringArray(
            value.correctChoiceIds,
            "item.correctChoiceIds",
          ),
        }),
    ...(value.rubric === undefined
      ? {}
      : { rubric: value.rubric as NonNullable<AuthoringRecord["rubric"]> }),
    feedback: requiredString(value.feedback, "item.feedback"),
    critical: requiredBoolean(value.critical, "item.critical"),
    remediationTargetObjectiveId: requiredString(
      value.remediationTargetObjectiveId,
      "item.remediationTargetObjectiveId",
    ),
    sourceRefs: parsedSourceRefs,
    participant: {
      id: requiredString(participant.id, "item.participant.id"),
      ordinal:
        typeof participant.ordinal === "number" &&
        Number.isInteger(participant.ordinal) &&
        participant.ordinal > 0
          ? participant.ordinal
          : (() => {
              throw new PersistenceMappingError(
                "item.participant.ordinal is invalid",
              );
            })(),
      kind:
        participant.kind === "QUESTAO" || participant.kind === "CASO"
          ? participant.kind
          : (() => {
              throw new PersistenceMappingError(
                "item.participant.kind is invalid",
              );
            })(),
      title: requiredString(participant.title, "item.participant.title"),
      prompt: requiredString(participant.prompt, "item.participant.prompt"),
      responseMode: participantResponseMode,
      ...(participant.choices === undefined
        ? {}
        : {
            choices: participant.choices as NonNullable<
              AuthoringRecord["participant"]["choices"]
            >,
          }),
      ...(participant.selectionMode === undefined
        ? {}
        : {
            selectionMode:
              participant.selectionMode === "SINGLE" ||
              participant.selectionMode === "MULTIPLE"
                ? participant.selectionMode
                : (() => {
                    throw new PersistenceMappingError(
                      "item.participant.selectionMode is invalid",
                    );
                  })(),
          }),
    },
  };
}

function parsePreflight(value: unknown): AuthoringRecord["preflight"] {
  if (!isRecord(value) || value.ruleVersion !== "authoring-preflight-v1") {
    throw new PersistenceMappingError("authoring preflight is invalid");
  }
  const checks = value.checks;
  if (!isRecord(checks)) {
    throw new PersistenceMappingError("authoring preflight checks are invalid");
  }
  return Object.freeze({
    ruleVersion: "authoring-preflight-v1" as const,
    technicalChecksPassed: requiredBoolean(
      value.technicalChecksPassed,
      "preflight.technicalChecksPassed",
    ),
    ...(value.readyForClinicalReview === undefined
      ? {}
      : {
          readyForClinicalReview: requiredBoolean(
            value.readyForClinicalReview,
            "preflight.readyForClinicalReview",
          ),
        }),
    ...(value.readyForPublication === undefined
      ? {}
      : {
          readyForPublication: requiredBoolean(
            value.readyForPublication,
            "preflight.readyForPublication",
          ),
        }),
    checks: Object.freeze({
      requiredFields: requiredBoolean(
        checks.requiredFields,
        "preflight.checks.requiredFields",
      ),
      correctionMetadata: requiredBoolean(
        checks.correctionMetadata,
        "preflight.checks.correctionMetadata",
      ),
      publicBoundary: requiredBoolean(
        checks.publicBoundary,
        "preflight.checks.publicBoundary",
      ),
      sourceTraceability: requiredBoolean(
        checks.sourceTraceability,
        "preflight.checks.sourceTraceability",
      ),
      publicationBlocked: requiredBoolean(
        checks.publicationBlocked,
        "preflight.checks.publicationBlocked",
      ),
    }),
    checkedAt: requiredString(value.checkedAt, "preflight.checkedAt"),
  });
}

function assertContentStatus(value: string): ContentStatus {
  if (!contentStatuses.includes(value as ContentStatus)) {
    throw new PersistenceMappingError("content status is invalid");
  }
  return value as ContentStatus;
}

function assertVersion(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new PersistenceMappingError(`${field} must be a positive integer`);
  }
}

export function authoringRowToRecord(
  row: AuthoringRowShape,
  latestReview?: AuthoringReview,
): AuthoringRecord {
  for (const [value, field] of [
    [row.editorialRecordId, "editorialRecordId"],
    [row.contentVersionId, "contentVersionId"],
    [row.contentId, "contentId"],
    [row.scopeId, "scopeId"],
    [row.moduleId, "moduleId"],
    [row.sessionId, "sessionId"],
    [row.objectiveId, "objectiveId"],
    [row.authorId, "authorId"],
  ] as const) {
    requiredString(value, field);
  }
  assertVersion(row.version, "version");
  const item = parseItem(row.item);
  const preflight = parsePreflight(row.preflight);
  return Object.freeze({
    editorialRecordId: row.editorialRecordId,
    contentId: row.contentId,
    version: row.version,
    contentVersionId: row.contentVersionId,
    scopeId: row.scopeId,
    moduleId: row.moduleId,
    sessionId: row.sessionId,
    objectiveId: row.objectiveId,
    authorId: row.authorId,
    ...item,
    contentStatus: assertContentStatus(row.contentStatus),
    preflight,
    ...(latestReview === undefined ? {} : { latestReview }),
  });
}

export function reviewRowToState(row: ReviewRowShape): AuthoringReview {
  if (
    row.decision !== "APROVAR_CLINICAMENTE" &&
    row.decision !== "SOLICITAR_AJUSTES"
  ) {
    throw new PersistenceMappingError("review decision is invalid");
  }
  requiredString(row.reviewerId, "reviewerId");
  requiredString(row.rationale, "rationale");
  requiredString(row.correlationId, "correlationId");
  if (Number.isNaN(row.reviewedAt.getTime())) {
    throw new PersistenceMappingError("reviewedAt must be valid");
  }
  return Object.freeze({
    reviewerId: row.reviewerId,
    decision: row.decision,
    rationale: row.rationale,
    reviewedAt: row.reviewedAt.toISOString(),
    correlationId: row.correlationId,
  });
}

async function findAuthoringRecord(
  executor: DatabaseExecutor,
  contentId: string,
  version: number,
  scopeId: string,
): Promise<AuthoringRecord | null> {
  const rows = await executor
    .select({
      editorialRecordId: contentEditorialRecords.id,
      contentVersionId: contentEditorialRecords.contentVersionId,
      contentId: contentEditorialRecords.contentId,
      scopeId: contentEditorialRecords.scopeId,
      version: contentEditorialRecords.version,
      moduleId: contentEditorialRecords.moduleId,
      sessionId: contentEditorialRecords.sessionId,
      objectiveId: contentEditorialRecords.objectiveId,
      authorId: contentEditorialRecords.authorId,
      item: contentEditorialRecords.item,
      preflight: contentEditorialRecords.preflight,
      contentStatus: contentVersions.status,
    })
    .from(contentEditorialRecords)
    .innerJoin(
      contentVersions,
      eq(contentEditorialRecords.contentVersionId, contentVersions.id),
    )
    .where(
      and(
        eq(contentEditorialRecords.contentId, contentId),
        eq(contentEditorialRecords.version, version),
        eq(contentEditorialRecords.scopeId, scopeId),
        eq(contentVersions.scopeId, scopeId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;

  const reviews = await executor
    .select({
      reviewerId: contentReviewDecisions.reviewerId,
      decision: contentReviewDecisions.decision,
      rationale: contentReviewDecisions.rationale,
      reviewedAt: contentReviewDecisions.reviewedAt,
      correlationId: contentReviewDecisions.correlationId,
    })
    .from(contentReviewDecisions)
    .where(
      and(
        eq(
          contentReviewDecisions.contentEditorialRecordId,
          row.editorialRecordId,
        ),
        eq(contentReviewDecisions.scopeId, scopeId),
      ),
    )
    .orderBy(
      desc(contentReviewDecisions.reviewedAt),
      desc(contentReviewDecisions.createdAt),
      desc(contentReviewDecisions.id),
    )
    .limit(1);
  const reviewRow = reviews[0];
  return authoringRowToRecord(
    row,
    reviewRow === undefined ? undefined : reviewRowToState(reviewRow),
  );
}

function persistedItem(record: AuthoringRecord): schema.PersistedAuthoringItem {
  return {
    title: record.title,
    prompt: record.prompt,
    responseMode: record.responseMode,
    ...(record.choices === undefined ? {} : { choices: record.choices }),
    ...(record.correctChoiceIds === undefined
      ? {}
      : { correctChoiceIds: record.correctChoiceIds }),
    ...(record.rubric === undefined ? {} : { rubric: record.rubric }),
    feedback: record.feedback,
    critical: record.critical,
    remediationTargetObjectiveId: record.remediationTargetObjectiveId,
    sourceRefs: record.sourceRefs,
    participant: record.participant,
  };
}

function assertDraftPersistenceInput(
  record: AuthoringRecord,
  options: AuthoringDraftCreateOptions,
): void {
  if (record.contentStatus !== "RASCUNHO" || record.version !== 1) {
    throw new PersistenceMappingError(
      "authoring draft persistence accepts only version-one RASCUNHO records",
    );
  }
  if (
    record.contentId.trim().length === 0 ||
    record.contentVersionId.trim().length === 0 ||
    record.editorialRecordId.trim().length === 0 ||
    record.scopeId.trim().length === 0 ||
    record.authorId.trim().length === 0
  ) {
    throw new PersistenceMappingError("authoring draft identity is incomplete");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/u.test(options.idempotencyKey)) {
    throw new PersistenceMappingError(
      "authoring draft idempotency key is invalid",
    );
  }
  if (
    options.audit.actorKind !== "AUTHENTICATED" ||
    options.audit.principalId !== record.authorId ||
    options.audit.scopeId !== record.scopeId ||
    options.audit.action !== "CONTENT_DRAFT_CREATED" ||
    options.audit.resourceType !== "content_version" ||
    options.audit.resourceId !== record.contentId
  ) {
    throw new PersistenceMappingError(
      "authoring draft audit context does not match the draft",
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function createAuthoringRepository(
  db: DatabaseExecutor,
): AuthoringRepositoryPort {
  const repository: AuthoringRepositoryPort = {
    createDraft: async (record, options) => {
      try {
        return await db.transaction(async (transaction) => {
          const executor = transaction as unknown as DatabaseExecutor;
          assertDraftPersistenceInput(record, options);
          await setDatabaseSecurityContext(executor, {
            scopeId: record.scopeId,
          });
          await executor.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${options.idempotencyKey}, 0))`,
          );

          const existing = await executor
            .select({
              fingerprint: authoringDraftIdempotency.fingerprint,
              contentEditorialRecordId:
                authoringDraftIdempotency.contentEditorialRecordId,
              contentVersionId: authoringDraftIdempotency.contentVersionId,
              contentId: authoringDraftIdempotency.contentId,
              version: authoringDraftIdempotency.version,
              scopeId: authoringDraftIdempotency.scopeId,
            })
            .from(authoringDraftIdempotency)
            .where(eq(authoringDraftIdempotency.key, options.idempotencyKey))
            .limit(1);
          const existingRow = existing[0];
          if (existingRow !== undefined) {
            if (existingRow.fingerprint !== options.fingerprint) {
              throw new PersistenceConflictError(
                "authoring draft idempotency key has another fingerprint",
              );
            }
            const replay = await findAuthoringRecord(
              executor,
              existingRow.contentId,
              existingRow.version,
              existingRow.scopeId,
            );
            if (replay === null) {
              throw new PersistenceMappingError(
                "authoring draft idempotency record has no content",
              );
            }
            if (
              replay.editorialRecordId !==
                existingRow.contentEditorialRecordId ||
              replay.contentVersionId !== existingRow.contentVersionId ||
              replay.contentId !== existingRow.contentId ||
              replay.version !== existingRow.version ||
              replay.scopeId !== existingRow.scopeId
            ) {
              throw new PersistenceMappingError(
                "authoring draft idempotency record identity mismatch",
              );
            }
            return replay;
          }

          const item = persistedItem(record);
          await executor.insert(contentVersions).values({
            id: record.contentVersionId,
            contentId: record.contentId,
            scopeId: record.scopeId,
            version: record.version,
            status: record.contentStatus,
            kind: record.participant.kind,
            title: record.title,
            participantText: record.participant.prompt,
            responseMode: record.participant.responseMode,
            ...(record.participant.choices === undefined
              ? {}
              : { participantOptions: record.participant.choices }),
            ...(record.participant.selectionMode === undefined
              ? {}
              : { participantSelectionMode: record.participant.selectionMode }),
          });
          await executor.insert(contentEditorialRecords).values({
            id: record.editorialRecordId,
            contentVersionId: record.contentVersionId,
            contentId: record.contentId,
            scopeId: record.scopeId,
            version: record.version,
            moduleId: record.moduleId,
            sessionId: record.sessionId,
            objectiveId: record.objectiveId,
            authorId: record.authorId,
            item,
            preflight: record.preflight,
          });
          await executor.execute(
            sql`select
            set_config('cvg.audit_write', 'on', true),
            set_config('cvg.audit_read', '', true),
            set_config('cvg.audit_scope_id', ${record.scopeId}, true)`,
          );
          await executor
            .insert(auditEntries)
            .values(auditEntryToRow(options.audit));
          await executor.insert(authoringDraftIdempotency).values({
            key: options.idempotencyKey,
            operation: "create_authoring_draft",
            fingerprint: options.fingerprint,
            contentEditorialRecordId: record.editorialRecordId,
            contentVersionId: record.contentVersionId,
            contentId: record.contentId,
            version: record.version,
            scopeId: record.scopeId,
            authorId: record.authorId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
          });
          return record;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new PersistenceConflictError(
            "authoring draft idempotency key is already in use",
          );
        }
        throw error;
      }
    },
    find: async (contentId, version, scopeId) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId });
        return findAuthoringRecord(executor, contentId, version, scopeId);
      }),
    savePreflight: async (record, preflight) => {
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: record.scopeId });
        await executor
          .update(contentEditorialRecords)
          .set({ preflight, updatedAt: new Date() })
          .where(
            and(
              eq(contentEditorialRecords.id, record.editorialRecordId),
              eq(contentEditorialRecords.contentId, record.contentId),
              eq(contentEditorialRecords.version, record.version),
              eq(contentEditorialRecords.scopeId, record.scopeId),
            ),
          );
      });
      return Object.freeze({ ...record, preflight });
    },
    saveReview: async (record, review) => {
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: record.scopeId });
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
        await executor
          .update(contentEditorialRecords)
          .set({ updatedAt: new Date() })
          .where(
            and(
              eq(
                contentEditorialRecords.contentVersionId,
                record.contentVersionId,
              ),
              eq(contentEditorialRecords.contentId, record.contentId),
              eq(contentEditorialRecords.version, record.version),
              eq(contentEditorialRecords.scopeId, record.scopeId),
            ),
          );
      });
      return Object.freeze({ ...record, latestReview: review });
    },
    rollbackReview: async (record, preflight, review) => {
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: record.scopeId });
        await executor
          .delete(contentReviewDecisions)
          .where(
            and(
              eq(
                contentReviewDecisions.contentEditorialRecordId,
                record.editorialRecordId,
              ),
              eq(contentReviewDecisions.reviewerId, review.reviewerId),
              eq(contentReviewDecisions.correlationId, review.correlationId),
              eq(contentReviewDecisions.scopeId, record.scopeId),
            ),
          );
        await executor
          .update(contentEditorialRecords)
          .set({ preflight, updatedAt: new Date() })
          .where(
            and(
              eq(contentEditorialRecords.id, record.editorialRecordId),
              eq(contentEditorialRecords.contentId, record.contentId),
              eq(contentEditorialRecords.version, record.version),
              eq(contentEditorialRecords.scopeId, record.scopeId),
            ),
          );
      });
    },
  };
  return Object.freeze(repository);
}
