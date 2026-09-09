import { describe, expect, it, vi } from "vitest";

import {
  createDeterministicEmbeddingProvider,
  createOpenAiTextProvider,
} from "./ai.js";

describe("AI human-in-the-loop governance", () => {
  it("exposes only side-effect-free capabilities on the AI ports", () => {
    const embedding = createDeterministicEmbeddingProvider({
      model: "synthetic-test-model",
      dimension: 4,
    });
    const text = createOpenAiTextProvider({
      apiKey: "test-key",
      model: "synthetic-test-model",
    });

    expect(Object.keys(embedding).sort()).toEqual(["embed", "model"]);
    expect(Object.keys(text)).toEqual(["generateStructured"]);
  });

  it("never resolves unvalidated provider output: invalid JSON fails closed", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi.fn().mockResolvedValue({ output_text: '{"wrong":1}' }),
      },
    );

    await expect(
      port.generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: () => {
          throw new Error("synthetic parse rejection");
        },
      }),
    ).rejects.toThrow("failed validation");
  });

  it("never resolves unvalidated provider output: empty output fails closed", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi.fn().mockResolvedValue({ output_text: "" }),
      },
    );

    await expect(
      port.generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: (value: unknown) => value,
      }),
    ).rejects.toThrow("no structured output");
  });

  it("rejects oversized provider output before parsing", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi
          .fn()
          .mockResolvedValue({
            output_text: `{"data":"${"x".repeat(100_000)}"}`,
          }),
      },
    );

    await expect(
      port.generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: (value: unknown) => value,
      }),
    ).rejects.toThrow("too large");
  });

  it("rejects HTML error pages masquerading as structured output", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi
          .fn()
          .mockResolvedValue({
            output_text: "<html><body>blocked</body></html>",
          }),
      },
    );

    await expect(
      port.generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: (value: unknown) => value,
      }),
    ).rejects.toThrow("markup received");
  });

  it("wraps provider transport failures without leaking internals", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi.fn().mockRejectedValue(new Error("socket hang up")),
      },
    );

    const failure = await port
      .generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: (value: unknown) => value,
      })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).not.toContain("socket hang up");
  });

  it("resolves only schema-validated output for human review", async () => {
    const port = createOpenAiTextProvider(
      { apiKey: "test-key", model: "synthetic-test-model" },
      {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ draftText: "synthetic draft" }),
        }),
      },
    );

    await expect(
      port.generateStructured({
        input: "synthetic input",
        instructions: "synthetic instructions",
        schemaName: "SyntheticV1",
        jsonSchema: { type: "object" },
        parse: (value: unknown) => {
          if (
            value === null ||
            typeof value !== "object" ||
            typeof (value as Record<string, unknown>).draftText !== "string"
          ) {
            throw new Error("synthetic parse rejection");
          }
          return value as { draftText: string };
        },
      }),
    ).resolves.toEqual({ draftText: "synthetic draft" });
  });
});
