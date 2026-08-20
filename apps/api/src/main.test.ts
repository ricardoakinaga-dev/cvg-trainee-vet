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

  it("normalizes configured origins and trusted proxies and completes the listen lifecycle", async () => {
    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      API_HOST: "127.0.0.1",
      API_PORT: "0",
      WEB_ORIGINS: " https://portal.example, , https://admin.example ",
      TRUSTED_PROXY_CIDRS: " 10.0.0.0/8, , 192.0.2.0/24 ",
    });

    await runtime.listen();
    expect(runtime.server.address()).not.toBeNull();
    await runtime.close();
  });

  it("treats blank origin and proxy configuration as absent", async () => {
    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
      WEB_ORIGINS: " , ",
      TRUSTED_PROXY_CIDRS: " , ",
    });

    expect(runtime.service).toBe("api");
    await runtime.close();
  });
});
