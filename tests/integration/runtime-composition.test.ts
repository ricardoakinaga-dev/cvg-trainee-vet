import { describe, expect, it } from "vitest";

import { loadRuntimeConfig } from "../../packages/config/src/env.js";
import { createServerIntegrations } from "../../packages/integrations/src/composition.js";

describe("server integration composition", () => {
  it("mounts PostgreSQL, Qdrant, embeddings and AI without making network calls", async () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "http://127.0.0.1:6333",
      QDRANT_COLLECTION: "cvg_internal_knowledge_test",
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_MODEL: "embedding-test",
      EMBEDDING_API_KEY: "embed-key",
      EMBEDDING_DIMENSION: "2",
      AI_ENABLED: "true",
      AI_API_KEY: "fake-key",
      AI_MODEL: "model-test",
    });
    const integrations = createServerIntegrations(config);

    expect(integrations.database.healthcheck).toBeTypeOf("function");
    expect(integrations.vectorStore).not.toBeNull();
    expect(integrations.embedding).not.toBeNull();
    expect(integrations.ai).not.toBeNull();

    await integrations.close();
  });
});
