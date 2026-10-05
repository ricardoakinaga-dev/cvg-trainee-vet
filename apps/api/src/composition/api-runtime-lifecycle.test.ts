import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  createApiRuntimeLifecycle,
  startApiRuntime,
  apiRuntimeFailureDiagnostic,
} from "./api-runtime-lifecycle.js";

it.each(["EADDRINUSE", "EADDRNOTAVAIL", "EACCES"])(
  "R26 classifies native %s without serializing arbitrary error details",
  (code) => {
    const error = Object.assign(new Error("private synthetic details"), {
      code,
      sensitive: "opaque synthetic metadata",
    });
    const event = apiRuntimeFailureDiagnostic(error);
    expect(event).toEqual({
      component: "api",
      event: "api.runtime.failed",
      error_code: code,
    });
    expect(JSON.stringify(event)).not.toContain(error.message);
    expect(JSON.stringify(event)).not.toContain(error.sensitive);
  },
);
it.each([
  undefined,
  null,
  "private synthetic details",
  { code: "private synthetic details" },
  { code: "EADDRINUSE\nsynthetic injection" },
  { code: 1 },
  new Error("private synthetic details"),
])(
  "R26 uses a redacted generic category for unrecognized failure %j",
  (error) => {
    expect(apiRuntimeFailureDiagnostic(error)).toEqual({
      component: "api",
      event: "api.runtime.failed",
      error_code: "UNCLASSIFIED_RUNTIME_FAILURE",
    });
  },
);
it("R26 diagnostic cannot itself fail on an unsafe code getter", () => {
  const error = Object.defineProperty({}, "code", {
    get() {
      throw new Error("synthetic accessor failure");
    },
  });
  expect(apiRuntimeFailureDiagnostic(error).error_code).toBe(
    "UNCLASSIFIED_RUNTIME_FAILURE",
  );
});

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function ports() {
  return {
    listen: vi.fn(async (): Promise<void> => undefined),
    beginInitialization: vi.fn(),
    cancelInitialization: vi.fn(),
    awaitInitialization: vi.fn(async (): Promise<void> => undefined),
    closeServer: vi.fn(async (): Promise<void> => undefined),
    closeIntegrations: vi.fn(async (): Promise<void> => undefined),
  };
}

describe("API owned runtime lifecycle", () => {
  it("shares one close and refuses startup after shutdown begins", async () => {
    const io = ports();
    const drain = gate();
    io.closeServer.mockImplementation(() => drain.promise);
    const runtime = createApiRuntimeLifecycle(io);
    const first = runtime.close();
    const second = runtime.close();
    try {
      expect(first).toBe(second);
      await expect(runtime.listen()).rejects.toThrow(/closing/u);
      expect(io.listen).not.toHaveBeenCalled();
      expect(io.closeIntegrations).not.toHaveBeenCalled();
    } finally {
      drain.release();
      await Promise.allSettled([first, second]);
    }
    expect(io.closeServer).toHaveBeenCalledTimes(1);
    expect(io.closeIntegrations).toHaveBeenCalledTimes(1);
  });
  it("waits admitted startup and initialization before releasing adapters", async () => {
    const io = ports();
    const admission = gate();
    const initialization = gate();
    io.listen.mockImplementation(() => admission.promise);
    io.awaitInitialization.mockImplementation(() => initialization.promise);
    const runtime = createApiRuntimeLifecycle(io);
    const starting = runtime.listen();
    const settled = starting.catch(() => undefined);
    const closing = runtime.close();
    await Promise.resolve();
    expect(io.closeServer).not.toHaveBeenCalled();
    admission.release();
    await settled;
    expect(io.beginInitialization).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(io.closeIntegrations).not.toHaveBeenCalled();
    initialization.release();
    await closing;
    expect(io.closeIntegrations).toHaveBeenCalledTimes(1);
  });
  it("successful startup begins optional initialization exactly once", async () => {
    const io = ports();
    const runtime = createApiRuntimeLifecycle(io);
    await Promise.all([runtime.listen(), runtime.listen()]);
    expect(io.listen).toHaveBeenCalledTimes(1);
    expect(io.beginInitialization).toHaveBeenCalledTimes(1);
    await runtime.close();
  });
  it.each(["SIGTERM", "SIGINT"] as const)(
    "repeated %s retains one close until completion",
    async (signal) => {
      const io = ports();
      const drain = gate();
      io.closeServer.mockImplementation(() => drain.promise);
      const runtime = createApiRuntimeLifecycle(io);
      const events = new EventEmitter();
      const failure = vi.fn();
      await startApiRuntime(runtime, events, failure);
      events.emit(signal);
      events.emit(signal);
      events.emit(signal === "SIGTERM" ? "SIGINT" : "SIGTERM");
      await Promise.resolve();
      expect(io.cancelInitialization).toHaveBeenCalledTimes(1);
      drain.release();
      await runtime.close();
      await Promise.resolve();
      expect(io.closeServer).toHaveBeenCalledTimes(1);
      expect(failure).not.toHaveBeenCalled();
      expect(events.listenerCount("SIGTERM")).toBe(0);
      expect(events.listenerCount("SIGINT")).toBe(0);
    },
  );
  it("failed startup drains owned resources and removes signal listeners", async () => {
    const io = ports();
    io.listen.mockRejectedValue(new Error("bind failed"));
    const runtime = createApiRuntimeLifecycle(io);
    const events = new EventEmitter();
    const failure = vi.fn();
    await startApiRuntime(runtime, events, failure);
    expect(failure).toHaveBeenCalledTimes(1);
    expect(io.closeIntegrations).toHaveBeenCalledTimes(1);
    expect(events.listenerCount("SIGTERM")).toBe(0);
  });
  it("finishes admitted initialization callbacks before adapter release", async () => {
    const io = ports();
    const init = gate();
    const order: string[] = [];
    io.awaitInitialization.mockImplementation(async () => {
      await init.promise;
      order.push("initialization settled");
    });
    io.closeServer.mockImplementation(async () => {
      order.push("network drained");
    });
    io.closeIntegrations.mockImplementation(async () => {
      order.push("adapters closed");
    });
    const runtime = createApiRuntimeLifecycle(io);
    await runtime.listen();
    const closing = runtime.close();
    await Promise.resolve();
    await Promise.resolve();
    expect(io.closeIntegrations).not.toHaveBeenCalled();
    init.release();
    await closing;
    expect(order).toEqual([
      "network drained",
      "initialization settled",
      "adapters closed",
    ]);
  });
  it("retains a failed drain and never closes adapters under live work", async () => {
    const io = ports();
    io.closeServer.mockRejectedValue(new Error("synthetic drain failed"));
    const runtime = createApiRuntimeLifecycle(io);
    const first = runtime.close();
    await expect(first).rejects.toThrow("synthetic drain failed");
    expect(runtime.close()).toBe(first);
    expect(io.closeServer).toHaveBeenCalledTimes(1);
    expect(io.closeIntegrations).not.toHaveBeenCalled();
  });
  it("reports signal teardown failure and removes its owned listeners", async () => {
    const events = new EventEmitter();
    const failure = vi.fn();
    const runtime = {
      listen: async () => undefined,
      close: vi.fn(async () => {
        throw new Error("synthetic shutdown failed");
      }),
    };
    await startApiRuntime(runtime, events, failure);
    events.emit("SIGTERM");
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(failure).toHaveBeenCalledTimes(1);
    expect(runtime.close).toHaveBeenCalledTimes(1);
    expect(events.listenerCount("SIGTERM")).toBe(0);
    expect(events.listenerCount("SIGINT")).toBe(0);
  });
});
