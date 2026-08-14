import { z } from "zod";

const accountStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);
const roleSchema = z.enum([
  "PARTICIPANT",
  "MODERATOR",
  "ADMIN",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
]);
function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) as number;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
const boundedScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !containsControlCharacter(value));
const uuidSchema = z.string().uuid();

export const accountManagementListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    status: accountStatusSchema.optional(),
    scopeId: boundedScopeSchema.optional(),
  })
  .strict();

export type AccountManagementListQuery = z.infer<
  typeof accountManagementListQuerySchema
>;

export const accountManagementUpdateRequestSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    status: accountStatusSchema.optional(),
    roles: z.array(roleSchema).max(6).optional(),
    scopes: z.array(boundedScopeSchema).max(32).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== undefined ||
      value.roles !== undefined ||
      value.scopes !== undefined,
    { message: "at least one account field is required" },
  );

export const accountSessionRevokeRequestSchema = z.object({}).strict();

export type AccountSessionRevokeRequest = z.infer<
  typeof accountSessionRevokeRequestSchema
>;

export type AccountManagementUpdateRequest = z.infer<
  typeof accountManagementUpdateRequestSchema
>;

const managedAccountProjectionSchema = z
  .object({
    accountId: uuidSchema,
    professionalEmail: z.string().email().max(320),
    accountStatus: accountStatusSchema,
    roles: z.array(roleSchema).max(6),
    scopes: z.array(boundedScopeSchema).max(32),
    version: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const managedAccountPageProjectionSchema = z
  .object({
    accounts: z.array(managedAccountProjectionSchema).max(200),
    nextCursor: z.string().trim().min(1).max(320).nullable(),
  })
  .strict();

export type ManagedAccountProjection = z.infer<
  typeof managedAccountProjectionSchema
>;
export type ManagedAccountPageProjection = z.infer<
  typeof managedAccountPageProjectionSchema
>;

export const revokedAccountSessionsProjectionSchema = z
  .object({
    accountId: uuidSchema,
    revokedCount: z.number().int().nonnegative(),
  })
  .strict();

export type RevokedAccountSessionsProjection = z.infer<
  typeof revokedAccountSessionsProjectionSchema
>;
