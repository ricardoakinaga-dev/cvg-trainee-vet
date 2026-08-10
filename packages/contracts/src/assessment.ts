import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const idSchema = z.string().uuid();
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const responseSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

export const createAttemptRequestSchema = z
  .object({
    activityId: idSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const saveAnswerRequestSchema = z
  .object({
    attemptId: idSchema,
    activityId: idSchema,
    itemId: idSchema,
    response: responseSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const submitAttemptRequestSchema = z
  .object({
    attemptId: idSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const participantAnswerSchema = z
  .object({
    itemId: idSchema,
    response: responseSchema,
    savedAt: z.iso.datetime(),
  })
  .strict();

export const participantAttemptProjectionSchema = z
  .object({
    attemptId: idSchema,
    activityId: idSchema,
    status: z.enum([
      "CRIADA",
      "EM_ANDAMENTO",
      "SALVA",
      "SUBMETIDA",
      "CORRIGIDA_AUTOMATICAMENTE",
      "AGUARDA_CORRECAO_HUMANA",
      "CORRIGIDA_HUMANAMENTE",
      "ANULADA",
    ]),
    version: z.number().int().nonnegative(),
    answers: z.array(participantAnswerSchema).max(100),
    feedback: z.string().trim().max(10_000).optional(),
  })
  .strict();

export type CreateAttemptRequest = z.infer<typeof createAttemptRequestSchema>;
export type SaveAnswerRequest = z.infer<typeof saveAnswerRequestSchema>;
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;
export type ParticipantAttemptProjection = z.infer<
  typeof participantAttemptProjectionSchema
>;

export function parseParticipantAttempt(
  value: unknown,
): ParticipantAttemptProjection {
  const projection = participantAttemptProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
