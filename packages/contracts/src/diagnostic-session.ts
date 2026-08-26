import { z } from "zod";

import { participantDiagnosticProfileItemSchema } from "./diagnostic.js";
import { assertPublicProjection } from "./public-boundary.js";

const idSchema = z.string().uuid();
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u);
const choiceIdSchema = z.string().trim().min(1).max(32);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

export const diagnosticSessionStartRequestSchema = z
  .object({ idempotencyKey: idempotencyKeySchema })
  .strict();

export const diagnosticSessionAnswerRequestSchema = z
  .object({
    version: z.number().int().nonnegative(),
    selectedChoiceIds: z.array(choiceIdSchema).max(8),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.selectedChoiceIds).size !== value.selectedChoiceIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "selectedChoiceIds must not contain duplicates",
      });
    }
  });

export const diagnosticSessionFinalizeRequestSchema = z
  .object({
    version: z.number().int().nonnegative(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const diagnosticSessionChoiceSchema = z
  .object({
    id: choiceIdSchema,
    label: z.string().trim().min(1).max(32),
    text: plainTextSchema.max(2_000),
  })
  .strict();

const diagnosticSessionItemSchema = z
  .object({
    itemId: idSchema,
    ordinal: z.number().int().min(1).max(120),
    title: plainTextSchema.max(300),
    text: plainTextSchema,
    responseMode: z.literal("CHOICE"),
    choices: z.array(diagnosticSessionChoiceSchema).min(1).max(8),
    selectionMode: z.enum(["SINGLE", "MULTIPLE"]),
  })
  .strict()
  .superRefine((value, context) => {
    const choiceIds = value.choices.map((choice) => choice.id);
    if (new Set(choiceIds).size !== choiceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["choices"],
        message: "choices must not contain duplicates",
      });
    }
    if (value.selectionMode === "SINGLE" && value.choices.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["choices"],
        message: "single-choice item must publish choices",
      });
    }
  });

const diagnosticSessionAnswerSchema = z
  .object({
    itemId: idSchema,
    selectedChoiceIds: z.array(choiceIdSchema).min(1).max(8),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.selectedChoiceIds).size !== value.selectedChoiceIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedChoiceIds"],
        message: "selectedChoiceIds must not contain duplicates",
      });
    }
  });

const diagnosticSessionThemeProjectionSchema =
  participantDiagnosticProfileItemSchema.omit({ recommendedModuleIds: true });

export const diagnosticSessionResultProjectionSchema = z
  .object({
    completedAt: z.iso.datetime(),
    themes: z.array(diagnosticSessionThemeProjectionSchema).length(3),
  })
  .strict()
  .superRefine((value, context) => {
    const themeIds = value.themes.map((theme) => theme.themeId);
    if (
      new Set(themeIds).size !== 3 ||
      !["B07-S1", "B07-S2", "B07-S3"].every((themeId) =>
        themeIds.includes(themeId as (typeof themeIds)[number]),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["themes"],
        message: "result must contain the three distinct B-07 themes",
      });
    }
  });

export const diagnosticSessionProjectionSchema = z
  .object({
    sessionId: idSchema,
    diagnosticId: z.literal("B07-DIAGNOSTIC-V1"),
    diagnosticVersion: z.literal("0.1.0"),
    version: z.number().int().nonnegative(),
    status: z.enum(["EM_ANDAMENTO", "FINALIZADA"]),
    startedAt: z.iso.datetime(),
    lastCheckpointAt: z.iso.datetime().optional(),
    finalizedAt: z.iso.datetime().optional(),
    itemCount: z.literal(120),
    answeredItemCount: z.number().int().nonnegative().max(120),
    currentOrdinal: z.number().int().min(1).max(120).nullable(),
    items: z.array(diagnosticSessionItemSchema).length(120),
    answers: z.array(diagnosticSessionAnswerSchema).max(120),
    result: diagnosticSessionResultProjectionSchema.optional(),
    nextAction: z
      .enum(["CONTINUAR_TRILHA", "CONSULTAR_PROXIMO_PASSO"])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.itemCount !== value.items.length) {
      context.addIssue({
        code: "custom",
        path: ["itemCount"],
        message: "itemCount must match the published item projection",
      });
    }
    if (value.answeredItemCount !== value.answers.length) {
      context.addIssue({
        code: "custom",
        path: ["answeredItemCount"],
        message: "answeredItemCount must match the answer projection",
      });
    }
    const itemsById = new Map(value.items.map((item) => [item.itemId, item]));
    const answerIds = new Set<string>();
    for (const answer of value.answers) {
      if (answerIds.has(answer.itemId)) {
        context.addIssue({
          code: "custom",
          path: ["answers"],
          message: "answers must not contain duplicate items",
        });
        continue;
      }
      answerIds.add(answer.itemId);
      const item = itemsById.get(answer.itemId);
      if (item === undefined) {
        context.addIssue({
          code: "custom",
          path: ["answers"],
          message: "answer item must belong to the session",
        });
        continue;
      }
      const choices = new Set(item.choices.map((choice) => choice.id));
      if (answer.selectedChoiceIds.some((id) => !choices.has(id))) {
        context.addIssue({
          code: "custom",
          path: ["answers"],
          message: "answer choice must belong to the item",
        });
      }
      if (
        item.selectionMode === "SINGLE" &&
        answer.selectedChoiceIds.length !== 1
      ) {
        context.addIssue({
          code: "custom",
          path: ["answers"],
          message: "single-choice item accepts one selected choice",
        });
      }
    }
    if (value.status === "FINALIZADA") {
      if (value.finalizedAt === undefined || value.result === undefined) {
        context.addIssue({
          code: "custom",
          path: ["status"],
          message: "finalized session must publish finalizedAt and result",
        });
      }
      if (value.currentOrdinal !== null) {
        context.addIssue({
          code: "custom",
          path: ["currentOrdinal"],
          message: "finalized session has no current ordinal",
        });
      }
    } else if (value.finalizedAt !== undefined || value.result !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "in-progress session cannot publish finalization",
      });
    }
  });

export type DiagnosticSessionStartRequest = z.infer<
  typeof diagnosticSessionStartRequestSchema
>;
export type DiagnosticSessionAnswerRequest = z.infer<
  typeof diagnosticSessionAnswerRequestSchema
>;
export type DiagnosticSessionFinalizeRequest = z.infer<
  typeof diagnosticSessionFinalizeRequestSchema
>;
export type DiagnosticSessionResultProjection = z.infer<
  typeof diagnosticSessionResultProjectionSchema
>;
export type DiagnosticSessionProjection = z.infer<
  typeof diagnosticSessionProjectionSchema
>;

export function parseDiagnosticSessionProjection(
  value: unknown,
): DiagnosticSessionProjection {
  const projection = diagnosticSessionProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
