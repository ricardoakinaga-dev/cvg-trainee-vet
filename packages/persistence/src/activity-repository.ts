import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AttemptStatus } from "@cvg/domain";
import type {
  ActivityReadPort,
  ParticipantReflectionAnswer,
  ParticipantReflectionState,
  ParticipantActivityChoice,
  ParticipantActivityItem,
  ParticipantActivityState,
} from "@cvg/application";
import { deriveReflectionState as deriveReflectionStateUseCase } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  activityAssignments,
  answers,
  attempts,
  contentVersions,
  learningActivities,
  learningActivityItems,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export { PersistenceMappingError } from "./attempt-repository.js";

export type ActivityRowShape = Readonly<{
  readonly activityId: string;
  readonly scopeId: string;
  readonly slug: string;
  readonly title: string;
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: string;
  readonly itemTitle: string;
  readonly text: string;
  readonly responseMode: string;
  readonly choices?: unknown;
  readonly selectionMode?: unknown;
}>;

export type ReflectionRowShape = Readonly<{
  readonly itemId: string;
  readonly attemptId: string | null;
  readonly attemptStatus: string | null;
  readonly attemptVersion: number | null;
  readonly attemptUpdatedAt: Date | null;
  readonly response: string | null;
  readonly savedAt: Date | null;
}>;

const supportedKinds = ["LEITURA", "QUESTAO", "CASO", "REFLEXAO"] as const;
const supportedResponseModes = ["TEXT", "CHOICE", "NONE"] as const;
const supportedAttemptStatuses = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
] as const satisfies readonly AttemptStatus[];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function parseKind(value: string): ParticipantActivityItem["kind"] {
  if (!supportedKinds.includes(value as (typeof supportedKinds)[number])) {
    throw new PersistenceMappingError("content kind is not supported");
  }
  return value as ParticipantActivityItem["kind"];
}

function parseResponseMode(
  value: string,
): ParticipantActivityItem["responseMode"] {
  if (
    !supportedResponseModes.includes(
      value as (typeof supportedResponseModes)[number],
    )
  ) {
    throw new PersistenceMappingError("response mode is not supported");
  }
  return value as ParticipantActivityItem["responseMode"];
}

function parsePlainText(value: string, field: string): string {
  assertNonEmpty(value, field);
  if (/<[^>]*>/u.test(value)) {
    throw new PersistenceMappingError(`${field} must be plain text`);
  }
  if (value.length > 20_000) {
    throw new PersistenceMappingError(`${field} exceeds the maximum size`);
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseChoices(
  value: unknown,
): readonly ParticipantActivityChoice[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length < 2 || value.length > 12) {
    throw new PersistenceMappingError("content choices are invalid");
  }

  const ids = new Set<string>();
  const choices = value.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new PersistenceMappingError(
        `content choice ${index + 1} is invalid`,
      );
    }
    const id = candidate.id;
    const label = candidate.label;
    const text = candidate.text;
    if (
      typeof id !== "string" ||
      typeof label !== "string" ||
      typeof text !== "string" ||
      id.trim().length === 0 ||
      label.trim().length === 0
    ) {
      throw new PersistenceMappingError(
        `content choice ${index + 1} is invalid`,
      );
    }
    if (ids.has(id)) {
      throw new PersistenceMappingError("content choice ids must be unique");
    }
    ids.add(id);
    return Object.freeze({
      id: id.trim(),
      label: label.trim(),
      text: parsePlainText(text, `choice ${index + 1}`),
    });
  });

  return Object.freeze(choices);
}

function parseSelectionMode(value: unknown): "SINGLE" | "MULTIPLE" | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== "SINGLE" && value !== "MULTIPLE") {
    throw new PersistenceMappingError("content selection mode is invalid");
  }
  return value;
}

function parseAttemptStatus(value: string): AttemptStatus {
  if (
    !supportedAttemptStatuses.includes(
      value as (typeof supportedAttemptStatuses)[number],
    )
  ) {
    throw new PersistenceMappingError("reflection attempt status is invalid");
  }
  return value as AttemptStatus;
}

function parseTimestamp(value: Date, field: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new PersistenceMappingError(`${field} must be a valid timestamp`);
  }
  return value.toISOString();
}

function compareAttemptRows(
  left: ReflectionRowShape,
  right: ReflectionRowShape,
): number {
  if (left.attemptUpdatedAt === null || right.attemptUpdatedAt === null) {
    throw new PersistenceMappingError(
      "reflection attempt updated timestamp is required",
    );
  }
  const updatedAtDifference =
    left.attemptUpdatedAt.getTime() - right.attemptUpdatedAt.getTime();
  if (updatedAtDifference !== 0) return updatedAtDifference;
  return (left.attemptVersion ?? -1) - (right.attemptVersion ?? -1);
}

export function reflectionRowsToState(
  itemIds: readonly string[],
  rows: readonly ReflectionRowShape[],
): ParticipantReflectionState {
  if (itemIds.length === 0 || itemIds.length > 100) {
    throw new PersistenceMappingError("reflection item count is invalid");
  }
  const itemSet = new Set(itemIds);
  if (itemSet.size !== itemIds.length) {
    throw new PersistenceMappingError("reflection item ids must be unique");
  }

  let latestAttempt: ReflectionRowShape | undefined;
  for (const row of rows) {
    if (!itemSet.has(row.itemId)) {
      throw new PersistenceMappingError(
        "reflection row is outside the current activity",
      );
    }
    if (row.attemptId === null) {
      if (
        row.attemptStatus !== null ||
        row.attemptVersion !== null ||
        row.attemptUpdatedAt !== null ||
        row.response !== null ||
        row.savedAt !== null
      ) {
        throw new PersistenceMappingError(
          "reflection row without attempt contains state",
        );
      }
      continue;
    }
    if (
      row.attemptStatus === null ||
      row.attemptVersion === null ||
      row.attemptUpdatedAt === null
    ) {
      throw new PersistenceMappingError(
        "reflection attempt metadata is incomplete",
      );
    }
    parseAttemptStatus(row.attemptStatus);
    if (!Number.isInteger(row.attemptVersion) || row.attemptVersion < 0) {
      throw new PersistenceMappingError(
        "reflection attempt version is invalid",
      );
    }
    parseTimestamp(row.attemptUpdatedAt, "attemptUpdatedAt");
    if (
      (row.response === null && row.savedAt !== null) ||
      (row.response !== null && row.savedAt === null)
    ) {
      throw new PersistenceMappingError(
        "reflection answer metadata is incomplete",
      );
    }
    if (
      latestAttempt === undefined ||
      compareAttemptRows(row, latestAttempt) > 0
    ) {
      latestAttempt = row;
    }
  }

  const attemptId = latestAttempt?.attemptId;
  const attemptStatus = latestAttempt
    ? parseAttemptStatus(latestAttempt.attemptStatus as string)
    : undefined;
  const answerByItemId = new Map<string, ParticipantReflectionAnswer>();
  for (const row of rows) {
    if (
      row.attemptId !== attemptId ||
      row.response === null ||
      row.savedAt === null
    ) {
      continue;
    }
    if (answerByItemId.has(row.itemId)) {
      throw new PersistenceMappingError("reflection answers must be unique");
    }
    answerByItemId.set(
      row.itemId,
      Object.freeze({
        itemId: row.itemId,
        response: row.response,
        savedAt: parseTimestamp(row.savedAt, "savedAt"),
      }),
    );
  }

  return deriveReflectionStateUseCase({
    itemIds,
    attemptStatus,
    answers: [...answerByItemId.values()],
  });
}

export function activityRowsToState(
  rows: readonly ActivityRowShape[],
): ParticipantActivityState | null {
  const first = rows[0];
  if (first === undefined) return null;

  assertNonEmpty(first.activityId, "activityId");
  assertNonEmpty(first.scopeId, "scopeId");
  assertNonEmpty(first.slug, "slug");
  assertNonEmpty(first.title, "title");
  const ordinals = new Set<number>();
  const items = rows.map((row) => {
    if (
      row.activityId !== first.activityId ||
      row.scopeId !== first.scopeId ||
      row.slug !== first.slug ||
      row.title !== first.title
    ) {
      throw new PersistenceMappingError("activity rows do not agree");
    }
    if (
      !Number.isInteger(row.ordinal) ||
      row.ordinal < 1 ||
      row.ordinal > 100
    ) {
      throw new PersistenceMappingError("content ordinal is invalid");
    }
    if (ordinals.has(row.ordinal)) {
      throw new PersistenceMappingError("content ordinal must be unique");
    }
    ordinals.add(row.ordinal);
    assertNonEmpty(row.itemId, "itemId");
    const choices = parseChoices(row.choices);
    const responseMode = parseResponseMode(row.responseMode);
    const selectionMode = parseSelectionMode(row.selectionMode);
    if (
      responseMode === "CHOICE" &&
      (choices === undefined || selectionMode === undefined)
    ) {
      throw new PersistenceMappingError(
        "choice content must include choices and selection mode",
      );
    }
    return Object.freeze({
      itemId: row.itemId,
      ordinal: row.ordinal,
      kind: parseKind(row.kind),
      title: parsePlainText(row.itemTitle, "itemTitle"),
      text: parsePlainText(row.text, "text"),
      responseMode,
      ...(choices === undefined ? {} : { choices }),
      ...(selectionMode === undefined ? {} : { selectionMode }),
    });
  });

  return Object.freeze({
    activityId: first.activityId,
    scopeId: first.scopeId,
    slug: first.slug,
    title: parsePlainText(first.title, "title"),
    items: Object.freeze(
      [...items].sort((left, right) => left.ordinal - right.ordinal),
    ),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createActivityReadRepository(
  db: PostgresJsDatabase<typeof schema>,
): ActivityReadPort {
  const repository: ActivityReadPort = {
    findParticipantActivity: async (
      participantId: string,
      activityId: string,
    ): Promise<ParticipantActivityState | null> => {
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { participantId });
        const rows = await executor
          .select({
            activityId: learningActivities.id,
            scopeId: learningActivities.scopeId,
            slug: learningActivities.slug,
            title: learningActivities.title,
            itemId: contentVersions.id,
            ordinal: learningActivityItems.ordinal,
            kind: contentVersions.kind,
            itemTitle: contentVersions.title,
            text: contentVersions.participantText,
            responseMode: contentVersions.responseMode,
            choices: contentVersions.participantOptions,
            selectionMode: contentVersions.participantSelectionMode,
          })
          .from(activityAssignments)
          .innerJoin(
            learningActivities,
            eq(activityAssignments.activityId, learningActivities.id),
          )
          .innerJoin(
            learningActivityItems,
            eq(learningActivityItems.activityId, learningActivities.id),
          )
          .innerJoin(
            contentVersions,
            eq(learningActivityItems.contentVersionId, contentVersions.id),
          )
          .where(
            and(
              eq(activityAssignments.participantId, participantId),
              eq(activityAssignments.activityId, activityId),
              inArray(activityAssignments.status, [
                "DISPONIVEL",
                "EM_ANDAMENTO",
                "EM_REFORCO",
              ]),
              eq(learningActivities.status, "PUBLISHED"),
              eq(contentVersions.status, "PUBLICADO"),
            ),
          )
          .orderBy(asc(learningActivityItems.ordinal));

        const activity = activityRowsToState(rows);
        if (activity === null) return null;

        const reflectionItemIds = activity.items
          .filter((item) => item.kind === "REFLEXAO")
          .map((item) => item.itemId);
        if (reflectionItemIds.length === 0) return activity;

        const reflectionRows = await executor
          .select({
            itemId: contentVersions.id,
            attemptId: attempts.id,
            attemptStatus: attempts.status,
            attemptVersion: attempts.version,
            attemptUpdatedAt: attempts.updatedAt,
            response: answers.response,
            savedAt: answers.savedAt,
          })
          .from(activityAssignments)
          .innerJoin(
            learningActivities,
            eq(activityAssignments.activityId, learningActivities.id),
          )
          .innerJoin(
            learningActivityItems,
            eq(learningActivityItems.activityId, learningActivities.id),
          )
          .innerJoin(
            contentVersions,
            eq(learningActivityItems.contentVersionId, contentVersions.id),
          )
          .leftJoin(
            attempts,
            and(
              eq(attempts.participantId, participantId),
              eq(attempts.activityId, activityId),
            ),
          )
          .leftJoin(
            answers,
            and(
              eq(answers.attemptId, attempts.id),
              eq(answers.itemId, contentVersions.id),
              inArray(answers.itemId, reflectionItemIds),
            ),
          )
          .where(
            and(
              eq(activityAssignments.participantId, participantId),
              eq(activityAssignments.activityId, activityId),
              inArray(activityAssignments.status, [
                "DISPONIVEL",
                "EM_ANDAMENTO",
                "EM_REFORCO",
              ]),
              eq(learningActivities.status, "PUBLISHED"),
              eq(contentVersions.status, "PUBLICADO"),
              eq(contentVersions.kind, "REFLEXAO"),
              inArray(contentVersions.id, reflectionItemIds),
            ),
          )
          .orderBy(
            asc(learningActivityItems.ordinal),
            desc(attempts.updatedAt),
            desc(attempts.version),
          );

        return Object.freeze({
          ...activity,
          reflection: reflectionRowsToState(reflectionItemIds, reflectionRows),
        });
      });
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
