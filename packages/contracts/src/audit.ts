import { z } from "zod";

const idSchema = z.string().uuid();
const tokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u);
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);

const auditEntryProjectionSchema = z
  .object({
    auditId: idSchema,
    principalId: idSchema,
    action: tokenSchema,
    resourceType: tokenSchema,
    resourceId: idSchema,
    scopeId: idSchema.optional(),
    outcome: z.enum(["SUCCESS", "DENIED", "FAILURE"]),
    reasonCode: tokenSchema.optional(),
    requestId: idSchema,
    correlationId: idSchema,
    beforeHash: hashSchema.optional(),
    afterHash: hashSchema.optional(),
    occurredAt: z.iso.datetime(),
  })
  .strict();

export const auditTrailProjectionSchema = z
  .object({
    entries: z.array(auditEntryProjectionSchema).max(100),
  })
  .strict();

export type AuditEntryProjection = z.infer<typeof auditEntryProjectionSchema>;
export type AuditTrailProjection = z.infer<typeof auditTrailProjectionSchema>;

export function parseAuditTrail(value: unknown): AuditTrailProjection {
  return auditTrailProjectionSchema.parse(value);
}
