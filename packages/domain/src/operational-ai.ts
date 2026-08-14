import { isValidIsoTimestamp } from "./timestamp.js";

export const operationalAiTools = [
  "READ_OPERATIONAL_METRICS",
  "DRAFT_OPERATIONAL_SUMMARY",
  "SUGGEST_RUNBOOK_STEP",
] as const;

export type OperationalAiTool = (typeof operationalAiTools)[number];
export type OperationalAiImpact = "INFORMATIONAL" | "IMPACTFUL";

export type OperationalAiOutput = Readonly<{
  readonly action: string;
  readonly rationale: string;
  readonly evidence: readonly string[];
  readonly stateMutation: false;
  readonly clinicalAuthority: false;
}>;

export type OperationalAiProposalInput = Readonly<{
  readonly requestId: string;
  readonly tool: OperationalAiTool;
  readonly impact: OperationalAiImpact;
  readonly estimatedCostUsd: number;
  readonly costCeilingUsd: number;
  readonly generatedAt: string;
  readonly output: unknown;
}>;

export type OperationalAiProposal = Readonly<{
  readonly requestId: string;
  readonly tool: OperationalAiTool;
  readonly impact: OperationalAiImpact;
  readonly estimatedCostUsd: number;
  readonly costCeilingUsd: number;
  readonly generatedAt: string;
  readonly output: OperationalAiOutput;
  readonly requiresHumanReview: boolean;
  readonly stateSource: false;
  readonly clinicalAuthority: false;
}>;

export type OperationalAiConfirmation = Readonly<{
  readonly status: "CONFIRMED";
  readonly proposal: OperationalAiProposal;
  readonly confirmedBy: string;
  readonly confirmedAt: string;
  readonly rationale?: string;
}>;

export class OperationalAiPolicyError extends Error {
  public override readonly name = "OperationalAiPolicyError";

  public constructor(message: string) {
    super(message);
  }
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OperationalAiPolicyError(`${field} is required`);
  }
}

function assertPlainText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  assertNonEmpty(value, field);
  if (value.length > maxLength || /<[^>]*>/u.test(value)) {
    throw new OperationalAiPolicyError(`${field} must be plain text`);
  }
  return value;
}

function assertTimestamp(value: string, field: string): void {
  if (!isValidIsoTimestamp(value)) {
    throw new OperationalAiPolicyError(`${field} must be a valid timestamp`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseOutput(value: unknown): OperationalAiOutput {
  if (!isRecord(value)) {
    throw new OperationalAiPolicyError("output must be an object");
  }

  const allowedKeys = new Set([
    "action",
    "rationale",
    "evidence",
    "stateMutation",
    "clinicalAuthority",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new OperationalAiPolicyError("output contains unsupported fields");
  }

  const action = assertPlainText(value.action, "output.action", 128);
  const rationale = assertPlainText(value.rationale, "output.rationale", 2_000);
  if (
    !Array.isArray(value.evidence) ||
    value.evidence.length > 20 ||
    value.evidence.some(
      (item) =>
        typeof item !== "string" ||
        item.trim().length === 0 ||
        item.length > 500,
    )
  ) {
    throw new OperationalAiPolicyError("output.evidence is invalid");
  }
  if (value.stateMutation !== false) {
    throw new OperationalAiPolicyError(
      "output.stateMutation must be false for operational AI",
    );
  }
  if (value.clinicalAuthority !== false) {
    throw new OperationalAiPolicyError(
      "output.clinicalAuthority must be false for operational AI",
    );
  }

  return Object.freeze({
    action,
    rationale,
    evidence: Object.freeze([...value.evidence]),
    stateMutation: false,
    clinicalAuthority: false,
  });
}

export function createOperationalAiProposal(
  input: OperationalAiProposalInput,
): OperationalAiProposal {
  assertNonEmpty(input.requestId, "requestId");
  if (!operationalAiTools.includes(input.tool)) {
    throw new OperationalAiPolicyError("tool is not allowed");
  }
  if (input.impact !== "INFORMATIONAL" && input.impact !== "IMPACTFUL") {
    throw new OperationalAiPolicyError("impact is not supported");
  }
  if (!Number.isFinite(input.estimatedCostUsd) || input.estimatedCostUsd < 0) {
    throw new OperationalAiPolicyError("estimated cost is invalid");
  }
  if (!Number.isFinite(input.costCeilingUsd) || input.costCeilingUsd <= 0) {
    throw new OperationalAiPolicyError("cost ceiling is invalid");
  }
  if (input.estimatedCostUsd > input.costCeilingUsd) {
    throw new OperationalAiPolicyError("estimated cost exceeds cost ceiling");
  }
  assertTimestamp(input.generatedAt, "generatedAt");

  return Object.freeze({
    requestId: input.requestId,
    tool: input.tool,
    impact: input.impact,
    estimatedCostUsd: input.estimatedCostUsd,
    costCeilingUsd: input.costCeilingUsd,
    generatedAt: input.generatedAt,
    output: parseOutput(input.output),
    requiresHumanReview: input.impact === "IMPACTFUL",
    stateSource: false,
    clinicalAuthority: false,
  });
}

export function confirmOperationalAiProposal(
  proposal: OperationalAiProposal,
  confirmation: Readonly<{
    readonly confirmedBy: string;
    readonly confirmedAt: string;
    readonly rationale?: string;
  }>,
): OperationalAiConfirmation {
  if (proposal.requiresHumanReview) {
    assertNonEmpty(confirmation.confirmedBy, "confirmedBy");
  }
  assertTimestamp(confirmation.confirmedAt, "confirmedAt");
  const rationale =
    confirmation.rationale === undefined
      ? undefined
      : assertPlainText(confirmation.rationale, "rationale", 2_000);

  return Object.freeze({
    status: "CONFIRMED" as const,
    proposal,
    confirmedBy: confirmation.confirmedBy,
    confirmedAt: confirmation.confirmedAt,
    ...(rationale === undefined ? {} : { rationale }),
  });
}
