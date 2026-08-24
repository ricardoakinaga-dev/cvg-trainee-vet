import { z } from "zod";

const idSchema = z.string().uuid();
const timestampSchema = z.iso.datetime();
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

const eventTypeSchema = z.enum(["CRIADO", "STATUS_ALTERADO"]);

export const feedbackTicketHistoryPathSchema = z
  .object({ ticketId: idSchema })
  .strict();

export const feedbackTicketHistoryQuerySchema = z
  .object({ limit: z.number().int().min(1).max(100).optional() })
  .strict();

const eventProjectionSchema = z
  .object({
    historyId: idSchema,
    ticketId: idSchema,
    ticketVersion: z.number().int().nonnegative(),
    eventType: eventTypeSchema,
    fromStatus: statusSchema.optional(),
    toStatus: statusSchema,
    createdAt: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.eventType === "CRIADO" && value.fromStatus !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["fromStatus"],
        message: "created events cannot have a previous status",
      });
    }
    if (
      value.eventType === "STATUS_ALTERADO" &&
      value.fromStatus === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["fromStatus"],
        message: "status changes require a previous status",
      });
    }
  });

export const feedbackTicketHistoryProjectionSchema = z
  .object({
    ticketId: idSchema,
    events: z.array(eventProjectionSchema).max(100),
  })
  .strict();

export type FeedbackTicketHistoryPath = z.infer<
  typeof feedbackTicketHistoryPathSchema
>;
export type FeedbackTicketHistoryQuery = z.infer<
  typeof feedbackTicketHistoryQuerySchema
>;
export type FeedbackTicketHistoryEventProjection = z.infer<
  typeof eventProjectionSchema
>;
export type FeedbackTicketHistoryProjection = z.infer<
  typeof feedbackTicketHistoryProjectionSchema
>;
