import { describe, expect, it } from "vitest";

import { ConfigError, loadRuntimeConfig } from "./env.js";

const developmentAuditCursorKey = "cvg-development-only-audit-cursor-key-v1";
const productionAuditCursorKey = "production-audit-cursor-key-with-32-bytes";

describe("loadRuntimeConfig", () => {
  it("loads the deterministic core with assistive integrations disabled", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      CLINICAL_APPROVER_ID: "ricardo-account",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(config).toEqual({
      nodeEnv: "test",
      databaseUrl: "postgresql://cvg:cvg@localhost:5432/cvg",
      requireDatabaseLeastPrivilege: false,
      diagnosticSessionDraftEnabled: false,
      auditCursorSecret: developmentAuditCursorKey,
      approvedClinicalApproverId: "ricardo-account",
      trustedProxies: [],
      tracing: { enabled: false },
      qdrant: { enabled: false },
      ai: { enabled: false, provider: "openai" },
    });
  });

  it("wires OTLP tracing only with an explicit HTTPS(S) endpoint", () => {
    const enabled = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      OTEL_TRACES_ENABLED: "true",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://127.0.0.1:4318/v1/traces",
      OTEL_SERVICE_NAME: "cvg-staging",
    });
    expect(enabled.tracing).toEqual({
      enabled: true,
      endpoint: "http://127.0.0.1:4318/v1/traces",
      serviceName: "cvg-staging",
    });

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        OTEL_TRACES_ENABLED: "true",
      }),
    ).toThrow("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        OTEL_TRACES_ENABLED: "true",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "ftp://collector/traces",
      }),
    ).toThrow("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");
  });

  it("keeps the diagnostic draft disabled without an explicit non-production opt-in", () => {
    const defaults = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });
    expect(defaults.diagnosticSessionDraftEnabled).toBe(false);

    const optedIn = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      DIAGNOSTIC_SESSION_DRAFT_ENABLED: "true",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });
    expect(optedIn.diagnosticSessionDraftEnabled).toBe(true);

    const production = loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      DIAGNOSTIC_SESSION_DRAFT_ENABLED: "true",
      AUDIT_CURSOR_SECRET: productionAuditCursorKey,
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });
    expect(production.diagnosticSessionDraftEnabled).toBe(false);
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
      AUDIT_CURSOR_SECRET: productionAuditCursorKey,
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
    expect(config.auditCursorSecret).toBe(productionAuditCursorKey);
  });

  it("requires a dedicated cursor secret in production", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
      }),
    ).toThrow("AUDIT_CURSOR_SECRET");
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

  it("defaults to an empty trusted proxy list and parses explicit entries", () => {
    const defaults = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });
    expect(defaults.trustedProxies).toEqual([]);

    const trusted = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      TRUSTED_PROXIES: "10.0.0.1, 2001:db8::1",
    });
    expect(trusted.trustedProxies).toEqual(["10.0.0.1", "2001:db8::1"]);
  });

  it("rejects malformed trusted proxy entries fail-closed", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "false",
        AI_ENABLED: "false",
        TRUSTED_PROXIES: "10.0.0.1, not-an-ip",
      }),
    ).toThrow("TRUSTED_PROXIES");
  });
});

describe("loadRuntimeConfig branch closure (AAA-FINAL-003)", () => {
  const core = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
    QDRANT_ENABLED: "false",
    AI_ENABLED: "false",
  } as const;

  it("rejects doubly-compressed IPv6 proxies", () => {
    expect(() =>
      loadRuntimeConfig({ ...core, TRUSTED_PROXIES: "1::2::3" }),
    ).toThrow("TRUSTED_PROXIES");
  });

  it("accepts full eight-group IPv6 proxies", () => {
    const config = loadRuntimeConfig({
      ...core,
      TRUSTED_PROXIES: "2001:0db8:0000:0000:0000:ff00:0042:8329, ::",
    });
    expect(config.trustedProxies).toEqual([
      "2001:0db8:0000:0000:0000:ff00:0042:8329",
      "::",
    ]);
  });

  it("falls back to AI_API_KEY for the embedding key", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "http://127.0.0.1:6333",
      EMBEDDING_MODEL: "m",
      EMBEDDING_DIMENSION: "64",
      AI_ENABLED: "false",
      AI_API_KEY: "synthetic-key",
    });
    expect(config.qdrant).toMatchObject({
      enabled: true,
      embeddingApiKey: "synthetic-key",
    });
  });
});
