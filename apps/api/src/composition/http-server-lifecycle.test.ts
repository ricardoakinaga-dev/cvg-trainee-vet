import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { BatchSpanProcessor, createTracer } from "@cvg/observability";
import { createHttpServerLifecycle } from "./http-server-lifecycle.js";

describe("HTTP network drain before owned telemetry closure", () => {
  it("observes an already-running export within the existing budget without cancelling it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let release!: () => void;
    let enter!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    let exported = false;
    const processor = new BatchSpanProcessor({
      export: async () => {
        enter();
        await held;
        exported = true;
      },
    });
    const tracer = createTracer({
      onEnd: (span) => {
        void processor.onEnd(span);
      },
    });
    tracer.startSpan("last-inflight").end();
    const exporting = processor.flush();
    await entered;
    const lifecycle = createHttpServerLifecycle(
      createServer(),
      "127.0.0.1",
      0,
      () => processor.close(),
    );
    let closed = false;
    const closing = lifecycle.close().then(() => {
      closed = true;
    });
    try {
      await vi.advanceTimersByTimeAsync(1999);
      expect(closed).toBe(false);
      expect(exported).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await closing;
      expect(closed).toBe(true);
      expect(exported).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      release();
      await exporting;
      expect(exported).toBe(true);
    } finally {
      release();
      await Promise.all([exporting, closing]);
      vi.useRealTimers();
    }
  });
  it("detaches only owned callbacks when listen throws synchronously", async () => {
    const server = createServer();
    const unrelatedError = vi.fn();
    const unrelatedListening = vi.fn();
    server.on("error", unrelatedError);
    server.on("listening", unrelatedListening);
    const existingErrors = server.listeners("error");
    const existingListening = server.listeners("listening");
    const lifecycle = createHttpServerLifecycle(
      server,
      "127.0.0.1",
      -1,
      async () => undefined,
    );
    try {
      await expect(lifecycle.listen()).rejects.toBeInstanceOf(RangeError);
      await lifecycle.close();
      expect(server.listeners("error")).toEqual(existingErrors);
      expect(server.listeners("listening")).toEqual(existingListening);
      expect(unrelatedError).not.toHaveBeenCalled();
      expect(unrelatedListening).not.toHaveBeenCalled();
    } finally {
      server.off("error", unrelatedError);
      server.off("listening", unrelatedListening);
    }
  });
  it("finishes an admitted request before telemetry and rejects reopening", async () => {
    let release!: () => void;
    let admitted!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      admitted = resolve;
    });
    const order: string[] = [];
    const server = createServer(async (_request, response) => {
      admitted();
      await gate;
      order.push("request finished");
      response.end("complete");
    });
    const flush = vi.fn(async () => {
      order.push("telemetry closed");
    });
    const lifecycle = createHttpServerLifecycle(server, "127.0.0.1", 0, flush);
    await lifecycle.listen();
    const address = server.address() as AddressInfo;
    const request = fetch(`http://127.0.0.1:${address.port}`);
    await entered;
    const first = lifecycle.close();
    const second = lifecycle.close();
    try {
      expect(first).toBe(second);
      expect(lifecycle.isClosing()).toBe(true);
      expect(flush).not.toHaveBeenCalled();
      await expect(lifecycle.listen()).rejects.toThrow(/closing/u);
      release();
      expect(await (await request).text()).toBe("complete");
      await first;
      expect(order).toEqual(["request finished", "telemetry closed"]);
      expect(flush).toHaveBeenCalledTimes(1);
      expect(server.address()).toBeNull();
    } finally {
      release();
      await Promise.allSettled([first, second, request]);
    }
  });
  it("waits a previously admitted bind and closes its listener", async () => {
    const server = createServer((_request, response) => response.end("unused"));
    const flush = vi.fn(async () => undefined);
    const lifecycle = createHttpServerLifecycle(server, "127.0.0.1", 0, flush);
    const listening = lifecycle.listen();
    const closing = lifecycle.close();
    await listening;
    await closing;
    expect(server.address()).toBeNull();
    expect(flush).toHaveBeenCalledTimes(1);
    await expect(lifecycle.listen()).rejects.toThrow(/closing/u);
  });
  it("never binds when closed before first listen", async () => {
    const server = createServer();
    const flush = vi.fn(async () => undefined);
    const lifecycle = createHttpServerLifecycle(server, "127.0.0.1", 0, flush);
    await lifecycle.close();
    await expect(lifecycle.listen()).rejects.toThrow(/closing/u);
    expect(server.address()).toBeNull();
    expect(flush).toHaveBeenCalledTimes(1);
  });
  it("releases bind listeners and telemetry after an occupied-port failure", async () => {
    const occupied = createServer();
    await new Promise<void>((resolve) =>
      occupied.listen(0, "127.0.0.1", resolve),
    );
    const server = createServer();
    const flush = vi.fn(async () => undefined);
    const lifecycle = createHttpServerLifecycle(
      server,
      "127.0.0.1",
      (occupied.address() as AddressInfo).port,
      flush,
    );
    const existingListeningListeners = server.listenerCount("listening");
    try {
      await expect(lifecycle.listen()).rejects.toMatchObject({
        code: "EADDRINUSE",
      });
      await lifecycle.close();
      expect(server.listenerCount("listening")).toBe(
        existingListeningListeners,
      );
      expect(flush).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  });
  it("uses the existing two-second telemetry budget without shortening request drain", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const server = createServer();
    const flush = vi.fn(() => new Promise<void>(() => undefined));
    const lifecycle = createHttpServerLifecycle(server, "127.0.0.1", 0, flush);
    let complete = false;
    const closing = lifecycle.close().then(() => {
      complete = true;
    });
    try {
      await vi.advanceTimersByTimeAsync(1999);
      expect(complete).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await closing;
      expect(complete).toBe(true);
      expect(flush).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("telemetry failure remains best effort and does not reopen network admission", async () => {
    const server = createServer();
    const flush = vi.fn(async () => {
      throw new Error("synthetic exporter unavailable");
    });
    const lifecycle = createHttpServerLifecycle(server, "127.0.0.1", 0, flush);
    await expect(lifecycle.close()).resolves.toBeUndefined();
    await expect(lifecycle.listen()).rejects.toThrow(/closing/u);
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
