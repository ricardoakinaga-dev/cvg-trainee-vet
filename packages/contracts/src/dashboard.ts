import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";
import { participantDiagnosticProfileItemSchema } from "./diagnostic.js";

const nextActionSchema = z.enum([
  "INICIAR_ATIVIDADE",
  "RETOMAR_ATIVIDADE",
  "AGUARDAR_CORRECAO",
  "REVISAR_PROXIMO_CONTEUDO",
  "CONSULTAR_PROXIMO_PASSO",
  "EXECUTAR_REMEDIACAO",
  "REVISAR_RETENCAO",
  "AGUARDAR_CORRECAO_HUMANA",
]);

const boundedCount = z.number().int().nonnegative();
const boundedPercent = z.number().int().min(0).max(100).nullable();
const modulePathItemSchema = z
  .object({
    moduleId: z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u),
    month: z.number().int().min(1).max(24),
    status: z.enum([
      "DISPONIVEL",
      "BLOQUEADO_PRE_REQUISITO",
      "EM_REMEDIACAO",
      "RETENCAO_PENDENTE",
      "CONCLUIDO",
      "EM_ANDAMENTO",
      "NAO_ATRIBUIDO",
    ]),
    nextAction: z.enum([
      "INICIAR_BASELINE",
      "CONCLUIR_PRE_REQUISITO",
      "EXECUTAR_REMEDIACAO",
      "EXECUTAR_RETENCAO",
      "REVISAR_PROXIMO_MODULO",
      "RETOMAR_MODULO",
      "AGUARDAR_ATRIBUICAO",
    ]),
  })
  .strict();

const competencyProfileItemSchema = z
  .object({
    moduleId: z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u),
    month: z.number().int().min(1).max(24),
    competence: z.string().trim().min(1).max(500),
    status: z.enum([
      "SEM_EVIDENCIA_DIGITAL",
      "EM_DESENVOLVIMENTO_DIGITAL",
      "DOMINIO_DIGITAL",
      "EM_REMEDIACAO",
      "RETENCAO_PENDENTE",
      "AGUARDA_CORRECAO_HUMANA",
    ]),
    scorePercent: boundedPercent,
    lastEvaluatedAt: z.string().datetime({ offset: true }).optional(),
    evidence: z.literal("AVALIACAO_MODULAR_DIGITAL"),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict();

const participantDashboardProjectionSchema = z
  .object({
    kind: z.literal("participant"),
    nextAction: nextActionSchema,
    path: z.array(modulePathItemSchema).max(24),
    profile: z.array(competencyProfileItemSchema).max(24),
    diagnosticProfile: z
      .array(participantDiagnosticProfileItemSchema)
      .length(3)
      .optional(),
    progress: z
      .object({
        assignedActivities: boundedCount,
        completedActivities: boundedCount,
        progressPercent: boundedPercent,
        remediationObjectives: boundedCount,
        retentionReviewsPending: boundedCount,
        pendingCorrections: boundedCount,
      })
      .strict(),
  })
  .strict();

const staffParticipantProjectionSchema = z
  .object({
    participantId: z.string().uuid(),
    professionalEmail: z.string().email().max(320),
    accountStatus: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"]),
    scopeIds: z.array(z.string().trim().min(1).max(128)).min(1).max(32),
    lastSeenAt: z.string().datetime({ offset: true }).optional(),
    progress: z
      .object({
        assignedModules: boundedCount,
        completedModules: boundedCount,
        progressPercent: boundedPercent,
        remediationModules: boundedCount,
        retentionReviewsPending: boundedCount,
      })
      .strict(),
    pendingCorrections: boundedCount,
    openFeedback: boundedCount,
    nextAction: nextActionSchema,
    diagnosticProfile: z
      .array(participantDiagnosticProfileItemSchema)
      .length(3)
      .optional(),
  })
  .strict();

export const staffDashboardProjectionSchema = z
  .object({
    kind: z.literal("staff"),
    scopes: z.array(z.string().trim().min(1).max(128)).min(1).max(32),
    generatedAt: z.string().datetime({ offset: true }),
    metrics: z
      .object({
        invitedParticipants: boundedCount,
        activeParticipants: boundedCount,
        inactiveParticipants: boundedCount,
        assignedModules: boundedCount,
        completedModules: boundedCount,
        completionRatePercent: boundedPercent,
        medianProgressPercent: boundedPercent,
        pendingCorrections: boundedCount,
        remediationParticipants: boundedCount,
        retentionReviewsPending: boundedCount,
        openFeedback: boundedCount,
        content: z
          .object({
            published: boundedCount,
            inReview: boundedCount,
            expired: boundedCount,
            withdrawn: boundedCount,
          })
          .strict(),
      })
      .strict(),
    participants: z.array(staffParticipantProjectionSchema).max(100),
  })
  .strict();

export const dashboardProjectionSchema = z.discriminatedUnion("kind", [
  participantDashboardProjectionSchema,
  staffDashboardProjectionSchema,
]);

export type ParticipantDashboardProjection = z.infer<
  typeof participantDashboardProjectionSchema
>;
export type StaffDashboardProjection = z.infer<
  typeof staffDashboardProjectionSchema
>;
export type DashboardProjection = z.infer<typeof dashboardProjectionSchema>;

export function parseDashboardProjection(value: unknown): DashboardProjection {
  const projection = dashboardProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
