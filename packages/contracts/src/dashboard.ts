import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const dashboardModuleStatusSchema = z.enum([
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "EM_REMEDIACAO",
  "RETENCAO_PENDENTE",
  "CONCLUIDO_DIGITAL",
  "BLOQUEADO_PRE_REQUISITO",
  "AGUARDANDO_PUBLICACAO",
]);
const dashboardNextActionSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/<[^>]*>/u.test(value), "nextAction must be plain text");

const dashboardModuleSchema = z
  .object({
    moduleId: moduleIdSchema,
    month: z.number().int().min(1).max(24),
    title: z.string().trim().min(1).max(300),
    competence: z.string().trim().min(1).max(2_000),
    sessionCount: z.literal(4),
    status: dashboardModuleStatusSchema,
    nextAction: dashboardNextActionSchema,
  })
  .strict();

export const participantDashboardProjectionSchema = z
  .object({
    curriculumId: z.string().trim().min(1).max(128),
    curriculumVersion: z.string().trim().min(1).max(32),
    totalMonths: z.literal(24),
    totalModules: z.literal(24),
    completedModules: z.number().int().min(0).max(24),
    progressPercent: z.number().int().min(0).max(100),
    activeModuleId: moduleIdSchema.optional(),
    nextAction: dashboardNextActionSchema,
    roadmap: z.array(dashboardModuleSchema).length(24),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.roadmap.map((module) => module.moduleId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["roadmap"],
        message: "roadmap module ids must be unique",
      });
    }
  });

export type ParticipantDashboardProjection = z.infer<
  typeof participantDashboardProjectionSchema
>;

export function parseParticipantDashboard(
  value: unknown,
): ParticipantDashboardProjection {
  const projection = participantDashboardProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}

const operationalEvidenceStatusSchema = z.enum([
  "VERIFIED",
  "NOT_CONFIGURED",
  "NOT_EXECUTED",
]);

export const operationsDashboardProjectionSchema = z
  .object({
    dependencyStatus: z.enum(["READY", "DEGRADED", "NOT_READY"]),
    dependencies: z
      .object({
        postgres: z.enum(["UP", "DOWN"]),
        qdrant: z.enum(["UP", "DOWN", "DISABLED"]),
        ai: z.enum(["ENABLED", "DISABLED"]),
      })
      .strict(),
    metrics: z
      .object({
        requestsTotal: z.number().int().nonnegative(),
        errorsTotal: z.number().int().nonnegative(),
        p95DurationMs: z.number().nonnegative().nullable(),
      })
      .strict(),
    evidence: z
      .object({
        collector: operationalEvidenceStatusSchema,
        retention: operationalEvidenceStatusSchema,
        traces: operationalEvidenceStatusSchema,
        load: operationalEvidenceStatusSchema,
        failover: operationalEvidenceStatusSchema,
        replicas: operationalEvidenceStatusSchema,
      })
      .strict(),
  })
  .strict();

export type OperationsDashboardProjection = z.infer<
  typeof operationsDashboardProjectionSchema
>;

export function parseOperationsDashboard(
  value: unknown,
): OperationsDashboardProjection {
  const projection = operationsDashboardProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}

export const accountSecurityProjectionSchema = z
  .object({
    provider: z.enum(["EXTERNAL_IDENTITY_PROVIDER", "NOT_CONFIGURED"]),
    recovery: z.enum(["AVAILABLE", "UNAVAILABLE"]),
    mfa: z.enum(["ENABLED", "NOT_ENABLED", "UNAVAILABLE"]),
    session: z.enum(["ACTIVE", "NO_SESSION"]),
  })
  .strict();

export type AccountSecurityProjection = z.infer<
  typeof accountSecurityProjectionSchema
>;

export function parseAccountSecurity(
  value: unknown,
): AccountSecurityProjection {
  const projection = accountSecurityProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
