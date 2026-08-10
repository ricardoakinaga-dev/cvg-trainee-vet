import { describe, expect, it } from "vitest";

import {
  acceptInvitation,
  createInvitation,
  type InvitationRecord,
  type InvitationTransactionalOperations,
  type InvitationUseCaseDependencies,
} from "./invitation-use-cases.js";
import { ApplicationError } from "./errors.js";
import type { SessionRecord } from "./session.js";

function dependencies(): InvitationUseCaseDependencies & {
  readonly accounts: string[];
  readonly invitations: InvitationRecord[];
  readonly sessions: SessionRecord[];
} {
  const accounts: string[] = [];
  const invitations: InvitationRecord[] = [];
  const sessions: SessionRecord[] = [];
  const operations: InvitationTransactionalOperations = {
    account: {
      createInvited: async ({ accountId }) => {
        accounts.push(accountId);
      },
      activate: async () => undefined,
    },
    invitation: {
      create: async (record) => {
        invitations.push(record);
      },
      findActive: async (hash, now) =>
        invitations.find(
          (invitation) =>
            invitation.tokenHash === hash &&
            invitation.acceptedAt === null &&
            invitation.expiresAt > now,
        ) ?? null,
      accept: async (invitationId, acceptedAt) => {
        const index = invitations.findIndex(
          (invitation) => invitation.invitationId === invitationId,
        );
        const current = invitations[index];
        if (current !== undefined) {
          invitations.splice(index, 1, { ...current, acceptedAt });
        }
      },
    },
    sessions: {
      create: async (record) => {
        sessions.push(record);
      },
      findActive: async () => null,
      revoke: async () => undefined,
    },
    audit: {
      append: async () => undefined,
    },
  };
  return {
    accounts,
    invitations,
    sessions,
    idFactory: () => "fallback-id",
    transaction: { run: async (work) => work(operations) },
  };
}

const admin = {
  principalId: "11111111-1111-4111-8111-111111111111",
  accountStatus: "ACTIVE" as const,
  roles: ["ADMIN"] as const,
  scopes: ["22222222-2222-4222-8222-222222222222"],
  invitedRoles: ["PARTICIPANT"] as const,
  invitedScopes: ["22222222-2222-4222-8222-222222222222"],
  professionalEmail: "Trainee@CVG.Example",
  expiresInSeconds: 3600,
  correlationId: "33333333-3333-4333-8333-333333333333",
  accountIdFactory: () => "44444444-4444-4444-8444-444444444444",
  invitationIdFactory: () => "55555555-5555-4555-8555-555555555555",
  tokenFactory: () => "a".repeat(32),
};

describe("invitation identity use cases", () => {
  it("creates a normalized, expiring one-time invitation without persisting raw token", async () => {
    const deps = dependencies();
    const invitation = await createInvitation(admin, deps);

    expect(invitation.professionalEmail).toBe("trainee@cvg.example");
    expect(invitation.token).toBe("a".repeat(32));
    expect(deps.invitations[0]?.tokenHash).not.toBe(invitation.token);
    expect(deps.invitations[0]?.roles).toEqual(["PARTICIPANT"]);
  });

  it("accepts once, activates through a transaction, and creates a secure session", async () => {
    const deps = dependencies();
    await createInvitation(admin, deps);

    const accepted = await acceptInvitation(
      {
        token: "a".repeat(32),
        sessionExpiresInSeconds: 3600,
        correlationId: admin.correlationId,
        now: new Date("2026-08-09T17:00:00.000Z"),
        sessionTokenFactory: () => "b".repeat(32),
        sessionIdFactory: () => "66666666-6666-4666-8666-666666666666",
      },
      deps,
    );

    expect(accepted.accountId).toBe(admin.accountIdFactory());
    expect(accepted.session.cookie).toContain("HttpOnly");
    expect(deps.sessions).toHaveLength(1);
    await expect(
      acceptInvitation(
        {
          token: "a".repeat(32),
          sessionExpiresInSeconds: 3600,
          correlationId: admin.correlationId,
          now: new Date("2026-08-09T17:00:00.000Z"),
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("does not allow non-admin invitation or invalid token enumeration", async () => {
    await expect(
      createInvitation(
        { ...admin, roles: ["PARTICIPANT"], invitedRoles: ["PARTICIPANT"] },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      acceptInvitation(
        {
          token: "short",
          sessionExpiresInSeconds: 3600,
          correlationId: admin.correlationId,
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects malformed invitation inputs before any persistence call", async () => {
    const cases: readonly Partial<typeof admin>[] = [
      { professionalEmail: "not-an-email" },
      { expiresInSeconds: 59 },
      { tokenFactory: () => "short" },
      { accountIdFactory: () => " " },
      { invitationIdFactory: () => " " },
      { principalId: " " },
      { correlationId: " " },
    ];
    for (const overrides of cases) {
      await expect(
        createInvitation({ ...admin, ...overrides }, dependencies()),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
  });

  it("uses cryptographic defaults and preserves application errors from the transaction", async () => {
    const deps = dependencies();
    const {
      tokenFactory,
      accountIdFactory,
      invitationIdFactory,
      ...defaultTokenAdmin
    } = admin;
    expect(tokenFactory).toBeTypeOf("function");
    expect(accountIdFactory).toBeTypeOf("function");
    expect(invitationIdFactory).toBeTypeOf("function");
    const created = await createInvitation(defaultTokenAdmin, deps);
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const failing: InvitationUseCaseDependencies = {
      ...dependencies(),
      transaction: {
        run: async () => {
          throw new ApplicationError("state_conflict", "already exists");
        },
      },
    };
    await expect(createInvitation(admin, failing)).rejects.toMatchObject({
      code: "state_conflict",
    });

    const genericFailure: InvitationUseCaseDependencies = {
      ...dependencies(),
      transaction: {
        run: async () => {
          throw new Error("database unavailable");
        },
      },
    };
    await expect(createInvitation(admin, genericFailure)).rejects.toMatchObject(
      { code: "internal_error" },
    );
  });

  it("fails on invalid clocks and supports default session token factories", async () => {
    const deps = dependencies();
    await expect(
      acceptInvitation(
        {
          token: "a".repeat(32),
          sessionExpiresInSeconds: 3600,
          correlationId: admin.correlationId,
          now: new Date("invalid"),
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const created = await createInvitation(admin, deps);
    const accepted = await acceptInvitation(
      {
        token: created.token,
        sessionExpiresInSeconds: 60,
        correlationId: admin.correlationId,
      },
      deps,
    );
    expect(accepted.session.token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  });
});
