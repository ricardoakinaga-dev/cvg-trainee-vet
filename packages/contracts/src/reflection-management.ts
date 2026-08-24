import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const countSchema = z.number().int().nonnegative();
const countsSchema = z
  .object({
    NAO_INICIADA: countSchema,
    EM_ANDAMENTO: countSchema,
    CONCLUIDA: countSchema,
  })
  .strict();

const moduleSchema = z
  .object({
    moduleId: moduleIdSchema,
    totalAssignments: countSchema,
    counts: countsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const total =
      value.counts.NAO_INICIADA +
      value.counts.EM_ANDAMENTO +
      value.counts.CONCLUIDA;
    if (total !== value.totalAssignments) {
      context.addIssue({
        code: "custom",
        path: ["totalAssignments"],
        message: "reflection counts must match total assignments",
      });
    }
  });

export const reflectionManagementProjectionSchema = z
  .object({
    kind: z.literal("reflection_management_aggregate"),
    scopeId: z.string().uuid(),
    generatedAt: z.iso.datetime(),
    modules: z.array(moduleSchema).max(24),
    evidence: z.literal("REFLEXAO_DIGITAL"),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const [index, module] of value.modules.entries()) {
      if (ids.has(module.moduleId)) {
        context.addIssue({
          code: "custom",
          path: ["modules", index, "moduleId"],
          message: "reflection modules must be unique",
        });
      }
      ids.add(module.moduleId);
    }
  });

export type ReflectionManagementProjection = z.infer<
  typeof reflectionManagementProjectionSchema
>;

export const reflectionManagementQuerySchema = z
  .object({
    scopeId: z.string().uuid(),
  })
  .strict();

export type ReflectionManagementQuery = z.infer<
  typeof reflectionManagementQuerySchema
>;

export function parseReflectionManagementProjection(
  value: unknown,
): ReflectionManagementProjection {
  const projection = reflectionManagementProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
