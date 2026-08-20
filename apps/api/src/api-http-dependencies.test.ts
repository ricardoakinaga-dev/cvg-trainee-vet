import { describe, expect, it } from "vitest";

import { loadRuntimeConfig } from "@cvg/config";

import { createApiHttpDependencies } from "./api-http-dependencies.js";
import { createApiRuntimeResources } from "./api-runtime-resources.js";

describe("API HTTP dependency composition", () => {
  it("wires required handlers and leaves optional AI disabled", async () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });
    const resources = createApiRuntimeResources(config);
    const dependencies = createApiHttpDependencies(config, resources);

    expect(dependencies.healthcheck).toBe(resources.integrations.healthcheck);
    expect(dependencies.dependencyStatus).toBe(
      resources.integrations.dependencyStatus,
    );
    expect(dependencies.runOperationalAiProposal).toBeUndefined();
    expect(typeof dependencies.createInvitation).toBe("function");
    expect(typeof dependencies.submitAttempt).toBe("function");

    await resources.integrations.close();
  });
});
