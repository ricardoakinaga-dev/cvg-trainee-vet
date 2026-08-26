import { describe, expect, it } from "vitest";

import { createApiRuntime } from "../../apps/api/src/main.js";

const runLiveHealthTest = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const qdrantUrl = process.env.CVG_TEST_QDRANT_URL;

type DependencyHealthBody = {
  data: {
    status: string;
    dependencies: Record<string, string>;
  };
};

async function waitForQdrantHealth(
  baseUrl: string,
): Promise<{ response: Response; body: DependencyHealthBody }> {
  let response: Response | undefined;
  let body: DependencyHealthBody | undefined;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    response = await fetch(`${baseUrl}/health/dependencies`);
    body = (await response.json()) as DependencyHealthBody;
    if (body.data.dependencies.qdrant === "UP") {
      return { response, body };
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  if (response === undefined || body === undefined) {
    throw new Error("dependency health did not produce a response");
  }
  return { response, body };
}

describe.skipIf(
  !runLiveHealthTest || databaseUrl === undefined || qdrantUrl === undefined,
)("API live health endpoints", () => {
  it("reports ready core and redacted dependency health", async () => {
    if (databaseUrl === undefined || qdrantUrl === undefined) {
      throw new Error("live database and Qdrant configuration are required");
    }

    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      API_HOST: "127.0.0.1",
      API_PORT: "0",
      WEB_ORIGINS: "http://127.0.0.1:0",
      QDRANT_ENABLED: "true",
      QDRANT_URL: qdrantUrl,
      ...(process.env.CVG_TEST_QDRANT_API_KEY === undefined
        ? {}
        : { QDRANT_API_KEY: process.env.CVG_TEST_QDRANT_API_KEY }),
      QDRANT_COLLECTION: "cvg_health_dependencies_v1",
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_PROVIDER: "fake",
      EMBEDDING_MODEL: "cvg-local-embedding-v1",
      EMBEDDING_DIMENSION: "8",
      AI_ENABLED: "false",
    });

    await runtime.listen();
    try {
      const address = runtime.server.address();
      if (address === null || typeof address === "string") return;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const ready = await fetch(`${baseUrl}/health/ready`);
      const { response: dependencies, body } =
        await waitForQdrantHealth(baseUrl);

      expect(ready.status).toBe(200);
      expect(dependencies.status).toBe(200);
      expect(body.data).toEqual({
        status: "READY",
        dependencies: { postgres: "UP", qdrant: "UP", ai: "DISABLED" },
      });
      expect(JSON.stringify(body)).not.toMatch(/secret|password|api_key|url/iu);
    } finally {
      await runtime.close();
    }
  });
});
