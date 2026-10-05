import { describe, expect, it, vi } from "vitest";
import { createStagingOwnedLifecycle } from "../../scripts/staging-owned-lifecycle.mjs";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("owned staging resource lifecycle (IO doubles, no provider certification)", () => {
  it("stops only registered resources in reverse acquisition order", async () => {
    const owner = createStagingOwnedLifecycle();
    const order: string[] = [];
    owner.own(async () => {
      order.push("pg");
    });
    owner.own(async () => {
      order.push("redis");
    });
    await owner.close();
    expect(order).toEqual(["redis", "pg"]);
  });
  it("shares one close and refuses further admission", async () => {
    const owner = createStagingOwnedLifecycle();
    const stop = vi.fn(async () => undefined);
    owner.own(stop);
    const first = owner.close();
    expect(owner.close()).toBe(first);
    expect(() => owner.assertActive()).toThrow(/closing/i);
    await expect(owner.run(async () => undefined)).rejects.toThrow(/closing/i);
    await first;
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it("awaits admitted work before closing its adapters", async () => {
    const owner = createStagingOwnedLifecycle();
    const gate = deferred<void>();
    const stop = vi.fn(async () => undefined);
    owner.own(stop);
    const work = owner.run(() => gate.promise);
    const closing = owner.close();
    await Promise.resolve();
    expect(stop).not.toHaveBeenCalled();
    gate.resolve();
    await work;
    await closing;
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it("owns a resource whose pending acquisition resolves after shutdown", async () => {
    const owner = createStagingOwnedLifecycle();
    const gate = deferred<{ id: string }>();
    const stop = vi.fn(async (_resource: { id: string }) => undefined);
    const acquiring = owner.acquire(() => gate.promise, stop);
    await Promise.resolve();
    const closing = owner.close();
    gate.resolve({ id: "owned-pg" });
    await acquiring;
    await closing;
    expect(stop).toHaveBeenCalledExactlyOnceWith({ id: "owned-pg" });
  });
  it("retains primary work failure while allowing every cleanup", async () => {
    const owner = createStagingOwnedLifecycle();
    const failure = new Error("owned synthetic startup failure");
    const stop = vi.fn(async () => undefined);
    owner.own(stop);
    await expect(
      owner.run(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    await owner.close();
    expect(stop).toHaveBeenCalledTimes(1);
  });
  it("continues other cleanups after a disposal failure and reports failure", async () => {
    const owner = createStagingOwnedLifecycle();
    const stopPg = vi.fn(async () => undefined);
    owner.own(stopPg);
    owner.own(async () => {
      throw new Error("synthetic disposal failure");
    });
    await expect(owner.close()).rejects.toBeInstanceOf(AggregateError);
    expect(stopPg).toHaveBeenCalledTimes(1);
  });
  it("never invokes an acquisition after shutdown", async () => {
    const owner = createStagingOwnedLifecycle();
    const factory = vi.fn(async () => ({ id: "new" }));
    await owner.close();
    await expect(owner.acquire(factory, async () => undefined)).rejects.toThrow(
      /closing/i,
    );
    expect(factory).not.toHaveBeenCalled();
  });
});
