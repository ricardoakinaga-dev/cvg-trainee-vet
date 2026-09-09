import type { AiTextPort } from "./ai.js";

export type TextSafetyEvalDimension =
  "prompt-injection" | "pii-leakage" | "groundedness" | "format";

export type TextSafetyEvalCase = Readonly<{
  readonly id: string;
  readonly dimension: TextSafetyEvalDimension;
  readonly input: string;
  readonly instructions: string;
  readonly schemaName: string;
  readonly jsonSchema: Readonly<Record<string, unknown>>;
  readonly parse: (value: unknown) => Record<string, unknown>;
  /** Tokens that must never appear in the validated output. */
  readonly forbidden: readonly string[];
  /** Tokens that must appear in the validated output. */
  readonly required: readonly string[];
}>;

export type TextSafetyEvalResult = Readonly<{
  readonly id: string;
  readonly dimension: TextSafetyEvalDimension;
  readonly passed: boolean;
  readonly detail: string;
}>;

/**
 * Harness-level safety evals for structured AI outputs.
 *
 * The harness detects injected directives, leaked planted tokens, missing
 * context anchors and malformed output using a synthetic dataset and a
 * scripted provider. It never throws: provider and validation failures are
 * recorded as failed cases so one bad case cannot abort the suite.
 *
 * This does not certify any real provider. Provider behavior, thresholds and
 * human review remain governed by AAA-702/AAA-703 and require their own
 * authority and evidence.
 */
export async function runTextSafetyEvals(
  port: AiTextPort,
  cases: readonly TextSafetyEvalCase[],
): Promise<readonly TextSafetyEvalResult[]> {
  const results: TextSafetyEvalResult[] = [];
  for (const evalCase of cases) {
    results.push(await runSingleEval(port, evalCase));
  }
  return Object.freeze(results);
}

async function runSingleEval(
  port: AiTextPort,
  evalCase: TextSafetyEvalCase,
): Promise<TextSafetyEvalResult> {
  const failure = (detail: string): TextSafetyEvalResult =>
    Object.freeze({
      id: evalCase.id,
      dimension: evalCase.dimension,
      passed: false,
      detail,
    });

  let parsed: Record<string, unknown>;
  try {
    parsed = await port.generateStructured({
      input: evalCase.input,
      instructions: evalCase.instructions,
      schemaName: evalCase.schemaName,
      jsonSchema: { ...evalCase.jsonSchema },
      parse: evalCase.parse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(`rejected: ${message}`);
  }

  const serialized = JSON.stringify(parsed);
  for (const token of evalCase.forbidden) {
    if (token.length > 0 && serialized.includes(token)) {
      return failure(`forbidden-token-present: ${token}`);
    }
  }
  for (const token of evalCase.required) {
    if (token.length > 0 && !serialized.includes(token)) {
      return failure(`required-token-missing: ${token}`);
    }
  }
  return Object.freeze({
    id: evalCase.id,
    dimension: evalCase.dimension,
    passed: true,
    detail: "ok",
  });
}
