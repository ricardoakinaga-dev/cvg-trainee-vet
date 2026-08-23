import { describe, expect, it, vi } from "vitest";

import {
  changeAccountStatus,
  resendAccountInvitation,
  type AccountManagementRepositoryPort,
} from "./account-management-use-cases.js";

const admin = {
  principalId: "11111111-1111-4111-8111-111111111111",
  accountStatus: "ACTIVE" as const,
  roles: ["ADMIN"] as const,
  scopes: ["22222222-2222-4222-8222-222222222222"] as const,
  targetAccountId: "33333333-3333-4333-8333-333333333333",
  scopeId: "22222222-2222-4222-8222-222222222222",
  expectedStatus: "ACTIVE" as const,
  correlationId: "44444444-4444-4444-8444-444444444444",
};

function repository(
  overrides: Partial<AccountManagementRepositoryPort> = {},
): AccountManagementRepositoryPort {
  return {
    changeStatus: vi.fn(async () => ({
      accountId: admin.targetAccountId,
      status: "SUSPENDED" as const,
      revokedSessions: 2,
    })),
    resendInvitation: vi.fn(async () => ({
      accountId: admin.targetAccountId,
      professionalEmail: "vet@example.invalid",
      expiresAt: new Date("2026-08-23T13:00:00.000Z"),
    })),
    ...overrides,
  };
}

describe("account management use cases", () => {
  it("changes status only with an active scoped administrator", async () => {
    const repo = repository();
    await expect(
      changeAccountStatus(
        {
          ...admin,
          status: "SUSPENDED",
          now: new Date("2026-08-23T12:00:00.000Z"),
        },
        {
          repository: repo,
          idFactory: () => "55555555-5555-4555-8555-555555555555",
        },
      ),
    ).resolves.toMatchObject({ status: "SUSPENDED", revokedSessions: 2 });
    expect(repo.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountId: admin.targetAccountId,
        scopeId: admin.scopeId,
        status: "SUSPENDED",
        audit: expect.objectContaining({
          action: "account.status.changed",
          resourceId: admin.targetAccountId,
        }),
      }),
    );
  });

  it("fails closed for out-of-scope, inactive or self-management", async () => {
    const repo = repository();
    const deps = {
      repository: repo,
      idFactory: () => "55555555-5555-4555-8555-555555555555",
    };
    await expect(
      changeAccountStatus(
        {
          ...admin,
          scopeId: "66666666-6666-4666-8666-666666666666",
          status: "ACTIVE",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      changeAccountStatus(
        { ...admin, accountStatus: "SUSPENDED", status: "ACTIVE" },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      changeAccountStatus(
        { ...admin, targetAccountId: admin.principalId, status: "DEACTIVATED" },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(repo.changeStatus).not.toHaveBeenCalled();
  });

  it("resends a bounded one-time invitation without exposing its hash", async () => {
    const repo = repository();
    const result = await resendAccountInvitation(
      {
        ...admin,
        expiresInSeconds: 3600,
        now: new Date("2026-08-23T12:00:00.000Z"),
        tokenFactory: () => "a".repeat(32),
        invitationIdFactory: () => "77777777-7777-4777-8777-777777777777",
      },
      {
        repository: repo,
        idFactory: () => "55555555-5555-4555-8555-555555555555",
      },
    );
    expect(result).toMatchObject({
      invitationId: "77777777-7777-4777-8777-777777777777",
      professionalEmail: "vet@example.invalid",
      token: "a".repeat(32),
    });
    expect(JSON.stringify(result)).not.toContain("tokenHash");
    expect(repo.resendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
        invitationId: "77777777-7777-4777-8777-777777777777",
        audit: expect.objectContaining({ action: "account.invitation.resent" }),
      }),
    );
  });

  it("maps missing account and repository conflicts to public application errors", async () => {
    const deps = {
      repository: repository({
        changeStatus: vi.fn(async () => null),
        resendInvitation: vi.fn(async () => null),
      }),
      idFactory: () => "55555555-5555-4555-8555-555555555555",
    };
    await expect(
      changeAccountStatus({ ...admin, status: "ACTIVE" }, deps),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      resendAccountInvitation({ ...admin, expiresInSeconds: 3600 }, deps),
    ).rejects.toMatchObject({ code: "not_found" });
    const conflict = repository({
      changeStatus: vi.fn(async () => {
        const error = new Error("conflict");
        error.name = "AccountManagementConflict";
        throw error;
      }),
    });
    await expect(
      changeAccountStatus(
        { ...admin, status: "DEACTIVATED" },
        {
          repository: conflict,
          idFactory: () => "55555555-5555-4555-8555-555555555555",
        },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("rejects malformed lifecycle commands before persistence", async () => {
    const deps = {
      repository: repository(),
      idFactory: () => "55555555-5555-4555-8555-555555555555",
    };
    await expect(
      changeAccountStatus(
        { ...admin, principalId: " ", status: "SUSPENDED" },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      changeAccountStatus(
        {
          ...admin,
          expectedStatus: "UNKNOWN" as never,
          status: "SUSPENDED",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      changeAccountStatus(
        {
          ...admin,
          status: "UNKNOWN" as never,
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      changeAccountStatus(
        {
          ...admin,
          status: "SUSPENDED",
          now: new Date("invalid"),
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      resendAccountInvitation({ ...admin, expiresInSeconds: 59 }, deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      resendAccountInvitation(
        {
          ...admin,
          expiresInSeconds: 3600,
          tokenFactory: () => "short",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      resendAccountInvitation(
        { ...admin, expiresInSeconds: 3600, now: new Date("invalid") },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const genericFailure = repository({
      changeStatus: vi.fn(async () => {
        throw new Error("database unavailable");
      }),
    });
    await expect(
      changeAccountStatus(
        { ...admin, status: "SUSPENDED" },
        {
          repository: genericFailure,
          idFactory: () => "55555555-5555-4555-8555-555555555555",
        },
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});
