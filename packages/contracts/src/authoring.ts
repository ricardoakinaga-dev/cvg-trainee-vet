import { z } from "zod";

const idSchema = z.string().uuid();
const versionSchema = z.number().int().min(1);
const contentStatusSchema = z.enum([
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
]);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const clinicalSourceCodeSchema = z.enum([
  "BOOK_ETTINGER_9E",
  "BOOK_FOSSUM_4E",
  "BOOK_JERICO_CAES_GATOS",
]);

const sourceRefSchema = z
  .object({
    code: clinicalSourceCodeSchema,
    locator: plainTextSchema.max(512),
    updateRequired: z.boolean(),
  })
  .strict();

const choiceSchema = z
  .object({
    id: plainTextSchema.max(64),
    label: plainTextSchema.max(32),
    text: plainTextSchema.max(2_000),
  })
  .strict();

const rubricDimensionSchema = z
  .object({
    id: plainTextSchema.max(64),
    label: plainTextSchema.max(128),
    description: plainTextSchema.max(2_000),
    maxPoints: z.number().int().min(1).max(100),
  })
  .strict();

const rubricSchema = z
  .object({
    dimensions: z.array(rubricDimensionSchema).min(1).max(20),
    passScore: z.number().min(0).max(100),
    criticalErrors: z.array(plainTextSchema.max(1_000)).min(1).max(50),
  })
  .strict();

const structuredFieldSchema = z
  .object({
    id: plainTextSchema.max(64),
    label: plainTextSchema.max(200),
    valueType: z.enum(["NUMBER", "TEXT", "BOOLEAN"]),
    unit: plainTextSchema.max(32).optional(),
    required: z.literal(true),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict();
const structuredValueSchema = z.union([
  z.string().trim().min(1).max(2_000),
  z.number().finite(),
  z.boolean(),
]);
const publicAssessmentInteractionSchema = z.discriminatedUnion("kind", [
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
      formulaLabel: plainTextSchema.max(500),
    })
    .strict(),
]);
const internalAssessmentInteractionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("STRUCTURED_FIELDS"),
      fields: z.array(structuredFieldSchema).min(1).max(20),
      rubric: z
        .object({
          criteria: z
            .array(
              z
                .object({
                  fieldId: plainTextSchema.max(64),
                  expectedValue: structuredValueSchema,
                  tolerance: z.number().finite().nonnegative().optional(),
                  points: z.number().int().positive().max(100),
                })
                .strict(),
            )
            .min(1)
            .max(20),
          passScore: z.number().finite().nonnegative().max(2_000),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("DOSE_INFUSION"),
      fields: z.array(structuredFieldSchema).min(1).max(20),
      calculationInputs: z
        .object({
          weightKg: z.number().finite().positive().max(1_000_000),
          doseMgPerKg: z.number().finite().nonnegative().max(1_000_000),
          concentrationMgPerMl: z.number().finite().positive().max(1_000_000),
          durationHours: z.number().finite().positive().max(1_000_000),
        })
        .strict(),
      formulaLabel: plainTextSchema.max(500),
      tolerance: z.number().finite().nonnegative().max(1_000_000),
    })
    .strict(),
]);
const digitalCaseStageSchema = z
  .object({
    caseId: plainTextSchema.max(128),
    stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    examSeries: z
      .array(
        z
          .object({
            id: plainTextSchema.max(128),
            modality: z.enum(["RADIOGRAFIA", "POCUS", "ECG"]),
            label: plainTextSchema.max(300),
            observationCount: z.number().int().min(2).max(20),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();

const participantItemSchema = z
  .object({
    id: plainTextSchema.max(128),
    ordinal: z.number().int().min(1).max(100),
    kind: z.enum(["QUESTAO", "CASO"]),
    title: plainTextSchema.max(1_000),
    prompt: plainTextSchema.max(10_000),
    responseMode: z.enum([
      "CHOICE",
      "TEXT",
      "STRUCTURED_FIELDS",
      "DOSE_INFUSION",
    ]),
    choices: z.array(choiceSchema).min(2).max(12).optional(),
    selectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional(),
    interaction: publicAssessmentInteractionSchema.optional(),
    digitalCaseStage: digitalCaseStageSchema.optional(),
  })
  .strict();

const internalAuthoringItemSchema = z
  .object({
    title: plainTextSchema.max(1_000),
    prompt: plainTextSchema.max(10_000),
    responseMode: z.enum([
      "CHOICE",
      "TEXT",
      "STRUCTURED_FIELDS",
      "DOSE_INFUSION",
      "NONE",
    ]),
    choices: z.array(choiceSchema).min(2).max(12).optional(),
    correctChoiceIds: z
      .array(plainTextSchema.max(64))
      .min(1)
      .max(12)
      .optional(),
    rubric: rubricSchema.optional(),
    interaction: internalAssessmentInteractionSchema.optional(),
    humanCorrectionOwner: z.literal("RICARDO").optional(),
    digitalCaseStage: digitalCaseStageSchema.optional(),
    feedback: plainTextSchema.max(10_000),
    critical: z.boolean(),
    remediationTargetObjectiveId: plainTextSchema.max(128),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
    participant: participantItemSchema,
  })
  .strict();

const preflightSchema = z
  .object({
    ruleVersion: z.literal("authoring-preflight-v1"),
    technicalChecksPassed: z.boolean(),
    sourceVerification: z
      .enum(["VERIFICADO_AUTOMATICAMENTE", "INVALIDO"])
      .optional(),
    readyForPublication: z.boolean().optional(),
    checks: z
      .object({
        requiredFields: z.boolean(),
        correctionMetadata: z.boolean(),
        publicBoundary: z.boolean(),
        sourceTraceability: z.boolean(),
        publicationBlocked: z.boolean(),
      })
      .strict(),
    checkedAt: z.iso.datetime(),
  })
  .strict();

export const authoringPublicationRequestSchema = z
  .object({
    version: versionSchema,
    scopeId: idSchema,
  })
  .strict();

export const authoringReviewRequestSchema = z
  .object({
    version: versionSchema,
    scopeId: idSchema,
    decision: z.enum(["APROVAR_CLINICAMENTE", "SOLICITAR_AJUSTES"]),
    rationale: plainTextSchema,
  })
  .strict();

export const clinicalReviewQueueQuerySchema = z
  .object({
    scopeId: idSchema,
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "ALL"]).default("PENDING"),
  })
  .strict();

const clinicalReviewQueueItemSchema = z
  .object({
    contentId: idSchema,
    version: versionSchema,
    scopeId: idSchema,
    moduleId: plainTextSchema.max(128),
    sessionId: plainTextSchema.max(128),
    objectiveId: plainTextSchema.max(128),
    authorId: idSchema,
    contentStatus: contentStatusSchema,
    reviewStatus: z.enum(["PENDING", "APPROVED", "ADJUSTMENTS_REQUESTED"]),
    technicalChecksPassed: z.boolean(),
    latestReview: z
      .object({
        decision: z.enum(["APROVAR_CLINICAMENTE", "SOLICITAR_AJUSTES"]),
        reviewedAt: z.iso.datetime(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const clinicalReviewQueuePageSchema = z
  .object({
    items: z.array(clinicalReviewQueueItemSchema).max(100),
    page: z.number().int().min(1),
    perPage: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  })
  .strict();

export const internalAuthoringRecordProjectionSchema = z
  .object({
    contentId: idSchema,
    version: versionSchema,
    scopeId: idSchema,
    moduleId: plainTextSchema.max(128),
    sessionId: plainTextSchema.max(128),
    objectiveId: plainTextSchema.max(128),
    authorId: idSchema,
    contentStatus: z.enum([
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
    ]),
    item: internalAuthoringItemSchema,
    preflight: preflightSchema,
  })
  .strict();

export type AuthoringPublicationRequest = z.infer<
  typeof authoringPublicationRequestSchema
>;
export type ClinicalReviewQueueQuery = z.infer<
  typeof clinicalReviewQueueQuerySchema
>;
export type ClinicalReviewQueuePage = z.infer<
  typeof clinicalReviewQueuePageSchema
>;
export type AuthoringReviewRequest = z.infer<
  typeof authoringReviewRequestSchema
>;
export type InternalAuthoringRecordProjection = z.infer<
  typeof internalAuthoringRecordProjectionSchema
>;

export function parseInternalAuthoringRecordProjection(
  value: unknown,
): InternalAuthoringRecordProjection {
  return internalAuthoringRecordProjectionSchema.parse(value);
}

export function parseClinicalReviewQueuePage(
  value: unknown,
): ClinicalReviewQueuePage {
  return clinicalReviewQueuePageSchema.parse(value);
}
