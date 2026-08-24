import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const reflectionAnswerSchema = z
  .object({
    itemId: z.string().uuid(),
    response: z
      .string()
      .trim()
      .min(1)
      .max(10_000)
      .refine(
        (value) => !/<[^>]*>/u.test(value),
        "response must be plain text",
      ),
    savedAt: z.iso.datetime(),
  })
  .strict();

export const participantReflectionProjectionSchema = z
  .object({
    status: z.enum(["NAO_INICIADA", "EM_ANDAMENTO", "CONCLUIDA"]),
    nextAction: z.enum([
      "INICIAR_REFLEXAO",
      "RETOMAR_REFLEXAO",
      "ENVIAR_REFLEXAO",
      "PROXIMA_ACAO",
    ]),
    itemCount: z.number().int().min(1).max(100),
    answeredItemCount: z.number().int().min(0).max(100),
    answers: z.array(reflectionAnswerSchema).max(100),
    evidence: z.literal("REFLEXAO_DIGITAL"),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.answeredItemCount !== value.answers.length) {
      context.addIssue({
        code: "custom",
        path: ["answeredItemCount"],
        message: "answered item count must match the published answers",
      });
    }
    if (value.answeredItemCount > value.itemCount) {
      context.addIssue({
        code: "custom",
        path: ["answeredItemCount"],
        message: "answered item count cannot exceed item count",
      });
    }
    const itemIds = new Set<string>();
    for (const [index, answer] of value.answers.entries()) {
      if (itemIds.has(answer.itemId)) {
        context.addIssue({
          code: "custom",
          path: ["answers", index, "itemId"],
          message: "reflection answers must be unique by item",
        });
      }
      itemIds.add(answer.itemId);
    }
    if (value.status === "NAO_INICIADA" && value.answers.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "an unstarted reflection cannot publish answers",
      });
    }
    if (
      value.status === "CONCLUIDA" &&
      value.answeredItemCount !== value.itemCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["answeredItemCount"],
        message: "a concluded reflection must have all answers",
      });
    }
  });

export type ParticipantReflectionProjection = z.infer<
  typeof participantReflectionProjectionSchema
>;

export function parseParticipantReflection(
  value: unknown,
): ParticipantReflectionProjection {
  const projection = participantReflectionProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
