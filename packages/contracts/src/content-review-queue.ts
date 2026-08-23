import { z } from "zod";

const idSchema = z.string().uuid();
const statusSchema = z.enum(["EM_REVISAO_CLINICA", "AJUSTES_SOLICITADOS"]);
const decisionSchema = z.enum(["APROVAR_CLINICAMENTE", "SOLICITAR_AJUSTES"]);

export const contentReviewQueueQuerySchema = z
  .object({
    scopeId: idSchema,
    status: statusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

const preflightSchema = z
  .object({
    technicalChecksPassed: z.boolean(),
    checkedAt: z.iso.datetime(),
  })
  .strict();

const latestReviewSchema = z
  .object({
    decision: decisionSchema,
    reviewedAt: z.iso.datetime(),
  })
  .strict();

const queueItemSchema = z
  .object({
    contentId: idSchema,
    version: z.number().int().min(1),
    scopeId: idSchema,
    moduleId: z.string().trim().min(1).max(128),
    sessionId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(1_000),
    authorId: idSchema,
    status: statusSchema,
    preflight: preflightSchema,
    latestReview: latestReviewSchema.optional(),
    canOpenAuthoring: z.boolean(),
    updatedAt: z.iso.datetime(),
    nextAction: z.enum(["REVISAR_CLINICAMENTE", "AGUARDAR_REENVIO_AUTOR"]),
  })
  .strict();

export const contentReviewQueueProjectionSchema = z
  .object({
    kind: z.literal("content_review_queue"),
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

export type ContentReviewQueueQuery = z.infer<
  typeof contentReviewQueueQuerySchema
>;
export type ContentReviewQueueProjection = z.infer<
  typeof contentReviewQueueProjectionSchema
>;

export function parseContentReviewQueueProjection(
  value: unknown,
): ContentReviewQueueProjection {
  return contentReviewQueueProjectionSchema.parse(value);
}
