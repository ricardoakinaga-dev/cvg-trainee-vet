import { z } from "zod";

const roleSchema = z.enum([
  "PARTICIPANT",
  "MODERATOR",
  "ADMIN",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
]);

const tokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{32,256}$/u, "invitation token is invalid");

export const createInvitationRequestSchema = z
  .object({
    professionalEmail: z.string().trim().email().max(320),
    invitedRoles: z.array(roleSchema).min(1).max(6),
    invitedScopes: z.array(z.string().uuid()).max(100),
    expiresInSeconds: z.number().int().min(60).max(604_800),
  })
  .strict();

export const acceptInvitationRequestSchema = z
  .object({
    token: tokenSchema,
    sessionExpiresInSeconds: z.number().int().min(60).max(604_800),
  })
  .strict();

export type CreateInvitationRequest = z.infer<
  typeof createInvitationRequestSchema
>;
export type AcceptInvitationRequest = z.infer<
  typeof acceptInvitationRequestSchema
>;
