import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const idSchema = z.string().uuid();

export const participantProgressProjectionSchema = z
  .object({
    activityId: idSchema,
    assignmentStatus: z.enum([
      "ATRIBUIDO",
      "DISPONIVEL",
      "EM_ANDAMENTO",
      "CONCLUIDO",
      "EM_REFORCO",
      "CONCLUIDO_COM_RETENCAO_PENDENTE",
      "PAUSADO",
      "BLOQUEADO",
    ]),
    attemptStatus: z
      .enum([
        "CRIADA",
        "EM_ANDAMENTO",
        "SALVA",
        "SUBMETIDA",
        "CORRIGIDA_AUTOMATICAMENTE",
        "AGUARDA_CORRECAO_HUMANA",
        "CORRIGIDA_HUMANAMENTE",
        "ANULADA",
      ])
      .optional(),
    attemptVersion: z.number().int().nonnegative().optional(),
    nextAction: z.enum([
      "INICIAR_ATIVIDADE",
      "RETOMAR_ATIVIDADE",
      "AGUARDAR_CORRECAO",
      "REVISAR_PROXIMO_CONTEUDO",
      "CONSULTAR_PROXIMO_PASSO",
    ]),
  })
  .strict();

export type ParticipantProgressProjection = z.infer<
  typeof participantProgressProjectionSchema
>;

export function parseParticipantProgress(
  value: unknown,
): ParticipantProgressProjection {
  const projection = participantProgressProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
