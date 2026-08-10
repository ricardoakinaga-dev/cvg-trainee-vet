import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { aiSuggestions } from "./schema.js";
import type * as schema from "./schema.js";

export type InternalAiSuggestion = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly draftText: string;
  readonly warnings: readonly string[];
}>;

export type AiSuggestionSinkPort = Readonly<{
  readonly saveDraftSuggestion: (
    suggestion: InternalAiSuggestion,
  ) => Promise<void>;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new TypeError(`${field} is required`);
}

export function createAiSuggestionSink(
  db: PostgresJsDatabase<typeof schema>,
  idFactory: () => string,
): AiSuggestionSinkPort {
  const sink: AiSuggestionSinkPort = {
    saveDraftSuggestion: async (
      suggestion: InternalAiSuggestion,
    ): Promise<void> => {
      assertNonEmpty(suggestion.contentId, "contentId");
      if (!Number.isInteger(suggestion.version) || suggestion.version < 1) {
        throw new RangeError("version must be positive");
      }
      assertNonEmpty(suggestion.draftText, "draftText");
      if (suggestion.draftText.length > 20_000) {
        throw new RangeError("draftText exceeds the maximum size");
      }
      if (/<[^>]*>/u.test(suggestion.draftText)) {
        throw new TypeError("draftText must be plain text");
      }
      if (
        suggestion.warnings.length > 20 ||
        suggestion.warnings.some(
          (warning) => warning.trim().length === 0 || warning.length > 500,
        )
      ) {
        throw new TypeError("warnings are invalid");
      }

      const now = new Date();
      await db
        .insert(aiSuggestions)
        .values({
          id: idFactory(),
          contentId: suggestion.contentId,
          version: suggestion.version,
          status: "DRAFT_AI",
          draftText: suggestion.draftText,
          warnings: [...suggestion.warnings],
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [aiSuggestions.contentId, aiSuggestions.version],
          set: {
            status: "DRAFT_AI",
            draftText: suggestion.draftText,
            warnings: [...suggestion.warnings],
            updatedAt: now,
          },
        });
    },
  };
  return Object.freeze(sink);
}
