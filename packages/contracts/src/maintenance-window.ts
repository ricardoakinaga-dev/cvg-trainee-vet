import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const timestamp = z.string().datetime({ offset: true });

const protectedOperationalIntervalSchema = z
  .object({
    intervalId: id,
    startsAt: timestamp,
    endsAt: timestamp,
  })
  .strict();

export const maintenanceWindowRequestSchema = z
  .object({
    changeId: id,
    startsAt: timestamp,
    endsAt: timestamp,
    approvedBy: id.optional(),
    approvedAt: timestamp.optional(),
    protectedIntervals: z
      .array(protectedOperationalIntervalSchema)
      .min(1)
      .max(128),
  })
  .strict();

export const maintenanceWindowDecisionSchema = z
  .object({
    changeId: id,
    decision: z.enum([
      "APPROVED_OUTSIDE_CRITICAL_HOURS",
      "REJECTED_CRITICAL_HOURS",
      "REJECTED_APPROVAL",
    ]),
    overlaps: z.array(id).max(128).readonly(),
  })
  .strict();

export type MaintenanceWindowRequest = z.infer<
  typeof maintenanceWindowRequestSchema
>;
export type MaintenanceWindowDecision = z.infer<
  typeof maintenanceWindowDecisionSchema
>;
