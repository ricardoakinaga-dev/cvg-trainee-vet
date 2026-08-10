import { z } from "zod";

const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

export const correctOpenResponseRequestSchema = z
  .object({
    scopeId: z.string().uuid(),
    idempotencyKey: z
      .string()
      .trim()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    score: z.number().int().min(0).max(100),
    outcome: z.enum(["APROVADO", "REFORCO"]),
    feedback: plainTextSchema,
    ruleVersion: z.string().trim().min(1).max(64),
  })
  .strict();

export const correctionResultProjectionSchema = z
  .object({
    attemptStatus: z.enum([
      "CORRIGIDA_HUMANAMENTE",
      "CORRIGIDA_AUTOMATICAMENTE",
    ]),
    attemptVersion: z.number().int().nonnegative(),
    resultVersion: z.number().int().positive(),
    score: z.number().int().min(0).max(100),
    outcome: z.enum(["APROVADO", "REFORCO"]),
    feedback: plainTextSchema,
  })
  .strict();

export type CorrectOpenResponseRequest = z.infer<
  typeof correctOpenResponseRequestSchema
>;
