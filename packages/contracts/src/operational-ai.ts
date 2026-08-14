import { z } from "zod";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");

const toolSchema = z.enum([
  "READ_OPERATIONAL_METRICS",
  "DRAFT_OPERATIONAL_SUMMARY",
  "SUGGEST_RUNBOOK_STEP",
]);
const impactSchema = z.enum(["INFORMATIONAL", "IMPACTFUL"]);
const outputSchema = z
  .object({
    action: plainText(128),
    rationale: plainText(2_000),
    evidence: z.array(plainText(500)).max(20),
    stateMutation: z.literal(false),
    clinicalAuthority: z.literal(false),
  })
  .strict();

export const operationalAiProposalRequestSchema = z
  .object({
    tool: toolSchema,
    impact: impactSchema,
    input: plainText(50_000),
    instructions: plainText(10_000),
    estimatedCostUsd: z.number().finite().nonnegative().max(100),
  })
  .strict();

export const operationalAiProposalProjectionSchema = z
  .object({
    requestId: plainText(128),
    tool: toolSchema,
    impact: impactSchema,
    estimatedCostUsd: z.number().finite().nonnegative().max(100),
    costCeilingUsd: z.number().finite().positive().max(100),
    generatedAt: z.iso.datetime(),
    output: outputSchema,
    requiresHumanReview: z.boolean(),
    stateSource: z.literal(false),
    clinicalAuthority: z.literal(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.requiresHumanReview !== (value.impact === "IMPACTFUL")) {
      context.addIssue({
        code: "custom",
        path: ["requiresHumanReview"],
        message: "impactful proposals require human review",
      });
    }
  });

export const operationalAiConfirmationRequestSchema = z
  .object({
    proposal: operationalAiProposalProjectionSchema,
    confirmedAt: z.iso.datetime(),
    rationale: plainText(2_000).optional(),
  })
  .strict();

export const operationalAiConfirmationProjectionSchema = z
  .object({
    status: z.literal("CONFIRMED"),
    proposal: operationalAiProposalProjectionSchema,
    confirmedBy: plainText(128),
    confirmedAt: z.iso.datetime(),
    rationale: plainText(2_000).optional(),
  })
  .strict();

export type OperationalAiProposalRequest = z.infer<
  typeof operationalAiProposalRequestSchema
>;
export type OperationalAiProposalProjection = z.infer<
  typeof operationalAiProposalProjectionSchema
>;
export type OperationalAiConfirmationRequest = z.infer<
  typeof operationalAiConfirmationRequestSchema
>;
