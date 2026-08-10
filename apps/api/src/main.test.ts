import { describe, expect, it } from "vitest";

import { createApiRuntime } from "./main.js";

describe("API runtime", () => {
  it("starts with deterministic integrations disabled", async () => {
    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(runtime.service).toBe("api");
    expect(runtime.config.qdrant.enabled).toBe(false);
    expect(runtime.integrations.vectorStore).toBeNull();
    expect(runtime.integrations.ai).toBeNull();
    await runtime.close();
  });
});
