import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createApiRuntime } from "../../apps/api/src/main.js";

const runLiveHealthTest = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const qdrantUrl = process.env.CVG_TEST_QDRANT_URL;

describe.skipIf(
  !runLiveHealthTest || databaseUrl === undefined || qdrantUrl === undefined,
)("API live health endpoints", () => {
  it("reports ready core and redacted dependency health", async () => {
    if (databaseUrl === undefined || qdrantUrl === undefined) {
      throw new Error("live database and Qdrant configuration are required");
    }

    const collection = `cvg_health_${randomUUID().replaceAll("-", "")}`;
    const qdrantApiKey = process.env.CVG_TEST_QDRANT_API_KEY;
    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      API_HOST: "127.0.0.1",
      API_PORT: "0",
      WEB_ORIGINS: "http://127.0.0.1:0",
      QDRANT_ENABLED: "true",
      QDRANT_URL: qdrantUrl,
      ...(qdrantApiKey === undefined ? {} : { QDRANT_API_KEY: qdrantApiKey }),
      QDRANT_COLLECTION: collection,
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_PROVIDER: "fake",
      EMBEDDING_MODEL: "cvg-local-embedding-v1",
      EMBEDDING_DIMENSION: "8",
      AI_ENABLED: "false",
      METRICS_SCRAPE_TOKEN: "m".repeat(32),
    });

    await runtime.listen();
    try {
      const address = runtime.server.address();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const ready = await fetch(`${baseUrl}/health/ready`);
      const dependencies = await fetch(`${baseUrl}/health/dependencies`, {
        headers: { authorization: `Bearer ${"m".repeat(32)}` },
      });
      const body = (await dependencies.json()) as {
        data: {
          status: string;
          dependencies: Record<string, string>;
        };
      };

      expect(ready.status).toBe(200);
      expect(dependencies.status).toBe(200);
      expect(body.data).toEqual({
        status: "READY",
        dependencies: { postgres: "UP", qdrant: "UP", ai: "DISABLED" },
      });
      expect(JSON.stringify(body)).not.toMatch(/secret|password|api_key|url/iu);
    } finally {
      await runtime.close();
      const headers = qdrantApiKey ? { "api-key": qdrantApiKey } : undefined;
      await fetch(`${qdrantUrl}/collections/${collection}`, {
        method: "DELETE",
        ...(headers ? { headers } : {}),
      });
    }
  }, 30_000);
});
