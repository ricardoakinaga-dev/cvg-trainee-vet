import { describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { createFakeDatabase } from "./test-support/fake-database.js";
import { createAiSuggestionSink } from "./ai-suggestion-repository.js";
import * as schema from "./schema.js";

describe("internal AI suggestion persistence", () => {
  it("upserts only a reviewable internal draft and never a participant projection", async () => {
    const onConflictDoUpdate = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const executed: unknown[] = [];
    const transactionDb = {
      execute: vi.fn(async (query: unknown) => {
        executed.push(query);
        return [];
      }),
      insert: vi.fn(() => ({ values })),
    };
    const database = {
      transaction: vi.fn(
        async (work: (tx: typeof transactionDb) => Promise<unknown>) =>
          work(transactionDb),
      ),
    } as unknown as PostgresJsDatabase<typeof schema>;
    const sink = createAiSuggestionSink(database, () => "suggestion-1");

    await sink.saveDraftSuggestion({
      contentId: "11111111-1111-4111-8111-111111111111",
      version: 1,
      draftText: "Rascunho interno.",
      warnings: ["Revisar antes de publicar."],
    });

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(executed)).toContain("cvg.service_role");
    expect(JSON.stringify(executed)).toContain("content-indexer");
    expect(transactionDb.insert).toHaveBeenCalledWith(schema.aiSuggestions);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "suggestion-1",
        status: "DRAFT_AI",
        draftText: "Rascunho interno.",
        warnings: ["Revisar antes de publicar."],
      }),
    );
    expect(JSON.stringify(values.mock.calls)).not.toContain("source");
    expect(JSON.stringify(values.mock.calls)).not.toContain("photo");
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: [schema.aiSuggestions.contentId, schema.aiSuggestions.version],
      }),
    );
  });
});

describe("ai suggestion sink", () => {
  const suggestion = {
    contentId: "33333333-3333-4333-8333-333333333333",
    version: 1,
    draftText: "Sugestão sintética sem marcação.",
    warnings: ["sem fontes"],
  };

  it("saves a draft suggestion under the service identity", async () => {
    const db = createFakeDatabase();
    const sink = createAiSuggestionSink(
      db as unknown as Parameters<typeof createAiSuggestionSink>[0],
      () => "fixed-id",
    );
    await expect(
      sink.saveDraftSuggestion({ ...suggestion }),
    ).resolves.toBeUndefined();
  });

  it("rejects invalid suggestions", async () => {
    const db = createFakeDatabase();
    const sink = createAiSuggestionSink(
      db as unknown as Parameters<typeof createAiSuggestionSink>[0],
      () => "fixed-id",
    );
    await expect(
      sink.saveDraftSuggestion({ ...suggestion, contentId: " " }),
    ).rejects.toThrow();
    await expect(
      sink.saveDraftSuggestion({ ...suggestion, version: 0 }),
    ).rejects.toThrow(RangeError);
    await expect(
      sink.saveDraftSuggestion({ ...suggestion, draftText: " " }),
    ).rejects.toThrow();
    await expect(
      sink.saveDraftSuggestion({
        ...suggestion,
        draftText: "x".repeat(20_001),
      }),
    ).rejects.toThrow(RangeError);
    await expect(
      sink.saveDraftSuggestion({
        ...suggestion,
        draftText: "<b>marcação</b>",
      }),
    ).rejects.toThrow(TypeError);
    await expect(
      sink.saveDraftSuggestion({
        ...suggestion,
        warnings: ["a", ...Array.from({ length: 20 }, () => "b")],
      }),
    ).rejects.toThrow(TypeError);
    await expect(
      sink.saveDraftSuggestion({
        ...suggestion,
        warnings: [" "],
      }),
    ).rejects.toThrow(TypeError);
    await expect(
      sink.saveDraftSuggestion({
        ...suggestion,
        warnings: ["x".repeat(501)],
      }),
    ).rejects.toThrow(TypeError);
  });
});
