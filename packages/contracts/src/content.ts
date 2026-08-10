import { z } from "zod";

const idSchema = z.string().uuid();

export const contentTransitionRequestSchema = z
  .object({
    version: z.number().int().min(1),
    scopeId: idSchema,
    event: z.enum([
      "AUTOVERIFICAR",
      "INICIAR_REVISAO_CLINICA",
      "SOLICITAR_AJUSTES",
      "RETORNAR_A_RASCUNHO",
      "APROVAR_CLINICAMENTE",
      "VERIFICAR_PROJECAO",
      "AUTORIZAR_PUBLICACAO",
      "PUBLICAR",
      "RETIRAR",
      "VENCER",
    ]),
  })
  .strict();

export type ContentTransitionRequest = z.infer<
  typeof contentTransitionRequestSchema
>;
