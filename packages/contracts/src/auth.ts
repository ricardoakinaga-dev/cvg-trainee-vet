import { z } from "zod";

const passwordSchema = z.string().min(12).max(128);

export const loginRequestSchema = z
  .object({
    login: z.string().trim().email().max(320),
    password: passwordSchema,
    sessionExpiresInSeconds: z
      .number()
      .int()
      .min(60)
      .max(604_800)
      .default(3600),
  })
  .strict();

export const passwordUpdateRequestSchema = z
  .object({ password: passwordSchema })
  .strict();

export const activeSessionProjectionSchema = z
  .object({ status: z.literal("active") })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type PasswordUpdateRequest = z.infer<typeof passwordUpdateRequestSchema>;
