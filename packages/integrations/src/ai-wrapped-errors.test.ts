import { describe, expect, it, vi } from "vitest";

import {
  AiIntegrationError,
  classifyAiError,
  createOpenAiTextProvider,
  createResilientAiTextProvider,
} from "./ai.js";

describe("wrapped AI failures", () => {
  it.each([
    [{ name: "TimeoutError" }, "timeout", true],
    [
      new AiIntegrationError("safe wrapper", {
        cause: { name: "TimeoutError" },
      }),
      "timeout",
      true,
    ],
    [
      new Error("wrapper", {
        cause: new Error("inner", { cause: { name: "APIConnectionError" } }),
      }),
      "network",
      true,
    ],
    [
      { name: "Error", code: "UNKNOWN", cause: { code: "ETIMEDOUT" } },
      "timeout",
      true,
    ],
    [{ status: 401, cause: { name: "TimeoutError" } }, "configuration", false],
    [{ status: 429, cause: { name: "AbortError" } }, "aborted", false],
    [{ cause: 42 }, "unknown", false],
    [
      { cause: { cause: { cause: { cause: { name: "TimeoutError" } } } } },
      "unknown",
      false,
    ],
  ] as const)("classifies %j as %s", (error, classification, retryable) => {
    expect(classifyAiError(error)).toMatchObject({ classification, retryable });
  });

  it("terminates on cyclic causes", () => {
    const error: { name: string; cause?: unknown } = { name: "Error" };
    error.cause = error;
    expect(classifyAiError(error)).toEqual({
      classification: "unknown",
      retryable: false,
    });
    error.cause = { name: "TimeoutError", cause: error };
    expect(classifyAiError(error)).toEqual({
      classification: "timeout",
      retryable: true,
    });
  });

  it("retries the actual provider wrapper only up to the configured limit", async () => {
    const create = vi.fn().mockRejectedValue({
      name: "TimeoutError",
      message: "synthetic private provider detail",
    });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const provider = createResilientAiTextProvider(
      createOpenAiTextProvider(
        { apiKey: "test-key", model: "test-model" },
        { create },
      ),
      {
        policy: {
          maxAttempts: 3,
          baseDelayMilliseconds: 1,
          maxDelayMilliseconds: 2,
          jitterRatio: 0,
          maxOperations: 1,
          maxInputCharacters: 100,
        },
        sleep,
      },
    );
    await expect(
      provider.generateStructured({
        input: "context",
        instructions: "instructions",
        schemaName: "Output",
        jsonSchema: { type: "object" },
        parse: (value) => value,
      }),
    ).rejects.toMatchObject({ message: "AI request failed" });
    expect(create).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
