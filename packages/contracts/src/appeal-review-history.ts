import { z } from "zod";

const idSchema = z.string().uuid();
const timestampSchema = z.iso.datetime();
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const appealReviewHistoryEventTypeSchema = z.enum([
  "ATRIBUIR_REVISOR",
  "DECIDIR",
  "SOLICITAR_RECALCULO",
  "CONCLUIR_RECALCULO",
]);
const appealReviewHistoryFromStatusSchema = z.enum([
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
]);
const appealReviewHistoryToStatusSchema = z.enum([
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
]);
const appealDecisionSchema = z.enum([
  "MANTER_RESULTADO",
  "ANULAR_ITEM",
  "ALTERAR_RESULTADO",
]);

export const appealReviewHistoryPathSchema = z
  .object({ appealId: idSchema })
  .strict();

export const appealReviewHistoryQuerySchema = z
  .object({ limit: z.number().int().min(1).max(100).optional() })
  .strict();

export const appealReviewHistoryEventProjectionSchema = z
  .object({
    historyId: idSchema,
    appealId: idSchema,
    appealVersion: z.number().int().positive(),
    eventType: appealReviewHistoryEventTypeSchema,
    fromStatus: appealReviewHistoryFromStatusSchema,
    toStatus: appealReviewHistoryToStatusSchema,
    reviewerId: idSchema.optional(),
    decision: appealDecisionSchema.optional(),
    decisionRationale: plainTextSchema.optional(),
    decisionAt: timestampSchema.optional(),
    decisionCorrelationId: idSchema.optional(),
    createdAt: timestampSchema,
  })
  .strict();

export const appealReviewHistoryProjectionSchema = z
  .object({
    appealId: idSchema,
    events: z.array(appealReviewHistoryEventProjectionSchema).max(100),
  })
  .strict();

export type AppealReviewHistoryPath = z.infer<
  typeof appealReviewHistoryPathSchema
>;
export type AppealReviewHistoryQuery = z.infer<
  typeof appealReviewHistoryQuerySchema
>;
export type AppealReviewHistoryEventProjection = z.infer<
  typeof appealReviewHistoryEventProjectionSchema
>;
export type AppealReviewHistoryProjection = z.infer<
  typeof appealReviewHistoryProjectionSchema
>;
