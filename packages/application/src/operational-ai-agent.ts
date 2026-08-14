import {
  createOperationalAiProposal,
  type OperationalAiImpact,
  type OperationalAiProposal,
  type OperationalAiTool,
} from "@cvg/domain";

export type OperationalAiGenerator = Readonly<{
  readonly generateStructured: (request: {
    readonly input: string;
    readonly instructions: string;
    readonly schemaName: string;
    readonly jsonSchema: Readonly<Record<string, unknown>>;
    readonly parse: (value: unknown) => unknown;
  }) => Promise<unknown>;
}>;

export type RunOperationalAiProposalCommand = Readonly<{
  readonly requestId: string;
  readonly tool: OperationalAiTool;
  readonly impact: OperationalAiImpact;
  readonly input: string;
  readonly instructions: string;
  readonly estimatedCostUsd: number;
  readonly costCeilingUsd: number;
  readonly generatedAt: string;
}>;

const operationalAiJsonSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", minLength: 1, maxLength: 128 },
    rationale: { type: "string", minLength: 1, maxLength: 2_000 },
    evidence: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
    stateMutation: { const: false },
    clinicalAuthority: { const: false },
  },
  required: [
    "action",
    "rationale",
    "evidence",
    "stateMutation",
    "clinicalAuthority",
  ],
});

function assertText(value: string, field: string, maxLength: number): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} is required`);
  }
  if (value.length > maxLength || /<[^>]*>/u.test(value)) {
    throw new TypeError(`${field} must be plain text`);
  }
}

export async function runOperationalAiProposal(
  command: RunOperationalAiProposalCommand,
  generator: OperationalAiGenerator,
): Promise<OperationalAiProposal> {
  assertText(command.input, "input", 50_000);
  assertText(command.instructions, "instructions", 10_000);

  const output = await generator.generateStructured({
    input: command.input,
    instructions: command.instructions,
    schemaName: "OperationalAiProposal",
    jsonSchema: operationalAiJsonSchema,
    parse: (value) => value,
  });

  return createOperationalAiProposal({
    requestId: command.requestId,
    tool: command.tool,
    impact: command.impact,
    estimatedCostUsd: command.estimatedCostUsd,
    costCeilingUsd: command.costCeilingUsd,
    generatedAt: command.generatedAt,
    output,
  });
}
