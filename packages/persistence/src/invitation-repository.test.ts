import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { InvitationRecord, SessionRecord } from "@cvg/application";

import type * as schema from "./schema.js";
import {
  PersistenceConflictError,
  PersistenceMappingError,
  createInvitationUseCaseDependencies,
  invitationRecordToRow,
  invitationRowToRecord,
  type InvitationRowShape,
} from "./invitation-repository.js";

const now = new Date("2026-08-09T17:00:00.000Z");
const record: InvitationRecord = {
  invitationId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  professionalEmail: "trainee@cvg.example",
  tokenHash: "a".repeat(64),
  roles: ["PARTICIPANT"],
  scopes: ["33333333-3333-4333-8333-333333333333"],
  expiresAt: new Date("2026-08-09T18:00:00.000Z"),
  acceptedAt: null,
  createdBy: "44444444-4444-4444-8444-444444444444",
  createdAt: now,
};

function fakeDatabase(
  rows: readonly InvitationRowShape[] = [
    {
      invitationId: record.invitationId,
      accountId: record.accountId,
      professionalEmail: record.professionalEmail,
      tokenHash: record.tokenHash,
      roles: record.roles,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      acceptedAt: null,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
    },
  ],
  updated: readonly { readonly id: string }[] = [{ id: record.invitationId }],
): PostgresJsDatabase<typeof schema> & {
  readonly inserted: unknown[];
} {
  const inserted: unknown[] = [];
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: async () => rows,
  };
  const database = {
    inserted,
    execute: async () => undefined,
    select: () => query,
    insert: () => ({
      values: async (value: unknown) => {
        inserted.push(value);
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => updated,
        }),
      }),
    }),
    transaction: async <Result>(work: (executor: unknown) => Promise<Result>) =>
      work(database),
  };
  return database as unknown as PostgresJsDatabase<typeof schema> & {
    readonly inserted: unknown[];
  };
}

describe("PostgreSQL invitation persistence", () => {
  it("maps safe invitation rows and rejects malformed stored values", () => {
    const row = invitationRecordToRow(record);
    expect(row).toMatchObject({
      id: record.invitationId,
      accountId: record.accountId,
      tokenHash: record.tokenHash,
    });
    expect(row).not.toHaveProperty("token");
    expect(
      invitationRowToRecord({
        invitationId: record.invitationId,
        accountId: record.accountId,
        professionalEmail: record.professionalEmail,
        tokenHash: record.tokenHash,
        roles: ["PARTICIPANT"],
        scopes: record.scopes,
        expiresAt: record.expiresAt.toISOString(),
        acceptedAt: null,
        createdBy: record.createdBy,
        createdAt: record.createdAt.toISOString(),
      }),
    ).toMatchObject(record);

    expect(() =>
      invitationRecordToRow({
        ...record,
        invitationId: " ",
      }),
    ).toThrow("invitationId");
    expect(() =>
      invitationRecordToRow({
        ...record,
        tokenHash: "invalid",
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      invitationRecordToRow({
        ...record,
        roles: ["ROOT" as never],
      }),
    ).toThrow("roles");
    expect(() =>
      invitationRecordToRow({
        ...record,
        scopes: [" "] as readonly string[],
      }),
    ).toThrow("scopes");
    expect(() =>
      invitationRecordToRow({
        ...record,
        expiresAt: record.createdAt,
      }),
    ).toThrow("expiresAt");
    expect(() =>
      invitationRowToRecord({
        invitationId: record.invitationId,
        accountId: record.accountId,
        professionalEmail: record.professionalEmail,
        tokenHash: record.tokenHash,
        roles: ["PARTICIPANT"],
        scopes: record.scopes,
        expiresAt: "invalid",
        acceptedAt: null,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
      }),
    ).toThrow("expiresAt");
    expect(() =>
      invitationRowToRecord({
        invitationId: record.invitationId,
        accountId: record.accountId,
        professionalEmail: record.professionalEmail,
        tokenHash: "invalid",
        roles: ["PARTICIPANT"],
        scopes: record.scopes,
        expiresAt: record.expiresAt,
        acceptedAt: null,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
      }),
    ).toThrow("tokenHash");
    expect(
      invitationRecordToRow({
        ...record,
        acceptedAt: new Date("2026-08-09T17:30:00.000Z"),
      }).acceptedAt,
    ).toEqual(new Date("2026-08-09T17:30:00.000Z"));
  });

  it("exposes transactional account, invitation, and session ports", async () => {
    const database = fakeDatabase();
    const dependencies = createInvitationUseCaseDependencies(
      database,
      () => "session-factory-id",
    );
    const session: SessionRecord = {
      sessionId: "55555555-5555-4555-8555-555555555555",
      accountId: record.accountId,
      accountStatus: "ACTIVE",
      sessionGeneration: 0,
      roles: ["PARTICIPANT"],
      scopes: record.scopes,
      tokenHash: "b".repeat(64),
      expiresAt: new Date("2026-08-09T18:00:00.000Z"),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: now,
    };

    await dependencies.transaction.run(async (operations) => {
      await operations.account.createInvited({
        accountId: record.accountId,
        professionalEmail: " TRAINEE@CVG.EXAMPLE ",
      });
      await operations.account.setPassword(
        record.accountId,
        "scrypt$16384$8$1$" + "a".repeat(22) + "$" + "b".repeat(86),
      );
      await operations.invitation.create(record);
      await expect(
        operations.invitation.findActive(record.tokenHash, now),
      ).resolves.toMatchObject({ invitationId: record.invitationId });
      await operations.account.activate(record.accountId);
      await operations.invitation.accept(record.invitationId, now);
      await operations.sessions.create(session);
    });

    expect(database.inserted).toHaveLength(3);
    expect(database.inserted[0]).toMatchObject({
      id: record.accountId,
      professionalEmail: "trainee@cvg.example",
      status: "INVITED",
    });
    expect(database.inserted[1]).toMatchObject({
      id: record.invitationId,
      tokenHash: record.tokenHash,
    });
    expect(database.inserted[2]).toMatchObject({
      id: session.sessionId,
      tokenHash: session.tokenHash,
    });
  });

  it("fails closed for invalid token lookup and single-use conflicts", async () => {
    const database = fakeDatabase([], []);
    const dependencies = createInvitationUseCaseDependencies(
      database,
      () => "id",
    );
    await expect(
      dependencies.transaction.run((operations) =>
        operations.invitation.findActive("invalid", now),
      ),
    ).rejects.toThrow("tokenHash");
    await expect(
      dependencies.transaction.run((operations) =>
        operations.invitation.findActive("a".repeat(64), now),
      ),
    ).resolves.toBeNull();
    await expect(
      dependencies.transaction.run((operations) =>
        operations.account.createInvited({
          accountId: record.accountId,
          professionalEmail: "invalid",
        }),
      ),
    ).rejects.toThrow("professionalEmail");
    await expect(
      dependencies.transaction.run((operations) =>
        operations.account.activate(record.accountId),
      ),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
    await expect(
      dependencies.transaction.run((operations) =>
        operations.invitation.accept(record.invitationId, now),
      ),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
  });
});
