import { describe, expect, it } from "vitest";

import {
  createRespScriptClient,
  parseRespReply,
  RedisProtocolError,
} from "./redis-client.js";

/**
 * AAA-FINAL-005 — RESP parser contract (pure, no sockets).
 *
 * Risco: interpretar errado a resposta do backend (budget errado).
 * Branches: todos os tipos RESP2 + truncamento + inválidos.
 */
describe("resp parser", () => {
  it("parses simple strings, integers and nulls", () => {
    expect(parseRespReply(Buffer.from("+OK\r\n"))).toMatchObject({
      value: "OK",
    });
    expect(parseRespReply(Buffer.from(":42\r\n"))).toMatchObject({ value: 42 });
    expect(parseRespReply(Buffer.from("$-1\r\n"))).toMatchObject({
      value: null,
    });
    expect(parseRespReply(Buffer.from("*-1\r\n"))).toMatchObject({
      value: null,
    });
  });

  it("parses bulk strings and integer arrays", () => {
    const bulk = parseRespReply(Buffer.from("$5\r\nhello\r\nTRAIL"));
    expect(bulk.value).toBe("hello");
    expect(bulk.rest.toString()).toBe("TRAIL");
    const array = parseRespReply(Buffer.from("*2\r\n:11\r\n:5000\r\n"));
    expect(array.value).toEqual([11, 5000]);
    expect(array.rest.length).toBe(0);
  });

  it("surfaces server errors as rejections, not values", () => {
    const parsed = parseRespReply(Buffer.from("-NOSCRIPT boom\r\n"));
    expect(parsed.value).toBeInstanceOf(RedisProtocolError);
  });

  it("waits for truncated frames instead of guessing", () => {
    expect(parseRespReply(Buffer.from(""))).toMatchObject({ value: undefined });
    expect(parseRespReply(Buffer.from("*2\r\n:1\r\n"))).toMatchObject({
      value: undefined,
    });
    expect(parseRespReply(Buffer.from("$5\r\nhel"))).toMatchObject({
      value: undefined,
    });
  });

  it("propagates nested server errors and top-level truncation", () => {
    expect(() => parseRespReply(Buffer.from("*1\r\n-ERR\r\n"))).toThrow(
      RedisProtocolError,
    );
    expect(parseRespReply(Buffer.from("+OK"))).toMatchObject({
      value: undefined,
    });
  });

  it("rejects malformed frames fail-closed", () => {
    for (const raw of ["!x\r\n", ":1.5\r\n", "$x\r\n", "*-2\r\n"]) {
      expect(() => parseRespReply(Buffer.from(raw))).toThrow(
        RedisProtocolError,
      );
    }
  });
});

describe("resp client over loopback TCP", () => {
  async function fakeServer(
    chunks: Array<string>,
  ): Promise<{ port: number; close: () => Promise<void> }> {
    const net = await import("node:net");
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        socket.once("data", () => {
          for (const chunk of chunks) socket.write(chunk);
        });
      });
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address !== null && typeof address === "object") {
          resolve({
            port: address.port,
            close: () =>
              new Promise<void>((done) => server.close(() => done())),
          });
        } else {
          reject(new Error("no port"));
        }
      });
    });
  }

  it("resolves EVAL replies split across TCP chunks", async () => {
    const { port, close } = await fakeServer(["*2\r\n:4\r", "\n:60000\r\n"]);
    try {
      const client = createRespScriptClient(`redis://127.0.0.1:${port}`);
      await expect(client.eval("return 1", ["k"], [1])).resolves.toEqual([
        4, 60000,
      ]);
    } finally {
      await close();
    }
  });

  it("rejects server error replies", async () => {
    const { port, close } = await fakeServer(["-BUSY overloaded\r\n"]);
    try {
      const client = createRespScriptClient(`redis://127.0.0.1:${port}`);
      await expect(client.eval("return 1", [], [])).rejects.toThrow(
        RedisProtocolError,
      );
    } finally {
      await close();
    }
  });

  it("rejects refused connections and invalid options", async () => {
    const client = createRespScriptClient("redis://127.0.0.1:9", {
      timeoutMs: 50,
    });
    await expect(client.eval("return 1", [], [])).rejects.toThrow();
    expect(() =>
      createRespScriptClient("redis://127.0.0.1:9", { timeoutMs: 0 }),
    ).toThrow(RangeError);
    expect(() => createRespScriptClient(`redis://:9`)).toThrow(TypeError);
  });
});
