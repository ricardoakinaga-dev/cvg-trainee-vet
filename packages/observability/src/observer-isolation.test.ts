import { describe, expect, it, vi } from "vitest";

import { createObservability, type LogRecord } from "./observability.js";
import { isolateObservabilityWrites } from "./observer-isolation.js";

describe("observation writes do not control application outcome", () => {
  it.each(["debug", "info", "warn", "error"] as const)(
    "contains a failing %s log sink",
    (level) => {
      const source = createObservability({
        service: "test",
        minimumLevel: "debug",
        sink: () => {
          throw new Error("synthetic sink detail");
        },
      });
      const isolated = isolateObservabilityWrites(source);
      expect(() => isolated.logger[level]("test.event")).not.toThrow();
      expect(() =>
        isolated.logger.child({ requestId: "r39" })[level]("test.child"),
      ).not.toThrow();
    },
  );

  it.each(["increment", "observe"] as const)(
    "contains a failing %s metric writer",
    (method) => {
      const source = createObservability({
        service: "test",
        sink: () => undefined,
      });
      const fail = vi.fn(() => {
        throw new Error("synthetic metric detail");
      });
      const isolated = isolateObservabilityWrites({
        ...source,
        metrics: { ...source.metrics, [method]: fail },
      });
      expect(() => {
        if (method === "increment")
          isolated.metrics.increment("test.count", { outcome: "success" }, 2);
        else
          isolated.metrics.observe("test.duration", 42, { outcome: "success" });
      }).not.toThrow();
      expect(fail).toHaveBeenCalledOnce();
    },
  );

  it("preserves healthy records, redaction, context, counters and readers", () => {
    const records: LogRecord[] = [];
    const source = createObservability({
      service: "test",
      sink: (record) => records.push(record),
    });
    const isolated = isolateObservabilityWrites(source);
    isolated.logger.child({ requestId: "r39" }).info("test.ok", {
      fields: { outcome: "success", unknown: "synthetic hidden" },
    });
    isolated.metrics.increment("test.count", { outcome: "success" }, 2);
    isolated.metrics.observe("test.duration", 42);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      requestId: "r39",
      fields: { outcome: "success" },
    });
    expect(JSON.stringify(records)).not.toContain("synthetic hidden");
    expect(isolated.metrics.snapshot()).toEqual(source.metrics.snapshot());
    expect(isolated.metrics.prometheus()).toBe(source.metrics.prometheus());
  });

  it("does not let child-context construction suppress a later diagnostic", () => {
    const records: LogRecord[] = [];
    const source = createObservability({
      service: "test",
      sink: (record) => records.push(record),
    });
    const child = vi.fn(() => {
      throw new Error("synthetic child detail");
    });
    const isolated = isolateObservabilityWrites({
      ...source,
      logger: { ...source.logger, child },
    });
    expect(() =>
      isolated.logger.child({ requestId: "r39" }).error("test.failure"),
    ).not.toThrow();
    expect(child).toHaveBeenCalledOnce();
    expect(records).toHaveLength(1);
    expect(records[0]?.event).toBe("test.failure");
    expect(JSON.stringify(records)).not.toContain("synthetic child detail");
  });

  it("preserves reader failures rather than fabricating clean telemetry", () => {
    const source = createObservability({
      service: "test",
      sink: () => undefined,
    });
    const error = new Error("synthetic reader outage");
    const isolated = isolateObservabilityWrites({
      ...source,
      metrics: {
        ...source.metrics,
        snapshot: () => {
          throw error;
        },
        prometheus: () => {
          throw error;
        },
      },
    });
    expect(() => isolated.metrics.snapshot()).toThrow(error);
    expect(() => isolated.metrics.prometheus()).toThrow(error);
  });
});
