import { z } from "zod";

const idSchema = z.string().uuid();
const withdrawalReasonCodeSchema = z.enum([
  "ERRO_CLINICO",
  "ERRO_CONTEUDO",
  "RISCO_SEGURANCA",
]);

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
    withdrawalReasonCode: withdrawalReasonCodeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.event === "RETIRAR" && value.withdrawalReasonCode === undefined) {
      context.addIssue({
        code: "custom",
        path: ["withdrawalReasonCode"],
        message: "withdrawalReasonCode is required when withdrawing content",
      });
    }
    if (value.event !== "RETIRAR" && value.withdrawalReasonCode !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["withdrawalReasonCode"],
        message: "withdrawalReasonCode is only valid when withdrawing content",
      });
    }
  });

export type ContentTransitionRequest = z.infer<
  typeof contentTransitionRequestSchema
>;
