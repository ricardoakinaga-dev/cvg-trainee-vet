import { describe, expect, it, vi } from "vitest";

import {
  normalizeDatabaseSecurityContext,
  resolveParticipantActivityScope,
  setDatabaseAppealReviewContext,
  setDatabaseAccountProvisioningContext,
  setDatabaseSecurityContext,
  setDatabaseSessionSecurityContext,
  setDatabaseTokenSecurityContext,
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

  it("maps the participant activity scope oracle and fails closed on malformed results", async () => {
    const execute = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce([{ scopeId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ scopeId });

    await expect(
      resolveParticipantActivityScope(
        { execute },
        "33333333-3333-4333-8333-333333333333",
        participantId,
      ),
    ).resolves.toBe(scopeId);
    await expect(
      resolveParticipantActivityScope(
        { execute },
        "33333333-3333-4333-8333-333333333333",
        participantId,
      ),
    ).resolves.toBeNull();
    await expect(
      resolveParticipantActivityScope(
        { execute },
        "33333333-3333-4333-8333-333333333333",
        participantId,
      ),
    ).resolves.toBeNull();
  });

  it("sets a dedicated reviewer scope context without participant identity", async () => {
    const execute = vi.fn(async () => []);

    await setDatabaseAppealReviewContext({ execute }, { scopeId });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("sets invitation and recovery token context only for valid hashes", async () => {
    const execute = vi.fn(async () => []);
    const tokenHash = "a".repeat(64);

    await setDatabaseTokenSecurityContext(
      { execute },
      {
        kind: "invitation",
        tokenHash,
      },
    );
    await setDatabaseTokenSecurityContext(
      { execute },
      {
        kind: "recovery",
        tokenHash,
      },
    );

    expect(execute).toHaveBeenCalledTimes(2);
    await expect(
      setDatabaseTokenSecurityContext(
        { execute },
        {
          kind: "recovery",
          tokenHash: "short",
        },
      ),
    ).rejects.toThrow("tokenHash");
  });

  it("sets provisioning and session contexts with bounded values", async () => {
    const execute = vi.fn(async () => []);
    const tokenHash = "b".repeat(64);

    await setDatabaseAccountProvisioningContext(
      { execute },
      { accountId: participantId },
    );
    await setDatabaseSessionSecurityContext(
      { execute },
      { tokenHash, scopeId },
    );

    expect(execute).toHaveBeenCalledTimes(2);
    await expect(
      setDatabaseAccountProvisioningContext({ execute }, { accountId: " " }),
    ).rejects.toThrow("accountId");
    await expect(
      setDatabaseSessionSecurityContext({ execute }, { tokenHash: "short" }),
    ).rejects.toThrow("tokenHash");
  });
});
