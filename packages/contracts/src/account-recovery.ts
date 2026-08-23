import { z } from "zod";

const recoveryTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/u);

export const accountRecoveryIssueRequestSchema = z
  .object({
    scopeId: z.string().uuid(),
    expiresInSeconds: z.number().int().min(60).max(1_800),
  })
  .strict();

export const accountRecoveryAcceptRequestSchema = z
  .object({
    token: recoveryTokenSchema,
    sessionExpiresInSeconds: z
      .number()
      .int()
      .min(60)
      .max(604_800)
      .default(3_600),
  })
  .strict();

export const accountRecoveryIssueProjectionSchema = z
  .object({
    professionalEmail: z.string().email().max(320),
    token: recoveryTokenSchema,
    expiresAt: z.string().datetime({ offset: true }),
    revokedSessions: z.number().int().nonnegative(),
  })
  .strict();

export const accountRecoveryAcceptProjectionSchema = z
  .object({ status: z.literal("active") })
  .strict();

export type AccountRecoveryIssueRequest = z.infer<
  typeof accountRecoveryIssueRequestSchema
>;
export type AccountRecoveryAcceptRequest = z.infer<
  typeof accountRecoveryAcceptRequestSchema
>;
export type AccountRecoveryIssueProjection = z.infer<
  typeof accountRecoveryIssueProjectionSchema
>;
export type AccountRecoveryAcceptProjection = z.infer<
  typeof accountRecoveryAcceptProjectionSchema
>;
