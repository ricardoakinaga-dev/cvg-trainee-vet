import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";
import { describe, expect, it } from "vitest";

import { createRedisRateLimitStore } from "./rate-limit-store.js";
import { createRespScriptClient } from "./redis-client.js";

/**
 * AAA-FINAL-005 — production RESP client against real Redis.
 *
 * Risco: o wiring de produção (main.ts) usar um cliente nunca testado.
 * Prova EVAL real ponta a ponta via createRespScriptClient + store.
 * Requer CVG_REDIS_SERVER_BIN (pula sem ele, como os demais lives).
 */
const REDIS_BIN = process.env.CVG_REDIS_SERVER_BIN?.trim() || "";
const enabled = REDIS_BIN.length > 0;

async function ephemeralPort(): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address !== null && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("could not allocate a port"));
        }
      });
    });
  });
}

async function waitForTcp(port: number): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("redis did not become ready");
}

describe.skipIf(!enabled)("production resp client on real Redis", () => {
  it("drives the fixed-window script through EVAL", async () => {
    const port = await ephemeralPort();
    const child: ChildProcess = spawn(
      REDIS_BIN,
      [
        "--port",
        String(port),
        "--bind",
        "127.0.0.1",
        "--save",
        "",
        "--appendonly",
        "no",
      ],
      { stdio: "ignore" },
    );
    try {
      await waitForTcp(port);
      const store = createRedisRateLimitStore(
        createRespScriptClient(`redis://127.0.0.1:${port}`),
        { keyPrefix: "rl:prod-client" },
      );
      const key = `prod-${Date.now()}`;
      for (let index = 0; index < 3; index += 1) {
        await expect(
          store.increment(key, 3, 60_000, Date.now()),
        ).resolves.toMatchObject({ allowed: true });
      }
      await expect(
        store.increment(key, 3, 60_000, Date.now()),
      ).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 60 });
    } finally {
      child.kill("SIGKILL");
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }, 60000);

  it("rejects non-redis schemes fail-fast", () => {
    expect(() => createRespScriptClient("http://127.0.0.1:6379")).toThrow(
      RangeError,
    );
  });
});
