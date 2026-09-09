import type { AiTextPort, EmbeddingPort, StructuredAiRequest } from "./ai.js";
import type { VectorStorePort } from "./qdrant.js";

function assertTestOnly(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("fault injection is test-only and disabled in production");
  }
}

function delayed<T>(
  value: T,
  delayMs: number,
  signal?: AbortSignal,
): Promise<T> {
  assertTestOnly();
  if (signal?.aborted === true) {
    return Promise.reject(new Error("fault injection aborted"));
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), delayMs);
    timer.unref?.();
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("fault injection aborted"));
      },
      { once: true },
    );
  });
}

export type LatencyFaultOptions = Readonly<{
  readonly delayMs: number;
  readonly signal?: AbortSignal;
}>;

export function slowVectorStore(
  inner: VectorStorePort,
  options: LatencyFaultOptions,
): VectorStorePort {
  assertTestOnly();
  const slow = async <T>(task: Promise<T>): Promise<T> => {
    await delayed(undefined, options.delayMs, options.signal);
    return task;
  };
  return Object.freeze({
    indexVersion: inner.indexVersion,
    embeddingModel: inner.embeddingModel,
    healthcheck: () => slow(inner.healthcheck()),
    ensureCollection: () => slow(inner.ensureCollection()),
    list: () => slow(inner.list()),
    upsert: (points) => slow(inner.upsert(points)),
    delete: (ids) => slow(inner.delete(ids)),
    search: (input) => slow(inner.search(input)),
  });
}

export function failingVectorStore(
  reason = "qdrant unavailable",
): VectorStorePort {
  assertTestOnly();
  const failure = async (): Promise<never> => {
    throw new Error(reason);
  };
  return Object.freeze({
    indexVersion: "fault",
    embeddingModel: "fault",
    healthcheck: failure,
    ensureCollection: failure,
    list: failure,
    upsert: failure,
    delete: failure,
    search: failure,
  });
}

export function timeoutEmbeddingProvider(
  options: LatencyFaultOptions & { readonly model?: string },
): EmbeddingPort {
  assertTestOnly();
  return Object.freeze({
    model: options.model ?? "fault-timeout-v1",
    embed: async () => delayed([], options.delayMs, options.signal),
  });
}

export function malformedAiTextProvider(
  reason = "malformed provider output",
): AiTextPort {
  assertTestOnly();
  return Object.freeze({
    generateStructured: async <T>(
      _request: StructuredAiRequest<T>,
    ): Promise<T> => {
      throw Object.assign(new Error(reason), {
        code: "MALFORMED_PROVIDER_OUTPUT",
      });
    },
  });
}

export function providerErrorAiTextProvider(
  status: number,
  reason = "provider error",
): AiTextPort {
  assertTestOnly();
  return Object.freeze({
    generateStructured: async <T>(
      _request: StructuredAiRequest<T>,
    ): Promise<T> => {
      throw Object.assign(new Error(`${reason} (status ${status})`), {
        code: status >= 500 ? "PROVIDER_500" : "PROVIDER_4XX",
        status,
      });
    },
  });
}
