import { describe, expect, it } from "vitest";

import { parseRespReply, RedisProtocolError } from "./redis-client.js";

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

  it("rejects malformed frames fail-closed", () => {
    for (const raw of ["!x\r\n", ":1.5\r\n", "$x\r\n", "*-2\r\n"]) {
      expect(() => parseRespReply(Buffer.from(raw))).toThrow(
        RedisProtocolError,
      );
    }
  });
});
