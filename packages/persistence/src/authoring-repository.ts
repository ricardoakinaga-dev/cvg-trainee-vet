import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AuthoringRecord,
  AuthoringRepositoryPort,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

import { PersistenceMappingError } from "./attempt-repository.js";
import { contentEditorialRecords, contentVersions } from "./schema.js";
import type * as schema from "./schema.js";

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

export function createAuthoringRepository(
  db: DatabaseExecutor,
): AuthoringRepositoryPort {
  const repository: AuthoringRepositoryPort = {
    find: async (contentId, version) => {
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
      if (row === undefined) return null;

      return authoringRowToRecord(row);
    },
    savePreflight: async (record, preflight) => {
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
    },
  };
  return Object.freeze(repository);
}
