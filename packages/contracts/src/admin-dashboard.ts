import { z } from "zod";

const idSchema = z.string().uuid();
const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const scopeIdSchema = z.string().trim().min(1).max(128);
const accountStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
]);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const summarySchema = z
  .object({
    participantsTotal: z.number().int().nonnegative(),
    activeParticipants: z.number().int().nonnegative(),
    invitedParticipants: z.number().int().nonnegative(),
    participantsInProgress: z.number().int().nonnegative(),
    averageProgressPercent: z.number().int().min(0).max(100),
    assignedModules: z.number().int().nonnegative(),
    completedModules: z.number().int().nonnegative(),
  })
  .strict();

const participantSchema = z
  .object({
    participantId: idSchema,
    professionalEmail: z.string().trim().email().max(320),
    accountStatus: accountStatusSchema,
    scopeIds: z.array(scopeIdSchema).max(32),
    assignedModules: z.number().int().nonnegative().max(24),
    completedModules: z.number().int().nonnegative().max(24),
    progressPercent: z.number().int().min(0).max(100),
    activeModuleId: moduleIdSchema.optional(),
    activeModuleTitle: plainTextSchema.optional(),
    nextAction: plainTextSchema,
  })
  .strict();

const trainingModuleSchema = z
  .object({
    moduleId: moduleIdSchema,
    month: z.number().int().min(1).max(24),
    title: z.string().trim().min(1).max(300),
    competence: z.string().trim().min(1).max(2_000),
    assignedParticipants: z.number().int().nonnegative(),
    activeParticipants: z.number().int().nonnegative(),
    completedParticipants: z.number().int().nonnegative(),
  })
  .strict();

export const adminDashboardProjectionSchema = z
  .object({
    curriculumId: z.string().trim().min(1).max(128),
    curriculumVersion: z.string().trim().min(1).max(32),
    summary: summarySchema,
    participants: z.array(participantSchema).max(200),
    trainingCatalog: z.array(trainingModuleSchema).length(24),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.trainingCatalog.map((module) => module.moduleId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["trainingCatalog"],
        message: "training catalog module ids must be unique",
      });
    }
  });

export type AdminDashboardProjection = z.infer<
  typeof adminDashboardProjectionSchema
>;

export function parseAdminDashboard(value: unknown): AdminDashboardProjection {
  return adminDashboardProjectionSchema.parse(value);
}
