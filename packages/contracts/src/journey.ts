import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";
import {
  participantAssessmentWorkflowProjectionSchema,
  participantLearningAssignmentProjectionSchema,
} from "./learning-state.js";
import { participantCurriculumRuntimeProjectionSchema } from "./learning.js";

const idSchema = z.string().uuid();
const attemptStatusSchema = z.enum([
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
]);
const journeyNextActionSchema = z.enum([
  "INICIAR_ATIVIDADE",
  "RETOMAR_ATIVIDADE",
  "AGUARDAR_CORRECAO",
  "REVISAR_PROXIMO_CONTEUDO",
  "CONSULTAR_PROXIMO_PASSO",
  "EXECUTAR_REMEDIACAO",
  "REVISAR_RETENCAO",
  "AGUARDAR_CORRECAO_HUMANA",
]);
const journeyNextActionTargetSchema = z
  .object({
    kind: z.literal("ACTIVITY"),
    activityId: idSchema,
  })
  .strict();

const activitySchema = z
  .object({
    activityId: idSchema,
    slug: z.string().trim().min(1).max(128),
    title: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .refine((value) => !/<[^>]*>/u.test(value), "title must be plain text"),
    status: z.enum([
      "ATRIBUIDO",
      "DISPONIVEL",
      "EM_ANDAMENTO",
      "CONCLUIDO",
      "EM_REFORCO",
      "CONCLUIDO_COM_RETENCAO_PENDENTE",
      "PAUSADO",
      "BLOQUEADO",
    ]),
    attemptId: idSchema.optional(),
    attemptStatus: attemptStatusSchema.optional(),
    attemptVersion: z.number().int().nonnegative().optional(),
    nextAction: journeyNextActionSchema.extract([
      "INICIAR_ATIVIDADE",
      "RETOMAR_ATIVIDADE",
      "AGUARDAR_CORRECAO",
      "REVISAR_PROXIMO_CONTEUDO",
      "CONSULTAR_PROXIMO_PASSO",
    ]),
  })
  .strict()
  .superRefine((value, context) => {
    const attemptFields = [
      value.attemptId,
      value.attemptStatus,
      value.attemptVersion,
    ];
    const present = attemptFields.filter((field) => field !== undefined).length;
    if (present !== 0 && present !== attemptFields.length) {
      context.addIssue({
        code: "custom",
        path: ["attemptId"],
        message: "attempt fields must be published together",
      });
    }
  });

export const participantLearningJourneyProjectionSchema = z
  .object({
    assignments: z
      .array(participantLearningAssignmentProjectionSchema)
      .max(100),
    activities: z.array(activitySchema).max(100),
    results: z.array(participantAssessmentWorkflowProjectionSchema).max(100),
    runtimes: z.array(participantCurriculumRuntimeProjectionSchema).max(100),
    nextAction: journeyNextActionSchema,
    nextActionTarget: journeyNextActionTargetSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.nextActionTarget !== undefined &&
      !value.activities.some(
        (activity) =>
          activity.activityId === value.nextActionTarget?.activityId,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["nextActionTarget", "activityId"],
        message: "next action target must be a published journey activity",
      });
    }
    if (
      value.nextActionTarget !== undefined &&
      ![
        "INICIAR_ATIVIDADE",
        "RETOMAR_ATIVIDADE",
        "EXECUTAR_REMEDIACAO",
      ].includes(value.nextAction)
    ) {
      context.addIssue({
        code: "custom",
        path: ["nextActionTarget"],
        message: "next action target is incompatible with the next action",
      });
    }
  });

export type ParticipantLearningJourneyProjection = z.infer<
  typeof participantLearningJourneyProjectionSchema
>;

export function parseParticipantLearningJourney(
  value: unknown,
): ParticipantLearningJourneyProjection {
  const projection = participantLearningJourneyProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
