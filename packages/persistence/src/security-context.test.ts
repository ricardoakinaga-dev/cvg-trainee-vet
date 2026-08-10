import { describe, expect, it, vi } from "vitest";

import {
  normalizeDatabaseSecurityContext,
  setDatabaseSecurityContext,
} from "./security-context.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

describe("database security context", () => {
  it("accepts participant and scope context without mutating the input", () => {
    const input = { participantId, scopeId } as const;
    const normalized = normalizeDatabaseSecurityContext(input);

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    expect(Object.isFrozen(normalized)).toBe(true);
  });

  it("rejects an empty context instead of creating an unrestricted transaction", () => {
    expect(() => normalizeDatabaseSecurityContext({})).toThrow(
      "security context",
    );
    expect(() =>
      normalizeDatabaseSecurityContext({ participantId: " " }),
    ).toThrow("participantId");
  });

  it("sets context only through a transaction-local SQL command", async () => {
    const execute = vi.fn(async () => []);

    await setDatabaseSecurityContext({ execute }, { participantId, scopeId });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
