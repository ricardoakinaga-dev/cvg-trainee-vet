import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import {
  normalizeDatabaseSecurityContext,
  normalizeDatabaseServiceContext,
  resolveParticipantActivityScope,
  setDatabaseAppealReviewContext,
  setDatabaseAccountProvisioningContext,
  setDatabaseAuditReadContext,
  setDatabaseSecurityContext,
  setDatabaseServiceContext,
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

  it("accepts the content-indexer service identity without participant or scope", () => {
    const input = { serviceRole: "content-indexer" } as const;
    const normalized = normalizeDatabaseServiceContext(input);

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    expect(Object.isFrozen(normalized)).toBe(true);
  });

  it("rejects unknown service identities instead of widening access", () => {
    const hostile = { serviceRole: "super-reader" } as unknown as {
      serviceRole: "content-indexer";
    };
    const blank = { serviceRole: " " } as unknown as {
      serviceRole: "content-indexer";
    };
    expect(() => normalizeDatabaseServiceContext(hostile)).toThrow(
      "serviceRole",
    );
    expect(() => normalizeDatabaseServiceContext(blank)).toThrow("serviceRole");
  });

  it("sets the service identity through a transaction-local SQL command", async () => {
    let seen: unknown;
    const execute = vi.fn(async (query: unknown) => {
      seen = query;
      return [];
    });

    await setDatabaseServiceContext(
      { execute },
      { serviceRole: "content-indexer" },
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(seen ?? "")).toContain("cvg.service_role");
    expect(JSON.stringify(seen ?? "")).toContain("content-indexer");
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

describe("security context — uncovered guards (AAA-FINAL-002)", () => {
  it.each([
    [
      "participant",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseSecurityContext({ execute }, { participantId, scopeId }),
    ],
    [
      "service",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseServiceContext(
          { execute },
          { serviceRole: "content-indexer" },
        ),
    ],
    [
      "token",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseTokenSecurityContext(
          { execute },
          { kind: "invitation", tokenHash: "a".repeat(64) },
        ),
    ],
    [
      "provision",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseAccountProvisioningContext(
          { execute },
          { accountId: participantId },
        ),
    ],
    [
      "session",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseSessionSecurityContext(
          { execute },
          { tokenHash: "b".repeat(64), scopeId },
        ),
    ],
    [
      "appeal",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseAppealReviewContext({ execute }, { scopeId }),
    ],
    [
      "audit",
      (execute: (query: SQL) => Promise<unknown>) =>
        setDatabaseAuditReadContext({ execute }, { scopeId }),
    ],
  ] as const)(
    "clears internal curriculum identity before entering %s context",
    async (_name, enter) => {
      const execute = vi.fn(async (_query: SQL) => []);
      await enter(execute);
      const command = JSON.stringify(execute.mock.calls[0]?.[0]);
      expect(command).toContain(
        "set_config('cvg.curriculum_activity_id', '', true)",
      );
      expect(command).toContain(
        "set_config('cvg.curriculum_attempt_id', '', true)",
      );
    },
  );

  it("branch=invalid-kind/risk=context-confusion: rejects unsupported token context kinds", async () => {
    const execute = vi.fn(async () => []);
    await expect(
      setDatabaseTokenSecurityContext({ execute }, {
        kind: "session",
        tokenHash: "a".repeat(64),
      } as never),
    ).rejects.toThrow("token context kind");
    expect(execute).not.toHaveBeenCalled();
  });
});
