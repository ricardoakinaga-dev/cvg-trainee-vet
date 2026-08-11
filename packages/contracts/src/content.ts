import { z } from "zod";

const idSchema = z.string().uuid();

export const contentTransitionRequestSchema = z
  .object({
    version: z.number().int().min(1),
    scopeId: idSchema,
    event: z.enum([
      "AUTOVERIFICAR",
      "VERIFICAR_PROJECAO",
      "ENVIAR_PARA_REVISAO_CLINICA",
      "SOLICITAR_AJUSTES",
      "APROVAR_CLINICAMENTE",
      "AUTORIZAR_PUBLICACAO",
      "PUBLICAR",
      "PUBLICAR_AUTOMATICAMENTE",
      "RETIRAR",
      "VENCER",
    ]),
  })
  .strict();

export type ContentTransitionRequest = z.infer<
  typeof contentTransitionRequestSchema
>;
