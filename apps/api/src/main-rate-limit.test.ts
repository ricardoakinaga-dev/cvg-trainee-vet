import { describe, expect, it } from "vitest";

import { createHttpRateLimiter } from "./main.js";

/**
 * AAA-FINAL-005 — explicit backend selection (no silent fallback).
 *
 * Risco: servir com limiter local por engano em multi-instância, ou
 * aceitar backend desconhecido silenciosamente. Comportamento: seleção
 * explícita, falha fechada no boot, default documentado.
 */
describe("http rate limiter backend selection", () => {
  const db = { fake: true };
  const log = () => undefined;

  it("defaults to the shared postgres backend", async () => {
    const messages: Array<string> = [];
    const limiter = createHttpRateLimiter({}, db as never, (message) =>
      messages.push(message),
    );
    expect(messages).toEqual(["rate-limit backend: postgres-shared"]);
    // The postgres limiter needs a real transaction executor; construction
    // alone must succeed (wiring), execution is covered live.
    expect(typeof limiter.check).toBe("function");
  });

  it("rejects unknown backends fail-closed at startup", () => {
    expect(() =>
      createHttpRateLimiter(
        { CVG_RATE_LIMIT_BACKEND: "auto" },
        db as never,
        log,
      ),
    ).toThrow("unknown CVG_RATE_LIMIT_BACKEND");
  });

  it("requires an explicit redis URL for the redis backend", () => {
    expect(() =>
      createHttpRateLimiter(
        { CVG_RATE_LIMIT_BACKEND: "redis" },
        db as never,
        log,
      ),
    ).toThrow("CVG_RATE_LIMIT_REDIS_URL is required");
  });

  it("builds a redis-backed limiter without touching postgres", async () => {
    const limiter = createHttpRateLimiter(
      {
        CVG_RATE_LIMIT_BACKEND: "redis",
        CVG_RATE_LIMIT_REDIS_URL: "redis://127.0.0.1:9",
      },
      db as never,
      log,
    );
    // Unreachable backend surfaces as fail-closed deny, never as a
    // silent memory allow-all nor an unhandled throw (no 500s/hangs).
    await expect(limiter.check("k")).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });
});
