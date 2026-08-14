import { z } from "zod";

const distractorObservationSchema = z
  .object({
    key: z.string().trim().min(1).max(256),
    count: z.number().int().nonnegative(),
  })
  .strict();

const anomalyCodeSchema = z.enum([
  "LOW_SAMPLE",
  "EXTREME_DIFFICULTY",
  "LOW_DISCRIMINATION",
  "HIGH_APPEAL_RATE",
]);

export const observedItemStatisticsRequestSchema = z
  .object({
    itemId: z.string().trim().min(1).max(256),
    scopeId: z.string().trim().min(1).max(256),
    contentVersion: z.number().int().min(1),
    observedAt: z.string().datetime({ offset: true }),
    sampleSize: z.number().int().min(1),
    correctCount: z.number().int().nonnegative(),
    appealCount: z.number().int().nonnegative(),
    discrimination: z.number().finite().min(-1).max(1).optional(),
    distractorCounts: z.array(distractorObservationSchema).max(32),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.correctCount > value.sampleSize) {
      context.addIssue({
        code: "custom",
        path: ["correctCount"],
        message: "correctCount cannot exceed sampleSize",
      });
    }
    if (value.appealCount > value.sampleSize) {
      context.addIssue({
        code: "custom",
        path: ["appealCount"],
        message: "appealCount cannot exceed sampleSize",
      });
    }
  });

export const observedItemStatisticsProjectionSchema = z
  .object({
    statisticsId: z.string().trim().min(1).max(256),
    itemId: z.string().trim().min(1).max(256),
    scopeId: z.string().trim().min(1).max(256),
    contentVersion: z.number().int().min(1),
    observedAt: z.string().datetime({ offset: true }),
    sampleSize: z.number().int().min(1),
    correctCount: z.number().int().nonnegative(),
    appealCount: z.number().int().nonnegative(),
    difficulty: z.number().min(0).max(1),
    appealRate: z.number().min(0).max(1),
    discrimination: z.number().min(-1).max(1).nullable(),
    distractorCounts: z.array(distractorObservationSchema).max(32),
    anomalyCodes: z.array(anomalyCodeSchema).max(4).readonly(),
    requiresHumanReview: z.boolean(),
    automaticDecision: z.literal("NONE"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.correctCount > value.sampleSize) {
      context.addIssue({
        code: "custom",
        path: ["correctCount"],
        message: "correctCount cannot exceed sampleSize",
      });
    }
    if (value.appealCount > value.sampleSize) {
      context.addIssue({
        code: "custom",
        path: ["appealCount"],
        message: "appealCount cannot exceed sampleSize",
      });
    }
  });

export type ObservedItemStatisticsProjection = z.infer<
  typeof observedItemStatisticsProjectionSchema
>;

export function parseObservedItemStatistics(
  value: unknown,
): ObservedItemStatisticsProjection {
  return observedItemStatisticsProjectionSchema.parse(value);
}
