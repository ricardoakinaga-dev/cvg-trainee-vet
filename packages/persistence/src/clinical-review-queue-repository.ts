import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ClinicalReviewDecision,
  ClinicalReviewQueueItem,
  ClinicalReviewQueuePort,
  ClinicalReviewQueueQuery,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import { PersistenceMappingError } from "./attempt-repository.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

type ClinicalReviewQueueRow = Readonly<{
  readonly contentId: unknown;
  readonly version: unknown;
  readonly scopeId: unknown;
  readonly moduleId: unknown;
  readonly sessionId: unknown;
  readonly objectiveId: unknown;
  readonly authorId: unknown;
  readonly contentStatus: unknown;
  readonly reviewStatus: unknown;
  readonly technicalChecksPassed: unknown;
  readonly latestDecision: unknown;
  readonly latestReviewedAt: unknown;
}>;

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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must be a non-empty string`);
  }
  return value;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new PersistenceMappingError(`${field} must be a positive integer`);
  }
  return parsed;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new PersistenceMappingError(`${field} must be boolean`);
}

function parseContentStatus(value: unknown): ContentStatus {
  const status = requiredString(value, "contentStatus");
  if (!contentStatuses.includes(status as ContentStatus)) {
    throw new PersistenceMappingError("content status is invalid");
  }
  return status as ContentStatus;
}

function parseReviewDecision(value: unknown): ClinicalReviewDecision | null {
  if (value === null || value === undefined) return null;
  if (value !== "APROVAR_CLINICAMENTE" && value !== "SOLICITAR_AJUSTES") {
    throw new PersistenceMappingError("clinical review decision is invalid");
  }
  return value;
}

function parseReviewedAt(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(requiredString(value, "latestReviewedAt"));
  if (Number.isNaN(parsed.getTime())) {
    throw new PersistenceMappingError("latestReviewedAt is invalid");
  }
  return parsed.toISOString();
}

export function clinicalReviewQueueRowToItem(
  row: ClinicalReviewQueueRow,
): ClinicalReviewQueueItem {
  const latestDecision = parseReviewDecision(row.latestDecision);
  const latestReviewedAt =
    row.latestReviewedAt === null || row.latestReviewedAt === undefined
      ? null
      : parseReviewedAt(row.latestReviewedAt);
  if ((latestDecision === null) !== (latestReviewedAt === null)) {
    throw new PersistenceMappingError(
      "clinical review decision and timestamp must be paired",
    );
  }
  const reviewStatus = requiredString(row.reviewStatus, "reviewStatus");
  if (
    reviewStatus !== "PENDING" &&
    reviewStatus !== "APPROVED" &&
    reviewStatus !== "ADJUSTMENTS_REQUESTED"
  ) {
    throw new PersistenceMappingError("clinical review status is invalid");
  }
  return Object.freeze({
    contentId: requiredString(row.contentId, "contentId"),
    version: requiredPositiveInteger(row.version, "version"),
    scopeId: requiredString(row.scopeId, "scopeId"),
    moduleId: requiredString(row.moduleId, "moduleId"),
    sessionId: requiredString(row.sessionId, "sessionId"),
    objectiveId: requiredString(row.objectiveId, "objectiveId"),
    authorId: requiredString(row.authorId, "authorId"),
    contentStatus: parseContentStatus(row.contentStatus),
    reviewStatus: reviewStatus as ClinicalReviewQueueItem["reviewStatus"],
    technicalChecksPassed: requiredBoolean(
      row.technicalChecksPassed,
      "technicalChecksPassed",
    ),
    latestReview:
      latestDecision === null || latestReviewedAt === null
        ? null
        : Object.freeze({
            decision: latestDecision,
            reviewedAt: latestReviewedAt,
          }),
  });
}

function pendingClause(query: ClinicalReviewQueueQuery) {
  return query.status === "PENDING"
    ? sql`
        and version.status not in (
          'APROVADO_CLINICAMENTE',
          'AUTORIZADO_PARA_PUBLICACAO',
          'PUBLICADO',
          'RETIRADO',
          'VENCIDO'
        )
        and (latest.decision is null or latest.decision = 'SOLICITAR_AJUSTES')`
    : sql``;
}

export function createClinicalReviewQueueRepository(
  db: DatabaseExecutor,
): ClinicalReviewQueuePort {
  const repository: ClinicalReviewQueuePort = {
    listClinicalReviewQueue: async (scopeId, query) => {
      const offset = (query.page - 1) * query.perPage;
      const filter = pendingClause(query);
      const from = sql`
        from content_editorial_records editorial
        inner join content_versions version
          on version.id = editorial.content_version_id
        left join lateral (
          select decision, reviewed_at
          from content_review_decisions review
          where review.content_id = editorial.content_id
            and review.version = editorial.version
            and review.scope_id = editorial.scope_id
          order by review.reviewed_at desc, review.created_at desc
          limit 1
        ) latest on true
        where editorial.scope_id = ${scopeId}
        ${filter}
      `;
      const [rows, totalRows] = await Promise.all([
        db.execute<ClinicalReviewQueueRow>(sql`
          select
            editorial.content_id as "contentId",
            editorial.version as "version",
            editorial.scope_id as "scopeId",
            editorial.module_id as "moduleId",
            editorial.session_id as "sessionId",
            editorial.objective_id as "objectiveId",
            editorial.author_id as "authorId",
            version.status as "contentStatus",
            case
              when latest.decision = 'APROVAR_CLINICAMENTE' then 'APPROVED'
              when latest.decision = 'SOLICITAR_AJUSTES'
                then 'ADJUSTMENTS_REQUESTED'
              else 'PENDING'
            end as "reviewStatus",
            coalesce(editorial.preflight ->> 'technicalChecksPassed', 'false')
              as "technicalChecksPassed",
            latest.decision as "latestDecision",
            latest.reviewed_at as "latestReviewedAt"
          ${from}
          order by editorial.module_id, editorial.session_id,
            editorial.version, editorial.content_id
          limit ${query.perPage} offset ${offset}
        `),
        db.execute<{ readonly total: unknown }>(sql`
          select count(*)::int as "total"
          ${from}
        `),
      ]);
      const total = Number(totalRows[0]?.total ?? 0);
      if (!Number.isSafeInteger(total) || total < 0) {
        throw new PersistenceMappingError(
          "clinical review queue total is invalid",
        );
      }
      return Object.freeze({
        items: Object.freeze(rows.map(clinicalReviewQueueRowToItem)),
        page: query.page,
        perPage: query.perPage,
        total,
      });
    },
  };
  return Object.freeze(repository);
}
