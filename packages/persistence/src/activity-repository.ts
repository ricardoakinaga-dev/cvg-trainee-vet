import { and, asc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ActivityReadPort,
  ParticipantActivityChoice,
  ParticipantActivityItem,
  ParticipantActivityState,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  activityAssignments,
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

const supportedKinds = ["LEITURA", "QUESTAO", "CASO", "REFLEXAO"] as const;
const supportedResponseModes = ["TEXT", "CHOICE", "NONE"] as const;

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

        return activityRowsToState(rows);
      });
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
