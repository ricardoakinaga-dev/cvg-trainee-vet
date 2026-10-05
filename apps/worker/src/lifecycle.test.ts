import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkerLifecycle } from "./lifecycle.js";

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

describe("worker lifecycle T23", () => {
  afterEach(() => vi.useRealTimers());

  it("drains all concurrently admitted callbacks including rejected work", async () => {
    const first = gate<number>();
    const second = gate<number>();
    const closeResources = vi.fn(async () => {});
    const stop = vi.fn();
    const lifecycle = createWorkerLifecycle(stop, closeResources);
    const success = lifecycle.admit(() => first.promise);
    const failure = lifecycle.admit(() => second.promise);
    const rejection = expect(failure).rejects.toThrow("synthetic failure");
    const closing = lifecycle.close();
    expect(lifecycle.isStopped()).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    await expect(lifecycle.admit(async () => 3)).rejects.toThrow(
      "worker is stopping",
    );
    first.resolve(1);
    expect(await success).toBe(1);
    await tick();
    expect(closeResources).not.toHaveBeenCalled();
    second.reject(new Error("synthetic failure"));
    await rejection;
    await closing;
    expect(closeResources).toHaveBeenCalledTimes(1);
  });

  it("retains one rejecting resource close for every repeat caller", async () => {
    const resources = gate<void>();
    const closeResources = vi.fn(() => resources.promise);
    const lifecycle = createWorkerLifecycle(() => {}, closeResources);
    const first = lifecycle.close();
    expect(lifecycle.close()).toBe(first);
    const rejection = expect(first).rejects.toThrow("synthetic close failure");
    resources.reject(new Error("synthetic close failure"));
    await rejection;
    expect(lifecycle.close()).toBe(first);
    expect(closeResources).toHaveBeenCalledTimes(1);
  });

  it("surfaces synchronous work errors and still closes resources", async () => {
    const closeResources = vi.fn(async () => {});
    const lifecycle = createWorkerLifecycle(() => {}, closeResources);
    await expect(
      lifecycle.admit(() => {
        throw new Error("synthetic synchronous failure");
      }),
    ).rejects.toThrow("synthetic synchronous failure");
    await lifecycle.close();
    expect(closeResources).toHaveBeenCalledTimes(1);
  });

  it("does not invent a global timeout or cancel an original blocked callback", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const work = gate<void>();
    const closeResources = vi.fn(async () => {});
    const lifecycle = createWorkerLifecycle(() => {}, closeResources);
    const operation = lifecycle.admit(() => work.promise);
    const closing = lifecycle.close();
    try {
      await vi.advanceTimersByTimeAsync(120_000);
      expect(closeResources).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      work.resolve();
      await Promise.all([operation, closing]);
    }
  });

  it("settles all idle waiters without waiting for the poll interval", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const lifecycle = createWorkerLifecycle(
      () => {},
      async () => {},
    );
    const waiters = [lifecycle.waitForPoll(), lifecycle.waitForPoll()];
    expect(vi.getTimerCount()).toBe(2);
    await lifecycle.close();
    await Promise.all(waiters);
    await lifecycle.waitForPoll();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles the ordinary poll interval and permits further admission", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const lifecycle = createWorkerLifecycle(
      () => {},
      async () => {},
    );
    const waiting = lifecycle.waitForPoll();
    await vi.advanceTimersByTimeAsync(1000);
    await waiting;
    expect(await lifecycle.admit(async () => 1)).toBe(1);
    await lifecycle.close();
    expect(vi.getTimerCount()).toBe(0);
  });
});
