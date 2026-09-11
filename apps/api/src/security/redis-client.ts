import { connect, type Socket } from "node:net";

/**
 * AAA-FINAL-005 §17 — minimal RESP2 client for the Redis/Valkey
 * rate-limit backend. EVAL-only on purpose: the rate-limit store speaks
 * nothing else. Per-call connections (stateless: no pool, no reconnect
 * state machine to get wrong); localhost handshake costs are negligible
 * next to a 500 ms backend budget.
 */
export type RespValue =
  string | number | null | Error | ReadonlyArray<RespValue>;

export class RedisProtocolError extends Error {
  public override readonly name = "RedisProtocolError";

  public constructor(message: string) {
    super(message);
  }
}

export function parseRespReply(buffer: Buffer): {
  readonly value: RespValue | undefined;
  readonly rest: Buffer;
} {
  if (buffer.length === 0) return { value: undefined, rest: buffer };
  const type = String.fromCharCode(buffer[0] as number);
  const lineEnd = buffer.indexOf("\r\n");
  if (lineEnd === -1) return { value: undefined, rest: buffer };
  const line = buffer.subarray(1, lineEnd).toString("utf8");
  const after = buffer.subarray(lineEnd + 2);
  switch (type) {
    case "+":
      return { value: line, rest: after };
    case "-":
      return { value: new RedisProtocolError(line), rest: after };
    case ":": {
      const integer = Number(line);
      if (!Number.isSafeInteger(integer)) {
        throw new RedisProtocolError(`invalid integer reply: ${line}`);
      }
      return { value: integer, rest: after };
    }
    case "$": {
      const length = Number(line);
      if (length === -1) return { value: null, rest: after };
      if (!Number.isSafeInteger(length) || length < 0) {
        throw new RedisProtocolError(`invalid bulk length: ${line}`);
      }
      if (after.length < length + 2) return { value: undefined, rest: buffer };
      return {
        value: after.subarray(0, length).toString("utf8"),
        rest: after.subarray(length + 2),
      };
    }
    case "*": {
      const count = Number(line);
      if (count === -1) return { value: null, rest: after };
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new RedisProtocolError(`invalid array length: ${line}`);
      }
      const items: Array<RespValue> = [];
      let rest = after;
      for (let index = 0; index < count; index += 1) {
        const parsed = parseRespReply(rest);
        if (parsed.value === undefined)
          return { value: undefined, rest: buffer };
        if (parsed.value instanceof Error) throw parsed.value;
        items.push(parsed.value);
        rest = parsed.rest;
      }
      return { value: Object.freeze(items), rest };
    }
    default:
      throw new RedisProtocolError(`unknown reply type: ${type}`);
  }
}

function encodeBulk(value: string): string {
  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
}

function encodeCommand(parts: readonly string[]): string {
  return `*${parts.length}\r\n${parts.map((part) => encodeBulk(part)).join("")}`;
}

export type RespScriptClientOptions = Readonly<{
  readonly timeoutMs?: number;
}>;

export type RespScriptClient = Readonly<{
  readonly eval: (
    script: string,
    keys: readonly string[],
    args: readonly (string | number)[],
  ) => Promise<unknown>;
}>;

function parseUrl(url: string): {
  readonly host: string;
  readonly port: number;
} {
  const parsed = new URL(url);
  if (parsed.protocol !== "redis:") {
    throw new RangeError("rate-limit redis URL must use the redis: scheme");
  }
  return Object.freeze({
    host: parsed.hostname === "" ? "127.0.0.1" : parsed.hostname,
    port: parsed.port === "" ? 6379 : Number(parsed.port),
  });
}

/**
 * Creates an EVAL-only script client. Every call opens a fresh connection,
 * runs one EVAL, then closes: no shared mutable connection state, no
 * silent fallback. Any transport failure rejects (the store maps it to
 * fail-closed / fail-open per risk class).
 */
export function createRespScriptClient(
  url: string,
  options: RespScriptClientOptions = {},
): RespScriptClient {
  const timeoutMs = options.timeoutMs ?? 500;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("timeoutMs must be a positive integer");
  }
  const target = parseUrl(url);

  async function evalScript(
    script: string,
    keys: readonly string[],
    args: readonly (string | number)[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (signal?.aborted === true) {
      throw new RedisProtocolError("rate-limit operation aborted");
    }
    const socket: Socket = connect({
      host: target.host,
      port: target.port,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new RedisProtocolError("rate-limit backend timeout"));
        }, timeoutMs);
        timer.unref?.();
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(new RedisProtocolError("rate-limit operation aborted"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        socket.once("connect", () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          resolve();
        });
        socket.once("error", (error) => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        });
      });
      const payload = encodeCommand([
        "EVAL",
        script,
        String(keys.length),
        ...keys,
        ...args.map((argument) => String(argument)),
      ]);
      await new Promise<void>((resolve, reject) => {
        socket.write(payload, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new RedisProtocolError("rate-limit backend timeout"));
        }, timeoutMs);
        timer.unref?.();
        let buffer = Buffer.alloc(0);
        const done = (finish: () => void): void => {
          clearTimeout(timer);
          finish();
        };
        socket.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          try {
            const parsed = parseRespReply(buffer);
            if (parsed.value !== undefined) {
              done(() =>
                parsed.value instanceof Error
                  ? reject(parsed.value)
                  : resolve(parsed.value),
              );
            }
          } catch (error) {
            done(() => reject(error));
          }
        });
        socket.once("error", (error) => {
          done(() => reject(error));
        });
        socket.once("close", () => {
          done(() => reject(new RedisProtocolError("redis connection closed")));
        });
      });
    } finally {
      socket.destroy();
    }
  }

  return Object.freeze({
    eval: (script, keys, args) => evalScript(script, keys, args),
  });
}
