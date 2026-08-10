import { z } from "zod";

const idSchema = z.string().uuid();
const versionSchema = z.number().int().min(1);
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
export type InternalAuthoringRecordProjection = z.infer<
  typeof internalAuthoringRecordProjectionSchema
>;

export function parseInternalAuthoringRecordProjection(
  value: unknown,
): InternalAuthoringRecordProjection {
  return internalAuthoringRecordProjectionSchema.parse(value);
}
