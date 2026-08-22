import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AuthoringIdempotencyPort,
  AuthoringIdempotencyRecord,
  AuthoringPublicationResult,
  AuthoringPreflight,
  AuthoringRepositoryPort,
  AuthoringReviewResult,
  ClinicalReviewRecord,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import { PersistenceMappingError } from "./attempt-repository.js";
import { authoringWorkflowIdempotency } from "./schema.js";
import type * as schema from "./schema.js";
import {
  assertIdempotencyKey,
  lockIdempotencyKey,
} from "./idempotency-policy.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type AuthoringWorkflowResponse =
  AuthoringReviewResult | AuthoringPublicationResult;

type AuthoringWorkflowReplayPayload = Readonly<{
  readonly schemaVersion: 1;
  readonly contentId: string;
  readonly version: number;
  readonly contentStatus: ContentStatus;
  readonly preflight: AuthoringPreflight;
  readonly recordHash: string;
  readonly review?: ClinicalReviewRecord;
}>;

type AuthoringReplayBase = Readonly<
  Omit<AuthoringWorkflowReplayPayload, "review">
>;

type AuthoringIdempotencyDatabaseRow = Readonly<{
  readonly operation: string;
  readonly fingerprint: string;
  readonly contentId: string;
  readonly version: number;
  readonly response: unknown;
  readonly responseHash: string;
  readonly expiresAt: Date;
}>;

const authoringWorkflowTtlMs = 24 * 60 * 60 * 1_000;
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/u;
const replayHashPattern = /^(?:sha256:[0-9a-f]{64}|legacy:[0-9a-f]{32})$/u;
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

function assertFingerprint(fingerprint: string): void {
  if (!fingerprintPattern.test(fingerprint)) {
    throw new PersistenceMappingError(
      "authoring idempotency fingerprint must be a sha256 digest",
    );
  }
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const object = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
    .join(",")}}`;
}

function responseHash(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(stableSerialize(value), "utf8")
    .digest("hex")}`;
}

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

function parsePreflight(value: unknown): AuthoringPreflight {
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

function parseClinicalReviewSnapshot(value: unknown): ClinicalReviewRecord {
  if (!isRecord(value)) {
    throw new PersistenceMappingError(
      "clinical review idempotency snapshot is invalid",
    );
  }
  const decision = value.decision;
  if (decision !== "APROVAR_CLINICAMENTE" && decision !== "SOLICITAR_AJUSTES") {
    throw new PersistenceMappingError(
      "clinical review idempotency decision is invalid",
    );
  }
  const version = value.version;
  if (typeof version !== "number") {
    throw new PersistenceMappingError(
      "clinical review idempotency version is invalid",
    );
  }
  assertVersion(version, "clinical review version");
  return Object.freeze({
    reviewId: requiredString(value.reviewId, "review.reviewId"),
    contentId: requiredString(value.contentId, "review.contentId"),
    version,
    contentEditorialRecordId: requiredString(
      value.contentEditorialRecordId,
      "review.contentEditorialRecordId",
    ),
    contentVersionId: requiredString(
      value.contentVersionId,
      "review.contentVersionId",
    ),
    scopeId: requiredString(value.scopeId, "review.scopeId"),
    reviewerId: requiredString(value.reviewerId, "review.reviewerId"),
    decision,
    rationale: requiredString(value.rationale, "review.rationale"),
    correlationId: requiredString(value.correlationId, "review.correlationId"),
    reviewedAt: requiredString(value.reviewedAt, "review.reviewedAt"),
  });
}

function parseReplayBase(
  value: Readonly<Record<string, unknown>>,
): AuthoringReplayBase {
  if (value.schemaVersion !== 1) {
    throw new PersistenceMappingError(
      "authoring idempotency replay payload is invalid",
    );
  }
  const version = value.version;
  if (typeof version !== "number") {
    throw new PersistenceMappingError(
      "authoring idempotency replay version is invalid",
    );
  }
  assertVersion(version, "authoring replay version");
  const contentId = requiredString(
    value.contentId,
    "authoring replay contentId",
  );
  const contentStatusValue = value.contentStatus;
  if (typeof contentStatusValue !== "string") {
    throw new PersistenceMappingError(
      "authoring idempotency replay status is invalid",
    );
  }
  const recordHash = requiredString(
    value.recordHash,
    "authoring replay recordHash",
  );
  if (!replayHashPattern.test(recordHash)) {
    throw new PersistenceMappingError(
      "authoring idempotency replay recordHash is invalid",
    );
  }
  return Object.freeze({
    schemaVersion: 1,
    contentId,
    version,
    contentStatus: assertContentStatus(contentStatusValue),
    preflight: parsePreflight(value.preflight),
    recordHash,
  });
}

function parseReplayPayload(
  operation: AuthoringIdempotencyRecord["operation"],
  value: unknown,
): AuthoringWorkflowReplayPayload {
  if (!isRecord(value)) {
    throw new PersistenceMappingError(
      "authoring idempotency replay payload is invalid",
    );
  }
  const base = parseReplayBase(value);
  if (operation === "clinical_review") {
    if (!isRecord(value.review)) {
      throw new PersistenceMappingError(
        "clinical review idempotency snapshot is invalid",
      );
    }
    const review = parseClinicalReviewSnapshot(value.review);
    if (
      review.contentId !== base.contentId ||
      review.version !== base.version
    ) {
      throw new PersistenceMappingError(
        "clinical review idempotency snapshot does not match content",
      );
    }
    return Object.freeze({ ...base, review });
  }
  if ("review" in value) {
    throw new PersistenceMappingError(
      "publication idempotency snapshot contains a review",
    );
  }
  return base;
}

function createReplayPayload(
  value: AuthoringIdempotencyRecord,
): AuthoringWorkflowReplayPayload {
  const record = value.result.record;
  const base = {
    schemaVersion: 1 as const,
    contentId: record.contentId,
    version: record.version,
    contentStatus: record.contentStatus,
    preflight: record.preflight,
    recordHash: responseHash(record),
  };
  if (value.operation === "clinical_review") {
    return Object.freeze({ ...base, review: value.result.review });
  }
  return Object.freeze(base);
}

async function rehydrateReplayResult(
  operation: AuthoringIdempotencyRecord["operation"],
  payload: AuthoringWorkflowReplayPayload,
  repository: AuthoringRepositoryPort,
): Promise<AuthoringWorkflowResponse> {
  const record = await repository.find(payload.contentId, payload.version);
  if (record === null) {
    throw new PersistenceMappingError(
      "authoring idempotency content record is missing",
    );
  }
  if (
    record.contentStatus !== payload.contentStatus ||
    responseHash(record.preflight) !== responseHash(payload.preflight)
  ) {
    throw new PersistenceMappingError(
      "authoring idempotency content state has changed",
    );
  }
  if (
    payload.recordHash.startsWith("sha256:") &&
    responseHash(record) !== payload.recordHash
  ) {
    throw new PersistenceMappingError(
      "authoring idempotency record hash is invalid",
    );
  }
  if (operation === "clinical_review") {
    if (payload.review === undefined) {
      throw new PersistenceMappingError(
        "clinical review idempotency result is incomplete",
      );
    }
    return Object.freeze({ record, review: payload.review });
  }
  return Object.freeze({ record });
}

function isAuthoringWorkflowOperation(
  value: string,
): value is AuthoringIdempotencyRecord["operation"] {
  return value === "clinical_review" || value === "publication";
}

async function loadAuthoringIdempotencyRow(
  db: DatabaseExecutor,
  key: string,
): Promise<AuthoringIdempotencyDatabaseRow | null> {
  assertIdempotencyKey(key, "authoring idempotency");
  await lockIdempotencyKey(db, "authoring", key);
  await db
    .delete(authoringWorkflowIdempotency)
    .where(sql`${authoringWorkflowIdempotency.expiresAt} <= CURRENT_TIMESTAMP`);
  const rows = await db
    .select({
      operation: authoringWorkflowIdempotency.operation,
      fingerprint: authoringWorkflowIdempotency.fingerprint,
      contentId: authoringWorkflowIdempotency.contentId,
      version: authoringWorkflowIdempotency.version,
      response: authoringWorkflowIdempotency.response,
      responseHash: authoringWorkflowIdempotency.responseHash,
      expiresAt: authoringWorkflowIdempotency.expiresAt,
    })
    .from(authoringWorkflowIdempotency)
    .where(
      and(
        eq(authoringWorkflowIdempotency.key, key),
        sql`${authoringWorkflowIdempotency.expiresAt} > CURRENT_TIMESTAMP`,
      ),
    )
    .limit(1);
  const row = rows[0];
  if (row === undefined || row.expiresAt <= new Date()) return null;
  return row;
}

async function findAuthoringIdempotency(
  db: DatabaseExecutor,
  repository: AuthoringRepositoryPort,
  key: string,
): Promise<AuthoringIdempotencyRecord | null> {
  const row = await loadAuthoringIdempotencyRow(db, key);
  if (row === null) return null;
  if (!isAuthoringWorkflowOperation(row.operation)) {
    throw new PersistenceMappingError(
      "authoring idempotency operation is invalid",
    );
  }
  assertFingerprint(row.fingerprint);
  const payload = parseReplayPayload(row.operation, row.response);
  if (payload.contentId !== row.contentId || payload.version !== row.version) {
    throw new PersistenceMappingError(
      "authoring idempotency content identity is invalid",
    );
  }
  if (
    row.responseHash.startsWith("sha256:") &&
    row.responseHash !== responseHash(payload)
  ) {
    throw new PersistenceMappingError(
      "authoring idempotency response hash is invalid",
    );
  }
  const result = await rehydrateReplayResult(
    row.operation,
    payload,
    repository,
  );
  return Object.freeze({
    operation: row.operation,
    fingerprint: row.fingerprint,
    result,
  }) as AuthoringIdempotencyRecord;
}

async function storeAuthoringIdempotency(
  db: DatabaseExecutor,
  key: string,
  value: AuthoringIdempotencyRecord,
): Promise<void> {
  assertIdempotencyKey(key, "authoring idempotency");
  assertFingerprint(value.fingerprint);
  const payload = createReplayPayload(value);
  await lockIdempotencyKey(db, "authoring", key);
  await db
    .delete(authoringWorkflowIdempotency)
    .where(sql`${authoringWorkflowIdempotency.expiresAt} <= CURRENT_TIMESTAMP`);
  await db
    .insert(authoringWorkflowIdempotency)
    .values({
      key,
      operation: value.operation,
      fingerprint: value.fingerprint,
      contentId: payload.contentId,
      version: payload.version,
      response: payload,
      responseHash: responseHash(payload),
      expiresAt: sql`CURRENT_TIMESTAMP + (${authoringWorkflowTtlMs} * interval '1 millisecond')`,
    })
    .onConflictDoNothing({
      target: authoringWorkflowIdempotency.key,
    });
}

export function createAuthoringIdempotency(
  db: DatabaseExecutor,
  repository: AuthoringRepositoryPort,
): AuthoringIdempotencyPort {
  return Object.freeze({
    find: (key: string) => findAuthoringIdempotency(db, repository, key),
    store: (key: string, value: AuthoringIdempotencyRecord) =>
      storeAuthoringIdempotency(db, key, value),
  });
}
