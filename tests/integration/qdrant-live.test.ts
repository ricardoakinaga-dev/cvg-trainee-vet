import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createQdrantVectorStore } from "../../packages/integrations/src/qdrant.js";

const runLiveQdrantTests = process.env.CVG_RUN_LIVE_QDRANT_TESTS === "true";
const qdrantUrl = process.env.CVG_TEST_QDRANT_URL;
const qdrantApiKey = process.env.CVG_TEST_QDRANT_API_KEY;

describe.skipIf(!runLiveQdrantTests || qdrantUrl === undefined)(
  "Qdrant live adapter",
  () => {
    it("creates, validates, indexes, and searches an internal synthetic collection", async () => {
      if (qdrantUrl === undefined) throw new Error("Qdrant URL is required");
      const collection = `cvg_live_test_${Date.now()}`;
      const pointId = randomUUID();
      const store = createQdrantVectorStore({
        url: qdrantUrl,
        ...(qdrantApiKey ? { apiKey: qdrantApiKey } : {}),
        collection,
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      });

      try {
        await store.ensureCollection();
        await store.healthcheck();
        await store.upsert([
          {
            id: pointId,
            vector: [1, 0],
            knowledgeId: "knowledge-1",
            sectionId: "section-1",
            scopeId: "scope-1",
            contentHash: "hash-1",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
          },
        ]);

        await expect(store.list()).resolves.toEqual([
          expect.objectContaining({
            id: pointId,
            knowledgeId: "knowledge-1",
            scopeId: "scope-1",
            contentHash: "hash-1",
          }),
        ]);

        const matches = await store.search({
          vector: [1, 0],
          scopeId: "scope-1",
          limit: 5,
        });

        expect(matches).toEqual([
          expect.objectContaining({
            id: pointId,
            knowledgeId: "knowledge-1",
            scopeId: "scope-1",
          }),
        ]);
        await store.delete([pointId]);
      } finally {
        await fetch(`${qdrantUrl}/collections/${collection}`, {
          method: "DELETE",
        });
      }
    });
  },
);
