import { describe, expect, it, vi } from "vitest";

import { loadRuntimeConfig } from "@cvg/config";

import {
  createDependencyStatus,
  createIntegrationHealthcheck,
  createIntegrationInitializer,
  createServerIntegrations,
} from "./composition.js";

describe("server integration health composition", () => {
  it("returns redacted dependency status without exposing failure details", async () => {
    const status = await createDependencyStatus(
      async () => undefined,
      { healthcheck: async () => undefined },
      true,
    )();

    expect(status).toEqual({
      status: "READY",
      dependencies: {
        postgres: "UP",
        qdrant: "UP",
        ai: "ENABLED",
      },
    });

    const degraded = await createDependencyStatus(
      async () => {
        throw new Error("database secret must not escape");
      },
      { healthcheck: async () => undefined },
      false,
    )();

    expect(degraded).toEqual({
      status: "NOT_READY",
      dependencies: {
        postgres: "DOWN",
        qdrant: "UP",
        ai: "DISABLED",
      },
    });
    expect(JSON.stringify(degraded)).not.toContain("secret");
  });

  it("checks PostgreSQL and an enabled Qdrant dependency", async () => {
    const databaseHealthcheck = vi.fn(async () => undefined);
    const vectorHealthcheck = vi.fn(async () => undefined);
    const healthcheck = createIntegrationHealthcheck(databaseHealthcheck, {
      healthcheck: vectorHealthcheck,
    });

    await healthcheck();

    expect(databaseHealthcheck).toHaveBeenCalledOnce();
    expect(vectorHealthcheck).toHaveBeenCalledOnce();
  });

  it("does not require disabled Qdrant for core readiness", async () => {
    const databaseHealthcheck = vi.fn(async () => undefined);
    const healthcheck = createIntegrationHealthcheck(databaseHealthcheck, null);

    await expect(healthcheck()).resolves.toBeUndefined();
  });

  it("fails readiness when a dependency healthcheck fails", async () => {
    const healthcheck = createIntegrationHealthcheck(async () => undefined, {
      healthcheck: vi.fn(async () => {
        throw new Error("qdrant down");
      }),
    });

    await expect(healthcheck()).rejects.toThrow("qdrant down");
  });

  it("initializes an enabled Qdrant collection exactly through its adapter", async () => {
    const ensureCollection = vi.fn(async () => undefined);
    const initialize = createIntegrationInitializer({ ensureCollection });

    await initialize();

    expect(ensureCollection).toHaveBeenCalledOnce();
  });

  it("keeps initialization a no-op when Qdrant is disabled", async () => {
    await expect(createIntegrationInitializer(null)()).resolves.toBeUndefined();
  });

  it("wires deterministic embeddings without constructing an external AI client", async () => {
    const integrations = createServerIntegrations(
      loadRuntimeConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: "http://localhost:6333",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "4",
        AI_ENABLED: "false",
      }),
    );

    await expect(integrations.embedding?.embed(["synthetic"])).resolves.toEqual(
      [expect.any(Array)],
    );
    await integrations.close();
  });
});
