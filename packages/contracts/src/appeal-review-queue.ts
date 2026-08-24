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
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

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
    justification: plainTextSchema,
    createdAt: z.iso.datetime(),
    dueAt: z.iso.datetime(),
    status: statusSchema,
    version: z.number().int().nonnegative(),
    reviewerId: idSchema.optional(),
    decision: decisionSchema.optional(),
    decisionRationale: plainTextSchema.optional(),
    decisionAt: z.iso.datetime().optional(),
    decisionCorrelationId: idSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const decided = ["DECIDIDA", "RECALCULO_PENDENTE", "ENCERRADA"].includes(
      value.status,
    );
    const metadata = [
      value.decisionRationale,
      value.decisionAt,
      value.decisionCorrelationId,
    ];
    if (decided && value.decision === undefined) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "decision is required after deciding",
      });
    }
    if (decided && metadata.some((entry) => entry === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["decisionRationale"],
        message: "decision metadata is required after deciding",
      });
    }
    if (!decided && metadata.some((entry) => entry !== undefined)) {
      context.addIssue({
        code: "custom",
        path: ["decisionRationale"],
        message: "decision metadata is only valid after deciding",
      });
    }
  });

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
