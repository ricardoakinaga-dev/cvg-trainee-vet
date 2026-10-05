import { z } from "zod";

export const sessionCurrentProjectionSchema = z
  .object({
    status: z.literal("active"),
  })
  .strict();

export type SessionCurrentProjection = z.infer<
  typeof sessionCurrentProjectionSchema
>;

export const rotateSessionRequestSchema = z
  .object({
    sessionExpiresInSeconds: z.number().int().min(60).max(43_200).default(3600),
  })
  .strict();

export type RotateSessionRequest = z.infer<typeof rotateSessionRequestSchema>;
