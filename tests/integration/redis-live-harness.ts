import { connect, type Socket } from "node:net";

export const liveRedisUrl = process.env.CVG_TEST_REDIS_URL?.trim();
const runLiveRedisTests = process.env.CVG_RUN_LIVE_REDIS_TESTS === "true";

export const liveRedisEnabled =
  runLiveRedisTests && liveRedisUrl !== undefined && liveRedisUrl.length > 0;

export class RedisProtocolError extends Error {
  public override readonly name = "RedisProtocolError";
}

type ResolveReply = (reply: unknown) => void;
type RejectReply = (error: Error) => void;

function encodeBulk(value: string): string {
  const encoded = Buffer.byteLength(value);
  return `$${encoded}\r\n${value}\r\n`;
}

function encodeCommand(parts: readonly (string | number)[]): string {
  return `*${parts.length}\r\n${parts.map((part) => encodeBulk(String(part))).join("")}`;
}

/**
 * Minimal test-only RESP2 client: just enough to drive EVAL scripts and a
 * handful of control commands against a real Redis/Valkey. Not production code.
 */
export class TestRespClient {
  private readonly socket: Socket;
  private buffer = Buffer.alloc(0);
  private readonly pending: Array<{
    resolve: ResolveReply;
    reject: RejectReply;
  }> = [];
  private closed = false;

  private constructor(socket: Socket) {
    this.socket = socket;
    socket.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    socket.on("error", (error) => {
      while (this.pending.length > 0) {
        this.pending.shift()?.reject(error as Error);
      }
    });
    socket.on("close", () => {
      this.closed = true;
      while (this.pending.length > 0) {
        this.pending.shift()?.reject(new Error("redis connection closed"));
      }
    });
  }

  public static async connect(url: string): Promise<TestRespClient> {
    const parsed = new URL(url);
    const socket = connect({
      host: parsed.hostname === "" ? "127.0.0.1" : parsed.hostname,
      port: parsed.port === "" ? 6379 : Number(parsed.port),
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("error", (error) => reject(error));
    });
    return new TestRespClient(socket);
  }

  private drain(): void {
    while (this.pending.length > 0) {
      const parsed = this.parseOne();
      if (parsed === null) return;
      const entry = this.pending.shift();
      if (parsed instanceof Error) entry?.reject(parsed);
      else entry?.resolve(parsed.value);
    }
  }

  private parseOne(): { value: unknown } | Error | null {
    const text = this.buffer.toString("utf8");
    const end = text.indexOf("\r\n");
    if (end === -1) return null;
    const head = text.slice(0, end);
    const kind = head[0];
    const rest = head.slice(1);
    if (kind === "+") {
      this.buffer = this.buffer.subarray(end + 2);
      return { value: rest };
    }
    if (kind === "-") {
      this.buffer = this.buffer.subarray(end + 2);
      return new RedisProtocolError(rest);
    }
    if (kind === ":") {
      this.buffer = this.buffer.subarray(end + 2);
      return { value: Number(rest) };
    }
    if (kind === "$") {
      const length = Number(rest);
      if (length === -1) {
        this.buffer = this.buffer.subarray(end + 2);
        return { value: null };
      }
      if (this.buffer.length < end + 2 + length + 2) return null;
      const value = this.buffer
        .subarray(end + 2, end + 2 + length)
        .toString("utf8");
      this.buffer = this.buffer.subarray(end + 2 + length + 2);
      return { value };
    }
    if (kind === "*") {
      const count = Number(rest);
      if (count === -1) {
        this.buffer = this.buffer.subarray(end + 2);
        return { value: null };
      }
      // Only flat arrays are needed; parse elements iteratively.
      let cursor = end + 2;
      const items: unknown[] = [];
      const saved = this.buffer;
      for (let index = 0; index < count; index += 1) {
        const sub = TestRespClient.parseAt(saved.subarray(cursor));
        if (sub === null) return null;
        if (sub instanceof Error) return sub;
        items.push(sub.value);
        cursor += sub.next;
      }
      this.buffer = saved.subarray(cursor);
      return { value: items };
    }
    return new RedisProtocolError(`unexpected reply prefix: ${kind}`);
  }

  private static parseAt(
    buffer: Buffer,
  ): { value: unknown; next: number } | Error | null {
    const text = buffer.toString("utf8");
    const end = text.indexOf("\r\n");
    if (end === -1) return null;
    const head = text.slice(0, end);
    if (head.startsWith(":")) {
      return { value: Number(head.slice(1)), next: end + 2 };
    }
    if (head.startsWith("+")) {
      return { value: head.slice(1), next: end + 2 };
    }
    if (head.startsWith("-")) {
      return new RedisProtocolError(head.slice(1));
    }
    if (head.startsWith("$")) {
      const length = Number(head.slice(1));
      if (length === -1) return { value: null, next: end + 2 };
      if (buffer.length < end + 2 + length + 2) return null;
      return {
        value: buffer.subarray(end + 2, end + 2 + length).toString("utf8"),
        next: end + 2 + length + 2,
      };
    }
    return new RedisProtocolError(`unexpected nested prefix: ${head[0]}`);
  }

  public command(
    parts: readonly (string | number)[],
    timeoutMs = 5000,
  ): Promise<unknown> {
    if (this.closed)
      return Promise.reject(new Error("redis connection closed"));
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.pending.findIndex(
          (entry) => entry.resolve === resolve,
        );
        if (index !== -1) this.pending.splice(index, 1);
        reject(new Error("redis command timeout"));
      }, timeoutMs);
      timer.unref?.();
      this.pending.push({
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.socket.write(encodeCommand(parts));
    });
  }

  public eval(
    script: string,
    keys: readonly string[],
    args: readonly (string | number)[],
  ): Promise<unknown> {
    return this.command(["EVAL", script, keys.length, ...keys, ...args]);
  }

  public async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.socket.end(() => resolve());
    });
  }
}
