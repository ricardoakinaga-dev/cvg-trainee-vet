import { z } from "zod";

const idSchema = z.string().uuid();
const statusSchema = z.enum([
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
]);
const prioritySchema = z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]);
const assignmentSchema = z.enum(["MANTER", "ASSUMIR", "LIBERAR"]);

export const feedbackTriageMetadataPathSchema = z
  .object({ ticketId: idSchema })
  .strict();

export const feedbackTriageMetadataRequestSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    priority: prioritySchema,
    assignment: assignmentSchema,
  })
  .strict();

export const feedbackTriageMetadataProjectionSchema = z
  .object({
    ticketId: idSchema,
    scopeId: idSchema,
    status: statusSchema,
    version: z.number().int().nonnegative(),
    priority: prioritySchema,
    assigneeId: idSchema.optional(),
  })
  .strict();

export type FeedbackTriageMetadataPath = z.infer<
  typeof feedbackTriageMetadataPathSchema
>;
export type FeedbackTriageMetadataRequest = z.infer<
  typeof feedbackTriageMetadataRequestSchema
>;
export type FeedbackTriageMetadataProjection = z.infer<
  typeof feedbackTriageMetadataProjectionSchema
>;
