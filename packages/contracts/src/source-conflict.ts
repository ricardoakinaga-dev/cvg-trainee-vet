import { z } from "zod";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const decisionSchema = z.enum([
  "ACCEPT_SOURCE_A",
  "ACCEPT_SOURCE_B",
  "ESCALATE_CLINICAL_REVIEW",
  "DEFER_PUBLICATION",
]);

const baseSchema = {
  conflictId: plainText(256),
  contentId: plainText(256),
  contentVersion: z.number().int().min(1),
  scopeId: plainText(256),
  sourceCodes: z.array(plainText(256)).min(2).max(32),
  description: plainText(4_000),
  decision: decisionSchema,
  rationale: plainText(4_000),
  decidedAt: z.iso.datetime(),
};

export const sourceConflictDecisionRequestSchema = z
  .object(baseSchema)
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.sourceCodes).size !== value.sourceCodes.length) {
      context.addIssue({
        code: "custom",
        path: ["sourceCodes"],
        message: "source codes must be unique",
      });
    }
  });

export const sourceConflictDecisionProjectionSchema = z
  .object({
    ...baseSchema,
    decidedBy: plainText(256),
    humanReviewRequired: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.sourceCodes).size !== value.sourceCodes.length) {
      context.addIssue({
        code: "custom",
        path: ["sourceCodes"],
        message: "source codes must be unique",
      });
    }
  });

export type SourceConflictDecisionRequest = z.infer<
  typeof sourceConflictDecisionRequestSchema
>;
export type SourceConflictDecisionProjection = z.infer<
  typeof sourceConflictDecisionProjectionSchema
>;

export function parseSourceConflictDecision(
  value: unknown,
): SourceConflictDecisionProjection {
  return sourceConflictDecisionProjectionSchema.parse(value);
}
