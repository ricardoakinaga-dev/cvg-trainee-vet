import { describe, expect, it, vi } from "vitest";

import { createHttpRequestDrain } from "./http-request-drain.js";

const gate = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("HTTP actual callback ownership", () => {
  it("owns work before invocation and drains its completion", async () => {
    const hold = gate<string>();
    const drain = createHttpRequestDrain();
    const work = vi.fn(() => hold.promise);
    const operation = drain.track(work);
    let complete = false;
    const closing = drain.drain().then(() => {
      complete = true;
    });
    try {
      await tick();
      expect(work).toHaveBeenCalledTimes(1);
      expect(complete).toBe(false);
      hold.resolve("original-result");
      await expect(operation).resolves.toBe("original-result");
      await closing;
    } finally {
      hold.resolve("original-result");
      await Promise.allSettled([operation, closing]);
    }
  });

  it("observes every concurrent callback including a rejection without replacing it", async () => {
    const first = gate<void>();
    const last = gate<void>();
    const failure = new Error("synthetic callback failure");
    const drain = createHttpRequestDrain();
    const a = drain.track(() => first.promise);
    const b = drain.track(() => last.promise);
    const rejected = expect(b).rejects.toBe(failure);
    let complete = false;
    const closing = drain.drain().then(() => {
      complete = true;
    });
    try {
      first.resolve();
      await a;
      await tick();
      expect(complete).toBe(false);
      last.reject(failure);
      await rejected;
      await closing;
      expect(complete).toBe(true);
      await expect(drain.drain()).resolves.toBeUndefined();
    } finally {
      first.resolve();
      last.reject(failure);
      await Promise.allSettled([a, b, closing]);
      await rejected;
    }
  });

  it("retains synchronous callback failure and permits an empty drain", async () => {
    const failure = new Error("synthetic synchronous callback failure");
    const drain = createHttpRequestDrain();
    await expect(drain.drain()).resolves.toBeUndefined();
    const operation = drain.track(() => {
      throw failure;
    });
    await expect(operation).rejects.toBe(failure);
    await expect(drain.drain()).resolves.toBeUndefined();
  });

  it("references only an active drain and releases liveness on callback settlement", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const hold = gate<void>();
    const drain = createHttpRequestDrain();
    const operation = drain.track(() => hold.promise);
    expect(vi.getTimerCount()).toBe(0);
    let complete = false;
    const closing = drain.drain().then(() => {
      complete = true;
    });
    try {
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(complete).toBe(false);
      hold.resolve();
      await Promise.all([operation, closing]);
      expect(vi.getTimerCount()).toBe(0);
      await drain.drain();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      hold.resolve();
      await Promise.all([operation, closing]);
      vi.useRealTimers();
    }
  });

  it("observes callbacks registered by earlier work while draining", async () => {
    const hold = gate<void>();
    const entered = gate<void>();
    const drain = createHttpRequestDrain();
    const parent = drain.track(async () => {
      void drain.track(() => hold.promise);
      entered.resolve();
    });
    let complete = false;
    const closing = drain.drain().then(() => {
      complete = true;
    });
    try {
      await entered.promise;
      await parent;
      await tick();
      expect(complete).toBe(false);
      hold.resolve();
      await closing;
    } finally {
      hold.resolve();
      await closing;
    }
  });
});
