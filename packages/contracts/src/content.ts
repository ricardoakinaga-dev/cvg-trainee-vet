import { z } from "zod";

const idSchema = z.string().uuid();

export const contentTransitionRequestSchema = z
  .object({
    version: z.number().int().min(1),
    scopeId: idSchema,
    event: z.enum([
      "AUTOVERIFICAR",
      "INICIAR_REVISAO_CLINICA",
      "RETORNAR_A_RASCUNHO",
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
