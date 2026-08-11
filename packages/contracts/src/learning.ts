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
const participantItemSchema = z
  .object({
    itemId: idSchema,
    ordinal: z.number().int().min(1).max(100),
    kind: z.enum(["LEITURA", "QUESTAO", "CASO", "REFLEXAO"]),
    title: participantPlainTextSchema(300),
    text: participantPlainTextSchema(20_000),
    responseMode: z.enum(["TEXT", "CHOICE", "NONE"]),
    choices: z.array(participantChoiceSchema).min(2).max(12).optional(),
    selectionMode: z.enum(["SINGLE", "MULTIPLE"]).optional(),
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
  })
  .strict()
  .superRefine((value, context) => {
    if (value.selectedChoiceIds === undefined && value.text === undefined) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "an answer must contain choices or text",
      });
    }
    if (value.selectedChoiceIds !== undefined && value.text !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["text"],
        message: "an answer cannot contain choices and text together",
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

const runtimeRetentionReviewSchema = z
  .object({
    day: z.union([z.literal(7), z.literal(30), z.literal(90)]),
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
