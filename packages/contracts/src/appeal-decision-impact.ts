import { z } from "zod";

const idSchema = z.string().uuid();

const appealStatusSchema = z.enum([
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
]);

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

const latestResultSchema = z
  .object({
    availability: z.enum(["AVAILABLE", "NOT_AVAILABLE"]),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.availability === "AVAILABLE" && value.version === undefined) {
      context.addIssue({
        code: "custom",
        path: ["version"],
        message: "version is required when a result is available",
      });
    }
    if (value.availability === "NOT_AVAILABLE" && value.version !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["version"],
        message: "version is forbidden when a result is unavailable",
      });
    }
  });

export const appealDecisionImpactPathSchema = z
  .object({ appealId: idSchema })
  .strict();

export const appealDecisionImpactQuerySchema = z
  .object({ decision: z.literal("ANULAR_ITEM") })
  .strict();

export const appealDecisionImpactProjectionSchema = z
  .object({
    kind: z.literal("appeal_decision_impact_preview"),
    appealId: idSchema,
    decision: z.literal("ANULAR_ITEM"),
    appeal: z
      .object({
        status: appealStatusSchema,
        version: z.number().int().nonnegative(),
      })
      .strict(),
    target: z
      .object({
        attemptId: idSchema,
        itemId: idSchema,
        attemptStatus: attemptStatusSchema,
        attemptVersion: z.number().int().nonnegative(),
      })
      .strict(),
    latestResult: latestResultSchema,
    impact: z
      .object({
        scoreImpact: z.literal("NOT_COMPUTED"),
        recalculation: z.literal("NOT_AVAILABLE_IN_THIS_SLICE"),
        automaticMutation: z.literal("NONE"),
        publication: z.literal("NOT_PERFORMED"),
      })
      .strict(),
  })
  .strict();

export type AppealDecisionImpactPath = z.infer<
  typeof appealDecisionImpactPathSchema
>;
export type AppealDecisionImpactQuery = z.infer<
  typeof appealDecisionImpactQuerySchema
>;
export type AppealDecisionImpactProjection = z.infer<
  typeof appealDecisionImpactProjectionSchema
>;
