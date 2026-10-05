import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";
import { participantReflectionProjectionSchema } from "./reflection.js";

const idSchema = z.string().uuid();
const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const participantChoiceSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .refine(
        (value) => !/<[^>]*>/u.test(value),
        "choice IDs must be representable by the plain response contract",
      ),
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
    reflection: participantReflectionProjectionSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const ordinals = new Set<number>();
    const itemIds = new Set<string>();
    const reflectionItemIds = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (itemIds.has(item.itemId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "itemId"],
          message: "item identities must be unique",
        });
      }
      itemIds.add(item.itemId);
      if (ordinals.has(item.ordinal)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "ordinal"],
          message: "item ordinals must be unique",
        });
      }
      ordinals.add(item.ordinal);
      if (item.kind === "REFLEXAO") reflectionItemIds.add(item.itemId);
      if (item.responseMode === "CHOICE") {
        if (
          item.choices !== undefined &&
          new Set(item.choices.map((choice) => choice.id)).size !==
            item.choices.length
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "choices"],
            message: "choice identities must be unique within each item",
          });
        }
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
        if (
          item.selectionMode === "MULTIPLE" &&
          item.choices?.some((left) =>
            item.choices?.some(
              (right) =>
                left.id !== right.id &&
                /<[^>]*>/u.test(JSON.stringify([left.id, right.id])),
            ),
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "choices"],
            message:
              "every selection ordering must fit the plain response contract",
          });
        }
      }
    }
    if (value.reflection !== undefined) {
      if (value.reflection.itemCount !== reflectionItemIds.size) {
        context.addIssue({
          code: "custom",
          path: ["reflection", "itemCount"],
          message: "reflection item count must match the published activity",
        });
      }
      for (const [index, answer] of value.reflection.answers.entries()) {
        if (!reflectionItemIds.has(answer.itemId)) {
          context.addIssue({
            code: "custom",
            path: ["reflection", "answers", index, "itemId"],
            message: "reflection answer must belong to a reflection item",
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

export const curriculumRuntimeEvaluationRequestSchema = z
  .object({
    participantId: idSchema,
    scopeId: idSchema,
    attemptId: idSchema,
    attemptVersion: z.number().int().nonnegative(),
    formVersion: z.number().int().min(1),
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
      "DOMINIO_DIGITAL",
      "EM_REMEDIACAO",
      "AGUARDA_CORRECAO_HUMANA",
    ]),
    nextAction: z.enum([
      "REVISAR_RETENCAO",
      "EXECUTAR_REMEDIACAO",
      "AGUARDAR_CORRECAO_HUMANA",
    ]),
    scorePercent: z.number().int().min(0).max(100).optional(),
    activityProgress: z
      .enum(["ATIVIDADES_PENDENTES", "AGUARDA_CORRECAO_HUMANA"])
      .optional(),
    unansweredMandatoryCount: z.number().int().nonnegative().optional(),
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
