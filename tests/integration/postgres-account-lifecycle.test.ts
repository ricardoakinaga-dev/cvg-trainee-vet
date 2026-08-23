import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  authenticateSessionCookie,
  acceptInvitation,
  changeAccountStatus,
  hashSessionToken,
  resendAccountInvitation,
} from "../../packages/application/src/index.js";
import {
  accountInvitations,
  accounts,
  auditEntries,
  createAccountManagementRepository,
  createInvitationUseCaseDependencies,
  createSessionRepository,
  sessions,
} from "../../packages/persistence/src/index.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL account lifecycle integration",
  () => {
    it("resends invited accounts and atomically revokes sessions on status changes", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application, admin } = harness;
      const repository = createAccountManagementRepository(application.db);
      const adminId = randomUUID();
      const activeId = randomUUID();
      const invitedId = randomUUID();
      const concurrentId = randomUUID();
      const resendConcurrentId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const activeInvitationId = randomUUID();
      const invitedInvitationId = randomUUID();
      const concurrentInvitationId = randomUUID();
      const resendConcurrentInvitationId = randomUUID();
      const activeSessionIds = [randomUUID(), randomUUID()];
      const suspendedSessionId = randomUUID();
      const suspendedSessionCredential = [
        "suspended",
        "session",
        "fixture",
      ].join("-");
      const correlationIds = [randomUUID(), randomUUID(), randomUUID()];
      const createdAccountIds = [
        adminId,
        activeId,
        invitedId,
        concurrentId,
        resendConcurrentId,
      ];

      try {
        await admin.db.insert(accounts).values([
          {
            id: adminId,
            professionalEmail: `lifecycle-admin-${adminId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: activeId,
            professionalEmail: `lifecycle-active-${activeId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: invitedId,
            professionalEmail: `lifecycle-invited-${invitedId}@example.invalid`,
            status: "INVITED",
          },
          {
            id: concurrentId,
            professionalEmail: `lifecycle-concurrent-${concurrentId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: resendConcurrentId,
            professionalEmail: `lifecycle-resend-concurrent-${resendConcurrentId}@example.invalid`,
            status: "INVITED",
          },
        ]);
        await admin.db.insert(accountInvitations).values([
          {
            id: activeInvitationId,
            accountId: activeId,
            tokenHash: "a".repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt: new Date("2026-08-22T12:00:00.000Z"),
            createdBy: adminId,
          },
          {
            id: invitedInvitationId,
            accountId: invitedId,
            tokenHash: "b".repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId, otherScopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt: null,
            createdBy: adminId,
          },
          {
            id: concurrentInvitationId,
            accountId: concurrentId,
            tokenHash: "c".repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt: new Date("2026-08-22T12:00:00.000Z"),
            createdBy: adminId,
          },
          {
            id: resendConcurrentInvitationId,
            accountId: resendConcurrentId,
            tokenHash: "e".repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt: null,
            createdBy: adminId,
          },
        ]);
        await admin.db.insert(sessions).values(
          activeSessionIds.map((id, index) => ({
            id,
            accountId: activeId,
            tokenHash: `${String.fromCharCode(100 + index)}${"d".repeat(63)}`,
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            lastSeenAt: new Date("2026-08-23T11:00:00.000Z"),
          })),
        );

        const baseCommand = {
          principalId: adminId,
          accountStatus: "ACTIVE" as const,
          roles: ["ADMIN"] as const,
          scopes: [scopeId] as const,
          scopeId,
          expectedStatus: "ACTIVE" as const,
        };
        const suspended = await changeAccountStatus(
          {
            ...baseCommand,
            targetAccountId: activeId,
            status: "SUSPENDED",
            correlationId: correlationIds[0] as string,
            now: new Date("2026-08-23T12:00:00.000Z"),
          },
          { repository, idFactory: randomUUID },
        );
        expect(suspended).toMatchObject({
          accountId: activeId,
          status: "SUSPENDED",
          revokedSessions: 2,
        });
        const revoked = await admin.db
          .select({ revokedAt: sessions.revokedAt })
          .from(sessions)
          .where(inArray(sessions.id, activeSessionIds));
        expect(revoked).toHaveLength(2);
        expect(revoked.every((row) => row.revokedAt !== null)).toBe(true);

        await admin.db.insert(sessions).values({
          id: suspendedSessionId,
          accountId: activeId,
          tokenHash: hashSessionToken(suspendedSessionCredential),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          lastSeenAt: new Date("2026-08-23T12:00:00.000Z"),
        });
        await expect(
          authenticateSessionCookie(
            `__Host-cvg_session=${suspendedSessionCredential}`,
            createSessionRepository(application.db),
            new Date("2026-08-23T12:00:00.000Z"),
          ),
        ).resolves.toBeNull();

        const reactivated = await changeAccountStatus(
          {
            ...baseCommand,
            targetAccountId: activeId,
            expectedStatus: "SUSPENDED",
            status: "ACTIVE",
            correlationId: randomUUID(),
            now: new Date("2026-08-23T12:01:00.000Z"),
          },
          { repository, idFactory: randomUUID },
        );
        expect(reactivated).toMatchObject({
          accountId: activeId,
          status: "ACTIVE",
          revokedSessions: 1,
        });

        const resent = await resendAccountInvitation(
          {
            ...baseCommand,
            targetAccountId: invitedId,
            expiresInSeconds: 3600,
            correlationId: correlationIds[1] as string,
            now: new Date("2026-08-23T12:02:00.000Z"),
            tokenFactory: () => "r".repeat(32),
            invitationIdFactory: () => randomUUID(),
          },
          { repository, idFactory: randomUUID },
        );
        expect(resent.professionalEmail).toContain("lifecycle-invited-");
        expect(resent.token).toBe("r".repeat(32));
        expect(JSON.stringify(resent)).not.toContain("tokenHash");
        const invitationRows = await admin.db
          .select({
            tokenHash: accountInvitations.tokenHash,
            scopes: accountInvitations.scopes,
            acceptedAt: accountInvitations.acceptedAt,
            expiresAt: accountInvitations.expiresAt,
          })
          .from(accountInvitations)
          .where(eq(accountInvitations.accountId, invitedId));
        expect(invitationRows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              tokenHash: "b".repeat(64),
              acceptedAt: null,
              expiresAt: new Date("2026-08-23T12:02:00.000Z"),
            }),
            expect.objectContaining({
              tokenHash: hashSessionToken("r".repeat(32)),
              scopes: [scopeId],
              acceptedAt: null,
            }),
          ]),
        );

        const concurrentResendResults = await Promise.allSettled([
          resendAccountInvitation(
            {
              ...baseCommand,
              targetAccountId: resendConcurrentId,
              expiresInSeconds: 3600,
              correlationId: randomUUID(),
              now: new Date("2026-08-23T12:03:00.000Z"),
              tokenFactory: () => "x".repeat(32),
              invitationIdFactory: () => randomUUID(),
            },
            { repository, idFactory: randomUUID },
          ),
          resendAccountInvitation(
            {
              ...baseCommand,
              targetAccountId: resendConcurrentId,
              expiresInSeconds: 3600,
              correlationId: randomUUID(),
              now: new Date("2026-08-23T12:04:00.000Z"),
              tokenFactory: () => "y".repeat(32),
              invitationIdFactory: () => randomUUID(),
            },
            { repository, idFactory: randomUUID },
          ),
        ]);
        expect(
          concurrentResendResults.filter(
            (result) => result.status === "fulfilled",
          ),
        ).toHaveLength(2);
        const concurrentInvitationRows = await admin.db
          .select({
            acceptedAt: accountInvitations.acceptedAt,
            expiresAt: accountInvitations.expiresAt,
          })
          .from(accountInvitations)
          .where(eq(accountInvitations.accountId, resendConcurrentId));
        expect(
          concurrentInvitationRows.filter(
            (row) =>
              row.acceptedAt === null &&
              row.expiresAt > new Date("2026-08-23T12:04:00.001Z"),
          ),
        ).toHaveLength(1);

        await expect(
          changeAccountStatus(
            {
              ...baseCommand,
              targetAccountId: invitedId,
              expectedStatus: "INVITED",
              status: "ACTIVE",
              correlationId: randomUUID(),
            },
            { repository, idFactory: randomUUID },
          ),
        ).rejects.toMatchObject({ code: "state_conflict" });

        const crossScope = await changeAccountStatus(
          {
            ...baseCommand,
            scopes: [scopeId, otherScopeId],
            scopeId: otherScopeId,
            targetAccountId: activeId,
            expectedStatus: "ACTIVE",
            status: "DEACTIVATED",
            correlationId: correlationIds[2] as string,
          },
          { repository, idFactory: randomUUID },
        ).catch((error: unknown) => error);
        expect(crossScope).toMatchObject({ code: "not_found" });

        const concurrentResults = await Promise.allSettled([
          changeAccountStatus(
            {
              ...baseCommand,
              targetAccountId: concurrentId,
              expectedStatus: "ACTIVE",
              status: "SUSPENDED",
              correlationId: randomUUID(),
            },
            { repository, idFactory: randomUUID },
          ),
          changeAccountStatus(
            {
              ...baseCommand,
              targetAccountId: concurrentId,
              expectedStatus: "ACTIVE",
              status: "DEACTIVATED",
              correlationId: randomUUID(),
            },
            { repository, idFactory: randomUUID },
          ),
        ]);
        expect(
          concurrentResults.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
          concurrentResults.filter(
            (result) =>
              result.status === "rejected" &&
              result.reason?.code === "state_conflict",
          ),
        ).toHaveLength(1);

        const accepted = await acceptInvitation(
          {
            token: resent.token,
            sessionExpiresInSeconds: 3600,
            correlationId: randomUUID(),
            now: new Date("2026-08-23T12:30:00.000Z"),
            sessionTokenFactory: () => "s".repeat(32),
            sessionIdFactory: () => randomUUID(),
          },
          createInvitationUseCaseDependencies(application.db, randomUUID),
        );
        expect(accepted.accountId).toBe(invitedId);

        const auditRows = await admin.db
          .select({
            action: auditEntries.action,
            reasonCode: auditEntries.reasonCode,
          })
          .from(auditEntries)
          .where(inArray(auditEntries.correlationId, correlationIds));
        expect(auditRows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ action: "account.status.changed" }),
            expect.objectContaining({ action: "account.invitation.resent" }),
          ]),
        );
      } finally {
        await admin.db
          .delete(sessions)
          .where(inArray(sessions.accountId, createdAccountIds));
        await admin.db
          .delete(accountInvitations)
          .where(inArray(accountInvitations.accountId, createdAccountIds));
        await admin.db
          .delete(accounts)
          .where(inArray(accounts.id, createdAccountIds));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
