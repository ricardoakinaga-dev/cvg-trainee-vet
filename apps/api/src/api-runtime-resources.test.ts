import { describe, expect, it } from "vitest";

import { loadRuntimeConfig } from "@cvg/config";

import { createApiRuntimeResources } from "./api-runtime-resources.js";

describe("API runtime resource composition", () => {
  const identityProviderFixtureValue = ["fixture", "idp"].join("-");

  it("composes deterministic resources without enabling external integrations", async () => {
    const resources = createApiRuntimeResources(
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    );

    expect(resources.integrations.vectorStore).toBeNull();
    expect(resources.integrations.ai).toBeNull();
    expect(resources.identityProvider).toBeDefined();
    expect(resources.learningStateRepository).toBeDefined();
    expect(resources.rateLimiter).toBeDefined();

    await resources.integrations.close();
  });

  it("composes configured identity and OTLP integrations without connecting", async () => {
    const resources = createApiRuntimeResources(
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        IDENTITY_PROVIDER_URL: "https://identity.example",
        IDENTITY_PROVIDER_TOKEN: identityProviderFixtureValue,
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel.example:4318",
      }),
    );

    expect(resources.identityProvider).toBeDefined();
    expect(resources.observability).toBeDefined();
    await resources.integrations.close();
  });
});
