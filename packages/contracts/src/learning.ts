import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const idSchema = z.string().uuid();
const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const participantChoiceSchema = z
  .object({
    id: z.string().trim().min(1).max(32),
    label: z.string().trim().min(1).max(16),
    text: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .refine(
        (value) => !/<[^>]*>/u.test(value),
        "choice text must be plain text",
      ),
  })
  .strict();
const participantPlainTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<[^>]*>/u.test(value), "text must be plain text");
const structuredFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: participantPlainTextSchema(200),
    valueType: z.enum(["NUMBER", "TEXT", "BOOLEAN"]),
    unit: participantPlainTextSchema(32).optional(),
    required: z.literal(true),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.min !== undefined &&
      value.max !== undefined &&
      value.min > value.max
    ) {
      context.addIssue({
        code: "custom",
        path: ["min"],
        message: "field range is invalid",
      });
    }
  });
const assessmentInteractionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("STRUCTURED_FIELDS"),
      evaluationMode: z.literal("AUTOMATIC"),
      fields: z.array(structuredFieldSchema).min(1).max(20),
    })
    .strict(),
  z
    .object({
      kind: z.literal("DOSE_INFUSION"),
      evaluationMode: z.literal("AUTOMATIC"),
      fields: z.array(structuredFieldSchema).min(1).max(20),
      calculationInputs: z
        .object({
          weightKg: z.number().finite().positive().max(1_000_000),
          doseMgPerKg: z.number().finite().nonnegative().max(1_000_000),
          concentrationMgPerMl: z.number().finite().positive().max(1_000_000),
          durationHours: z.number().finite().positive().max(1_000_000),
        })
        .strict(),
      formulaLabel: participantPlainTextSchema(500),
    })
    .strict(),
]);
const digitalCaseStageSchema = z
  .object({
    caseId: z.string().trim().min(1).max(128),
    stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    examSeries: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(128),
            modality: z.enum(["RADIOGRAFIA", "POCUS", "ECG"]),
            label: participantPlainTextSchema(300),
            observationCount: z.number().int().min(2).max(20),
          })
          .strict(),
      )
      .min(3)
      .max(3),
  })
  .strict();
const participantItemSchema = z
  .object({
    itemId: idSchema,
    ordinal: z.number().int().min(1).max(100),
    kind: z.enum(["LEITURA", "QUESTAO", "CASO", "REFLEXAO"]),
    title: participantPlainTextSchema(300),
    text: participantPlainTextSchema(20_000),
    responseMode: z.enum([
      "TEXT",
      "CHOICE",
      "STRUCTURED_FIELDS",
      "DOSE_INFUSION",
      "NONE",
    ]),
    choices: z.array(participantChoiceSchema).min(2).max(12).optional(),
    selectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional(),
    interaction: assessmentInteractionSchema.optional(),
    digitalCaseStage: digitalCaseStageSchema.optional(),
  })
  .strict();

export const participantActivityProjectionSchema = z
  .object({
    activityId: idSchema,
    slug: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(300),
    items: z.array(participantItemSchema).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const ordinals = new Set<number>();
    for (const [index, item] of value.items.entries()) {
      if (ordinals.has(item.ordinal)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "ordinal"],
          message: "item ordinals must be unique",
        });
      }
      ordinals.add(item.ordinal);
      if (item.responseMode === "CHOICE") {
        if (item.choices === undefined) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "choices"],
            message: "choice items must publish choices",
          });
        }
        if (item.selectionMode === undefined) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "selectionMode"],
            message: "choice items must publish selection mode",
          });
        }
      }
      if (
        item.responseMode === "STRUCTURED_FIELDS" ||
        item.responseMode === "DOSE_INFUSION"
      ) {
        if (item.interaction?.kind !== item.responseMode) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "interaction"],
            message: "structured items must publish their interaction schema",
          });
        }
        if (item.choices !== undefined || item.selectionMode !== undefined) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "choices"],
            message: "structured items cannot publish choice metadata",
          });
        }
      }
      if (
        item.responseMode === "TEXT" &&
        (item.choices !== undefined ||
          item.selectionMode !== undefined ||
          item.interaction !== undefined)
      ) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "responseMode"],
          message: "open response items cannot publish choice metadata",
        });
      }
    }
  });

export type ParticipantActivityProjection = z.infer<
  typeof participantActivityProjectionSchema
>;

export function parseParticipantActivity(
  value: unknown,
): ParticipantActivityProjection {
  const projection = participantActivityProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}

const runtimeAnswerSchema = z
  .object({
    itemId: z.string().trim().min(1).max(128),
    selectedChoiceIds: z
      .array(z.string().trim().min(1).max(32))
      .min(1)
      .max(8)
      .optional(),
    text: z
      .string()
      .trim()
      .min(1)
      .max(10_000)
      .refine((value) => !/<[^>]*>/u.test(value), "text must be plain text")
      .optional(),
    structuredValues: z
      .record(
        z.string().trim().min(1).max(64),
        z.union([
          z.string().trim().min(1).max(2_000),
          z.number().finite(),
          z.boolean(),
        ]),
      )
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.selectedChoiceIds === undefined &&
      value.text === undefined &&
      value.structuredValues === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "an answer must contain a supported response",
      });
    }
    if (
      [
        value.selectedChoiceIds !== undefined,
        value.text !== undefined,
        value.structuredValues !== undefined,
      ].filter(Boolean).length > 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["text"],
        message: "an answer cannot contain multiple response shapes",
      });
    }
  });

export const curriculumRuntimeEvaluationRequestSchema = z
  .object({
    participantId: idSchema,
    scopeId: idSchema,
    answers: z.array(runtimeAnswerSchema).max(100),
    completedAt: z.iso.datetime(),
    mode: z.enum(["FORMATIVE_CHOICE", "MODULE_COMPLETION"]).optional(),
  })
  .strict();

const digitalCaseStateValueSchema = z.union([
  z.string().trim().min(1).max(200),
  z.number().finite(),
  z.boolean(),
]);

export const digitalCaseAdvanceRequestSchema = z
  .object({
    scopeId: idSchema.optional(),
    selectedChoiceIds: z.array(z.string().trim().min(1).max(32)).min(1).max(8),
    expectedVersion: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.selectedChoiceIds).size !== value.selectedChoiceIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "choice ids must be unique",
      });
    }
  });

export const digitalCaseScopeQuerySchema = z
  .object({ scopeId: idSchema.optional() })
  .strict();

const digitalCaseObservationProjectionSchema = z
  .object({
    sequence: z.number().int().min(1).max(20),
    syntheticSummary: participantPlainTextSchema(2_000),
  })
  .strict();

const digitalCaseExamProjectionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    modality: z.enum(["RADIOGRAFIA", "POCUS", "ECG"]),
    label: participantPlainTextSchema(300),
    observations: z.array(digitalCaseObservationProjectionSchema).max(20),
  })
  .strict();

const digitalCaseConsequenceProjectionSchema = z
  .object({
    branchId: z.string().trim().min(1).max(128),
    consequence: participantPlainTextSchema(2_000),
    recordedAt: z.iso.datetime(),
  })
  .strict();

export const participantDigitalCaseRuntimeProjectionSchema = z
  .object({
    moduleId: moduleIdSchema,
    caseId: z.string().trim().min(1).max(128),
    version: z.number().int().min(0).max(100),
    currentStage: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal("CONCLUIDO"),
    ]),
    state: z.record(
      z.string().trim().min(1).max(64),
      digitalCaseStateValueSchema,
    ),
    revealedExamSeries: z.array(digitalCaseExamProjectionSchema).max(3),
    consequences: z.array(digitalCaseConsequenceProjectionSchema).max(20),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const runtimeRetentionReviewSchema = z
  .object({
    day: z.union([z.literal(30), z.literal(60), z.literal(90)]),
    dueAt: z.iso.datetime(),
    status: z.literal("PENDENTE"),
  })
  .strict();

export const participantCurriculumRuntimeProjectionSchema = z
  .object({
    moduleId: moduleIdSchema,
    version: z.number().int().min(1),
    status: z.enum([
      "PENDENTE",
      "DOMINIO_DIGITAL",
      "EM_REMEDIACAO",
      "AGUARDA_CORRECAO_HUMANA",
    ]),
    nextAction: z.enum([
      "INICIAR_BASELINE",
      "REVISAR_RETENCAO",
      "EXECUTAR_REMEDIACAO",
      "AGUARDAR_CORRECAO_HUMANA",
    ]),
    scorePercent: z.number().int().min(0).max(100).optional(),
    remediationCount: z.number().int().nonnegative(),
    retentionReviews: z.array(runtimeRetentionReviewSchema).max(3),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict();

export type CurriculumRuntimeEvaluationRequest = z.infer<
  typeof curriculumRuntimeEvaluationRequestSchema
>;
export type DigitalCaseAdvanceRequest = z.infer<
  typeof digitalCaseAdvanceRequestSchema
>;
export type ParticipantDigitalCaseRuntimeProjection = z.infer<
  typeof participantDigitalCaseRuntimeProjectionSchema
>;
export type ParticipantCurriculumRuntimeProjection = z.infer<
  typeof participantCurriculumRuntimeProjectionSchema
>;

export function parseParticipantCurriculumRuntime(
  value: unknown,
): ParticipantCurriculumRuntimeProjection {
  const projection = participantCurriculumRuntimeProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}

export function parseParticipantDigitalCaseRuntime(
  value: unknown,
): ParticipantDigitalCaseRuntimeProjection {
  const projection = participantDigitalCaseRuntimeProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
