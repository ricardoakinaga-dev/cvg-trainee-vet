import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  toLogContext,
  type RequestContextInput,
} from "./request-context.js";

const BASE_INPUT: RequestContextInput = {
  method: "POST",
  route: "/api/v1/attempts/:attemptId/submit",
  principal: {
    principalId: "participant-1",
    roles: ["PARTICIPANT"],
    scopes: ["scope-1"],
    accountStatus: "ACTIVE",
  },
  clientIp: "10.0.0.8",
};

describe("request context", () => {
  it("builds a frozen typed context with generated ids by default", () => {
    let counter = 0;
    const context = createRequestContext(BASE_INPUT, {
      idFactory: () => `request-${(counter += 1)}`,
      clock: () => 1_700_000_000_000,
    });

    expect(context.requestId).toBe("request-1");
    expect(context.correlationId).toBe("request-1");
    expect(context.method).toBe("POST");
    expect(context.route).toBe("/api/v1/attempts/:attemptId/submit");
    expect(context.principal?.principalId).toBe("participant-1");
    expect(context.clientIp).toBe("10.0.0.8");
    expect(context.startedAtMs).toBe(1_700_000_000_000);
    expect(context.deadlineMs).toBeGreaterThan(context.startedAtMs);
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("prefers an explicit valid correlation id and ignores invalid ones", () => {
    const explicit = createRequestContext(
      { ...BASE_INPUT, correlationId: "trace-abc.123" },
      { idFactory: () => "request-9", clock: () => 0 },
    );
    expect(explicit.correlationId).toBe("trace-abc.123");

    const invalid = createRequestContext(
      { ...BASE_INPUT, correlationId: "has spaces; and\ttabs" },
      { idFactory: () => "request-9", clock: () => 0 },
    );
    expect(invalid.correlationId).toBe("request-9");
  });

  it("supports anonymous contexts without a principal", () => {
    const context = createRequestContext(
      { method: "GET", route: "/health/live" },
      { idFactory: () => "request-1", clock: () => 0 },
    );
    expect(context.principal).toBeNull();
    expect(toLogContext(context).authenticated).toBe(false);
  });

  it("never exposes identity, network or clinical payload in log context", () => {
    const context = createRequestContext(
      {
        ...BASE_INPUT,
        clientIp: "10.0.0.8",
        body: {
          pass: "s3cr3t",
          answers: [{ itemId: "i-1", value: "clinical payload" }],
        },
      },
      { idFactory: () => "request-2", clock: () => 0 },
    );
    const logged = JSON.stringify(toLogContext(context));
    expect(logged).not.toContain("participant-1");
    expect(logged).not.toContain("10.0.0.8");
    expect(logged).not.toContain("s3cr3t");
    expect(logged).not.toContain("clinical payload");
    expect(toLogContext(context).authenticated).toBe(true);
  });

  it("rejects invalid method, route and deadline inputs fail-closed", () => {
    expect(() =>
      createRequestContext(
        { ...BASE_INPUT, method: "QUERY" },
        { idFactory: () => "request-1", clock: () => 0 },
      ),
    ).toThrow("method");
    expect(() =>
      createRequestContext(
        { ...BASE_INPUT, route: "not-a-route" },
        { idFactory: () => "request-1", clock: () => 0 },
      ),
    ).toThrow("route");
    expect(() =>
      createRequestContext(
        { ...BASE_INPUT, timeoutMs: 0 },
        { idFactory: () => "request-1", clock: () => 0 },
      ),
    ).toThrow("timeoutMs");
  });
});
