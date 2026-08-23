import { z } from "zod";

import { assertPublicProjection } from "./public-boundary.js";

const uuidSchema = z.string().uuid();
const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const diagnosticAnswerSchema = z
  .object({
    itemId: z.string().trim().min(1).max(128),
    selectedChoiceIds: z.array(z.string().trim().min(1).max(32)).min(1).max(8),
  })
  .strict();

export const diagnosticEvaluationRequestSchema = z
  .object({
    participantId: uuidSchema,
    scopeId: uuidSchema,
    answers: z.array(diagnosticAnswerSchema).max(120),
    completedAt: z.iso.datetime(),
  })
  .strict();

const diagnosticThemeIdSchema = z.enum(["B07-S1", "B07-S2", "B07-S3"]);

export const participantDiagnosticProfileItemSchema = z
  .object({
    themeId: diagnosticThemeIdSchema,
    themeLabel: z.string().trim().min(1).max(160),
    status: z.enum(["SEM_EVIDENCIA_DIGITAL", "BASELINE_REGISTRADA"]),
    scorePercent: z.number().int().min(0).max(100).nullable(),
    answeredItemCount: z.number().int().nonnegative().max(40),
    itemCount: z.number().int().min(1).max(40),
    recommendedModuleIds: z.array(moduleIdSchema).max(24),
    lastEvaluatedAt: z.string().datetime({ offset: true }).optional(),
    evidence: z.literal("DIAGNOSTICO_FORMATIVO_DIGITAL"),
    notPunitive: z.literal(true),
    noGlobalPassFail: z.literal(true),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict();

export const diagnosticResultProjectionSchema = z
  .object({
    resultId: uuidSchema,
    diagnosticId: z.literal("B07-DIAGNOSTIC-V1"),
    version: z.literal("0.1.0"),
    completedAt: z.string().datetime({ offset: true }),
    themes: z.array(participantDiagnosticProfileItemSchema).length(3),
  })
  .strict();

export type DiagnosticEvaluationRequest = z.infer<
  typeof diagnosticEvaluationRequestSchema
>;
export type ParticipantDiagnosticProfileItem = z.infer<
  typeof participantDiagnosticProfileItemSchema
>;
export type DiagnosticResultProjection = z.infer<
  typeof diagnosticResultProjectionSchema
>;

export function parseParticipantDiagnosticProfile(
  value: unknown,
): ParticipantDiagnosticProfileItem {
  const profile = participantDiagnosticProfileItemSchema.parse(value);
  assertPublicProjection(profile);
  return profile;
}

export function parseDiagnosticResultProjection(
  value: unknown,
): DiagnosticResultProjection {
  const projection = diagnosticResultProjectionSchema.parse(value);
  assertPublicProjection(projection);
  return projection;
}
