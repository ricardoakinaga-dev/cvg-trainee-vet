import { describe, expect, it, vi } from "vitest";

import {
  AiIntegrationError,
  createResilientAiTextProvider,
  createResilientEmbeddingProvider,
  createDeterministicEmbeddingProvider,
  createOpenAiEmbeddingProvider,
  createOpenAiTextProvider,
} from "./ai.js";

describe("AI integration boundary", () => {
  it("requests strict structured output without storing the response", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ status: "ok" }),
    });
    const provider = createOpenAiTextProvider(
      { apiKey: "test-key", model: "test-model" },
      { create },
    );

    const output = await provider.generateStructured({
      input: "internal training context",
      instructions: "Return only the requested training object.",
      schemaName: "TrainingOutput",
      jsonSchema: {
        type: "object",
        properties: { status: { type: "string" } },
        required: ["status"],
        additionalProperties: false,
      },
      parse: (value) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("status" in value) ||
          typeof value.status !== "string"
        ) {
          throw new TypeError("invalid output");
        }
        return { status: value.status };
      },
    });

    expect(output).toEqual({ status: "ok" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        store: false,
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        }),
      }),
    );
    expect(JSON.stringify(create.mock.calls[0])).not.toContain("test-key");
  });

  it("fails closed when the model returns invalid structured output", async () => {
    const provider = createOpenAiTextProvider(
      { apiKey: "test-key", model: "test-model" },
      { create: vi.fn().mockResolvedValue({ output_text: "not-json" }) },
    );

    await expect(
      provider.generateStructured({
        input: "context",
        instructions: "instructions",
        schemaName: "Output",
        jsonSchema: { type: "object" },
        parse: () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(AiIntegrationError);
  });

  it("wraps provider failures and refuses empty model output", async () => {
    const failingProvider = createOpenAiTextProvider(
      { apiKey: "test-key", model: "test-model" },
      { create: vi.fn().mockRejectedValue(new Error("network")) },
    );
    const request = {
      input: "context",
      instructions: "instructions",
      schemaName: "Output",
      jsonSchema: { type: "object" },
      parse: () => ({ ok: true }),
    };

    await expect(failingProvider.generateStructured(request)).rejects.toThrow(
      "AI request failed",
    );

    const emptyProvider = createOpenAiTextProvider(
      { apiKey: "test-key", model: "test-model" },
      { create: vi.fn().mockResolvedValue({ output_text: "" }) },
    );
    await expect(emptyProvider.generateStructured(request)).rejects.toThrow(
      "no structured output",
    );
  });

  it("validates AI request and provider configuration at the boundary", async () => {
    expect(() =>
      createOpenAiTextProvider(
        { apiKey: " ", model: "test-model" },
        { create: vi.fn() },
      ),
    ).toThrow("apiKey");
    expect(() =>
      createOpenAiTextProvider(
        { apiKey: "test-key", model: " " },
        { create: vi.fn() },
      ),
    ).toThrow("model");

    const provider = createOpenAiTextProvider(
      { apiKey: "test-key", model: "test-model" },
      { create: vi.fn().mockResolvedValue({ output_text: "{}" }) },
    );
    const request = {
      instructions: "instructions",
      schemaName: "Output",
      jsonSchema: { type: "object" },
      parse: () => ({ ok: true }),
    };

    await expect(
      provider.generateStructured({ ...request, input: " " }),
    ).rejects.toThrow("input is required");
    await expect(
      provider.generateStructured({ ...request, input: "x".repeat(50_001) }),
    ).rejects.toThrow("exceeds");
    await expect(
      provider.generateStructured({
        ...request,
        input: "ok",
        schemaName: "bad name",
      }),
    ).rejects.toThrow("schemaName");
  });

  it("normalizes embedding order and enforces the configured dimension", async () => {
    const create = vi.fn().mockResolvedValue({
      data: [
        { index: 1, embedding: [0.2, 0.3] },
        { index: 0, embedding: [0.1, 0.2] },
      ],
    });
    const provider = createOpenAiEmbeddingProvider(
      { apiKey: "test-key", model: "embedding-test", dimension: 2 },
      { create },
    );

    expect(provider.model).toBe("embedding-test");
    await expect(provider.embed(["first", "second"])).resolves.toEqual([
      [0.1, 0.2],
      [0.2, 0.3],
    ]);
    expect(create).toHaveBeenCalledWith({
      model: "embedding-test",
      input: ["first", "second"],
      dimensions: 2,
    });
  });

  it("handles empty, invalid and failed embedding requests", async () => {
    const provider = createOpenAiEmbeddingProvider(
      { apiKey: "test-key", model: "embedding-test", dimension: 2 },
      { create: vi.fn().mockResolvedValue({ data: [] }) },
    );
    await expect(provider.embed([])).resolves.toEqual([]);
    await expect(provider.embed([" "])).rejects.toThrow("cannot be empty");

    const invalidConfig = (config: {
      apiKey: string;
      model: string;
      dimension: number;
    }) => createOpenAiEmbeddingProvider(config, { create: vi.fn() });
    expect(() =>
      invalidConfig({ apiKey: " ", model: "embedding-test", dimension: 2 }),
    ).toThrow("apiKey");
    expect(() =>
      invalidConfig({ apiKey: "test-key", model: " ", dimension: 2 }),
    ).toThrow("model");
    expect(() =>
      invalidConfig({
        apiKey: "test-key",
        model: "embedding-test",
        dimension: 0,
      }),
    ).toThrow("dimension");

    const failing = createOpenAiEmbeddingProvider(
      { apiKey: "test-key", model: "embedding-test", dimension: 2 },
      { create: vi.fn().mockRejectedValue(new Error("network")) },
    );
    await expect(failing.embed(["context"])).rejects.toThrow(
      "Embedding request failed",
    );

    const wrongDimension = createOpenAiEmbeddingProvider(
      { apiKey: "test-key", model: "embedding-test", dimension: 2 },
      {
        create: vi
          .fn()
          .mockResolvedValue({ data: [{ index: 0, embedding: [0.1] }] }),
      },
    );
    await expect(wrongDimension.embed(["context"])).rejects.toThrow(
      "dimension contract",
    );
  });

  it("creates deterministic local embeddings without external credentials", async () => {
    const provider = createDeterministicEmbeddingProvider({
      model: "cvg-local-embedding-v1",
      dimension: 8,
    });

    const first = await provider.embed(["internal context", "another"]);
    const second = await provider.embed(["internal context", "another"]);

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    const firstVector = first[0];
    const secondVector = first[1];
    expect(firstVector).toBeDefined();
    expect(secondVector).toBeDefined();
    expect(firstVector).toHaveLength(8);
    expect(firstVector).not.toEqual(secondVector);
    expect(firstVector?.every(Number.isFinite)).toBe(true);
  });

  it("validates deterministic embedding input and configuration", async () => {
    expect(() =>
      createDeterministicEmbeddingProvider({ model: " ", dimension: 8 }),
    ).toThrow("model");
    expect(() =>
      createDeterministicEmbeddingProvider({
        model: "cvg-local-embedding-v1",
        dimension: 0,
      }),
    ).toThrow("dimension");

    const provider = createDeterministicEmbeddingProvider({
      model: "cvg-local-embedding-v1",
      dimension: 8,
    });
    await expect(provider.embed([])).resolves.toEqual([]);
    await expect(provider.embed([" "])).rejects.toThrow("cannot be empty");
    await expect(provider.embed(["x".repeat(50_001)])).rejects.toThrow(
      "exceeds",
    );
  });

  it("retries transient AI failures with bounded backoff and Retry-After", async () => {
    const generateStructured = vi
      .fn()
      .mockRejectedValueOnce({ name: "APIConnectionTimeoutError" })
      .mockRejectedValueOnce({
        status: 429,
        headers: {
          get: (name: string) => (name === "retry-after" ? "1" : null),
        },
      })
      .mockResolvedValueOnce({ status: "ok" });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const provider = createResilientAiTextProvider(
      { generateStructured },
      {
        policy: {
          maxAttempts: 3,
          baseDelayMilliseconds: 100,
          maxDelayMilliseconds: 500,
          jitterRatio: 0,
          maxOperations: 2,
          maxInputCharacters: 100,
        },
        random: () => 0.5,
        sleep,
      },
    );

    await expect(
      provider.generateStructured({
        input: "context",
        instructions: "instructions",
        schemaName: "Output",
        jsonSchema: { type: "object" },
        parse: (value) => value as { status: string },
      }),
    ).resolves.toEqual({ status: "ok" });
    expect(generateStructured).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  it("does not retry permanent failures and fails closed on quota or input budget", async () => {
    const generateStructured = vi
      .fn()
      .mockRejectedValue({ status: 401, message: "secret provider detail" });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const provider = createResilientAiTextProvider(
      { generateStructured },
      {
        policy: {
          maxAttempts: 3,
          baseDelayMilliseconds: 1,
          maxDelayMilliseconds: 2,
          jitterRatio: 0,
          maxOperations: 1,
          maxInputCharacters: 10,
        },
        sleep,
      },
    );
    const request = {
      input: "ok",
      instructions: "ok",
      schemaName: "Output",
      jsonSchema: { type: "object" },
      parse: (value: unknown) => value,
    };

    let permanentError: unknown;
    try {
      await provider.generateStructured(request);
    } catch (error) {
      permanentError = error;
    }
    expect(permanentError).toMatchObject({ message: "AI request failed" });
    expect(JSON.stringify(permanentError)).not.toContain(
      "secret provider detail",
    );
    expect(generateStructured).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();

    const leakingAdapter = createResilientAiTextProvider({
      generateStructured: vi
        .fn()
        .mockRejectedValue(new AiIntegrationError("raw provider detail")),
    });
    await expect(
      leakingAdapter.generateStructured(request),
    ).rejects.toMatchObject({ message: "AI request failed" });

    await expect(provider.generateStructured(request)).rejects.toThrow("quota");
    await expect(
      provider.generateStructured({ ...request, input: "01234567890" }),
    ).rejects.toThrow("exceeds");
    expect(JSON.stringify(generateStructured.mock.calls)).not.toContain(
      "secret provider detail",
    );
  });

  it("forwards cancellation to embeddings and never retries an aborted operation", async () => {
    const embed = vi.fn().mockRejectedValue({ name: "AbortError" });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const controller = new AbortController();
    controller.abort();
    const provider = createResilientEmbeddingProvider(
      { model: "embedding-test", embed },
      {
        policy: {
          maxAttempts: 3,
          baseDelayMilliseconds: 1,
          maxDelayMilliseconds: 2,
          jitterRatio: 0,
          maxOperations: 2,
          maxInputCharacters: 100,
        },
        sleep,
      },
    );

    await expect(
      provider.embed(["context"], { signal: controller.signal }),
    ).rejects.toThrow("aborted");
    expect(embed).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });
});
