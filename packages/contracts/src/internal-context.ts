import { z } from "zod";

export const internalSessionScopesProjectionSchema = z
  .object({
    kind: z.literal("internal_session_scopes"),
    scopes: z.array(z.string().uuid()).max(100),
  })
  .strict();

export type InternalSessionScopesProjection = z.infer<
  typeof internalSessionScopesProjectionSchema
>;
