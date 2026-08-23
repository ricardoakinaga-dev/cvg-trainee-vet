import { z } from "zod";

const managedAccountStatusSchema = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);

const accountStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);

const scopeIdSchema = z.string().uuid();

export const accountStatusChangeRequestSchema = z
  .object({
    scopeId: scopeIdSchema,
    status: managedAccountStatusSchema,
    expectedStatus: accountStatusSchema,
  })
  .strict();

export const resendAccountInvitationRequestSchema = z
  .object({
    scopeId: scopeIdSchema,
    expiresInSeconds: z.number().int().min(60).max(604_800),
  })
  .strict();

export const accountStatusChangeProjectionSchema = z
  .object({
    status: managedAccountStatusSchema,
    revokedSessions: z.number().int().nonnegative(),
  })
  .strict();

export const resentAccountInvitationProjectionSchema = z
  .object({
    professionalEmail: z.string().email().max(320),
    token: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/u),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type AccountStatusChangeRequest = z.infer<
  typeof accountStatusChangeRequestSchema
>;
export type ResendAccountInvitationRequest = z.infer<
  typeof resendAccountInvitationRequestSchema
>;
export type AccountStatusChangeProjection = z.infer<
  typeof accountStatusChangeProjectionSchema
>;
export type ResentAccountInvitationProjection = z.infer<
  typeof resentAccountInvitationProjectionSchema
>;
