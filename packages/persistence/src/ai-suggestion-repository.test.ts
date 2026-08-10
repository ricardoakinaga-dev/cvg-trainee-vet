import { describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { createAiSuggestionSink } from "./ai-suggestion-repository.js";
import * as schema from "./schema.js";

describe("internal AI suggestion persistence", () => {
  it("upserts only a reviewable internal draft and never a participant projection", async () => {
    const onConflictDoUpdate = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const database = {
      insert: vi.fn(() => ({ values })),
    } as unknown as PostgresJsDatabase<typeof schema>;
    const sink = createAiSuggestionSink(database, () => "suggestion-1");

    await sink.saveDraftSuggestion({
      contentId: "11111111-1111-4111-8111-111111111111",
      version: 1,
      draftText: "Rascunho interno.",
      warnings: ["Revisar antes de publicar."],
    });

    expect(database.insert).toHaveBeenCalledWith(schema.aiSuggestions);
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
