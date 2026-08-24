import { z } from "zod";

const idSchema = z.string().uuid();
const statusSchema = z.enum([
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
]);
const decisionSchema = z.enum([
  "MANTER_RESULTADO",
  "ANULAR_ITEM",
  "ALTERAR_RESULTADO",
]);

export const appealReviewQueueQuerySchema = z
  .object({
    scopeId: idSchema,
    status: statusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

const queueItemSchema = z
  .object({
    appealId: idSchema,
    participantId: idSchema,
    attemptId: idSchema,
    itemId: idSchema,
    justification: z
      .string()
      .trim()
      .min(1)
      .max(10_000)
      .refine((value) => !/<[^>]*>/u.test(value), "plain text is required"),
    createdAt: z.iso.datetime(),
    dueAt: z.iso.datetime(),
    status: statusSchema,
    version: z.number().int().nonnegative(),
    reviewerId: idSchema.optional(),
    decision: decisionSchema.optional(),
  })
  .strict();

export const appealReviewQueueProjectionSchema = z
  .object({
    kind: z.literal("appeal_review_queue"),
    scopeId: idSchema,
    generatedAt: z.iso.datetime(),
    filters: z
      .object({
        scopeId: idSchema,
        status: statusSchema.optional(),
        limit: z.number().int().min(1).max(100),
      })
      .strict(),
    items: z.array(queueItemSchema).max(100),
  })
  .strict();

export type AppealReviewQueueQuery = z.infer<
  typeof appealReviewQueueQuerySchema
>;
export type AppealReviewQueueProjection = z.infer<
  typeof appealReviewQueueProjectionSchema
>;

export function parseAppealReviewQueueProjection(
  value: unknown,
): AppealReviewQueueProjection {
  return appealReviewQueueProjectionSchema.parse(value);
}
