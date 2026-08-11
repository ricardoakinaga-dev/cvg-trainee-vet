import { z } from "zod";

export const accountActionRequestSchema = z.object({}).strict();

const operationIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((value) => !hasControlCharacter(value));
const verificationCodeSchema = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value.trim().length > 0)
  .refine((value) => !hasControlCharacter(value));

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export const accountVerificationRequestSchema = z
  .object({
    operationId: operationIdSchema,
    verificationCode: verificationCodeSchema,
  })
  .strict();

export type AccountVerificationRequest = z.infer<
  typeof accountVerificationRequestSchema
>;

export const accountOperationProjectionSchema = z
  .object({
    operationId: operationIdSchema,
    expiresAt: z.iso.datetime(),
  })
  .strict();

export type AccountOperationProjection = z.infer<
  typeof accountOperationProjectionSchema
>;
