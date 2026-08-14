import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);
const participantIdSchema = z.string().uuid();
const scopeIdSchema = z.string().trim().min(1).max(128);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");
const countSchema = z.number().int().nonnegative().max(1_000_000);

const queueSchema = z
  .object({
    queueId: idSchema,
    scopeId: scopeIdSchema,
    kind: z.enum(["CORRECTION", "FEEDBACK", "REMEDIATION"]),
    openCount: countSchema,
    overdueCount: countSchema,
  })
  .strict();

const participantSchema = z
  .object({
    participantId: participantIdSchema,
    professionalEmail: z.string().trim().email().max(320),
    scopeIds: z.array(scopeIdSchema).max(32),
    progressPercent: z.number().int().min(0).max(100),
    nextAction: plainTextSchema,
    gapCount: countSchema,
    remediationObjectiveIds: z.array(idSchema).max(500),
    correctionPendingCount: countSchema,
    feedbackOpenCount: countSchema,
    technicalFailureCount: countSchema,
    digitalReinforcementPlan: z.array(idSchema).max(500),
  })
  .strict();

const summarySchema = z
  .object({
    participantsTotal: countSchema,
    correctionPending: countSchema,
    feedbackOpen: countSchema,
    technicalFailures: countSchema,
    overdueQueues: countSchema,
  })
  .strict();

export const moderatorDashboardProjectionSchema = z
  .object({
    moderatorId: idSchema,
    scopeIds: z.array(scopeIdSchema).max(32),
    participants: z.array(participantSchema).max(200),
    queues: z.array(queueSchema).max(500),
    practiceValidation: z.literal("NOT_AVAILABLE"),
    summary: summarySchema,
  })
  .strict();

export type ModeratorDashboardProjection = z.infer<
  typeof moderatorDashboardProjectionSchema
>;

export function parseModeratorDashboard(
  value: unknown,
): ModeratorDashboardProjection {
  return moderatorDashboardProjectionSchema.parse(value);
}
