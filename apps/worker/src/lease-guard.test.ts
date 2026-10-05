import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutboxRepositoryPort } from "@cvg/persistence";
import {
  guardWorkerEffect,
  withWorkerLease,
  WorkerLeaseLostError,
} from "./lease-guard.js";

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("not initialized");
  };
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function repository(): OutboxRepositoryPort {
  return {
    claim: async () => [],
    markProcessed: async () => true,
    markFailed: async () => true,
    renewLease: async () => true,
    withLeaseFence: async (_id, _token, _seconds, work) => ({
      owned: true,
      value: await work(),
    }),
  };
}
afterEach(() => {
  vi.useRealTimers();
});
describe("worker lease guard", () => {
  it("rejects a renewal that loses ownership while the handler is finishing", async () => {
    vi.useFakeTimers();
    const renewal = deferred<boolean>();
    const handler = deferred<void>();
    const repo = {
      ...repository(),
      renewLease: vi.fn(async () => renewal.promise),
    };
    const pending = withWorkerLease(
      repo,
      "event",
      "token",
      1,
      async () => handler.promise,
    );
    // Attach the rejection assertion before settling the asynchronous guard.
    const result = expect(pending).rejects.toBeInstanceOf(WorkerLeaseLostError);
    await vi.advanceTimersByTimeAsync(334);
    expect(repo.renewLease).toHaveBeenCalledTimes(1);
    handler.resolve();
    await vi.advanceTimersByTimeAsync(0);
    renewal.resolve(false);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, "error"] as const)(
    "denies a resumed effect after renewal %s",
    async (outcome) => {
      vi.useFakeTimers();
      const handler = deferred<void>();
      const effect = vi.fn(async () => {});
      const repo = {
        ...repository(),
        renewLease: async () => {
          if (outcome === "error") throw new Error("database unavailable");
          return false;
        },
      };
      const pending = withWorkerLease(repo, "event", "token", 1, async () => {
        await handler.promise;
        await guardWorkerEffect(effect);
      });
      const result =
        expect(pending).rejects.toBeInstanceOf(WorkerLeaseLostError);
      await vi.advanceTimersByTimeAsync(334);
      handler.resolve();
      await result;
      expect(effect).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("permits a current owner and clears its heartbeat after a failing handler", async () => {
    vi.useFakeTimers();
    const effect = vi.fn(async () => {});
    await withWorkerLease(repository(), "event", "token", 1, async () =>
      guardWorkerEffect(effect),
    );
    expect(effect).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await expect(
      withWorkerLease(repository(), "event", "token", 1, async () => {
        throw new Error("synthetic handler failure");
      }),
    ).rejects.toThrow("synthetic handler failure");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("requires configured fencing before entering the handler", async () => {
    const configured = repository();
    const unconfigured: OutboxRepositoryPort = {
      claim: configured.claim,
      markProcessed: configured.markProcessed,
      markFailed: configured.markFailed,
    };
    const handler = vi.fn(async () => {});
    await expect(
      withWorkerLease(unconfigured, "event", "token", 1, handler),
    ).rejects.toBeInstanceOf(WorkerLeaseLostError);
    expect(handler).not.toHaveBeenCalled();
  });
});
