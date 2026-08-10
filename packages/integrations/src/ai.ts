import { createHash } from "node:crypto";

import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses.js";

export type AiIntegrationConfig = Readonly<{
  apiKey: string;
  model: string;
  timeoutMilliseconds?: number;
}>;

export type StructuredAiRequest<T> = Readonly<{
  input: string;
  instructions: string;
  schemaName: string;
  jsonSchema: Readonly<Record<string, unknown>>;
  parse: (value: unknown) => T;
}>;

export type AiTextPort = Readonly<{
  generateStructured: <T>(request: StructuredAiRequest<T>) => Promise<T>;
}>;

export type EmbeddingProviderConfig = Readonly<{
  apiKey: string;
  model: string;
  dimension: number;
  timeoutMilliseconds?: number;
}>;

export type DeterministicEmbeddingProviderConfig = Readonly<{
  model: string;
  dimension: number;
}>;

export type EmbeddingPort = Readonly<{
  embed: (inputs: readonly string[]) => Promise<readonly (readonly number[])[]>;
}>;

type ResponsesPort = Pick<OpenAI["responses"], "create">;
type EmbeddingsPort = Pick<OpenAI["embeddings"], "create">;

export class AiIntegrationError extends Error {
  public override readonly name = "AiIntegrationError";

  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export function createOpenAiTextProvider(
  config: AiIntegrationConfig,
  responses: ResponsesPort = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMilliseconds ?? 20_000,
    maxRetries: 0,
  }).responses,
): AiTextPort {
  if (!config.apiKey.trim()) throw new TypeError("AI apiKey is required");
  if (!config.model.trim()) throw new TypeError("AI model is required");

  const generateStructured = async <T>(
    request: StructuredAiRequest<T>,
  ): Promise<T> => {
    validateRequest(request);

    const parameters: ResponseCreateParamsNonStreaming = {
      model: config.model,
      input: request.input,
      instructions: request.instructions,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName,
          strict: true,
          schema: { ...request.jsonSchema },
        },
      },
    };

    let response: Awaited<ReturnType<ResponsesPort["create"]>>;
    try {
      response = await responses.create(parameters);
    } catch (error) {
      throw new AiIntegrationError("AI request failed", { cause: error });
    }

    if (!response.output_text) {
      throw new AiIntegrationError("AI returned no structured output");
    }

    try {
      return request.parse(JSON.parse(response.output_text) as unknown);
    } catch (error) {
      throw new AiIntegrationError("AI structured output failed validation", {
        cause: error,
      });
    }
  };

  return Object.freeze({ generateStructured });
}

export function createOpenAiEmbeddingProvider(
  config: EmbeddingProviderConfig,
  embeddings: EmbeddingsPort = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMilliseconds ?? 20_000,
    maxRetries: 0,
  }).embeddings,
): EmbeddingPort {
  if (!config.apiKey.trim())
    throw new TypeError("Embedding apiKey is required");
  if (!config.model.trim()) throw new TypeError("Embedding model is required");
  if (!Number.isInteger(config.dimension) || config.dimension < 1) {
    throw new RangeError("Embedding dimension must be a positive integer");
  }

  const embed = async (
    inputs: readonly string[],
  ): Promise<readonly (readonly number[])[]> => {
    if (inputs.length === 0) return [];
    if (inputs.some((input) => input.trim().length === 0)) {
      throw new TypeError("Embedding inputs cannot be empty");
    }

    let response: Awaited<ReturnType<EmbeddingsPort["create"]>>;
    try {
      response = await embeddings.create({
        model: config.model,
        input: [...inputs],
        dimensions: config.dimension,
      });
    } catch (error) {
      throw new AiIntegrationError("Embedding request failed", {
        cause: error,
      });
    }

    const ordered = [...response.data].sort(
      (left, right) => left.index - right.index,
    );
    const vectors = ordered.map((item) => [...item.embedding]);
    if (
      vectors.length !== inputs.length ||
      vectors.some((vector) => vector.length !== config.dimension)
    ) {
      throw new AiIntegrationError("Embedding dimension contract failed");
    }

    return vectors;
  };

  return Object.freeze({ embed });
}

export function createDeterministicEmbeddingProvider(
  config: DeterministicEmbeddingProviderConfig,
): EmbeddingPort {
  validateEmbeddingModel(config.model);
  validateEmbeddingDimension(config.dimension);

  const embed = async (
    inputs: readonly string[],
  ): Promise<readonly (readonly number[])[]> => {
    validateEmbeddingInputs(inputs);
    return Object.freeze(
      inputs.map((input) =>
        deterministicVector(input, config.model, config.dimension),
      ),
    );
  };

  return Object.freeze({ embed });
}

const MAX_EMBEDDING_INPUT_LENGTH = 50_000;

function validateEmbeddingInputs(inputs: readonly string[]): void {
  if (inputs.some((input) => input.trim().length === 0)) {
    throw new TypeError("Embedding inputs cannot be empty");
  }
  if (inputs.some((input) => input.length > MAX_EMBEDDING_INPUT_LENGTH)) {
    throw new RangeError("Embedding input exceeds the allowed size");
  }
}

function validateEmbeddingModel(model: string): void {
  if (!model.trim()) throw new TypeError("Embedding model is required");
}

function validateEmbeddingDimension(dimension: number): void {
  if (!Number.isInteger(dimension) || dimension < 1) {
    throw new RangeError("Embedding dimension must be a positive integer");
  }
}

function deterministicVector(
  input: string,
  model: string,
  dimension: number,
): readonly number[] {
  const digest = createHash("sha256")
    .update(model)
    .update("\0")
    .update(input)
    .digest();
  const values = Array.from(
    { length: dimension },
    (_, index) => ((digest[index % digest.length] ?? 0) / 255) * 2 - 1,
  );
  let normSquared = 0;
  for (const value of values) normSquared += value * value;
  const norm = Math.sqrt(normSquared) || 1;
  return Object.freeze(values.map((value) => value / norm));
}

function validateRequest<T>(request: StructuredAiRequest<T>): void {
  if (request.input.trim().length === 0) {
    throw new TypeError("AI input is required");
  }

  if (request.input.length > 50_000) {
    throw new RangeError("AI input exceeds the allowed size");
  }

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(request.schemaName)) {
    throw new TypeError("AI schemaName must be a safe identifier");
  }

  if (typeof request.parse !== "function") {
    throw new TypeError("AI parser is required");
  }
}
