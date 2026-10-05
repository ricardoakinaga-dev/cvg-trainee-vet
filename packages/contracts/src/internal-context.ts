import { z } from "zod";

export const internalSessionScopesProjectionSchema = z
  .object({
    kind: z.literal("internal_session_scopes"),
    scopes: z.array(z.string().uuid()).max(100),
    recoveryContext: z
      .object({
        principalId: z.string().uuid(),
        sessionBinding: z.string().uuid(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type InternalSessionScopesProjection = z.infer<
  typeof internalSessionScopesProjectionSchema
>;
