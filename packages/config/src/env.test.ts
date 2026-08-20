import { describe, expect, it } from "vitest";

import { ConfigError, loadRuntimeConfig } from "./env.js";

describe("loadRuntimeConfig", () => {
  it("loads the deterministic core with assistive integrations disabled", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      CLINICAL_APPROVER_ID: "ricardo-account",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      IDENTITY_PROVIDER_URL: "",
      IDENTITY_PROVIDER_TOKEN: "",
    });

    expect(config).toEqual({
      nodeEnv: "test",
      databaseUrl: "postgresql://cvg:cvg@localhost:5432/cvg",
      requireDatabaseLeastPrivilege: false,
      operationalAiCostCeilingUsd: 0.25,
      approvedClinicalApproverId: "ricardo-account",
      identityProvider: { configured: false },
      identityProviderRequired: false,
      observability: { configured: false },
      qdrant: { enabled: false },
      ai: { enabled: false, provider: "openai" },
    });
  });

  it("accepts a bounded operational AI cost ceiling and fails closed outside it", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      AI_OPERATIONAL_COST_CEILING_USD: "1.5",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(config.operationalAiCostCeilingUsd).toBe(1.5);
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        AI_OPERATIONAL_COST_CEILING_USD: "0",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow(ConfigError);
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        AI_OPERATIONAL_COST_CEILING_USD: "100.01",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow(ConfigError);
  });

  it("requires a valid database URL", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "not-a-url",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow(ConfigError);
  });

  it("requires Qdrant configuration only when it is enabled", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        AI_ENABLED: "false",
      }),
    ).toThrow("QDRANT_URL");
  });

  it("requires server-side AI credentials only when AI is enabled", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "true",
        AI_PROVIDER: "openai",
      }),
    ).toThrow("AI_API_KEY");
  });

  it("loads Qdrant and AI settings only into the server-side runtime config", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      CLINICAL_APPROVER_ID: "ricardo-account",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "https://qdrant.example.test",
      QDRANT_API_KEY: "test-key",
      QDRANT_COLLECTION: "cvg_test_v1",
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_MODEL: "embedding-test",
      EMBEDDING_API_KEY: "embed-key",
      EMBEDDING_DIMENSION: "1536",
      AI_ENABLED: "true",
      AI_PROVIDER: "openai",
      AI_API_KEY: "fake-key",
      AI_MODEL: "model-test",
      METRICS_SCRAPE_TOKEN: "m".repeat(32),
    });

    expect(config.qdrant).toEqual({
      enabled: true,
      embeddingProvider: "openai",
      url: "https://qdrant.example.test",
      apiKey: "test-key",
      collection: "cvg_test_v1",
      indexVersion: "v1",
      embeddingApiKey: "embed-key",
      embeddingModel: "embedding-test",
      embeddingDimension: 1536,
    });
    expect(config.ai).toEqual({
      enabled: true,
      provider: "openai",
      apiKey: "fake-key",
      model: "model-test",
    });
  });

  it("allows the deterministic embedding only outside production", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "http://localhost:6333",
      EMBEDDING_PROVIDER: "fake",
      EMBEDDING_MODEL: "cvg-local-embedding-v1",
      EMBEDDING_DIMENSION: "8",
      AI_ENABLED: "false",
    });

    expect(config.qdrant).toEqual({
      enabled: true,
      embeddingProvider: "fake",
      url: "http://localhost:6333",
      collection: "cvg_internal_knowledge_v1",
      indexVersion: "v1",
      embeddingModel: "cvg-local-embedding-v1",
      embeddingDimension: 8,
    });

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: "http://localhost:6333",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      }),
    ).toThrow("development or test");
  });

  it("requires a dedicated metrics token in production and never exposes it", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow("METRICS_SCRAPE_TOKEN");

    const config = loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      METRICS_SCRAPE_TOKEN: "m".repeat(32),
      CLINICAL_APPROVER_ID: "ricardo-account",
    });
    expect(config.metricsScrapeToken).toBe("m".repeat(32));
    expect(JSON.stringify(config)).not.toContain("METRICS_SCRAPE_TOKEN");
  });

  it("requires a designated clinical approver in production", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        METRICS_SCRAPE_TOKEN: "m".repeat(32),
      }),
    ).toThrow("CLINICAL_APPROVER_ID");
  });

  it("fails closed when an external identity provider is required", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        IDENTITY_PROVIDER_REQUIRED: "true",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        METRICS_SCRAPE_TOKEN: "m".repeat(32),
      }),
    ).toThrow("IDENTITY_PROVIDER_URL");

    const config = loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      IDENTITY_PROVIDER_REQUIRED: "true",
      IDENTITY_PROVIDER_URL: "https://identity.example",
      IDENTITY_PROVIDER_TOKEN: "x",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      METRICS_SCRAPE_TOKEN: "m".repeat(32),
      CLINICAL_APPROVER_ID: "ricardo-account",
    });
    expect(config.identityProviderRequired).toBe(true);
    expect(config.identityProvider.configured).toBe(true);
  });

  it("rejects an insecure identity provider transport in production", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        IDENTITY_PROVIDER_REQUIRED: "true",
        IDENTITY_PROVIDER_URL: "http://identity.example",
        IDENTITY_PROVIDER_TOKEN: "x",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        METRICS_SCRAPE_TOKEN: "m".repeat(32),
      }),
    ).toThrow("HTTPS");
  });

  it("rejects an identity provider URL without its server-side token", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        IDENTITY_PROVIDER_URL: "https://identity.example",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow("IDENTITY_PROVIDER_TOKEN");
  });

  it("loads the OTLP endpoint without exposing credentials", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(config.observability).toEqual({
      configured: true,
      otlpEndpoint: "http://otel-collector:4318",
    });
  });
});
