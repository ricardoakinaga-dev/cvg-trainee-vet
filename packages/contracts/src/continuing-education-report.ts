import { z } from "zod";

const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const accountStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);
const countSchema = z.number().int().nonnegative();
const percentSchema = z.number().int().min(0).max(100).nullable();
const hoursSchema = z.number().finite().nonnegative();

export const continuingEducationReportQuerySchema = z
  .object({
    scopeId: z.string().uuid(),
    moduleId: moduleIdSchema.optional(),
    accountStatus: accountStatusSchema.optional(),
  })
  .strict();

const participantSchema = z
  .object({
    participantId: z.string().uuid(),
    professionalEmail: z.string().email().max(320),
    accountStatus: accountStatusSchema,
    assignedModules: countSchema,
    completedModules: countSchema,
    progressPercent: percentSchema,
    completedDigitalMinutes: countSchema,
    completedDigitalHours: hoursSchema,
    lastSeenAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const moduleSummarySchema = z
  .object({
    moduleId: moduleIdSchema,
    month: z.number().int().min(1).max(24),
    scheduledMinutes: countSchema,
    assignedParticipants: countSchema,
    completedParticipants: countSchema,
    completionRatePercent: percentSchema,
  })
  .strict();

export const continuingEducationReportProjectionSchema = z
  .object({
    kind: z.literal("continuing_education_report"),
    scopeId: z.string().uuid(),
    generatedAt: z.string().datetime({ offset: true }),
    filters: continuingEducationReportQuerySchema,
    summary: z
      .object({
        participantCount: countSchema,
        invitedParticipants: countSchema,
        activeParticipants: countSchema,
        suspendedParticipants: countSchema,
        deactivatedParticipants: countSchema,
        assignedModules: countSchema,
        completedModules: countSchema,
        completionRatePercent: percentSchema,
        completedDigitalMinutes: countSchema,
        completedDigitalHours: hoursSchema,
      })
      .strict(),
    participants: z.array(participantSchema).max(100),
    modules: z.array(moduleSummarySchema).max(24),
    learningEvidence: z.literal("ATIVIDADE_MODULAR_DIGITAL"),
    hoursClaim: z.literal("NAO_CREDENCIADAS"),
    practicalCompetenceClaim: z.literal("PROIBIDO_MVP"),
  })
  .strict();

export type ContinuingEducationReportQuery = z.infer<
  typeof continuingEducationReportQuerySchema
>;
export type ContinuingEducationReportProjection = z.infer<
  typeof continuingEducationReportProjectionSchema
>;

export function parseContinuingEducationReportProjection(
  value: unknown,
): ContinuingEducationReportProjection {
  return continuingEducationReportProjectionSchema.parse(value);
}
