import { z } from "zod";

const idSchema = z.string().uuid();
const versionSchema = z.number().int().min(1);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u,
    "idempotency key contains unsafe characters",
  );

const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const sourceCodeSchema = z.enum([
  "F-01",
  "F-02",
  "F-03",
  "AAHA-2024",
  "RECOVER-2024",
  "WSAVA-2022",
  "AVHTM-TRACS-2021",
]);

const sourceRefSchema = z
  .object({
    code: plainTextSchema.max(128),
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

const participantItemSchema = z
  .object({
    id: plainTextSchema.max(128),
    ordinal: z.number().int().min(1).max(100),
    kind: z.enum(["QUESTAO", "CASO"]),
    title: plainTextSchema.max(1_000),
    prompt: plainTextSchema.max(10_000),
    responseMode: z.enum(["CHOICE", "TEXT"]),
    choices: z.array(choiceSchema).min(2).max(12).optional(),
    selectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional(),
  })
  .strict();

const internalAuthoringItemSchema = z
  .object({
    title: plainTextSchema.max(1_000),
    prompt: plainTextSchema.max(10_000),
    responseMode: z.enum(["CHOICE", "TEXT", "NONE"]),
    choices: z.array(choiceSchema).min(2).max(12).optional(),
    correctChoiceIds: z
      .array(plainTextSchema.max(64))
      .min(1)
      .max(12)
      .optional(),
    rubric: rubricSchema.optional(),
    feedback: plainTextSchema.max(10_000),
    critical: z.boolean(),
    remediationTargetObjectiveId: plainTextSchema.max(128),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
    participant: participantItemSchema,
  })
  .strict();

export const authoringDraftCreateRequestSchema = z
  .object({
    idempotencyKey: idempotencyKeySchema,
    scopeId: idSchema,
    moduleId: moduleIdSchema,
    sessionId: plainTextSchema.max(128),
    objectiveId: plainTextSchema.max(128),
    ordinal: z.number().int().min(1).max(100),
    title: plainTextSchema.max(1_000),
    prompt: plainTextSchema.max(10_000),
    responseMode: z.enum(["CHOICE", "TEXT"]),
    choices: z.array(choiceSchema).min(2).max(12).optional(),
    correctChoiceIds: z
      .array(plainTextSchema.max(64))
      .min(1)
      .max(12)
      .optional(),
    rubric: rubricSchema.optional(),
    feedback: plainTextSchema.max(10_000),
    critical: z.boolean(),
    remediationTargetObjectiveId: plainTextSchema.max(128),
    sourceRefs: z
      .array(
        z
          .object({
            code: sourceCodeSchema,
            locator: plainTextSchema.max(512),
            updateRequired: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.choices !== undefined) {
      const choiceIds = value.choices.map((choice) => choice.id);
      if (new Set(choiceIds).size !== choiceIds.length) {
        context.addIssue({
          code: "custom",
          path: ["choices"],
          message: "choice ids must be unique",
        });
      }
    }
    if (value.correctChoiceIds !== undefined) {
      if (
        new Set(value.correctChoiceIds).size !== value.correctChoiceIds.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["correctChoiceIds"],
          message: "correct choice ids must be unique",
        });
      }
      const choiceIds = new Set(value.choices?.map((choice) => choice.id));
      if (value.correctChoiceIds.some((choiceId) => !choiceIds.has(choiceId))) {
        context.addIssue({
          code: "custom",
          path: ["correctChoiceIds"],
          message: "correct choice ids must belong to choices",
        });
      }
    }
    if (value.responseMode === "CHOICE" && value.rubric !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["rubric"],
        message: "choice drafts cannot contain a text rubric",
      });
    }
    if (value.responseMode === "TEXT") {
      if (value.choices !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["choices"],
          message: "text drafts cannot contain choices",
        });
      }
      if (value.correctChoiceIds !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["correctChoiceIds"],
          message: "text drafts cannot contain correct choices",
        });
      }
    }
  });

const preflightSchema = z
  .object({
    ruleVersion: z.literal("authoring-preflight-v1"),
    technicalChecksPassed: z.boolean(),
    readyForClinicalReview: z.boolean().optional(),
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

const reviewSchema = z
  .object({
    reviewerId: idSchema,
    decision: z.enum(["APROVAR_CLINICAMENTE", "SOLICITAR_AJUSTES"]),
    rationale: plainTextSchema,
    reviewedAt: z.iso.datetime(),
    correlationId: idSchema,
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

export const internalAuthoringRecordQuerySchema = z
  .object({ scopeId: idSchema })
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
    latestReview: reviewSchema.optional(),
    availableActions: z
      .object({
        requestAdjustments: z.boolean(),
        approveClinically: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type AuthoringReviewRequest = z.infer<
  typeof authoringReviewRequestSchema
>;
export type AuthoringDraftCreateRequest = z.infer<
  typeof authoringDraftCreateRequestSchema
>;
export type InternalAuthoringRecordProjection = z.infer<
  typeof internalAuthoringRecordProjectionSchema
>;

export function parseInternalAuthoringRecordProjection(
  value: unknown,
): InternalAuthoringRecordProjection {
  return internalAuthoringRecordProjectionSchema.parse(value);
}
