import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const outcome = z.enum(["APROVADO", "REFORCO"]);
const reason = z.enum(["ITEM_ANNULLED", "ANSWER_KEY_CHANGED"]);

export const assessmentRecalculationRequestSchema = z
  .object({
    scopeId: id,
    itemId: id,
    reason,
    passingScore: z.number().int().min(0).max(100),
    recalculatedAt: z.iso.datetime(),
  })
  .strict();

const candidateId = z.string().uuid();

export const assessmentRecalculationCandidateSchema = z
  .object({
    candidateId,
    participantId: candidateId,
    scopeId: candidateId,
    attemptId: candidateId,
    itemId: candidateId,
    previousVersion: z.number().int().min(1),
    previousScore: z.number().int().min(0).max(100),
    previousOutcome: outcome,
    correctCount: z.number().int().nonnegative(),
    eligibleItemCount: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.correctCount > value.eligibleItemCount) {
      context.addIssue({
        code: "custom",
        path: ["correctCount"],
        message: "correctCount cannot exceed eligibleItemCount",
      });
    }
  });

export const assessmentRecalculationBatchRequestSchema =
  assessmentRecalculationRequestSchema
    .extend({
      candidates: z.array(assessmentRecalculationCandidateSchema).max(10_000),
    })
    .strict();

const resultSchema = z
  .object({
    candidateId: id,
    participantId: id,
    scopeId: id,
    attemptId: id,
    itemId: id,
    previousVersion: z.number().int().min(1),
    previousScore: z.number().int().min(0).max(100),
    previousOutcome: outcome,
    correctCount: z.number().int().nonnegative(),
    eligibleItemCount: z.number().int().positive(),
    passingScore: z.number().int().min(0).max(100),
    reason,
    recalculatedAt: z.iso.datetime(),
    recalculatedVersion: z.number().int().min(2),
    recalculatedScore: z.number().int().min(0).max(100),
    recalculatedOutcome: outcome,
    notificationRequired: z.literal(true),
    automaticDecision: z.literal("NONE"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.correctCount > value.eligibleItemCount) {
      context.addIssue({
        code: "custom",
        path: ["correctCount"],
        message: "correctCount cannot exceed eligibleItemCount",
      });
    }
    if (value.recalculatedVersion !== value.previousVersion + 1) {
      context.addIssue({
        code: "custom",
        path: ["recalculatedVersion"],
        message: "recalculatedVersion must preserve the prior version",
      });
    }
  });

export const assessmentRecalculationResultSchema = z
  .object({
    processedCount: z.number().int().nonnegative(),
    notificationsQueued: z.number().int().nonnegative(),
    results: z.array(resultSchema).max(10_000),
  })
  .strict();

export type AssessmentRecalculationRequest = z.infer<
  typeof assessmentRecalculationRequestSchema
>;
export type AssessmentRecalculationCandidateRequest = z.infer<
  typeof assessmentRecalculationCandidateSchema
>;
export type AssessmentRecalculationBatchRequest = z.infer<
  typeof assessmentRecalculationBatchRequestSchema
>;
export type AssessmentRecalculationResult = z.infer<
  typeof assessmentRecalculationResultSchema
>;

export function parseAssessmentRecalculationResult(
  value: unknown,
): AssessmentRecalculationResult {
  return assessmentRecalculationResultSchema.parse(value);
}
