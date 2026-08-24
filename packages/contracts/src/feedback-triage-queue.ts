import { z } from "zod";

const idSchema = z.string().uuid();
const statusSchema = z.enum([
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
]);
const typeSchema = z.enum([
  "BUG_TECNICO",
  "USABILIDADE",
  "ERRO_CONTEUDO",
  "MELHORIA",
  "CONTESTACAO",
]);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

export const feedbackTriageQueueQuerySchema = z
  .object({
    scopeId: idSchema,
    status: statusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

const queueItemSchema = z
  .object({
    ticketId: idSchema,
    participantId: idSchema,
    type: typeSchema,
    description: plainTextSchema,
    createdAt: z.iso.datetime(),
    status: statusSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

export const feedbackTriageQueueProjectionSchema = z
  .object({
    kind: z.literal("feedback_triage_queue"),
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

export type FeedbackTriageQueueQuery = z.infer<
  typeof feedbackTriageQueueQuerySchema
>;
export type FeedbackTriageQueueProjection = z.infer<
  typeof feedbackTriageQueueProjectionSchema
>;

export function parseFeedbackTriageQueueProjection(
  value: unknown,
): FeedbackTriageQueueProjection {
  return feedbackTriageQueueProjectionSchema.parse(value);
}
