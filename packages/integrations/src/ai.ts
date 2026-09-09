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
  signal?: AbortSignal;
}>;

export type AiTextPort = Readonly<{
  generateStructured: <T>(request: StructuredAiRequest<T>) => Promise<T>;
}>;

export type EmbeddingRequestOptions = Readonly<{
  signal?: AbortSignal;
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
  readonly model: string;
  embed: (
    inputs: readonly string[],
    options?: EmbeddingRequestOptions,
  ) => Promise<readonly (readonly number[])[]>;
}>;

export type AiFailureClassification =
  | "aborted"
  | "timeout"
  | "network"
  | "rate_limited"
  | "server"
  | "client"
  | "configuration"
  | "unknown";

export type AiFailure = Readonly<{
  readonly classification: AiFailureClassification;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly retryAfterMilliseconds?: number;
}>;

export type AiResiliencePolicy = Readonly<{
  readonly maxAttempts: number;
  readonly baseDelayMilliseconds: number;
  readonly maxDelayMilliseconds: number;
  readonly jitterRatio: number;
  readonly maxOperations: number;
  readonly maxInputCharacters: number;
}>;

export type AiResilienceOptions = Readonly<{
  readonly policy?: AiResiliencePolicy;
  readonly random?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}>;

export const DEFAULT_AI_RESILIENCE_POLICY: AiResiliencePolicy = Object.freeze({
  maxAttempts: 3,
  baseDelayMilliseconds: 250,
  maxDelayMilliseconds: 4_000,
  jitterRatio: 0.2,
  maxOperations: 100,
  maxInputCharacters: 50_000,
});

export const DEFAULT_EMBEDDING_RESILIENCE_POLICY: AiResiliencePolicy =
  Object.freeze({
    ...DEFAULT_AI_RESILIENCE_POLICY,
    maxOperations: 1_000,
    maxInputCharacters: 500_000,
  });

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
      response =
        request.signal === undefined
          ? await responses.create(parameters)
          : await responses.create(parameters, { signal: request.signal });
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
    options: EmbeddingRequestOptions = {},
  ): Promise<readonly (readonly number[])[]> => {
    if (inputs.length === 0) return [];
    if (inputs.some((input) => input.trim().length === 0)) {
      throw new TypeError("Embedding inputs cannot be empty");
    }

    let response: Awaited<ReturnType<EmbeddingsPort["create"]>>;
    try {
      const parameters = {
        model: config.model,
        input: [...inputs],
        dimensions: config.dimension,
      };
      response =
        options.signal === undefined
          ? await embeddings.create(parameters)
          : await embeddings.create(parameters, { signal: options.signal });
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

  return Object.freeze({ model: config.model, embed });
}

export function createDeterministicEmbeddingProvider(
  config: DeterministicEmbeddingProviderConfig,
): EmbeddingPort {
  validateEmbeddingModel(config.model);
  validateEmbeddingDimension(config.dimension);

  const embed = async (
    inputs: readonly string[],
    _options: EmbeddingRequestOptions = {},
  ): Promise<readonly (readonly number[])[]> => {
    validateEmbeddingInputs(inputs);
    return Object.freeze(
      inputs.map((input) =>
        deterministicVector(input, config.model, config.dimension),
      ),
    );
  };

  return Object.freeze({ model: config.model, embed });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorName(error: unknown): string | undefined {
  return isRecord(error) && typeof error.name === "string"
    ? error.name
    : undefined;
}

function errorStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  for (const field of ["status", "statusCode"]) {
    const value = error[field];
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 599
    ) {
      return value;
    }
  }
  return undefined;
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string"
    ? error.code
    : undefined;
}

function retryAfterMilliseconds(error: unknown): number | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!isRecord(current)) return undefined;
    const headers = current.headers;
    if (isRecord(headers)) {
      const get = headers.get;
      if (typeof get === "function") {
        for (const [name, multiplier] of [
          ["retry-after-ms", 1],
          ["retry-after", 1_000],
        ] as const) {
          const value = get.call(headers, name);
          const parsed = typeof value === "string" ? Number(value) : value;
          if (
            typeof parsed === "number" &&
            Number.isFinite(parsed) &&
            parsed >= 0
          ) {
            return Math.round(parsed * multiplier);
          }
        }
      }
    }
    const retryAfter = current.retryAfterMilliseconds;
    if (
      typeof retryAfter === "number" &&
      Number.isFinite(retryAfter) &&
      retryAfter >= 0
    ) {
      return Math.round(retryAfter);
    }
    current = current.cause;
  }
  return undefined;
}

function nestedErrorName(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    const name = errorName(current);
    if (name !== undefined) return name;
    current = isRecord(current) ? current.cause : undefined;
  }
  return undefined;
}

function nestedErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    const code = errorCode(current);
    if (code !== undefined) return code;
    current = isRecord(current) ? current.cause : undefined;
  }
  return undefined;
}

function nestedErrorStatusCode(error: unknown): number | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    const statusCode = errorStatusCode(current);
    if (statusCode !== undefined) return statusCode;
    current = isRecord(current) ? current.cause : undefined;
  }
  return undefined;
}

export function classifyAiError(error: unknown): AiFailure {
  const name = nestedErrorName(error)?.toLowerCase() ?? "";
  const code = nestedErrorCode(error)?.toUpperCase();
  const statusCode = nestedErrorStatusCode(error);
  const networkCodes = new Set([
    "EAI_AGAIN",
    "ECONNABORTED",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENETUNREACH",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ERR_NETWORK",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
  ]);

  if (name.includes("abort") || code === "ABORT_ERR") {
    return Object.freeze({ classification: "aborted", retryable: false });
  }
  if (statusCode === 429) {
    const retryAfter = retryAfterMilliseconds(error);
    return Object.freeze({
      classification: "rate_limited",
      retryable: true,
      statusCode,
      ...(retryAfter === undefined
        ? {}
        : { retryAfterMilliseconds: retryAfter }),
    });
  }
  if (statusCode === 408 || statusCode === 409) {
    return Object.freeze({
      classification: "timeout",
      retryable: true,
      statusCode,
    });
  }
  if (statusCode !== undefined && statusCode >= 500 && statusCode <= 599) {
    return Object.freeze({
      classification: "server",
      retryable: true,
      statusCode,
    });
  }
  if (statusCode !== undefined && statusCode >= 400 && statusCode <= 499) {
    return Object.freeze({
      classification:
        statusCode === 401 || statusCode === 403 || statusCode === 422
          ? "configuration"
          : "client",
      retryable: false,
      statusCode,
    });
  }
  if (name.includes("timeout") || code === "ETIMEDOUT") {
    return Object.freeze({ classification: "timeout", retryable: true });
  }
  if (name.includes("connection") || networkCodes.has(code ?? "")) {
    return Object.freeze({ classification: "network", retryable: true });
  }
  return Object.freeze({ classification: "unknown", retryable: false });
}

function validateAiResiliencePolicy(policy: AiResiliencePolicy): void {
  if (
    !Number.isInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 10
  ) {
    throw new RangeError("AI retry maxAttempts must be between 1 and 10");
  }
  if (
    !Number.isFinite(policy.baseDelayMilliseconds) ||
    policy.baseDelayMilliseconds < 0
  ) {
    throw new RangeError("AI retry base delay must be non-negative");
  }
  if (
    !Number.isFinite(policy.maxDelayMilliseconds) ||
    policy.maxDelayMilliseconds < policy.baseDelayMilliseconds
  ) {
    throw new RangeError("AI retry max delay must cap the base delay");
  }
  if (
    !Number.isFinite(policy.jitterRatio) ||
    policy.jitterRatio < 0 ||
    policy.jitterRatio > 1
  ) {
    throw new RangeError("AI retry jitter ratio must be between zero and one");
  }
  if (!Number.isInteger(policy.maxOperations) || policy.maxOperations < 1) {
    throw new RangeError("AI maxOperations must be a positive integer");
  }
  if (
    !Number.isInteger(policy.maxInputCharacters) ||
    policy.maxInputCharacters < 1
  ) {
    throw new RangeError("AI maxInputCharacters must be a positive integer");
  }
}

function safeRandom(random: () => number): number {
  const value = random();
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.5;
}

export function calculateAiRetryDelay(
  policy: AiResiliencePolicy,
  failedAttempt: number,
  random: () => number = Math.random,
  retryAfterMillisecondsValue?: number,
): number {
  validateAiResiliencePolicy(policy);
  if (!Number.isInteger(failedAttempt) || failedAttempt < 1) {
    throw new RangeError("AI retry attempt must be a positive integer");
  }
  const exponent = Math.min(failedAttempt - 1, 30);
  const exponentialDelay = Math.min(
    policy.maxDelayMilliseconds,
    policy.baseDelayMilliseconds * 2 ** exponent,
  );
  const jitter =
    exponentialDelay * policy.jitterRatio * (safeRandom(random) * 2 - 1);
  const backoffDelay = Math.max(0, Math.round(exponentialDelay + jitter));
  const retryAfter =
    retryAfterMillisecondsValue !== undefined &&
    Number.isFinite(retryAfterMillisecondsValue) &&
    retryAfterMillisecondsValue >= 0
      ? Math.round(retryAfterMillisecondsValue)
      : 0;
  return Math.min(
    policy.maxDelayMilliseconds,
    Math.max(backoffDelay, retryAfter),
  );
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new AiIntegrationError("AI request aborted");
  }
}

function safeFailure(error: unknown, message: string): AiIntegrationError {
  if (classifyAiError(error).classification === "aborted") {
    return new AiIntegrationError("AI request aborted", { cause: error });
  }
  return new AiIntegrationError(message, { cause: error });
}

async function runWithAiResilience<T>(
  input: Readonly<{
    readonly operation: () => Promise<T>;
    readonly inputCharacters: number;
    readonly signal?: AbortSignal;
    readonly failureMessage: string;
    readonly state: { operations: number };
    readonly options: Required<AiResilienceOptions>;
  }>,
): Promise<T> {
  const { options } = input;
  const policy = options.policy;
  validateAiResiliencePolicy(policy);
  assertNotAborted(input.signal);
  if (input.inputCharacters > policy.maxInputCharacters) {
    throw new AiIntegrationError(
      "AI input exceeds the configured resilience budget",
    );
  }
  if (input.state.operations >= policy.maxOperations) {
    throw new AiIntegrationError("AI request quota exhausted");
  }
  input.state.operations += 1;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    assertNotAborted(input.signal);
    try {
      return await input.operation();
    } catch (error) {
      const failure = classifyAiError(error);
      if (!failure.retryable || attempt >= policy.maxAttempts) {
        throw safeFailure(error, input.failureMessage);
      }
      const delay = calculateAiRetryDelay(
        policy,
        attempt,
        options.random,
        failure.retryAfterMilliseconds,
      );
      if (delay > 0) await options.sleep(delay);
      assertNotAborted(input.signal);
    }
  }

  throw new AiIntegrationError(input.failureMessage);
}

export function createResilientAiTextProvider(
  provider: AiTextPort,
  options: AiResilienceOptions = {},
): AiTextPort {
  const resolvedOptions: Required<AiResilienceOptions> = {
    policy: options.policy ?? DEFAULT_AI_RESILIENCE_POLICY,
    random: options.random ?? Math.random,
    sleep: options.sleep ?? defaultSleep,
  };
  const state = { operations: 0 };
  const generateStructured = <T>(request: StructuredAiRequest<T>): Promise<T> =>
    runWithAiResilience({
      operation: () => provider.generateStructured(request),
      inputCharacters: request.input.length + request.instructions.length,
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      failureMessage: "AI request failed",
      state,
      options: resolvedOptions,
    });
  return Object.freeze({ generateStructured });
}

export function createResilientEmbeddingProvider(
  provider: EmbeddingPort,
  options: AiResilienceOptions = {},
): EmbeddingPort {
  const resolvedOptions: Required<AiResilienceOptions> = {
    policy: options.policy ?? DEFAULT_EMBEDDING_RESILIENCE_POLICY,
    random: options.random ?? Math.random,
    sleep: options.sleep ?? defaultSleep,
  };
  const state = { operations: 0 };
  const embed = (
    inputs: readonly string[],
    requestOptions: EmbeddingRequestOptions = {},
  ): Promise<readonly (readonly number[])[]> =>
    runWithAiResilience({
      operation: () => provider.embed(inputs, requestOptions),
      inputCharacters: inputs.reduce((total, input) => total + input.length, 0),
      ...(requestOptions.signal === undefined
        ? {}
        : { signal: requestOptions.signal }),
      failureMessage: "Embedding request failed",
      state,
      options: resolvedOptions,
    });
  return Object.freeze({ model: provider.model, embed });
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
