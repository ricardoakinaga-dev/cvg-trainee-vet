import { z } from "zod";

const idSchema = z.string().uuid();
const safeTokenSchema = z
  .string()
  .trim()
  .min(2)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/u);
const boundedTextSchema = z.string().trim().min(1).max(256);
const timestampSchema = z.iso.datetime();
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const outcomeSchema = z.enum(["SUCCESS", "DENIED", "FAILURE"]);
const actorKindSchema = z.enum(["AUTHENTICATED", "ANONYMOUS"]);

export const auditTrailQuerySchema = z
  .object({
    scopeId: idSchema,
    action: safeTokenSchema.optional(),
    resourceType: safeTokenSchema.optional(),
    resourceId: boundedTextSchema.optional(),
    principalId: idSchema.optional(),
    actorKind: actorKindSchema.optional(),
    outcome: outcomeSchema.optional(),
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,512}$/u)
      .optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.from !== undefined &&
      value.to !== undefined &&
      Date.parse(value.from) > Date.parse(value.to)
    ) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "from must be before or equal to to",
      });
    }
  });

const auditTrailItemSchema = z
  .object({
    auditId: idSchema,
    occurredAt: timestampSchema,
    actorKind: actorKindSchema,
    principalId: idSchema.optional(),
    action: safeTokenSchema,
    resourceType: safeTokenSchema,
    resourceId: boundedTextSchema.optional(),
    scopeId: idSchema.optional(),
    outcome: outcomeSchema,
    reasonCode: safeTokenSchema.optional(),
    requestId: idSchema,
    correlationId: idSchema,
    beforeHash: hashSchema.optional(),
    afterHash: hashSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.actorKind === "AUTHENTICATED" &&
      value.principalId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["principalId"],
        message: "authenticated audit entries require a principal",
      });
    }
    if (value.actorKind === "ANONYMOUS" && value.principalId !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["principalId"],
        message: "anonymous audit entries cannot contain a principal",
      });
    }
    if (value.actorKind === "AUTHENTICATED" && value.scopeId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["scopeId"],
        message: "authenticated audit entries require a scope",
      });
    }
  });

const auditTrailFiltersSchema = z
  .object({
    scopeId: idSchema,
    action: safeTokenSchema.optional(),
    resourceType: safeTokenSchema.optional(),
    resourceId: boundedTextSchema.optional(),
    principalId: idSchema.optional(),
    actorKind: actorKindSchema.optional(),
    outcome: outcomeSchema.optional(),
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
    limit: z.number().int().min(1).max(100),
  })
  .strict();

export const auditTrailProjectionSchema = z
  .object({
    kind: z.literal("audit_trail"),
    scopeId: idSchema,
    filters: auditTrailFiltersSchema,
    items: z.array(auditTrailItemSchema).max(100),
  })
  .strict();

export type AuditTrailQuery = z.infer<typeof auditTrailQuerySchema>;
export type AuditTrailItem = z.infer<typeof auditTrailItemSchema>;
export type AuditTrailProjection = z.infer<typeof auditTrailProjectionSchema>;

export function parseAuditTrailProjection(
  value: unknown,
): AuditTrailProjection {
  return auditTrailProjectionSchema.parse(value);
}
