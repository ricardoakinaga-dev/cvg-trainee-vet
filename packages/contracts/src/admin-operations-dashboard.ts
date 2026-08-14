import { z } from "zod";

import { adminDashboardProjectionSchema } from "./admin-dashboard.js";

const counterSchema = z.number().int().nonnegative().max(1_000_000);

const operationsSchema = z
  .object({
    accounts: z
      .object({
        invited: counterSchema,
        active: counterSchema,
        suspended: counterSchema,
        deactivated: counterSchema,
        inactiveOver14Days: counterSchema,
      })
      .strict(),
    corrections: z
      .object({
        open: counterSchema,
        overdue: counterSchema,
        slaBreaches: counterSchema,
      })
      .strict(),
    remediation: z
      .object({
        participants: counterSchema,
        objectives: counterSchema,
      })
      .strict(),
    contentValidity: z
      .object({
        valid: counterSchema,
        dueForReview: counterSchema,
        expired: counterSchema,
        withdrawn: counterSchema,
      })
      .strict(),
    feedback: z
      .object({
        open: counterSchema,
        technicalFailures: counterSchema,
      })
      .strict(),
  })
  .strict();

export const adminOperationsDashboardProjectionSchema = z
  .object({
    dashboard: adminDashboardProjectionSchema,
    operations: operationsSchema,
  })
  .strict();

export type AdminOperationsDashboardProjection = z.infer<
  typeof adminOperationsDashboardProjectionSchema
>;

export function parseAdminOperationsDashboard(
  value: unknown,
): AdminOperationsDashboardProjection {
  return adminOperationsDashboardProjectionSchema.parse(value);
}
