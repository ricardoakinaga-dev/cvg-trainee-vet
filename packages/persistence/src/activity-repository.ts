import { and, asc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ActivityReadPort,
  ParticipantActivityChoice,
  ParticipantActivityItem,
  ParticipantActivityState,
} from "@cvg/application";
import type {
  PublicAssessmentInteraction,
  PublicDigitalCaseStage,
  StructuredFieldDefinition,
} from "@cvg/curriculum";

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
  readonly interaction?: unknown;
  readonly digitalCaseStage?: unknown;
}>;

const supportedKinds = ["LEITURA", "QUESTAO", "CASO", "REFLEXAO"] as const;
const supportedResponseModes = [
  "TEXT",
  "CHOICE",
  "STRUCTURED_FIELDS",
  "DOSE_INFUSION",
  "NONE",
] as const;

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

function parseInteractionFields(
  rawFields: unknown,
): readonly StructuredFieldDefinition[] {
  if (
    !Array.isArray(rawFields) ||
    rawFields.length < 1 ||
    rawFields.length > 20
  ) {
    throw new PersistenceMappingError("content interaction fields are invalid");
  }
  const fieldIds = new Set<string>();
  const fields = rawFields.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new PersistenceMappingError(
        `content field ${index + 1} is invalid`,
      );
    }
    const id = candidate.id;
    const label = candidate.label;
    const valueType = candidate.valueType;
    if (
      typeof id !== "string" ||
      typeof label !== "string" ||
      (valueType !== "NUMBER" &&
        valueType !== "TEXT" &&
        valueType !== "BOOLEAN") ||
      fieldIds.has(id)
    ) {
      throw new PersistenceMappingError(
        `content field ${index + 1} is invalid`,
      );
    }
    fieldIds.add(id);
    const min = candidate.min;
    const max = candidate.max;
    if (
      (min !== undefined &&
        (typeof min !== "number" || !Number.isFinite(min))) ||
      (max !== undefined && (typeof max !== "number" || !Number.isFinite(max)))
    ) {
      throw new PersistenceMappingError(
        `content field ${index + 1} range is invalid`,
      );
    }
    return Object.freeze({
      id: id.trim(),
      label: parsePlainText(label, `content field ${index + 1} label`),
      valueType,
      ...(typeof candidate.unit === "string"
        ? {
            unit: parsePlainText(
              candidate.unit,
              `content field ${index + 1} unit`,
            ),
          }
        : {}),
      required: true as const,
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    });
  });
  if (fields.some((field) => !field.required)) {
    throw new PersistenceMappingError("content fields must be required");
  }
  return Object.freeze(fields);
}

function parseDoseInteraction(
  value: Readonly<Record<string, unknown>>,
  fields: readonly StructuredFieldDefinition[],
): PublicAssessmentInteraction {
  const inputs = value.calculationInputs;
  if (!isRecord(inputs)) {
    throw new PersistenceMappingError("dose interaction inputs are invalid");
  }
  const inputKeys = [
    "weightKg",
    "doseMgPerKg",
    "concentrationMgPerMl",
    "durationHours",
  ] as const;
  if (
    inputKeys.some(
      (key) => typeof inputs[key] !== "number" || !Number.isFinite(inputs[key]),
    )
  ) {
    throw new PersistenceMappingError("dose interaction inputs are invalid");
  }
  if (typeof value.formulaLabel !== "string") {
    throw new PersistenceMappingError("dose interaction formula is invalid");
  }
  return Object.freeze({
    kind: "DOSE_INFUSION" as const,
    evaluationMode: "AUTOMATIC" as const,
    fields,
    calculationInputs: Object.freeze({
      weightKg: inputs.weightKg as number,
      doseMgPerKg: inputs.doseMgPerKg as number,
      concentrationMgPerMl: inputs.concentrationMgPerMl as number,
      durationHours: inputs.durationHours as number,
    }),
    formulaLabel: parsePlainText(value.formulaLabel, "dose formula"),
  });
}

function parseInteraction(
  value: unknown,
): PublicAssessmentInteraction | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new PersistenceMappingError("content interaction is invalid");
  }
  const kind = value.kind;
  const evaluationMode = value.evaluationMode;
  if (
    (kind !== "STRUCTURED_FIELDS" && kind !== "DOSE_INFUSION") ||
    evaluationMode !== "AUTOMATIC"
  ) {
    throw new PersistenceMappingError("content interaction is invalid");
  }
  const fields = parseInteractionFields(value.fields);
  if (kind === "STRUCTURED_FIELDS") {
    return Object.freeze({
      kind,
      evaluationMode,
      fields,
    });
  }
  return parseDoseInteraction(value, fields);
}

function parseDigitalCaseStage(
  value: unknown,
): PublicDigitalCaseStage | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new PersistenceMappingError("digital case stage is invalid");
  }
  if (
    typeof value.caseId !== "string" ||
    ![1, 2, 3].includes(value.stage as number) ||
    !Array.isArray(value.examSeries)
  ) {
    throw new PersistenceMappingError("digital case stage is invalid");
  }
  const examSeries = value.examSeries.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new PersistenceMappingError(`case exam ${index + 1} is invalid`);
    }
    const modality = candidate.modality;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.label !== "string" ||
      (modality !== "RADIOGRAFIA" &&
        modality !== "POCUS" &&
        modality !== "ECG") ||
      typeof candidate.observationCount !== "number" ||
      !Number.isInteger(candidate.observationCount) ||
      candidate.observationCount < 2
    ) {
      throw new PersistenceMappingError(`case exam ${index + 1} is invalid`);
    }
    return Object.freeze({
      id: candidate.id.trim(),
      modality,
      label: parsePlainText(candidate.label, `case exam ${index + 1} label`),
      observationCount: candidate.observationCount,
    });
  });
  return Object.freeze({
    caseId: value.caseId.trim(),
    stage: value.stage as 1 | 2 | 3,
    examSeries: Object.freeze(examSeries),
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
    const interaction = parseInteraction(row.interaction);
    const digitalCaseStage = parseDigitalCaseStage(row.digitalCaseStage);
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
      ...(interaction === undefined ? {} : { interaction }),
      ...(digitalCaseStage === undefined ? {} : { digitalCaseStage }),
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
        const executor = transaction;
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
            interaction: contentVersions.participantInteraction,
            digitalCaseStage: contentVersions.digitalCaseStage,
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
