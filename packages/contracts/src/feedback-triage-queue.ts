import { z } from "zod";

const idSchema = z.string().uuid();
const cursorSchema = z.string().regex(/^[A-Za-z0-9_-]{1,512}$/u);
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
const prioritySchema = z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]);
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
    cursor: cursorSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

const queueItemSchema = z
  .object({
    ticketId: idSchema,
    type: typeSchema,
    description: plainTextSchema,
    createdAt: z.iso.datetime(),
    status: statusSchema,
    version: z.number().int().nonnegative(),
    priority: prioritySchema,
    assigneeId: idSchema.optional(),
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
