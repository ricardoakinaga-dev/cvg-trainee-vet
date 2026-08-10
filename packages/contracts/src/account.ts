import { z } from "zod";

export const accountActionRequestSchema = z.object({}).strict();

export const accountOperationProjectionSchema = z
  .object({
    operationId: z.string().trim().min(1).max(256),
    expiresAt: z.iso.datetime(),
  })
  .strict();

export type AccountOperationProjection = z.infer<
  typeof accountOperationProjectionSchema
>;
