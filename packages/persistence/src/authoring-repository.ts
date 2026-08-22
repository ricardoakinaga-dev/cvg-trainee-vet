import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  advanceContentWithinTransaction,
  type AuthoringTransactionPort,
  type AuthoringTransactionalOperations,
} from "@cvg/application";
import type {
  AuthoringRecord,
  AuthoringRepositoryPort,
  ClinicalReviewRecord,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import { PersistenceMappingError } from "./attempt-repository.js";
import { createAuthoringIdempotency } from "./authoring-idempotency-repository.js";
import { createClinicalApproverPort } from "./clinical-approver-repository.js";
import { createContentTransactionalOperations } from "./content-repository.js";
import {
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
} from "./schema.js";
import type * as schema from "./schema.js";

export { createClinicalApproverPort } from "./clinical-approver-repository.js";

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

type ParsedAuthoringItem = Readonly<{
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: AuthoringRecord["responseMode"];
  readonly choices?: NonNullable<AuthoringRecord["choices"]>;
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: NonNullable<AuthoringRecord["rubric"]>;
  readonly interaction?: NonNullable<AuthoringRecord["interaction"]>;
  readonly humanCorrectionOwner?: "RICARDO";
  readonly digitalCaseStage?: NonNullable<AuthoringRecord["digitalCaseStage"]>;
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

type AuthoringParticipant = AuthoringRecord["participant"];

function parseResponseMode(
  value: unknown,
  message: string,
  allowNone: boolean,
): AuthoringRecord["responseMode"] {
  const valid =
    value === "CHOICE" ||
    value === "TEXT" ||
    value === "STRUCTURED_FIELDS" ||
    value === "DOSE_INFUSION" ||
    (allowNone && value === "NONE");
  if (!valid) throw new PersistenceMappingError(message);
  return value as AuthoringRecord["responseMode"];
}

function parseSourceRefs(value: unknown): AuthoringRecord["sourceRefs"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PersistenceMappingError("authoring sourceRefs are required");
  }
  return Object.freeze(
    value.map((source, index) => {
      if (!isRecord(source)) {
        throw new PersistenceMappingError(
          "sourceRefs[" + index + "] is invalid",
        );
      }
      return Object.freeze({
        code: requiredString(source.code, "sourceRefs[" + index + "].code"),
        locator: requiredString(
          source.locator,
          "sourceRefs[" + index + "].locator",
        ),
        updateRequired: requiredBoolean(
          source.updateRequired,
          "sourceRefs[" + index + "].updateRequired",
        ),
      });
    }),
  );
}

function parseParticipantKind(value: unknown): AuthoringParticipant["kind"] {
  if (value === "QUESTAO" || value === "CASO") return value;
  throw new PersistenceMappingError("item.participant.kind is invalid");
}

function parseSelectionMode(
  value: unknown,
): NonNullable<AuthoringParticipant["selectionMode"]> {
  if (value === "SINGLE" || value === "MULTIPLE") return value;
  throw new PersistenceMappingError(
    "item.participant.selectionMode is invalid",
  );
}

function parseParticipant(value: unknown): AuthoringParticipant {
  if (!isRecord(value)) {
    throw new PersistenceMappingError("authoring participant item is invalid");
  }
  return {
    id: requiredString(value.id, "item.participant.id"),
    ordinal:
      typeof value.ordinal === "number" &&
      Number.isInteger(value.ordinal) &&
      value.ordinal > 0
        ? value.ordinal
        : (() => {
            throw new PersistenceMappingError(
              "item.participant.ordinal is invalid",
            );
          })(),
    kind: parseParticipantKind(value.kind),
    title: requiredString(value.title, "item.participant.title"),
    prompt: requiredString(value.prompt, "item.participant.prompt"),
    responseMode: parseResponseMode(
      value.responseMode,
      "participant response mode is invalid",
      false,
    ) as AuthoringParticipant["responseMode"],
    ...(value.choices === undefined
      ? {}
      : {
          choices: value.choices as NonNullable<
            AuthoringParticipant["choices"]
          >,
        }),
    ...(value.selectionMode === undefined
      ? {}
      : { selectionMode: parseSelectionMode(value.selectionMode) }),
    ...(value.interaction === undefined
      ? {}
      : {
          interaction: value.interaction as NonNullable<
            AuthoringParticipant["interaction"]
          >,
        }),
    ...(value.digitalCaseStage === undefined
      ? {}
      : {
          digitalCaseStage: value.digitalCaseStage as NonNullable<
            AuthoringParticipant["digitalCaseStage"]
          >,
        }),
  };
}

function parseItem(value: unknown): ParsedAuthoringItem {
  if (!isRecord(value)) {
    throw new PersistenceMappingError("authoring item must be an object");
  }
  const responseMode = parseResponseMode(
    value.responseMode,
    "authoring response mode is invalid",
    true,
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
    ...(value.interaction === undefined
      ? {}
      : {
          interaction: value.interaction as NonNullable<
            AuthoringRecord["interaction"]
          >,
        }),
    ...(value.humanCorrectionOwner === undefined
      ? {}
      : { humanCorrectionOwner: value.humanCorrectionOwner as "RICARDO" }),
    ...(value.digitalCaseStage === undefined
      ? {}
      : {
          digitalCaseStage: value.digitalCaseStage as NonNullable<
            AuthoringRecord["digitalCaseStage"]
          >,
        }),
    feedback: requiredString(value.feedback, "item.feedback"),
    critical: requiredBoolean(value.critical, "item.critical"),
    remediationTargetObjectiveId: requiredString(
      value.remediationTargetObjectiveId,
      "item.remediationTargetObjectiveId",
    ),
    sourceRefs: parseSourceRefs(value.sourceRefs),
    participant: parseParticipant(value.participant),
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
  const sourceVerification = value.sourceVerification;
  if (
    sourceVerification !== undefined &&
    sourceVerification !== "VERIFICADO_AUTOMATICAMENTE" &&
    sourceVerification !== "INVALIDO"
  ) {
    throw new PersistenceMappingError(
      "authoring preflight source verification is invalid",
    );
  }
  return Object.freeze({
    ruleVersion: "authoring-preflight-v1" as const,
    technicalChecksPassed: requiredBoolean(
      value.technicalChecksPassed,
      "preflight.technicalChecksPassed",
    ),
    ...(sourceVerification === undefined ? {} : { sourceVerification }),
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

export function authoringRowToRecord(row: AuthoringRowShape): AuthoringRecord {
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
  });
}

async function findAuthoringRecord(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
): Promise<AuthoringRecord | null> {
  const rows = await db
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
      ),
    )
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : authoringRowToRecord(row);
}

async function saveAuthoringPreflight(
  db: DatabaseExecutor,
  record: AuthoringRecord,
  preflight: AuthoringRecord["preflight"],
): Promise<AuthoringRecord> {
  await db
    .update(contentEditorialRecords)
    .set({ preflight, updatedAt: new Date() })
    .where(
      and(
        eq(contentEditorialRecords.id, record.editorialRecordId),
        eq(contentEditorialRecords.contentId, record.contentId),
        eq(contentEditorialRecords.version, record.version),
      ),
    );
  return Object.freeze({ ...record, preflight });
}

async function findLatestClinicalReview(
  db: DatabaseExecutor,
  contentId: string,
  version: number,
): Promise<ClinicalReviewRecord | null> {
  const rows = await db
    .select({
      reviewId: contentReviewDecisions.id,
      contentId: contentReviewDecisions.contentId,
      version: contentReviewDecisions.version,
      contentEditorialRecordId: contentReviewDecisions.contentEditorialRecordId,
      contentVersionId: contentReviewDecisions.contentVersionId,
      scopeId: contentReviewDecisions.scopeId,
      reviewerId: contentReviewDecisions.reviewerId,
      decision: contentReviewDecisions.decision,
      rationale: contentReviewDecisions.rationale,
      correlationId: contentReviewDecisions.correlationId,
      reviewedAt: contentReviewDecisions.reviewedAt,
    })
    .from(contentReviewDecisions)
    .where(
      and(
        eq(contentReviewDecisions.contentId, contentId),
        eq(contentReviewDecisions.version, version),
      ),
    )
    .orderBy(desc(contentReviewDecisions.reviewedAt))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  if (
    row.decision !== "APROVAR_CLINICAMENTE" &&
    row.decision !== "SOLICITAR_AJUSTES"
  ) {
    throw new PersistenceMappingError("clinical review decision is invalid");
  }
  return Object.freeze({
    reviewId: row.reviewId,
    contentId: row.contentId,
    version: row.version,
    contentEditorialRecordId: row.contentEditorialRecordId,
    contentVersionId: row.contentVersionId,
    scopeId: row.scopeId,
    reviewerId: row.reviewerId,
    decision: row.decision,
    rationale: row.rationale,
    correlationId: row.correlationId,
    reviewedAt: row.reviewedAt.toISOString(),
  });
}

async function saveClinicalReview(
  db: DatabaseExecutor,
  review: ClinicalReviewRecord,
): Promise<void> {
  await db.insert(contentReviewDecisions).values({
    id: review.reviewId,
    contentEditorialRecordId: review.contentEditorialRecordId,
    contentVersionId: review.contentVersionId,
    contentId: review.contentId,
    version: review.version,
    scopeId: review.scopeId,
    reviewerId: review.reviewerId,
    decision: review.decision,
    rationale: review.rationale,
    correlationId: review.correlationId,
    reviewedAt: new Date(review.reviewedAt),
  });
}

export function createAuthoringRepository(
  db: DatabaseExecutor,
): AuthoringRepositoryPort {
  const repository: AuthoringRepositoryPort = {
    find: (contentId, version) => findAuthoringRecord(db, contentId, version),
    savePreflight: (record, preflight) =>
      saveAuthoringPreflight(db, record, preflight),
    findLatestClinicalReview: (contentId, version) =>
      findLatestClinicalReview(db, contentId, version),
    saveClinicalReview: (review) => saveClinicalReview(db, review),
  };
  return Object.freeze(repository);
}

export function createAuthoringTransactionPort(
  db: DatabaseExecutor,
  idFactory: () => string,
): AuthoringTransactionPort {
  return Object.freeze({
    run: async <Result>(
      work: (operations: AuthoringTransactionalOperations) => Promise<Result>,
    ): Promise<Result> =>
      db.transaction(async (transaction) => {
        const executor = transaction;
        await executor.execute(
          sql`select set_config('cvg.authoring_workflow', 'true', true)`,
        );
        const contentOperations =
          createContentTransactionalOperations(executor);
        const repository = createAuthoringRepository(executor);
        const operations: AuthoringTransactionalOperations = Object.freeze({
          repository,
          approver: createClinicalApproverPort(executor),
          transition: (
            command: Parameters<
              AuthoringTransactionalOperations["transition"]
            >[0],
          ) =>
            advanceContentWithinTransaction(
              command,
              contentOperations,
              idFactory,
            ),
          idFactory,
          idempotency: createAuthoringIdempotency(executor, repository),
        });
        return work(operations);
      }),
  });
}
